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
    
    // UI 상태
    selectedCards: [],
    loading: false,
    error: null
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
        
        // 첫 턴인 경우 구름 3을 플레이해야 함
        if (!this.lastPlayedCombo) {
          const hasCloud3 = selectedCards.some(card => card.suit === 'cloud' && card.rank === '3')
          if (!hasCloud3) {
            this.error = '첫 턴에는 구름 3을 플레이해야 합니다.'
            return
          }
        }
        
        // 카드를 게임 보드에 제출
        await this.submitCardsToBoard(selectedCards, combo)
        
        // 내 패에서 카드 제거
        this.removeCardsFromHand(selectedCards)
        
        // 턴 넘기기
        await this.nextTurn()
        
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
          const { error } = await supabase
            .from('lo_game_turns')
            .insert({
              game_id: this.gameId,
              player_id: this.myId,
              action: 'pass',
              cards: [],
              combo_type: null,
              combo_value: null
            })
          
          if (error) throw error
        }
        
        await this.nextTurn()
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
      
      const { error } = await supabase
        .from('lo_game_turns')
        .insert({
          game_id: this.gameId,
          player_id: this.myId,
          action: 'play',
          cards: cards,
          combo_type: combo.type,
          combo_value: getComboValue(combo)
        })
      
      if (error) throw error
      
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
      
      const { error } = await supabase
        .from('lo_games')
        .update({ current_turn_user_id: nextPlayerId })
        .eq('id', this.gameId)
      
      if (error) throw error
      
      this.currentTurnUserId = nextPlayerId
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
      // CPU의 패 불러오기
      const { data: hand } = await supabase
        .from('lo_cards')
        .select('*')
        .eq('game_id', this.gameId)
        .eq('owner_id', cpuId)
        .eq('in_hand', true)
      if (!hand || hand.length === 0) {
        await this.cpuPass(cpuId)
        return
      }
      
      // 첫 턴인 경우 구름 3을 우선적으로 플레이
      if (!this.lastPlayedCombo) {
        const cloud3 = hand.find(card => card.suit === 'cloud' && card.rank === '3')
        if (cloud3) {
          await this.submitCardsToBoard([cloud3], getCombo([cloud3]))
          await this.removeCpuCardsFromHand(cpuId, [cloud3])
          await this.nextTurn()
          return
        }
      }
      
      // 가능한 조합 찾기 (싱글, 페어, 트리플, ...)
      let playCards = null
      for (let n = 1; n <= Math.min(5, hand.length); n++) {
        // n장 조합 중 유효한 것
        const combs = getCombinations(hand, n)
        for (const comb of combs) {
          const combo = getCombo(comb)
          if (!combo) continue
          // 현재 보드보다 높은 조합만 제출
          if (!this.lastPlayedCombo || combo.type === this.lastPlayedCombo.type && getComboValue(combo) > getComboValue(this.lastPlayedCombo) || getComboRank(combo.type) > getComboRank(this.lastPlayedCombo?.type)) {
            playCards = comb
            break
          }
        }
        if (playCards) break
      }
      if (playCards) {
        // 제출
        await this.submitCardsToBoard(playCards, getCombo(playCards))
        await this.removeCpuCardsFromHand(cpuId, playCards)
        await this.nextTurn()
      } else {
        // 패스
        await this.cpuPass(cpuId)
      }
    },
    async cpuPass(cpuId) {
      await supabase.from('lo_game_turns').insert({
        game_id: this.gameId,
        player_id: cpuId,
        action: 'pass',
        cards: [],
        combo_type: null,
        combo_value: null
      })
      await this.nextTurn()
    },
    async removeCpuCardsFromHand(cpuId, cards) {
      for (const card of cards) {
        await supabase.from('lo_cards').update({ in_hand: false })
          .eq('game_id', card.game_id)
          .eq('owner_id', cpuId)
          .eq('suit', card.suit)
          .eq('rank', card.rank)
      }
    }
  }
})

// 렉시오 카드 조합 분석 함수들
function getCombo(cards) {
  if (!cards || cards.length === 0) return null
  
  const sortedCards = [...cards].sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank))
  const ranks = sortedCards.map(c => c.rank)
  const rankCounts = getRankCounts(ranks)
  
  // 파이브카드 (5장)
  if (cards.length === 5 && Object.values(rankCounts).some(count => count === 5)) {
    return { type: 'five_card', value: getCardValue(ranks[0]) }
  }
  
  // 포카드 (4장)
  if (cards.length === 4 && Object.values(rankCounts).some(count => count === 4)) {
    return { type: 'four_card', value: getCardValue(ranks[0]) }
  }
  
  // 풀하우스 (5장: 3장 + 2장)
  if (cards.length === 5) {
    const counts = Object.values(rankCounts).sort((a, b) => b - a)
    if (counts[0] === 3 && counts[1] === 2) {
      const threeRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3)
      return { type: 'full_house', value: getCardValue(threeRank) }
    }
  }
  
  // 스트레이트 (5장 연속)
  if (cards.length === 5 && isStraight(ranks)) {
    return { type: 'straight', value: getCardValue(ranks[0]) }
  }
  
  // 트리플 (3장)
  if (cards.length === 3 && Object.values(rankCounts).some(count => count === 3)) {
    return { type: 'triple', value: getCardValue(ranks[0]) }
  }
  
  // 페어 (2장)
  if (cards.length === 2 && Object.values(rankCounts).some(count => count === 2)) {
    return { type: 'pair', value: getCardValue(ranks[0]) }
  }
  
  // 싱글 (1장)
  if (cards.length === 1) {
    return { type: 'single', value: getCardValue(ranks[0]) }
  }
  
  return null
}

function getCardValue(rank) {
  const values = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11,
    '10': 10, '9': 9, '8': 8, '7': 7,
    '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  }
  return values[rank] || 0
}

function getRankCounts(ranks) {
  return ranks.reduce((counts, rank) => {
    counts[rank] = (counts[rank] || 0) + 1
    return counts
  }, {})
}

function isStraight(ranks) {
  const values = ranks.map(r => getCardValue(r)).sort((a, b) => b - a)
  for (let i = 1; i < values.length; i++) {
    if (values[i-1] - values[i] !== 1) return false
  }
  return true
}

function getComboValue(combo) {
  return combo.value
}

function getComboRank(comboType) {
  const ranks = {
    'five_card': 7,
    'four_card': 6,
    'full_house': 5,
    'straight': 4,
    'triple': 3,
    'pair': 2,
    'single': 1
  }
  return ranks[comboType] || 0
}

// 조합 이름을 한글로 변환
export function getComboName(comboType) {
  const names = {
    'five_card': '파이브카드',
    'four_card': '포카드',
    'full_house': '풀하우스',
    'straight': '스트레이트',
    'triple': '트리플',
    'pair': '페어',
    'single': '싱글'
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