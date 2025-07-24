<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-8">
    <div v-if="loading" class="text-center text-gray-400 py-8">방 정보를 불러오는 중...</div>
    <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
    <div v-else-if="!room" class="text-center text-gray-400 py-8">방 정보가 없습니다.</div>
    <div v-else class="w-full max-w-4xl bg-gray-800 rounded-xl shadow-md p-6 flex flex-col gap-6">
      <div class="mb-2 text-lg font-bold text-highlight-yellow">{{ room.name }}</div>
      <div v-if="isHost && isPlaying && game?.status === 'finished'" class="mb-4 text-center">
        <button @click="resetGame" class="bg-highlight-yellow text-gray-900 font-bold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">게임 재시작</button>
      </div>
      <div v-if="isHost && !isPlaying" class="mb-4 text-center">
        <button @click="startGame" class="bg-highlight-yellow text-gray-900 font-bold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">게임 시작</button>
      </div>
      <div v-if="isPlaying" class="mb-4 text-center text-green-400 font-bold">게임이 시작되었습니다!</div>
      <div v-if="isPlaying && game?.status === 'finished'" class="mb-4 text-center text-yellow-400 font-bold">게임이 종료되었습니다.</div>
      <div v-if="isPlaying && game?.status !== 'finished'" class="mb-4 text-center text-highlight-yellow font-bold">
        <span v-if="isMyTurn">내 턴입니다!</span>
        <span v-else>상대방의 턴을 기다리는 중...</span>
      </div>
      <div class="flex flex-col md:flex-row gap-6">
        <div class="flex-1">
          <GameBoard />
        </div>
        <div class="w-full md:w-1/3 flex flex-col gap-4">
          <PlayerPanel :players="players" />
          <CardDeck :my-hand="myCards" :is-my-turn="isMyTurn" @after-submit="handleAfterSubmit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import GameBoard from '../components/GameBoard.vue'
import PlayerPanel from '../components/PlayerPanel.vue'
import CardDeck from '../components/CardDeck.vue'

const route = useRoute()
const roomId = route.params.roomId
const room = ref(null)
const players = ref([])
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()
let playerSub = null
let roomSub = null
let gameSub = null
const game = ref(null)
const myCards = ref([])
const currentTurnUserId = ref(null)

const isHost = computed(() => {
  if (!room.value || !auth.user) return false
  return room.value.created_by === auth.user.id
})

const isPlaying = computed(() => room.value && room.value.status === 'playing')
const isMyTurn = computed(() => currentTurnUserId.value === auth.user?.id)

async function fetchRoom() {
  if (!roomId) return
  loading.value = true
  const { data, error: err } = await supabase.from('LO_rooms').select('*').eq('id', roomId).single()
  if (err) {
    error.value = '방 정보를 불러올 수 없습니다.'
    room.value = null
  } else {
    room.value = data
  }
  loading.value = false
}

async function fetchPlayers() {
  if (!roomId) return
  const { data } = await supabase.from('LO_room_players').select('*').eq('room_id', roomId)
  players.value = data || []
}

async function fetchGame() {
  if (!roomId) return
  const { data } = await supabase.from('LO_games').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(1)
  if (data && data[0]) {
    game.value = data[0]
    currentTurnUserId.value = data[0].current_turn_user_id
  }
}

async function fetchMyCards() {
  if (!roomId || !auth.user) return
  const { data } = await supabase.from('LO_cards').select('*').eq('game_id', game.value?.id).eq('owner_id', auth.user.id)
  myCards.value = data || []
}

async function joinRoom() {
  if (!auth.user || !roomId) return
  const { data: exists } = await supabase.from('LO_room_players').select('*').eq('room_id', roomId).eq('user_id', auth.user.id)
  if (!exists || exists.length === 0) {
    await supabase.from('LO_room_players').insert({ room_id: roomId, user_id: auth.user.id }).select()
  }
  fetchPlayers()
}

async function leaveRoom() {
  if (!auth.user || !roomId) return
  await supabase.from('LO_room_players').delete().eq('room_id', roomId).eq('user_id', auth.user.id)
  fetchPlayers()
}

function subscribePlayers() {
  if (playerSub) playerSub.unsubscribe()
  playerSub = supabase
    .channel('room-players-' + roomId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'LO_room_players', filter: `room_id=eq.${roomId}` }, fetchPlayers)
    .subscribe()
}

function subscribeRoom() {
  if (roomSub) roomSub.unsubscribe()
  roomSub = supabase
    .channel('room-status-' + roomId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'LO_rooms', filter: `id=eq.${roomId}` }, fetchRoom)
    .subscribe()
}

function subscribeGame() {
  if (gameSub) gameSub.unsubscribe()
  gameSub = supabase
    .channel('game-status-' + roomId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'LO_games', filter: `room_id=eq.${roomId}` }, fetchGame)
    .subscribe()
}

