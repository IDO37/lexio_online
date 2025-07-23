<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-8">
    <div class="w-full max-w-4xl bg-gray-800 rounded-xl shadow-md p-6 flex flex-col gap-6">
      <div class="flex flex-col md:flex-row gap-6">
        <div class="flex-1">
          <GameBoard :board="board" :current-player="currentPlayer" />
        </div>
        <div class="w-full md:w-1/3 flex flex-col gap-4">
          <PlayerPanel :players="players" />
          <CardDeck :my-hand="myHand" @submit-cards="handleSubmitCards" />
        </div>
      </div>
      <RoomList />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GameBoard from '../components/GameBoard.vue'
import PlayerPanel from '../components/PlayerPanel.vue'
import CardDeck from '../components/CardDeck.vue'
import RoomList from '../components/RoomList.vue'

const players = ref([
  { id: 'u1', name: '플레이어1', handCount: 7, isTurn: true, isMe: true },
  { id: 'u2', name: '플레이어2', handCount: 5, isTurn: false, isMe: false },
  { id: 'u3', name: '플레이어3', handCount: 2, isTurn: false, isMe: false }
])
const myHand = ref([
  { suit: 'sun', rank: 2 },
  { suit: 'moon', rank: 12 },
  { suit: 'star', rank: 7 },
  { suit: 'cloud', rank: 5 },
  { suit: 'sun', rank: 8 }
])
const board = ref({
  cards: [],
  combo: '',
  playerName: ''
})
const currentPlayer = ref(players.value[0])

function handleSubmitCards(cards) {
  board.value.cards = cards
  board.value.combo = '제출된 족보' // TODO: 족보 판별 함수 연결
  board.value.playerName = currentPlayer.value.name
  // 내 패에서 제출된 카드 제거
  myHand.value = myHand.value.filter(card => !cards.includes(card))
  // TODO: 턴 넘기기, 족보 판별 등 추가
}
</script> 