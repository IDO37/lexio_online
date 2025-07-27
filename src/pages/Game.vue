<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-lexio-bg py-8">
    <!-- 방 목록/생성 페이지 (roomId가 없을 때) -->
    <div v-if="!roomId" class="w-full max-w-6xl flex flex-col md:flex-row gap-8">
      <!-- 좌측: 방 생성 패널 -->
      <div class="w-full md:w-1/3 flex flex-col items-center">
        <RoomCreatePanel />
        <div class="mt-8 flex flex-col items-center gap-2">
          <a href="https://discord.gg/" target="_blank" class="text-highlight-red font-bold flex items-center gap-2 hover:underline">
            <span>JOIN US ON</span> <span class="text-2xl">DISCORD</span>
          </a>
          <span class="text-xs text-lexio-text-muted mt-2">Tip Jar</span>
        </div>
      </div>
      <!-- 우측: 방 목록/검색 -->
      <div class="w-full md:w-2/3">
        <div class="flex items-center gap-2 mb-4">
          <input type="text" placeholder="Search rooms" class="w-full rounded-xl px-4 py-2 bg-lexio-bg-light text-lexio-text focus:outline-none focus:ring-2 focus:ring-highlight-red transition" v-model="search" />
        </div>
        <RoomList :search="search" />
      </div>
    </div>

    <!-- 게임 방 페이지 (roomId가 있을 때) -->
    <div v-else class="w-full max-w-6xl">
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-highlight-red mx-auto mb-6"></div>
        <div class="text-lexio-text-muted text-lg mb-2">방 정보를 불러오는 중...</div>
        <div class="text-sm text-gray-500">잠시만 기다려주세요</div>
      </div>
      <div v-else-if="error" class="text-center py-12">
        <div class="text-red-400 text-lg mb-4">{{ error }}</div>
        <button 
          @click="retryLoad" 
          class="bg-highlight-red text-white font-bold rounded-lg px-6 py-2 transition hover:bg-highlight-red-dark"
        >
          다시 시도
        </button>
      </div>
      <div v-else-if="!room" class="text-center py-12">
        <div class="text-red-400 text-lg mb-4">방을 찾을 수 없습니다.</div>
        <router-link 
          to="/game" 
          class="bg-highlight-red text-white font-bold rounded-lg px-6 py-2 transition hover:bg-highlight-red-dark"
        >
          방 목록으로 돌아가기
        </router-link>
      </div>
      <div v-else class="flex flex-col gap-6">
        <!-- 방 헤더 -->
        <div class="flex items-center justify-between bg-lexio-bg-light rounded-xl p-4">
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-bold text-lexio-text">{{ room.name }}</h2>
            <span class="text-sm text-lexio-text-muted">({{ room.players }}/{{ room.max_players || 4 }})</span>
            <span v-if="room.status === 'playing'" class="text-sm text-highlight-red">진행중</span>
            <span v-else class="text-sm text-green-400">대기중</span>
          </div>
          <div class="flex gap-2">
            <button
              v-if="room.status === 'waiting' && isRoomOwner"
              @click="startGame"
              :disabled="!canStartGame"
              class="bg-highlight-red text-white font-semibold rounded-lg px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              :class="canStartGame ? 'hover:bg-highlight-red-dark' : ''"
            >
              게임 시작
            </button>
            <button
              @click="leaveRoom"
              class="bg-red-600 text-white font-semibold rounded-lg px-4 py-2 transition hover:bg-red-700"
            >
              방 나가기
            </button>
          </div>
        </div>
        
        <!-- 게임 시작 조건 경고 -->
        <div v-if="room.status === 'waiting' && isRoomOwner && !canStartGame" class="bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
          <div class="text-yellow-400 font-semibold mb-2">게임 시작 조건</div>
          <div class="text-yellow-300 text-sm">
            최소 2명 이상의 플레이어가 필요합니다. (현재: {{ players.length }}명)
          </div>
        </div>
        
        <!-- 게임 컨텐츠 -->
        <div v-if="room.status === 'playing'" class="flex flex-col lg:flex-row gap-6">
          <!-- 게임 보드 -->
          <div class="flex-1">
            <GameBoard 
              :currentPlayer="gameStore.currentPlayer"
              :isMyTurn="gameStore.isMyTurn"
              :lastPlayedCards="gameStore.lastPlayedCards"
              :lastPlayedCombo="gameStore.lastPlayedCombo"
              :lastPlayedPlayerName="lastPlayedPlayerName"
              :remainingCards="totalRemainingCards"
              :gameStatus="gameStore.status"
            />
          </div>
          <!-- 플레이어 패널 -->
          <div class="w-full lg:w-80">
            <PlayerPanel 
              :players="gamePlayers" 
              :gameStatus="gameStore.status"
            />
          </div>
          <!-- 카드 덱 -->
          <div class="w-full lg:w-80">
            <CardDeck 
              :myHand="gameStore.myHand" 
              :isMyTurn="gameStore.isMyTurn"
              :currentPlayerName="gameStore.currentPlayer?.name || ''"
            />
          </div>
        </div>
        
        <!-- 대기실 -->
        <div v-else class="flex flex-col lg:flex-row gap-6">
          <!-- 플레이어 관리 패널 -->
          <div class="flex-1">
            <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 border border-gray-600">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-lexio-text">플레이어 관리</h3>
                <div v-if="isRoomOwner" class="flex gap-2">
                  <button
                    @click="addCpu"
                    :disabled="players.length >= 4"
                    class="bg-blue-600 text-white font-semibold rounded-lg px-3 py-1 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="players.length < 4 ? 'hover:bg-blue-700' : ''"
                  >
                    CPU 추가
                  </button>
                  <button
                    @click="removeCpu"
                    :disabled="!hasCpuPlayers"
                    class="bg-gray-600 text-white font-semibold rounded-lg px-3 py-1 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="hasCpuPlayers ? 'hover:bg-gray-700' : ''"
                  >
                    CPU 제거
                  </button>
                </div>
              </div>
              
              <!-- 플레이어 목록 -->
              <div class="space-y-3">
                <div 
                  v-for="player in players" 
                  :key="player.id" 
                  class="flex items-center justify-between p-3 rounded-lg bg-lexio-bg border border-gray-600"
                >
                  <div class="flex items-center gap-3">
                    <div 
                      class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      :class="[
                        player.isMe 
                          ? 'bg-highlight-red' 
                          : isCpuPlayer(player.id)
                            ? 'bg-blue-600'
                            : 'bg-gray-500'
                      ]"
                    >
                      {{ player.email.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-lexio-text">{{ player.email }}</span>
                        <span v-if="player.isMe" class="text-xs text-highlight-red font-bold bg-highlight-red bg-opacity-20 px-2 py-1 rounded-full">
                          나
                        </span>
                        <span v-if="isCpuPlayer(player.id)" class="text-xs text-blue-400 font-bold bg-blue-600 bg-opacity-20 px-2 py-1 rounded-full">
                          CPU
                        </span>
                        <span v-if="player.id === room.created_by" class="text-xs text-yellow-400 font-bold bg-yellow-600 bg-opacity-20 px-2 py-1 rounded-full">
                          방장
                        </span>
                      </div>
                      <div class="text-xs text-lexio-text-muted">
                        {{ formatDate(player.joinedAt) }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 관리 버튼 -->
                  <div v-if="isRoomOwner && !player.isMe" class="flex gap-1">
                    <button
                      @click="kickPlayer(player.id)"
                      class="bg-red-600 text-white text-xs px-2 py-1 rounded transition hover:bg-red-700"
                    >
                      추방
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 게임 정보 -->
          <div class="w-full lg:w-80">
            <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 border border-gray-600">
              <h3 class="text-lg font-bold text-lexio-text mb-4">게임 정보</h3>
              
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">방 이름:</span>
                  <span class="text-lexio-text font-semibold">{{ room.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">플레이어:</span>
                  <span class="text-lexio-text font-semibold">{{ players.length }}/4</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">실제 플레이어:</span>
                  <span class="text-lexio-text font-semibold">{{ realPlayerCount }}명</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">CPU:</span>
                  <span class="text-lexio-text font-semibold">{{ cpuPlayerCount }}명</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">상태:</span>
                  <span class="text-green-400 font-semibold">대기 중</span>
                </div>
              </div>
              
              <div v-if="isRoomOwner" class="mt-6 p-4 bg-lexio-bg rounded-lg border border-gray-600">
                <div class="text-sm text-lexio-text-muted mb-2">방장 기능</div>
                <div class="text-xs text-gray-400 space-y-1">
                  <div>• 플레이어 추방</div>
                  <div>• CPU 추가/제거</div>
                  <div>• 게임 시작</div>
                </div>
              </div>
            </div>
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
import { useGameStore } from '../store/game.js'
import RoomCreatePanel from '../components/RoomCreatePanel.vue'
import RoomList from '../components/RoomList.vue'
import GameBoard from '../components/GameBoard.vue'
import PlayerPanel from '../components/PlayerPanel.vue'
import CardDeck from '../components/CardDeck.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const gameStore = useGameStore()

const roomId = computed(() => route.params.roomId)
const search = ref('')

// 게임 방 관련 상태
const room = ref(null)
const players = ref([])
const loading = ref(false)
const error = ref('')

// 실시간 구독
let roomSubscription = null
let playersSubscription = null
let gameSubscription = null
let turnsSubscription = null

// 계산된 속성들
const isRoomOwner = computed(() => {
  return room.value?.created_by === auth.user?.id
})

const gamePlayers = computed(() => {
  return players.value.map(player => ({
    id: player.id,
    name: player.email,
    handCount: player.handCount || 0,
    isTurn: gameStore.currentTurnUserId === player.id,
    isMe: player.id === auth.user?.id,
    isOnline: true // 실제로는 온라인 상태를 추적해야 함
  }))
})

const lastPlayedPlayerName = computed(() => {
  if (!gameStore.lastPlayedPlayerId) return ''
  const player = players.value.find(p => p.id === gameStore.lastPlayedPlayerId)
  return player?.email || 'Unknown'
})

const totalRemainingCards = computed(() => {
  return gamePlayers.value.reduce((total, player) => total + player.handCount, 0)
})

// CPU 플레이어 관련 computed
const isCpuPlayer = (playerId) => {
  return typeof playerId === 'string' && playerId.startsWith('cpu')
}

const realPlayerCount = computed(() => {
  return players.value.filter(p => !isCpuPlayer(p.id)).length
})

const cpuPlayerCount = computed(() => {
  return players.value.filter(p => isCpuPlayer(p.id)).length
})

const hasCpuPlayers = computed(() => {
  return cpuPlayerCount.value > 0
})

const canStartGame = computed(() => {
  return players.value.length >= 2
})

// 유틸리티 함수
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

onMounted(async () => {
  if (roomId.value) {
    await loadRoom()
    setupRealtimeSubscriptions()
  }
})

onUnmounted(() => {
  if (roomSubscription) roomSubscription.unsubscribe()
  if (playersSubscription) playersSubscription.unsubscribe()
  if (gameSubscription) gameSubscription.unsubscribe()
  if (turnsSubscription) turnsSubscription.unsubscribe()
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
    console.error('방 로드 오류:', err)
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
    players.value = data.map(p => {
      const isCpu = p.user_id.startsWith('cpu')
      return {
        id: p.user_id,
        email: isCpu ? p.user_id.toUpperCase() : (p.profiles?.email || 'Unknown'),
        joinedAt: p.joined_at,
        handCount: 0 // 게임이 시작되면 업데이트됨
      }
    })
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(data.length)
  }
}

async function updateRoomPlayerCount(count) {
  await supabase
    .from('lo_rooms')
    .update({ players: count })
    .eq('id', roomId.value)
}

async function loadGameData() {
  // 게임 데이터 로드
  const { data: gameData, error: gameError } = await supabase
    .from('lo_games')
    .select('*')
    .eq('room_id', roomId.value)
    .eq('status', 'playing')
    .single()
  
  if (!gameError && gameData) {
    // 게임 store 초기화
    gameStore.initializeGame(gameData, gamePlayers.value, auth.user?.id)
    
    // 내 카드 로드
    await loadMyHand(gameData.id)
    
    // 플레이어들의 카드 수 업데이트
    await updatePlayerHandCounts(gameData.id)
    
    // 마지막 턴 정보 로드
    await loadLastTurn(gameData.id)
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
    gameStore.setMyHand(data)
  }
}

async function updatePlayerHandCounts(gameId) {
  const { data, error: err } = await supabase
    .from('lo_cards')
    .select('owner_id, in_hand')
    .eq('game_id', gameId)
    .eq('in_hand', true)
  
  if (!err && data) {
    const handCounts = data.reduce((counts, card) => {
      counts[card.owner_id] = (counts[card.owner_id] || 0) + 1
      return counts
    }, {})
    
    // 플레이어들의 카드 수 업데이트
    players.value = players.value.map(player => ({
      ...player,
      handCount: handCounts[player.id] || 0
    }))
  }
}

async function loadLastTurn(gameId) {
  const { data, error: err } = await supabase
    .from('lo_game_turns')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (!err && data && data[0]) {
    gameStore.updateLastPlay(data[0])
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
        await loadPlayers()
        
        // 방에 플레이어가 없으면 방 삭제
        if (players.value.length === 0) {
          await supabase.from('lo_rooms').delete().eq('id', roomId.value)
          router.push('/game')
        }
        return
      }
      
      if (payload.eventType === 'INSERT') {
        // 새 플레이어 추가 (CPU 또는 실제 플레이어)
        await loadPlayers()
        return
      }
      
      await loadPlayers()
    })
    .subscribe()

  // 게임 상태 실시간 구독
  gameSubscription = supabase
    .channel('game-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_games',
      filter: `room_id=eq.${roomId.value}`
    }, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await loadGameData()
      }
    })
    .subscribe()

  // 턴 정보 실시간 구독
  turnsSubscription = supabase
    .channel('turns-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'lo_game_turns',
      filter: `game_id=eq.${gameStore.gameId}`
    }, async (payload) => {
      gameStore.updateLastPlay(payload.new)
      await updatePlayerHandCounts(gameStore.gameId)
    })
    .subscribe()
}

