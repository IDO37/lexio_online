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
            <span class="text-sm text-lexio-text-muted">({{ players.length }}/{{ room.max_players || 4 }})</span>
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
          <div class="text-yellow-300 text-sm">{{ startGameWarning }}</div>
        </div>
        
        <!-- 게임 상태 디버깅 (개발용) -->
        <div v-if="room.status === 'playing'" class="bg-blue-600 bg-opacity-20 border border-blue-600 rounded-lg p-4 mb-4">
          <div class="text-blue-400 font-semibold mb-2">게임 상태 디버깅</div>
          <div class="text-blue-300 text-xs">
            <pre>{{ JSON.stringify(gameStatusDebug, null, 2) }}</pre>
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
              :turnTransitioning="gameStore.turnTransitioning"
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
              :currentPlayerName="gameStore.currentTurnUserId ? (gamePlayers.value?.find(p => p.id === gameStore.currentTurnUserId)?.name || 'Unknown') : 'Unknown'"
              :isFirstTurn="!gameStore.lastPlayedCombo"
              :turnTransitioning="gameStore.turnTransitioning"
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
                    :disabled="players.length >= (room.max_players || 4)"
                    class="bg-blue-600 text-white font-semibold rounded-lg px-3 py-1 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="players.length < (room.max_players || 4) ? 'hover:bg-blue-700' : ''"
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
                  <div v-if="isRoomOwner && !player.isMe && player.id !== room.created_by" class="flex gap-1">
                    <button
                      @click="kickPlayer(player.id)"
                      class="bg-red-600 text-white text-xs px-2 py-1 rounded transition hover:bg-red-700"
                      :title="`${player.email}을(를) 방에서 추방합니다`"
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
                  <span class="text-lexio-text font-semibold">{{ players.length }}/{{ room.max_players || 4 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-lexio-text-muted">상태:</span>
                  <span class="text-green-400 font-semibold">대기 중</span>
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
    name: player.id.startsWith('cpu') ? player.name || player.email : player.email,
    handCount: player.handCount || 0,
    isTurn: gameStore.currentTurnUserId === player.id,
    isMe: player.id === auth.user?.id,
    isOnline: true // 실제로는 온라인 상태를 추적해야 함
  }))
})