function generateDeck() {
  // 렉시오용 48장 카드(4무늬 x 12)
  const suits = ['sun', 'moon', 'star', 'cloud']
  const deck = []
  for (let suit of suits) {
    for (let rank = 1; rank <= 12; rank++) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

async function startGame() {
  if (!isHost.value || !room.value) return
  // 카드 분배
  const deck = generateDeck().sort(() => Math.random() - 0.5)
  const playerIds = players.value.map(p => p.user_id)
  const hands = playerIds.map((id, i) => ({ id, cards: deck.slice(i * 12, (i + 1) * 12) }))
  // LO_games에 insert, LO_rooms.status = 'playing'으로 변경
  const { data: gameData, error: gameErr } = await supabase.from('LO_games').insert({ room_id: roomId, status: 'playing', current_turn_user_id: playerIds[0] }).select()
  if (!gameErr && gameData && gameData[0]) {
    game.value = gameData[0]
    await supabase.from('LO_rooms').update({ status: 'playing' }).eq('id', roomId)
    // LO_cards에 카드 분배
    for (const hand of hands) {
      await supabase.from('LO_cards').insert(hand.cards.map(card => ({ game_id: game.value.id, owner_id: hand.id, suit: card.suit, rank: card.rank, in_hand: true })))
    }
  } else {
    alert('게임 시작 실패: ' + (gameErr?.message || ''))
  }
}

async function nextTurn() {
  if (!game.value || !players.value.length) return
  // 현재 턴 유저 인덱스
  const idx = players.value.findIndex(p => p.user_id === currentTurnUserId.value)
  const nextIdx = (idx + 1) % players.value.length
  const nextUserId = players.value[nextIdx].user_id
  await supabase.from('LO_games').update({ current_turn_user_id: nextUserId }).eq('id', game.value.id)
}

async function updateStats(win) {
  if (!auth.user) return
  const { data } = await supabase.from('LO_stats').select('*').eq('user_id', auth.user.id)
  if (data && data[0]) {
    await supabase.from('LO_stats').update({
      wins: data[0].wins + (win ? 1 : 0),
      losses: data[0].losses + (win ? 0 : 1),
      total_games: data[0].total_games + 1,
      updated_at: new Date().toISOString()
    }).eq('user_id', auth.user.id)
  } else {
    await supabase.from('LO_stats').insert({
      user_id: auth.user.id,
      wins: win ? 1 : 0,
      losses: win ? 0 : 1,
      total_games: 1,
      updated_at: new Date().toISOString()
    })
  }
}

async function handleAfterSubmit() {
  await fetchMyCards()
  // 승리 체크: 내 카드가 0장이면 게임 종료
  if (myCards.value.length === 0) {
    await supabase.from('LO_games').update({ status: 'finished' }).eq('id', game.value.id)
    await supabase.from('LO_rooms').update({ status: 'finished' }).eq('id', roomId)
    await updateStats(true)
    alert('축하합니다! 승리하셨습니다.')
    return
  }
  await nextTurn()
}

async function handleGameEnd() {
  // 패배 처리
  await updateStats(false)
}

async function resetGame() {
  // 카드/턴/게임 상태 초기화 및 새 게임 시작
  if (!isHost.value || !room.value) return
  // 기존 카드/턴/게임 삭제
  if (game.value?.id) {
    await supabase.from('LO_cards').delete().eq('game_id', game.value.id)
    await supabase.from('LO_game_turns').delete().eq('game_id', game.value.id)
    await supabase.from('LO_games').delete().eq('id', game.value.id)
  }
  await supabase.from('LO_rooms').update({ status: 'waiting' }).eq('id', roomId)
  // 새 게임 시작
  await startGame()
}

onMounted(async () => {
  await fetchRoom()
  await joinRoom()
  await fetchPlayers()
  subscribePlayers()
  subscribeRoom()
  subscribeGame()
  await fetchGame()
  await fetchMyCards()
})

onUnmounted(() => {
  if (playerSub) playerSub.unsubscribe()
  if (roomSub) roomSub.unsubscribe()
  if (gameSub) gameSub.unsubscribe()
  leaveRoom()
})

watch(() => route.params.roomId, async (newId) => {
  if (newId) {
    await fetchRoom()
    await joinRoom()
    await fetchPlayers()
    subscribePlayers()
    subscribeRoom()
    subscribeGame()
    await fetchGame()
    await fetchMyCards()
  }
})

watch(game, async (g) => {
  if (g && g.id) {
    await fetchMyCards()
    currentTurnUserId.value = g.current_turn_user_id
    if (g.status === 'finished' && myCards.value.length > 0) {
      await handleGameEnd()
      alert('게임이 종료되었습니다. 다시 시작하려면 방장이 "게임 재시작"을 눌러주세요.')
    }
  }
})
</script> 