async function startGame() {
  if (!isRoomOwner.value || !canStartGame.value) return
  
  try {
    // 게임 생성
    const { data: gameData, error: gameError } = await supabase
      .from('lo_games')
      .insert({
        room_id: roomId.value,
        status: 'playing',
        current_turn_user_id: players.value[0]?.id,
        created_by: auth.user?.id
      })
      .select()
      .single()
    
    if (gameError) throw gameError
    
    // 카드 분배 (CPU 포함)
    await distributeCards(gameData.id)
    
    // 방 상태 업데이트
    await supabase
      .from('lo_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId.value)
    
  } catch (err) {
    console.error('게임 시작 오류:', err)
    error.value = '게임을 시작할 수 없습니다.'
  }
}

async function kickPlayer(playerId) {
  if (!isRoomOwner.value || playerId === auth.user?.id) return
  
  try {
    // 플레이어를 방에서 제거
    const { error } = await supabase
      .from('lo_room_players')
      .delete()
      .eq('room_id', roomId.value)
      .eq('user_id', playerId)
    
    if (error) throw error
    
    // 플레이어 목록 새로고침
    await loadPlayers()
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
  } catch (err) {
    console.error('플레이어 추방 오류:', err)
    error.value = '플레이어를 추방할 수 없습니다.'
  }
}

async function addCpu() {
  if (!isRoomOwner.value || players.value.length >= 4) return
  
  try {
    const cpuId = `cpu${cpuPlayerCount.value + 1}`
    const cpuPlayer = {
      id: cpuId,
      email: `CPU${cpuPlayerCount.value + 1}`,
      joinedAt: new Date().toISOString(),
      handCount: 0
    }
    
    // DB에 CPU 추가
    await supabase.from('lo_room_players').insert({
      room_id: roomId.value,
      user_id: cpuId
    })
    
    // 로컬 상태에 추가
    players.value.push(cpuPlayer)
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
  } catch (err) {
    console.error('CPU 추가 오류:', err)
    error.value = 'CPU를 추가할 수 없습니다.'
  }
}

async function removeCpu() {
  if (!isRoomOwner.value || !hasCpuPlayers.value) return
  
  try {
    // 가장 마지막 CPU 찾기
    const lastCpu = players.value.filter(p => isCpuPlayer(p.id)).pop()
    if (!lastCpu) return
    
    // DB에서 CPU 제거
    await supabase
      .from('lo_room_players')
      .delete()
      .eq('room_id', roomId.value)
      .eq('user_id', lastCpu.id)
    
    // 로컬 상태에서 제거
    players.value = players.value.filter(p => p.id !== lastCpu.id)
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
  } catch (err) {
    console.error('CPU 제거 오류:', err)
    error.value = 'CPU를 제거할 수 없습니다.'
  }
}

async function distributeCards(gameId) {
  // 간단한 카드 분배 (실제로는 더 복잡한 로직 필요)
  const suits = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  
  const cards = []
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({ suit, rank })
    }
  }
  
  // 카드 섞기
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  
  // 플레이어들에게 카드 분배
  const playerIds = players.value.map(p => p.id)
  for (let i = 0; i < cards.length; i++) {
    const playerId = playerIds[i % playerIds.length]
    const card = cards[i]
    
    await supabase
      .from('lo_cards')
      .insert({
        game_id: gameId,
        owner_id: playerId,
        suit: card.suit,
        rank: card.rank,
        in_hand: true
      })
  }
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

async function retryLoad() {
  error.value = ''
  await loadRoom()
}
</script> 