const lastPlayedPlayerName = computed(() => {
  if (!gameStore.lastPlayedPlayerId) return ''
  const player = players.value.find(p => p.id === gameStore.lastPlayedPlayerId)
  return player?.name || player?.email || 'Unknown'
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

// 게임 시작 조건을 방 설정 인원수에 맞게 수정
const canStartGame = computed(() => {
  return players.value.length >= (room.value?.max_players || 4)
})

// 게임 상태 디버깅을 위한 computed
const gameStatusDebug = computed(() => {
  return {
    roomStatus: room.value?.status,
    gameStoreStatus: gameStore.status,
    gameId: gameStore.gameId,
    roomId: gameStore.roomId,
    currentTurnUserId: gameStore.currentTurnUserId,
    myId: gameStore.myId,
    myHandCount: gameStore.myHand.length,
    isMyTurn: gameStore.isMyTurn,
    playersCount: gameStore.players.length,
    players: gameStore.players.map(p => ({ id: p.id, name: p.name || p.email })),
    gamePlayersCount: players.value.length,
    currentPlayerName: players.value.find(p => p.id === gameStore.currentTurnUserId)?.name || 
                      players.value.find(p => p.id === gameStore.currentTurnUserId)?.email || 'Unknown'
  }
})

// 게임 시작 조건 경고 메시지도 수정
const startGameWarning = computed(() => {
  const maxPlayers = room.value?.max_players || 4
  const currentPlayers = players.value.length
  if (currentPlayers < maxPlayers) {
    return `최소 ${maxPlayers}명의 플레이어가 필요합니다. (현재: ${currentPlayers}명)`
  }
  return ''
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
    // 방 로드 완료 후 실시간 구독 설정
    setTimeout(() => {
      console.log('실시간 구독 설정 시작')
      setupRealtimeSubscriptions()
    }, 1000)
  }
})

onUnmounted(() => {
  if (roomSubscription) roomSubscription.unsubscribe()
  if (playersSubscription) playersSubscription.unsubscribe()
  if (gameSubscription) gameSubscription.unsubscribe()
  if (turnsSubscription) turnsSubscription.unsubscribe()
})

// CPU 턴 자동 플레이
watch(() => gameStore.currentTurnUserId, async (newTurnUserId) => {
  if (newTurnUserId && newTurnUserId.startsWith('cpu') && isRoomOwner.value) {
    // 1.5초 지연 후 CPU 플레이 호출
    await new Promise(resolve => setTimeout(resolve, 1500));
    await gameStore.cpuPlay(newTurnUserId);
  }
}, { immediate: true });

async function loadRoom() {
  if (!roomId.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('방 로드 시작:', roomId.value)
    
    // 방 정보 로드 (재시도 로직 포함)
    let roomData = null
    let roomError = null
    let retryCount = 0
    
    while (retryCount < 5) {
      const { data, error } = await supabase
        .from('lo_rooms')
        .select('*')
        .eq('id', roomId.value)
        .single()
      
      if (data && !error) {
        roomData = data
        roomError = null
        console.log('방 정보 로드 성공:', roomData.id)
        break
      }
      
      roomError = error
      console.log(`방 정보 로드 재시도 ${retryCount + 1}/5:`, error?.message)
      await new Promise(resolve => setTimeout(resolve, 500))
      retryCount++
    }
    
    if (roomError || !roomData) {
      console.error('방을 찾을 수 없습니다:', roomError)
      error.value = '방을 찾을 수 없습니다.'
      return
    }
    
    room.value = roomData
    
    // 플레이어 목록 로드
    await loadPlayers()
    
    // 방 생성자가 플레이어 목록에 없으면 자동으로 추가
    if (roomData.created_by && !players.value.find(p => p.id === roomData.created_by)) {
      console.log('방 생성자를 플레이어로 추가합니다:', roomData.created_by)
      await addRoomCreatorAsPlayer(roomData.created_by)
      // 플레이어 목록을 다시 로드하여 정렬된 상태 확인
      await loadPlayers()
    }
    
    // 게임 정보 로드 (진행 중인 경우)
    if (roomData.status === 'playing') {
      await loadGameData()
    }
    
    console.log('방 로드 완료')
    
  } catch (err) {
    console.error('방 로드 오류:', err)
    error.value = '방 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadPlayers() {
  try {
    // 먼저 플레이어 목록을 가져옴
    const { data: playerData, error: playerError } = await supabase
      .from('lo_room_players')
      .select('*')
      .eq('room_id', roomId.value)
      .order('joined_at', { ascending: true })
    
    if (playerError) {
      console.error('플레이어 목록 로드 오류:', playerError)
      return
    }
    
    if (!playerData) {
      console.log('플레이어 데이터가 없습니다.')
      players.value = []
      return
    }
    
    console.log('플레이어 목록 로드:', playerData.length, '명')
    
    // 실제 사용자 ID들만 추출
    const realUserIds = playerData
      .filter(p => !p.user_id.startsWith('cpu'))
      .map(p => p.user_id)
    
    // 한 번에 모든 프로필 정보 가져오기
    let profileMap = {}
    if (realUserIds.length > 0) {
      console.log('프로필 정보를 가져올 사용자 ID들:', realUserIds)
      
      // profiles 테이블이 없을 수 있으므로 사용자 ID를 기반으로 이름 생성
      console.log('프로필 정보를 사용자 ID 기반으로 생성합니다.')
      realUserIds.forEach(userId => {
        profileMap[userId] = `User_${userId.slice(0, 8)}`
      })
    }
    
    // 플레이어 목록 생성
    let playerList = playerData.map(player => {
      const isCpu = player.user_id.startsWith('cpu')
      
      return {
        id: player.user_id,
        email: isCpu ? player.user_id.toUpperCase() : (profileMap[player.user_id] || `User_${player.user_id.slice(0, 8)}`),
        joinedAt: player.joined_at,
        handCount: 0
      }
    })
    
    // 방 생성자를 첫 번째로 정렬
    if (room.value?.created_by) {
      const creatorIndex = playerList.findIndex(p => p.id === room.value.created_by)
      console.log('방 생성자 ID:', room.value.created_by, '찾은 인덱스:', creatorIndex)
      
      if (creatorIndex > 0) {
        const creator = playerList.splice(creatorIndex, 1)[0]
        playerList.unshift(creator)
        console.log('방 생성자를 첫 번째로 이동:', creator.email)
      } else if (creatorIndex === 0) {
        console.log('방 생성자가 이미 첫 번째 위치에 있습니다.')
      } else {
        console.log('방 생성자를 플레이어 목록에서 찾을 수 없습니다.')
      }
    }
    
    players.value = playerList
    console.log('최종 플레이어 목록:', players.value.map(p => `${p.email} (${p.id})`))
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(playerData.length)
    
  } catch (err) {
    console.error('플레이어 목록 로드 오류:', err)
    players.value = []
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
  console.log('🃏 플레이어 카드 수 업데이트 시작:', gameId)
  
  const { data, error: err } = await supabase
    .from('lo_cards')
    .select('owner_id, in_hand')
    .eq('game_id', gameId)
    .eq('in_hand', true)
  
  console.log('📊 DB에서 가져온 카드 데이터:', data)
  console.log('❌ DB 오류:', err)
  
  if (!err && data) {
    const handCounts = data.reduce((counts, card) => {
      counts[card.owner_id] = (counts[card.owner_id] || 0) + 1
      return counts
    }, {})
    
    console.log('📈 실제 플레이어 카드 수:', handCounts)
    
    // 플레이어들의 카드 수 업데이트
    players.value = players.value.map(player => {
      let handCount = handCounts[player.id] || 0
      
      // CPU 플레이어인 경우 gameStore에서 카드 수 가져오기
      if (player.id.startsWith('cpu')) {
        const cpuCards = gameStore.cpuHands[player.id] || []
        handCount = cpuCards.length
        console.log(`🤖 CPU ${player.id} 카드 수:`, handCount)
      }
      
      console.log(`👤 ${player.email} (${player.id}) 카드 수:`, handCount)
      
      return {
        ...player,
        handCount: handCount
      }
    })
    
    console.log('✅ 업데이트된 플레이어 목록:', players.value.map(p => ({ name: p.email, handCount: p.handCount })))
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
  console.log('🔌 실시간 구독 설정 시작')
  console.log('📋 구독 설정 정보:', {
    roomId: roomId.value,
    gameId: gameStore.gameId,
    playersCount: gameStore.players.length
  })
  
  // 방 정보 실시간 구독
  roomSubscription = supabase
    .channel('room-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_rooms',
      filter: `id=eq.${roomId.value}`
    }, (payload) => {
      console.log('🏠 방 정보 변경 감지:', payload)
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
      console.log('👥 플레이어 목록 변경 감지:', payload)
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
        // 새 실제 플레이어 추가 (CPU는 로컬에서만 관리)
        await loadPlayers()
        return
      }
      
      if (payload.eventType === 'UPDATE') {
        // 플레이어 정보 업데이트
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
      console.log('🎮 게임 상태 변경 감지:', payload)
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
      console.log('🔄 턴 정보 변경 감지:', payload)
      gameStore.updateLastPlay(payload.new)
      await updatePlayerHandCounts(gameStore.gameId)
      
      // 턴 변경 처리
      if (payload.new && payload.new.player_id) {
        // turn_complete 액션인 경우에만 턴 변경 처리
        if (payload.new.action === 'turn_complete') {
          console.log('🔄 실시간 턴 변경 감지:', payload.new)
          console.log('📋 현재 게임 상태:', {
            currentTurnUserId: gameStore.currentTurnUserId,
            players: gameStore.players.map(p => ({ id: p.id, name: p.email }))
          })
          
          // 현재 플레이어가 턴을 완료했으므로, 다음 플레이어로 턴 넘기기
          const currentIndex = gameStore.players.findIndex(p => p.id === payload.new.player_id)
          if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % gameStore.players.length
            const nextPlayerId = gameStore.players[nextIndex].id
            
            console.log('👥 턴 변경 계산:', {
              currentIndex,
              nextIndex,
              currentPlayerId: payload.new.player_id,
              nextPlayerId,
              totalPlayers: gameStore.players.length
            })
            
            gameStore.setCurrentTurnUserId(nextPlayerId)
            
            console.log('턴 변경:', payload.new.player_id, '->', nextPlayerId)
            
            // CPU 턴이면 자동 플레이
            if (nextPlayerId.startsWith('cpu')) {
              console.log('🤖 CPU 턴 감지, 자동 플레이 예약:', nextPlayerId)
              // CPU는 이미 자신의 턴에서 플레이/패스를 완료했으므로 추가 호출 불필요
              console.log('✅ CPU 턴 완료됨, 추가 플레이 호출 없음')
            }
          } else {
            console.log('⚠️ 턴 변경 실패: 플레이어를 찾을 수 없음:', payload.new.player_id)
          }
        }
      }
    })
    .subscribe()
    
  console.log('✅ 실시간 구독 설정 완료')
}

async function startGame() {
  if (!isRoomOwner.value || !canStartGame.value) return;

  try {
    const { data: gameData, error: gameError } = await supabase
      .from('lo_games')
      .insert({ room_id: roomId.value, created_by: auth.user.id })
      .select()
      .single();

    if (gameError) throw gameError;

    await distributeCards(gameData.id);

    const firstTurnPlayerId = await findPlayerWithCloud3(gameData.id);

    await supabase
      .from('lo_games')
      .update({ current_turn_user_id: firstTurnPlayerId, status: 'playing', started_at: new Date().toISOString() })
      .eq('id', gameData.id);

    await supabase
      .from('lo_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId.value);

  } catch (err) {
    console.error('게임 시작 오류:', err);
    error.value = '게임을 시작할 수 없습니다: ' + err.message;
  }
}

async function kickPlayer(playerId) {
  // 방장이 아니거나 자신을 추방하려는 경우
  if (!isRoomOwner.value || playerId === auth.user?.id) {
    console.log('추방 권한이 없거나 자신을 추방하려고 합니다.')
    return
  }
  
  // 방장을 추방하려는 경우
  if (playerId === room.value?.created_by) {
    console.log('방장은 추방할 수 없습니다.')
    error.value = '방장은 추방할 수 없습니다.'
    return
  }
  
  // CPU 플레이어인 경우
  if (playerId.startsWith('cpu')) {
    console.log('CPU 플레이어는 추방할 수 없습니다. CPU 제거 기능을 사용하세요.')
    error.value = 'CPU 플레이어는 추방할 수 없습니다.'
    return
  }
  
  try {
    console.log('플레이어 추방 시작:', playerId)
    
    // 플레이어를 방에서 제거
    const { error } = await supabase
      .from('lo_room_players')
      .delete()
      .eq('room_id', roomId.value)
      .eq('user_id', playerId)
    
    if (error) {
      console.error('플레이어 추방 DB 오류:', error)
      throw error
    }
    
    console.log('플레이어 추방 성공:', playerId)
    
    // 플레이어 목록 새로고침
    await loadPlayers()
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
    // 성공 메시지
    console.log('플레이어 추방 완료')
    
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
      name: `CPU${cpuPlayerCount.value + 1}`,
      joinedAt: new Date().toISOString(),
      handCount: 0
    }
    
    // CPU는 실제 DB에 추가하지 않고 로컬에서만 관리
    // (실제 사용자가 아니므로 DB에 저장하면 오류 발생)
    players.value.push(cpuPlayer)
    
    // 방의 플레이어 수 업데이트 (CPU 포함)
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
    
    // CPU는 로컬에서만 제거 (DB에 저장하지 않았으므로)
    players.value = players.value.filter(p => p.id !== lastCpu.id)
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
  } catch (err) {
    console.error('CPU 제거 오류:', err)
    error.value = 'CPU를 제거할 수 없습니다.'
  }
}

async function loadMyCards(gameId) {
  try {
    console.log('내 카드 로드 시작:', gameId, auth.user?.id)
    
    const { data: cards, error } = await supabase
      .from('lo_cards')
      .select('*')
      .eq('game_id', gameId)
      .eq('owner_id', auth.user?.id)
      .eq('in_hand', true)
    
    if (error) {
      console.error('내 카드 로드 오류:', error)
      return
    }
    
    if (cards && cards.length > 0) {
      // DB 형식을 게임 형식으로 변환
      const myCards = cards.map(card => ({
        suit: card.suit,
        number: parseInt(card.rank), // CPU 카드와 동일한 형식으로 통일
        rank: card.rank // 호환성을 위해 유지
      }))
      
      // 카드를 약한 순서부터 강한 순서로 정렬
      const sortedCards = myCards.sort((a, b) => {
        // 먼저 숫자로 정렬 (3이 가장 낮음, 2가 가장 높음)
        const aNumber = parseInt(a.rank)
        const bNumber = parseInt(b.rank)
        if (aNumber !== bNumber) {
          return aNumber - bNumber
        }
        // 숫자가 같으면 문양으로 정렬 (cloud < star < moon < sun)
        const suitOrder = { cloud: 1, star: 2, moon: 3, sun: 4 }
        return suitOrder[a.suit] - suitOrder[b.suit]
      })
      
      gameStore.setMyHand(sortedCards)
      console.log('내 카드 로드 완료:', sortedCards.length, '장')
      console.log('내 카드 목록 (정렬됨):', sortedCards.map(c => `${c.suit} ${c.rank}`))
    } else {
      console.log('내 카드가 없습니다.')
      gameStore.setMyHand([])
    }
  } catch (err) {
    console.error('내 카드 로드 중 예외:', err)
  }
}

function toCpuUUID(cpuId) {
  return `00000000-0000-0000-0000-${cpuId.padStart(12, '0')}`;
}

async function distributeCards(gameId) {
  const playerCount = players.value.length;
  const suits = ['cloud', 'star', 'moon', 'sun'];
  let numbers, totalCards;

  if (playerCount === 3) {
    numbers = Array.from({ length: 9 }, (_, i) => i + 1);
    totalCards = 36;
  } else if (playerCount === 5) {
    numbers = Array.from({ length: 15 }, (_, i) => i + 1);
    totalCards = 60;
  } else { // 기본 4인
    numbers = Array.from({ length: 13 }, (_, i) => i + 1);
    totalCards = 52;
  }

  // 카드 셔플
  const tiles = suits.flatMap(suit => numbers.map(number => ({ suit, number })));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  const allPlayerIds = players.value.map(p => p.id);
  const realPlayerIds = allPlayerIds.filter(id => !id.startsWith('cpu'));
  const cpuPlayerIds = allPlayerIds.filter(id => id.startsWith('cpu'));

  const cardsToInsert = [];
  const cpuHands = Object.fromEntries(cpuPlayerIds.map(id => [id, []]));

  for (let i = 0; i < totalCards; i++) {
    const playerId = allPlayerIds[i % playerCount];
    const tile = tiles[i];

    const card = {
      game_id: gameId,
      suit: tile.suit,
      rank: tile.number.toString(),
      in_hand: true,
    };

    if (realPlayerIds.includes(playerId)) {
      card.owner_id = playerId;
      cardsToInsert.push(card);
    } else if (cpuPlayerIds.includes(playerId)) {
      const uuid = toCpuUUID(playerId); // CPU용 UUID
      card.owner_id = uuid;
      cardsToInsert.push(card);
      cpuHands[playerId].push(tile); // CPU 로컬 저장용
    }
  }

  const { error } = await supabase.from('lo_cards').insert(cardsToInsert);
  if (error) {
    console.error('카드 대량 삽입 오류:', error);
    throw error;
  }

  for (const cpuId in cpuHands) {
    gameStore.setCpuHand(cpuId, cpuHands[cpuId]);
  }

  console.log(`${playerCount}인 게임: ${totalCards}장 분배 완료`);
}



async function leaveRoom() {
  if (!auth.user || !roomId.value) return
  
  try {
    // 방장이 나가는 경우 방 삭제
    if (isRoomOwner.value) {
      await supabase.from('lo_rooms').delete().eq('id', roomId.value)
    } else {
      // 일반 플레이어는 방에서 제거
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

async function addRoomCreatorAsPlayer(creatorId) {
  try {
    console.log('방 생성자 플레이어 추가 시작:', creatorId)
    
    // 이미 플레이어로 추가되어 있는지 확인
    const { data: existingPlayer, error: checkError } = await supabase
      .from('lo_room_players')
      .select('*')
      .eq('room_id', roomId.value)
      .eq('user_id', creatorId)
      .single()
    
    if (existingPlayer && !checkError) {
      console.log('방 생성자가 이미 플레이어로 추가되어 있습니다.')
      return
    }
    
    // 방 생성자의 프로필 정보 (사용자 ID 기반으로 생성)
    let creatorEmail = `User_${creatorId.slice(0, 8)}`
    console.log('방 생성자 이메일 생성:', creatorEmail)
    
    // 방 생성자를 플레이어로 추가
    const { error: insertError } = await supabase
      .from('lo_room_players')
      .insert({
        room_id: roomId.value,
        user_id: creatorId,
        joined_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('방 생성자 플레이어 추가 오류:', insertError)
      return
    }
    
    console.log('방 생성자가 DB에 성공적으로 추가되었습니다.')
    
    // 로컬 상태에 추가
    const creatorPlayer = {
      id: creatorId,
      email: creatorEmail,
      joinedAt: new Date().toISOString(),
      handCount: 0
    }
    
    // 첫 번째 위치에 추가
    players.value.unshift(creatorPlayer)
    
    // 방의 플레이어 수 업데이트
    await updateRoomPlayerCount(players.value.length)
    
    console.log('방 생성자가 성공적으로 플레이어로 추가되었습니다. 현재 플레이어 수:', players.value.length)
    
  } catch (err) {
    console.error('방 생성자 플레이어 추가 오류:', err)
  }
}

async function findPlayerWithCloud3(gameId) {
  try {
    console.log('🔍 cloud 3 플레이어 검색 시작:', gameId)
    
    // cloud 3을 가진 실제 플레이어 찾기 (렉시오 규칙)
    const { data, error } = await supabase
      .from('lo_cards')
      .select('owner_id')
      .eq('game_id', gameId)
      .eq('suit', 'cloud')
      .eq('rank', '3')
      .eq('in_hand', true)
    
    console.log('📊 cloud 3 검색 결과:', { data, error })
    
    if (error) {
      console.error('cloud 3 검색 오류:', error)
      // 오류 발생 시 첫 번째 실제 플레이어로 설정
      const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
      console.log('⚠️ 오류로 인한 대체 플레이어:', firstRealPlayer?.id)
      return firstRealPlayer?.id || players.value[0]?.id
    }
    
    if (!data || data.length === 0) {
      console.log('cloud 3을 가진 플레이어가 없습니다.')
      console.log('📋 현재 플레이어 목록:', players.value.map(p => ({ id: p.id, email: p.email })))
      // cloud 3이 없으면 첫 번째 실제 플레이어로 설정
      const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
      console.log('⚠️ cloud 3 없음으로 인한 대체 플레이어:', firstRealPlayer?.id)
      return firstRealPlayer?.id || players.value[0]?.id
    }
    
    // 첫 번째 결과 사용 (single() 대신 배열의 첫 번째 요소)
    const ownerId = data[0].owner_id
    
    // cloud 3을 가진 플레이어가 누구든 그 플레이어가 첫 턴을 가짐 (렉시오 규칙)
    console.log('cloud 3을 가진 플레이어:', ownerId, '이(가) 첫 턴을 가집니다.')
    return ownerId
    
  } catch (err) {
    console.error('cloud 3 플레이어 찾기 오류:', err)
    // 오류 발생 시 첫 번째 실제 플레이어로 설정
    const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
    console.log('⚠️ 예외로 인한 대체 플레이어:', firstRealPlayer?.id)
    return firstRealPlayer?.id || players.value[0]?.id
  }
}
</script> 