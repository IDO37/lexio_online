import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase.js'

function isCpuPlayer(playerId) {
  return typeof playerId === 'string' && playerId.startsWith('cpu')
}

export const useGameStore = defineStore('game', {
  state: () => ({
    // 게임 상태
    gameId: null,
    roomId: null,
    status: 'waiting', // waiting, playing, finished
    currentTurnUserId: null,
    lastPlayedCards: [],
    lastPlayedCombo: null,
    lastPlayedPlayerId: null,
    
    // 플레이어 정보
    players: [],
    myHand: [],
    myId: null,
    
    // CPU 플레이어 카드 (로컬에서 관리)
    cpuHands: {}, // { cpuId: [cards] }
    
    // UI 상태
    selectedCards: [],
    loading: false,
    error: null,
    turnTransitioning: false, // 턴 전환 애니메이션 상태
  }),
  
  getters: {
    isMyTurn: (state) => state.currentTurnUserId === state.myId,
    currentPlayer: (state) => state.players.find(p => p.id === state.currentTurnUserId) || null,
    canPlay: (state) => {
      if (!state.isMyTurn) return false
      if (state.selectedCards.length === 0) return false
      
      // 선택된 카드 인덱스로부터 실제 카드 객체들 가져오기
      const selectedCards = state.selectedCards.map(i => state.myHand[i]).filter(Boolean)
      if (selectedCards.length === 0) return false
      
      const combo = getCombo(selectedCards)
      if (!combo) return false
      
      // 첫 턴이거나 마지막 플레이어가 패스한 경우
      if (!state.lastPlayedCombo || state.lastPlayedCombo.type === 'pass') return true
      
      // 같은 조합인 경우 높은 카드가 더 높아야 함
      if (combo.type === state.lastPlayedCombo.type) {
        return getComboValue(combo) > getComboValue(state.lastPlayedCombo)
      }
      
      // 다른 조합인 경우 더 높은 조합이어야 함
      return getComboRank(combo.type) > getComboRank(state.lastPlayedCombo.type)
    }
  },
  
  actions: {
    // 게임 상태 설정
    setGameId(gameId) {
      this.gameId = gameId
    },
    
    setRoomId(roomId) {
      this.roomId = roomId
    },
    
    setStatus(status) {
      this.status = status
    },
    
    setCurrentTurnUserId(userId) {
      this.currentTurnUserId = userId
    },
    
    setMyId(myId) {
      this.myId = myId
    },
    
    // CPU 플레이어 카드 설정
    setCpuHand(cpuId, cards) {
      this.cpuHands[cpuId] = cards
    },
    
    // 카드 선택/해제
    toggleCard(cardIndex) {
      if (!this.isMyTurn || this.loading) return
      
      const index = this.selectedCards.indexOf(cardIndex)
      if (index > -1) {
        this.selectedCards.splice(index, 1)
      } else {
        this.selectedCards.push(cardIndex)
      }
    },
    
    // 선택된 카드들로 플레이
    async playCards() {
      if (!this.canPlay) return
      
      this.loading = true
      try {
        const selectedCards = this.selectedCards.map(i => this.myHand[i]).filter(Boolean)
        if (selectedCards.length === 0) {
          this.error = '선택된 카드가 없습니다.'
          return
        }
        
        const combo = getCombo(selectedCards)
        if (!combo) {
          this.error = '유효하지 않은 카드 조합입니다.'
          return
        }
        
        // 첫 턴 검증 제거 - cloud 3을 가진 플레이어가 첫 턴을 가지지만, 어떤 카드든 플레이 가능
        
        // 카드를 게임 보드에 제출
        await this.submitCardsToBoard(selectedCards, combo)
        
        // 내 패에서 카드 제거
        this.removeCardsFromHand(selectedCards)
        
        // 턴 전환 애니메이션
        this.turnTransitioning = true
        setTimeout(async () => {
          await this.nextTurn()
          this.turnTransitioning = false
        }, 1000)
        
        this.selectedCards = []
        this.error = null
      } catch (error) {
        this.error = '카드 제출 중 오류가 발생했습니다.'
        console.error('Play cards error:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 패스
    async pass() {
      if (!this.isMyTurn || this.loading) return
      
      this.loading = true
      try {
        // 패스 기록
        if (this.gameId && this.myId) {
          // 현재 턴 넘버 계산 (DB에서 턴 개수 조회)
          let turnNumber = 1
          try {
            const { count, error: turnCountError } = await supabase
              .from('lo_game_turns')
              .select('', { count: 'exact', head: true })
              .eq('game_id', this.gameId)
            if (!turnCountError && typeof count === 'number') {
              turnNumber = count + 1
            }
          } catch (e) {
            console.error('턴 넘버 계산 오류:', e)
          }
          const passData = {
            game_id: this.gameId,
            player_id: this.myId,
            action: 'pass',
            cards: [],
            turn_number: turnNumber
          }
          
          try {
            const { error } = await supabase
              .from('lo_game_turns')
              .insert(passData)
            
            if (error) {
              console.error('패스 데이터 삽입 오류:', error)
              // 오류가 발생해도 게임은 계속 진행
            }
          } catch (err) {
            console.error('패스 데이터 삽입 중 예외:', err)
          }
        }
        
        // 턴 전환 애니메이션
        this.turnTransitioning = true
        setTimeout(async () => {
          await this.nextTurn()
          this.turnTransitioning = false
        }, 1000)
        this.selectedCards = []
        this.error = null
      } catch (error) {
        this.error = '패스 중 오류가 발생했습니다.'
        console.error('Pass error:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 카드를 게임 보드에 제출
    async submitCardsToBoard(cards, combo) {
      if (!this.gameId || !this.myId) {
        throw new Error('게임 ID 또는 사용자 ID가 없습니다.')
      }
      // 현재 턴 넘버 계산 (DB에서 턴 개수 조회)
      let turnNumber = 1
      try {
        const { count, error: turnCountError } = await supabase
          .from('lo_game_turns')
          .select('', { count: 'exact', head: true })
          .eq('game_id', this.gameId)
        if (!turnCountError && typeof count === 'number') {
          turnNumber = count + 1
        }
      } catch (e) {
        console.error('턴 넘버 계산 오류:', e)
      }
      const turnData = {
        game_id: this.gameId,
        player_id: this.myId,
        action: 'play',
        cards: cards,
        turn_number: turnNumber
      }
      try {
        const { error } = await supabase
          .from('lo_game_turns')
          .insert(turnData)
        if (error) {
          console.error('턴 데이터 삽입 오류:', error)
        }
      } catch (err) {
        console.error('턴 데이터 삽입 중 예외:', err)
      }
      
      // 로컬 상태 업데이트
      this.lastPlayedCards = cards
      this.lastPlayedCombo = combo
      this.lastPlayedPlayerId = this.myId
    },
    
    // 패에서 카드 제거
    removeCardsFromHand(cards) {
      const cardIds = cards.map(c => `${c.suit}-${c.rank}`)
      this.myHand = this.myHand.filter(card => 
        !cardIds.includes(`${card.suit}-${card.rank}`)
      )
    },
    
    // 다음 턴으로 넘기기
    async nextTurn() {
      if (!this.gameId || !this.players.length) return
      
      const currentIndex = this.players.findIndex(p => p.id === this.currentTurnUserId)
      const nextIndex = (currentIndex + 1) % this.players.length
      const nextPlayerId = this.players[nextIndex].id
      
      // DB에 턴 변경 정보 저장 (실시간 구독에서 감지)
      try {
        const { count, error: turnCountError } = await supabase
          .from('lo_game_turns')
          .select('', { count: 'exact', head: true })
          .eq('game_id', this.gameId)
       
        const turnNumber = (!turnCountError && typeof count === 'number') ? count + 1 : 1
       
        const turnData = {
          game_id: this.gameId,
          player_id: this.currentTurnUserId, // 현재 플레이어 (턴 완료)
          action: 'turn_complete',
          cards: [],
          turn_number: turnNumber
        }
       
        const { error } = await supabase
          .from('lo_game_turns')
          .insert(turnData)
       
        if (error) {
          console.error('턴 변경 데이터 삽입 오류:', error)
          // 오류가 발생해도 로컬에서 턴 변경
          this.currentTurnUserId = nextPlayerId
        }
        // 성공하면 실시간 구독에서 턴 변경을 처리
      } catch (err) {
        console.error('턴 변경 데이터 삽입 중 예외:', err)
        // 예외가 발생해도 로컬에서 턴 변경
        this.currentTurnUserId = nextPlayerId
      }
      
      // CPU 턴이면 자동 플레이
      if (isCpuPlayer(nextPlayerId)) {
        setTimeout(() => {
          this.cpuPlay(nextPlayerId)
        }, 1200)
      }
    },
    
    // 게임 상태 초기화
    initializeGame(gameData, players, myId) {
      this.gameId = gameData.id
      this.roomId = gameData.room_id
      this.status = gameData.status
      this.currentTurnUserId = gameData.current_turn_user_id
      this.players = players
      this.myId = myId
      this.selectedCards = []
      this.error = null
      this.loading = false
    },
    
    // 내 패 설정
    setMyHand(cards) {
      this.myHand = cards || []
    },
    
    // 마지막 플레이 정보 업데이트
    updateLastPlay(turnData) {
      if (!turnData) return
      
      this.lastPlayedCards = turnData.cards || []
      this.lastPlayedCombo = turnData.combo_type ? {
        type: turnData.combo_type,
        value: turnData.combo_value
      } : null
      this.lastPlayedPlayerId = turnData.player_id
    },
    async cpuPlay(cpuId) {
      console.log('CPU 플레이어 턴:', cpuId)
      
      // CPU의 패 가져오기 (로컬에서 관리)
      const hand = this.cpuHands[cpuId] || []
      if (!hand || hand.length === 0) {
        console.log('CPU 패가 없습니다. 패스합니다.')
        await this.cpuPass(cpuId)
        return
      }
      
      console.log('CPU 패:', hand.map(c => `${c.suit} ${c.rank}`))
      
      // 가능한 모든 조합 찾기 (카드 수가 많은 것 우선)
      let bestPlay = null
      let bestCombo = null
      
      // 5장부터 1장까지 역순으로 검색 (많은 카드 우선)
      for (let n = Math.min(5, hand.length); n >= 1; n--) {
        const combs = getCombinations(hand, n)
        let foundValidCombo = false
        
        for (const comb of combs) {
          const combo = getCombo(comb)
          if (!combo) continue
          
          // 현재 보드보다 높은 조합인지 확인
          const isValidPlay = !this.lastPlayedCombo || 
            (combo.type === this.lastPlayedCombo.type && getComboValue(combo) > getComboValue(this.lastPlayedCombo)) || 
            getComboRank(combo.type) > getComboRank(this.lastPlayedCombo?.type)
          
          if (isValidPlay) {
            // 같은 카드 수에서 가장 낮은 조합 선택
            if (!bestPlay || 
                (bestPlay.length === comb.length && getComboValue(combo) < getComboValue(bestCombo))) {
              bestPlay = comb
              bestCombo = combo
            }
            foundValidCombo = true
          }
        }
        
        // 이 카드 수에서 유효한 조합을 찾았다면, 더 적은 카드 수는 검색하지 않음
        if (foundValidCombo) {
          break
        }
      }
      
      if (bestPlay) {
        console.log(`CPU가 ${bestPlay.length}장의 카드를 플레이합니다:`, bestPlay.map(c => `${c.suit} ${c.rank}`))
        console.log('조합 타입:', bestCombo.type, '값:', getComboValue(bestCombo))
        // 제출
        await this.submitCardsToBoard(bestPlay, bestCombo)
        this.removeCpuCardsFromHand(cpuId, bestPlay)
        await this.nextTurn()
      } else {
        console.log('CPU가 패스합니다.')
        // 패스
        await this.cpuPass(cpuId)
      }
    },
    async cpuPass(cpuId) {
      // 현재 턴 넘버 계산 (DB에서 턴 개수 조회)
      let turnNumber = 1
      try {
        const { count, error: turnCountError } = await supabase
          .from('lo_game_turns')
          .select('', { count: 'exact', head: true })
          .eq('game_id', this.gameId)
        if (!turnCountError && typeof count === 'number') {
          turnNumber = count + 1
        }
      } catch (e) {
        console.error('턴 넘버 계산 오류:', e)
      }
      const passData = {
        game_id: this.gameId,
        player_id: cpuId,
        action: 'pass',
        cards: [],
        turn_number: turnNumber
      }
      try {
        const { error } = await supabase
          .from('lo_game_turns')
          .insert(passData)
        if (error) {
          console.error('CPU 패스 데이터 삽입 오류:', error)
        }
      } catch (err) {
        console.error('CPU 패스 데이터 삽입 중 예외:', err)
      }
      
      // 턴 전환 애니메이션
      this.turnTransitioning = true
      setTimeout(async () => {
        await this.nextTurn()
        this.turnTransitioning = false
      }, 1000)
    },
    removeCpuCardsFromHand(cpuId, cards) {
      // CPU 카드는 로컬에서만 관리
      const currentHand = this.cpuHands[cpuId] || []
      const cardIds = cards.map(c => `${c.suit}-${c.rank}`)
      
      this.cpuHands[cpuId] = currentHand.filter(card => 
        !cardIds.includes(`${card.suit}-${card.rank}`)
      )
      
      console.log(`CPU ${cpuId} 카드 제거 후:`, this.cpuHands[cpuId].map(c => `${c.suit} ${c.rank}`))
    }
  }
})

// 렉시오 타일 구조 (sun, moon, star, cloud)
export const SUITS = {
  CLOUD: 'cloud',
  STAR: 'star', 
  MOON: 'moon',
  SUN: 'sun'
}

export const SUIT_RANKS = {
  [SUITS.CLOUD]: 1,  // 가장 약함
  [SUITS.STAR]: 2,
  [SUITS.MOON]: 3,
  [SUITS.SUN]: 4     // 가장 강함
}

// 렉시오 조합 타입과 우선순위
export const COMBO_TYPES = {
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  STRAIGHT: 'straight',
  FULL_HOUSE: 'full_house',
  FOUR_CARD: 'four_card',
  STRAIGHT_FLUSH: 'straight_flush'
}

export const COMBO_RANKS = {
  [COMBO_TYPES.SINGLE]: 1,
  [COMBO_TYPES.PAIR]: 2,
  [COMBO_TYPES.TRIPLE]: 3,
  [COMBO_TYPES.STRAIGHT]: 4,
  [COMBO_TYPES.FULL_HOUSE]: 5,
  [COMBO_TYPES.FOUR_CARD]: 6,
  [COMBO_TYPES.STRAIGHT_FLUSH]: 7
}

// 렉시오 카드 조합 분석 함수들
function getCombo(tiles) {
  if (!tiles || tiles.length === 0) return null
  
  const sortedTiles = [...tiles].sort((a, b) => getTileValue(b) - getTileValue(a))
  const numbers = sortedTiles.map(t => t.number)
  const numberCounts = getNumberCounts(numbers)
  
  // 스트레이트 플러시 (같은 문양의 연속 숫자 5장)
  if (tiles.length === 5 && isStraightFlush(tiles)) {
    return { type: COMBO_TYPES.STRAIGHT_FLUSH, value: getTileValue(sortedTiles[0]) }
  }
  
  // 포카드 (같은 숫자 4장 + 아무 한 장)
  if (tiles.length === 5 && Object.values(numberCounts).some(count => count === 4)) {
    const fourNumber = Object.keys(numberCounts).find(num => numberCounts[num] === 4)
    return { type: COMBO_TYPES.FOUR_CARD, value: parseInt(fourNumber) }
  }
  
  // 풀하우스 (트리플 + 페어)
  if (tiles.length === 5) {
    const counts = Object.values(numberCounts).sort((a, b) => b - a)
    if (counts[0] === 3 && counts[1] === 2) {
      const threeNumber = Object.keys(numberCounts).find(num => numberCounts[num] === 3)
      return { type: COMBO_TYPES.FULL_HOUSE, value: parseInt(threeNumber) }
    }
  }
  
  // 스트레이트 (연속된 숫자 5장, 문양 무관)
  if (tiles.length === 5 && isStraight(numbers)) {
    return { type: COMBO_TYPES.STRAIGHT, value: getTileValue(sortedTiles[0]) }
  }
  
  // 트리플 (같은 숫자 3장)
  if (tiles.length === 3 && Object.values(numberCounts).some(count => count === 3)) {
    return { type: COMBO_TYPES.TRIPLE, value: getTileValue(sortedTiles[0]) }
  }
  
  // 페어 (같은 숫자 2장)
  if (tiles.length === 2 && Object.values(numberCounts).some(count => count === 2)) {
    return { type: COMBO_TYPES.PAIR, value: getTileValue(sortedTiles[0]) }
  }
  
  // 싱글 (한 장)
  if (tiles.length === 1) {
    return { type: COMBO_TYPES.SINGLE, value: getTileValue(sortedTiles[0]) }
  }
  
  return null
}

function getTileValue(tile) {
  // 렉시오 규칙: 숫자 + 문양 순위 (3이 가장 낮음, 2가 가장 높음)
  // 숫자 순위: 3=1, 4=2, ..., 2=13 (2가 가장 높음)
  const numberRank = tile.number === 2 ? 13 : tile.number - 2
  return numberRank * 10 + SUIT_RANKS[tile.suit]
}

function getNumberCounts(numbers) {
  return numbers.reduce((counts, num) => {
    counts[num] = (counts[num] || 0) + 1
    return counts
  }, {})
}

function isStraight(numbers) {
  const sortedNumbers = [...numbers].sort((a, b) => b - a)
  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i-1] - sortedNumbers[i] !== 1) return false
  }
  return true
}

function isStraightFlush(tiles) {
  // 같은 문양인지 확인
  const firstSuit = tiles[0].suit
  if (!tiles.every(tile => tile.suit === firstSuit)) return false
  
  // 연속된 숫자인지 확인
  const numbers = tiles.map(t => t.number).sort((a, b) => b - a)
  return isStraight(numbers)
}

function getComboValue(combo) {
  return combo.value
}

function getComboRank(comboType) {
  return COMBO_RANKS[comboType] || 0
}

// 조합 이름을 한글로 변환
export function getComboName(comboType) {
  const names = {
    [COMBO_TYPES.SINGLE]: '싱글',
    [COMBO_TYPES.PAIR]: '페어',
    [COMBO_TYPES.TRIPLE]: '트리플',
    [COMBO_TYPES.STRAIGHT]: '스트레이트',
    [COMBO_TYPES.FULL_HOUSE]: '풀하우스',
    [COMBO_TYPES.FOUR_CARD]: '포카드',
    [COMBO_TYPES.STRAIGHT_FLUSH]: '스트레이트 플러시'
  }
  return names[comboType] || '알 수 없음'
}

// 조합 생성 함수 (n장 중복 없는 조합)
function getCombinations(arr, n) {
  const result = []
  const f = (prefix, rest, n) => {
    if (n === 0) {
      result.push(prefix)
      return
    }
    for (let i = 0; i < rest.length; i++) {
      f([...prefix, rest[i]], rest.slice(i + 1), n - 1)
    }
  }
  f([], arr, n)
  return result
} 