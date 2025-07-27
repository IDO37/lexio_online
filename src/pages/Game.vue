<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-[#18181b] py-8">
    <!-- 방 목록/생성 페이지 (roomId가 없을 때) -->
    <div v-if="!roomId" class="w-full max-w-6xl flex flex-col md:flex-row gap-8">
      <!-- 좌측: 방 생성 패널 -->
      <div class="w-full md:w-1/3 flex flex-col items-center">
        <RoomCreatePanel />
        <div class="mt-8 flex flex-col items-center gap-2">
          <a href="https://discord.gg/" target="_blank" class="text-indigo-400 font-bold flex items-center gap-2 hover:underline">
            <span>JOIN US ON</span> <span class="text-2xl">DISCORD</span>
          </a>
          <span class="text-xs text-gray-400 mt-2">Tip Jar</span>
        </div>
      </div>
      <!-- 우측: 방 목록/검색 -->
      <div class="w-full md:w-2/3">
        <div class="flex items-center gap-2 mb-4">
          <input type="text" placeholder="Search rooms" class="w-full rounded-xl px-4 py-2 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" v-model="search" />
        </div>
        <RoomList :search="search" />
      </div>
    </div>

    <!-- 게임 방 페이지 (roomId가 있을 때) -->
    <div v-else class="w-full max-w-6xl">
      <div v-if="loading" class="text-center text-gray-400 py-8">방 정보를 불러오는 중...</div>
      <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
      <div v-else-if="!room" class="text-center text-red-400 py-8">방을 찾을 수 없습니다.</div>
      <div v-else class="flex flex-col gap-6">
        <!-- 방 헤더 -->
        <div class="flex items-center justify-between bg-gray-800 rounded-xl p-4">
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-bold text-white">{{ room.name }}</h2>
            <span class="text-sm text-gray-400">({{ room.players }}/{{ room.max_players || 4 }})</span>
            <span v-if="room.status === 'playing'" class="text-sm text-yellow-400">진행중</span>
            <span v-else class="text-sm text-green-400">대기중</span>
          </div>
          <button
            @click="leaveRoom"
            class="bg-red-600 text-white font-semibold rounded-lg px-4 py-2 transition hover:bg-red-700"
          >
            방 나가기
          </button>
        </div>
        
        <!-- 게임 컨텐츠 -->
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- 게임 보드 -->
          <div class="flex-1">
            <GameBoard :board="gameBoard" :currentPlayer="currentPlayer" />
          </div>
          <!-- 플레이어 패널 -->
          <div class="w-full lg:w-80">
            <PlayerPanel :players="players" />
          </div>
          <!-- 카드 덱 -->
          <div class="w-full lg:w-80">
            <CardDeck 
              :myHand="myHand" 
              :isMyTurn="isMyTurn" 
              @after-submit="handleCardSubmit" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import RoomCreatePanel from '../components/RoomCreatePanel.vue'
import RoomList from '../components/RoomList.vue'
import GameBoard from '../components/GameBoard.vue'
import PlayerPanel from '../components/PlayerPanel.vue'
import CardDeck from '../components/CardDeck.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const roomId = computed(() => route.params.roomId)
const search = ref('')

// 게임 방 관련 상태
const room = ref(null)
const players = ref([])
const gameBoard = ref([])
const myHand = ref([])
const currentPlayer = ref(null)
const isMyTurn = ref(false)
const loading = ref(false)
const error = ref('')

// 실시간 구독
let roomSubscription = null
let playersSubscription = null

onMounted(async () => {
  if (roomId.value) {
    await loadRoom()
    setupRealtimeSubscriptions()
  }
})

onUnmounted(() => {
  if (roomSubscription) roomSubscription.unsubscribe()
  if (playersSubscription) playersSubscription.unsubscribe()
})

async function loadRoom() {
  if (!roomId.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    // 방 정보 로드
    const { data: roomData, error: roomError } = await supabase
      .from('lo_rooms')
      .select('*')
      .eq('id', roomId.value)
      .single()
    
    if (roomError || !roomData) {
      error.value = '방을 찾을 수 없습니다.'
      return
    }
    
    room.value = roomData
    
    // 플레이어 목록 로드
    await loadPlayers()
    
    // 게임 정보 로드 (진행 중인 경우)
    if (roomData.status === 'playing') {
      await loadGameData()
    }
    
  } catch (err) {
    error.value = '방 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadPlayers() {
  const { data, error: err } = await supabase
    .from('lo_room_players')
    .select(`
      *,
      profiles:user_id(email)
    `)
    .eq('room_id', roomId.value)
    .order('joined_at', { ascending: true })
  
  if (!err && data) {
    players.value = data.map(p => ({
      id: p.user_id,
      email: p.profiles?.email || 'Unknown',
      joinedAt: p.joined_at,
      isMe: p.user_id === auth.user?.id
    }))
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(data.length)
  }
}

async function updateRoomPlayerCount(count) {
  // 방의 플레이어 수를 업데이트
  await supabase
    .from('lo_rooms')
    .update({ players: count })
    .eq('id', roomId.value)
}

async function loadGameData() {
  // 게임 데이터 로드 (진행 중인 게임이 있는 경우)
  const { data: gameData, error: gameError } = await supabase
    .from('lo_games')
    .select('*')
    .eq('room_id', roomId.value)
    .eq('status', 'playing')
    .single()
  
  if (!gameError && gameData) {
    // 현재 플레이어 턴 확인
    isMyTurn.value = gameData.current_turn_user_id === auth.user?.id
    
    // 내 카드 로드
    await loadMyHand(gameData.id)
    
    // 게임 보드 로드
    await loadGameBoard(gameData.id)
  }
}

async function loadMyHand(gameId) {
  const { data, error: err } = await supabase
    .from('lo_cards')
    .select('*')
    .eq('game_id', gameId)
    .eq('owner_id', auth.user?.id)
    .eq('in_hand', true)
  
  if (!err && data) {
    myHand.value = data
  }
}

async function loadGameBoard(gameId) {
  // 최근 턴의 카드들을 게임 보드에 표시
  const { data, error: err } = await supabase
    .from('lo_game_turns')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (!err && data && data[0]) {
    gameBoard.value = data[0].cards || []
    currentPlayer.value = data[0].player_id
  }
}

function setupRealtimeSubscriptions() {
  // 방 정보 실시간 구독
  roomSubscription = supabase
    .channel('room-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_rooms',
      filter: `id=eq.${roomId.value}`
    }, (payload) => {
      if (payload.eventType === 'DELETE') {
        // 방이 삭제된 경우
        router.push('/game')
        return
      }
      
      room.value = payload.new
      
      // 게임이 시작된 경우
      if (payload.new.status === 'playing') {
        loadGameData()
      }
    })
    .subscribe()

  // 플레이어 목록 실시간 구독
  playersSubscription = supabase
    .channel('players-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_room_players',
      filter: `room_id=eq.${roomId.value}`
    }, async (payload) => {
      if (payload.eventType === 'DELETE') {
        // 플레이어가 나간 경우
        await loadPlayers()
        
        // 방에 플레이어가 없으면 방 삭제
        if (players.value.length === 0) {
          await supabase.from('lo_rooms').delete().eq('id', roomId.value)
          router.push('/game')
        }
        return
      }
      
      // 플레이어 목록 새로고침
      await loadPlayers()
    })
    .subscribe()
}

async function handleCardSubmit() {
  // 카드 제출 후 처리
  await loadGameData()
}

async function leaveRoom() {
  if (!auth.user || !roomId.value) return
  
  try {
    // 플레이어를 방에서 제거
    const { error } = await supabase
      .from('lo_room_players')
      .delete()
      .eq('room_id', roomId.value)
      .eq('user_id', auth.user.id)
    
    if (error) {
      console.error('방 나가기 실패:', error)
    } else {
      // 남은 플레이어 수 확인
      const { data: remainingPlayers } = await supabase
        .from('lo_room_players')
        .select('*')
        .eq('room_id', roomId.value)
      
      if (remainingPlayers && remainingPlayers.length === 0) {
        // 방에 플레이어가 없으면 방 삭제
        await supabase.from('lo_rooms').delete().eq('id', roomId.value)
      }
    }
    
    // 방 목록으로 돌아가기
    router.push('/game')
    
  } catch (err) {
    console.error('방 나가기 중 오류:', err)
    router.push('/game')
  }
}
</script> 