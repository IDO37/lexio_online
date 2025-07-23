import { defineStore } from 'pinia'

function isStraight(cards) {
  if (cards.length < 3) return false
  const sorted = [...cards].map(c => c.rank).sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}
function isFullHouse(cards) {
  if (cards.length !== 5) return false
  const counts = cards.reduce((acc, c) => { acc[c.rank] = (acc[c.rank] || 0) + 1; return acc }, {})
  const values = Object.values(counts)
  return (values.includes(3) && values.includes(2))
}
function isQuad(cards) {
  if (cards.length !== 4) return false
  const counts = cards.reduce((acc, c) => { acc[c.rank] = (acc[c.rank] || 0) + 1; return acc }, {})
  return Object.values(counts).includes(4)
}
function isFive(cards) {
  if (cards.length !== 5) return false
  const counts = cards.reduce((acc, c) => { acc[c.rank] = (acc[c.rank] || 0) + 1; return acc }, {})
  return Object.values(counts).includes(5)
}

export const useGameStore = defineStore('game', {
  state: () => ({
    players: [
      { id: 'u1', name: '플레이어1', handCount: 5, isTurn: true, isMe: true },
      { id: 'u2', name: '플레이어2', handCount: 5, isTurn: false, isMe: false },
      { id: 'u3', name: '플레이어3', handCount: 5, isTurn: false, isMe: false }
    ],
    myHand: [
      { suit: 'sun', rank: 2 },
      { suit: 'moon', rank: 12 },
      { suit: 'star', rank: 7 },
      { suit: 'cloud', rank: 5 },
      { suit: 'sun', rank: 8 }
    ],
    board: {
      cards: [],
      combo: '',
      playerName: ''
    },
    turnIdx: 0,
    turnMessage: '',
    rooms: [
      { id: 'r1', name: '방 1', players: 3, status: 'waiting' },
      { id: 'r2', name: '방 2', players: 4, status: 'playing' },
      { id: 'r3', name: '방 3', players: 2, status: 'waiting' }
    ]
  }),
  getters: {
    currentPlayer(state) {
      return state.players[state.turnIdx]
    }
  },
  actions: {
    submitCards(cards) {
      this.board.cards = cards
      this.board.combo = this.getCombo(cards)
      this.board.playerName = this.currentPlayer.name
      if (this.currentPlayer.isMe) {
        this.myHand = this.myHand.filter(card => !cards.includes(card))
        this.players[this.turnIdx].handCount = this.myHand.length
      } else {
        this.players[this.turnIdx].handCount -= cards.length
      }
      this.nextTurn()
    },
    nextTurn() {
      this.players[this.turnIdx].isTurn = false
      this.turnIdx = (this.turnIdx + 1) % this.players.length
      this.players[this.turnIdx].isTurn = true
      this.turnMessage = `${this.players[this.turnIdx].name}의 턴입니다!`
      setTimeout(() => { this.turnMessage = '' }, 1500)
    },
    getCombo(cards) {
      if (cards.length === 1) return '싱글'
      if (cards.length === 2 && cards[0].rank === cards[1].rank) return '페어'
      if (cards.length === 3 && cards.every(c => c.rank === cards[0].rank)) return '트리플'
      if (isStraight(cards)) return '스트레이트'
      if (isFullHouse(cards)) return '풀하우스'
      if (isQuad(cards)) return '포카드'
      if (isFive(cards)) return '파이브카드'
      return `${cards.length}장 조합`
    }
  }
}) 