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
              :disabled="!canStartGame || dealing"
              class="bg-highlight-red text-white font-semibold rounded-lg px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              :class="canStartGame && !dealing ? 'hover:bg-highlight-red-dark' : ''"
            >
              {{ dealing ? '분배중...' : '게임 시작' }}
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
        </div> <!-- /대기실 -->
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

// 상태
const room = ref(null)
const players = ref([])
const loading = ref(false)
const error = ref('')
const dealing = ref(false) // ✅ 중복 분배 방지용 플래그

// 실시간 구독 핸들
let roomSubscription = null
let playersSubscription = null
let gameSubscription = null
let turnsSubscription = null

// 계산된 속성들
const isRoomOwner = computed(() => room.value?.created_by === auth.user?.id)

const gamePlayers = computed(() => {
  return players.value.map(player => ({
    id: player.id,
    name: player.id.startsWith('cpu') ? player.name || player.email : player.email,
    handCount: player.handCount || 0,
    isTurn: gameStore.currentTurnUserId === player.id,
    isMe: player.id === auth.user?.id,
    isOnline: true
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

const isCpuPlayer = (playerId) => typeof playerId === 'string' && playerId.startsWith('cpu')

const realPlayerCount = computed(() => players.value.filter(p => !isCpuPlayer(p.id)).length)
const cpuPlayerCount  = computed(() => players.value.filter(p =>  isCpuPlayer(p.id)).length)
const hasCpuPlayers   = computed(() => cpuPlayerCount.value > 0)

const canStartGame = computed(() => players.value.length >= (room.value?.max_players || 4))

const gameStatusDebug = computed(() => ({
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
}))

const startGameWarning = computed(() => {
  const maxPlayers = room.value?.max_players || 4
  const currentPlayers = players.value.length
  if (currentPlayers < maxPlayers) {
    return `최소 ${maxPlayers}명의 플레이어가 필요합니다. (현재: ${currentPlayers}명)`
  }
  return ''
})

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  if (roomId.value) {
    await loadRoom()
    setTimeout(() => {
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

// CPU 자동 플레이
watch(() => gameStore.currentTurnUserId, async (newTurnUserId) => {
  if (newTurnUserId && newTurnUserId.startsWith('cpu') && isRoomOwner.value) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await gameStore.cpuPlay(newTurnUserId);
  }
}, { immediate: true });

async function loadRoom() {
  if (!roomId.value) return
  loading.value = true
  error.value = ''
  try {
    let roomData = null
    let retryCount = 0
    while (retryCount < 5) {
      const { data, error } = await supabase
        .from('lo_rooms')
        .select('*')
        .eq('id', roomId.value)
        .single()
      if (data && !error) { roomData = data; break }
      await new Promise(r => setTimeout(r, 500))
      retryCount++
    }
    if (!roomData) { error.value = '방을 찾을 수 없습니다.'; return }
    room.value = roomData
    await loadPlayers()
    if (roomData.created_by && !players.value.find(p => p.id === roomData.created_by)) {
      await addRoomCreatorAsPlayer(roomData.created_by)
      await loadPlayers()
    }
    if (roomData.status === 'playing') await loadGameData()
  } catch (err) {
    console.error('방 로드 오류:', err)
    error.value = '방 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadPlayers() {
  try {
    const { data: playerData, error: playerError } = await supabase
      .from('lo_room_players')
      .select('*')
      .eq('room_id', roomId.value)
      .order('joined_at', { ascending: true })
    if (playerError) { console.error('플레이어 목록 로드 오류:', playerError); return }
    if (!playerData) { players.value = []; return }

    const realUserIds = playerData.filter(p => !p.user_id.startsWith('cpu')).map(p => p.user_id)
    const profileMap = {}
    // profiles 테이블이 없을 수도 있어서 임시 라벨링
    realUserIds.forEach(uid => { profileMap[uid] = `User_${uid.slice(0, 8)}` })

    let playerList = playerData.map(p => {
      const isCpu = p.user_id.startsWith('cpu')
      return {
        id: p.user_id,
        email: isCpu ? p.user_id.toUpperCase() : (profileMap[p.user_id] || `User_${p.user_id.slice(0, 8)}`),
        joinedAt: p.joined_at,
        handCount: 0
      }
    })

    if (room.value?.created_by) {
      const idx = playerList.findIndex(p => p.id === room.value.created_by)
      if (idx > 0) {
        const creator = playerList.splice(idx, 1)[0]
        playerList.unshift(creator)
      }
    }

    players.value = playerList
    await updateRoomPlayerCount(playerData.length)
  } catch (err) {
    console.error('플레이어 목록 로드 오류:', err)
    players.value = []
  }
}

async function updateRoomPlayerCount(count) {
  await supabase.from('lo_rooms').update({ players: count }).eq('id', roomId.value)
}

async function loadGameData() {
  const { data: gameData, error: gameError } = await supabase
    .from('lo_games')
    .select('*')
    .eq('room_id', roomId.value)
    .eq('status', 'playing')
    .single()
  if (!gameError && gameData) {
    gameStore.initializeGame(gameData, gamePlayers.value, auth.user?.id)
    await loadMyHand(gameData.id)
    await updatePlayerHandCounts(gameData.id)
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
  if (!err && data) gameStore.setMyHand(data)
}

async function updatePlayerHandCounts(gameId) {
  const { data, error: err } = await supabase
    .from('lo_cards')
    .select('owner_id, in_hand')
    .eq('game_id', gameId)
    .eq('in_hand', true)
  if (!err && data) {
    const handCounts = data.reduce((acc, c) => {
      acc[c.owner_id] = (acc[c.owner_id] || 0) + 1
      return acc
    }, {})
    players.value = players.value.map(player => {
      let handCount = handCounts[player.id] || 0
      if (player.id.startsWith('cpu')) {
        handCount = (gameStore.cpuHands[player.id] || []).length
      }
      return { ...player, handCount }
    })
  }
}

async function loadLastTurn(gameId) {
  const { data, error: err } = await supabase
    .from('lo_game_turns')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!err && data && data[0]) gameStore.updateLastPlay(data[0])
}

function setupRealtimeSubscriptions() {
  // 방
  roomSubscription = supabase
    .channel('room-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lo_rooms', filter: `id=eq.${roomId.value}` },
      (payload) => {
        if (payload.eventType === 'DELETE') { router.push('/game'); return }
        room.value = payload.new
        if (payload.new.status === 'playing') loadGameData()
      }
    )
    .subscribe()

  // 플레이어
  playersSubscription = supabase
    .channel('players-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lo_room_players', filter: `room_id=eq.${roomId.value}` },
      async () => { await loadPlayers() }
    )
    .subscribe()

  // 게임
  gameSubscription = supabase
    .channel('game-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lo_games', filter: `room_id=eq.${roomId.value}` },
      async () => { await loadGameData() }
    )
    .subscribe()

  // 턴
  turnsSubscription = supabase
    .channel('turns-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lo_game_turns', filter: `game_id=eq.${gameStore.gameId}` },
      async (payload) => {
        gameStore.updateLastPlay(payload.new)
        await updatePlayerHandCounts(gameStore.gameId)
        if (payload.new?.action === 'turn_complete' && payload.new.player_id) {
          const currentIndex = gameStore.players.findIndex(p => p.id === payload.new.player_id)
          if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % gameStore.players.length
            const nextPlayerId = gameStore.players[nextIndex].id
            gameStore.setCurrentTurnUserId(nextPlayerId)
          }
        }
      }
    )
    .subscribe()
}

async function startGame() {
  // ✅ 방장만 실행 & 분배 중 재진입 방지
  if (!isRoomOwner.value || !canStartGame.value) return;
  if (dealing.value) return;

  try {
    const { data: gameData, error: gameError } = await supabase
      .from('lo_games')
      .insert({ room_id: roomId.value, created_by: auth.user.id })
      .select()
      .single();
    if (gameError) throw gameError;

    // ✅ 카드 분배(중복 방지 포함)
    await distributeCards(gameData.id);

    const firstTurnPlayerId = await findPlayerWithCloud3(gameData.id);

    await supabase
      .from('lo_games')
      .update({
        current_turn_user_id: firstTurnPlayerId,
        status: 'playing',
        started_at: new Date().toISOString()
      })
      .eq('id', gameData.id);

    await supabase
      .from('lo_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId.value);

  } catch (err) {
    console.error('게임 시작 오류:', {
      code: err.code, message: err.message, details: err.details, hint: err.hint
    });
    error.value = '게임을 시작할 수 없습니다: ' + (err.message || '알 수 없는 오류');
  }
}

// CPU용 UUID (UUID 포맷 준수: 마지막 12자리를 16진수로)
function toCpuUUID(cpuId) {
  const numberPart = cpuId.replace(/^cpu/, '');
  const hexPart = parseInt(numberPart, 10).toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${hexPart}`;
}

async function distributeCards(gameId) {
  if (dealing.value) { console.warn('이미 분배 중, 스킵'); return; }
  dealing.value = true;
  try {
    // ✅ 이미 분배된 게임이면 스킵
    const { count, error: cntErr } = await supabase
      .from('lo_cards')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);
    if (cntErr) throw cntErr;
    if ((count ?? 0) > 0) { console.warn('이미 분배된 게임, 스킵'); return; }

    const playerCount = players.value.length;
    const suits = ['cloud', 'star', 'moon', 'sun'];
    let numbers, totalCards;

    if (playerCount === 3) {
      numbers = Array.from({ length: 9 }, (_, i) => i + 1);
      totalCards = 36;
    } else if (playerCount === 5) {
      numbers = Array.from({ length: 15 }, (_, i) => i + 1);
      totalCards = 60;
    } else {
      numbers = Array.from({ length: 13 }, (_, i) => i + 1);
      totalCards = 52;
    }

    const tiles = suits.flatMap(suit => numbers.map(number => ({ suit, number })));
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const allPlayerIds = players.value.map(p => p.id);
    const realPlayerIds = allPlayerIds.filter(id => !id.startsWith('cpu'));
    const cpuPlayerIds  = allPlayerIds.filter(id =>  id.startsWith('cpu'));

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
      } else {
        const uuid = toCpuUUID(playerId);
        card.owner_id = uuid;
        cardsToInsert.push(card);
        cpuHands[playerId].push(tile);
      }
    }

    const { error } = await supabase.from('lo_cards').insert(cardsToInsert);
    if (error) {
      console.error('카드 대량 삽입 오류:', {
        code: error.code, message: error.message, details: error.details, hint: error.hint
      });
      throw error;
    }

    for (const cpuId in cpuHands) {
      gameStore.setCpuHand(cpuId, cpuHands[cpuId]);
    }

    console.log(`${playerCount}인 게임: ${totalCards}장 분배 완료`);
  } finally {
    dealing.value = false;
  }
}

async function leaveRoom() {
  if (!auth.user || !roomId.value) return
  try {
    if (isRoomOwner.value) {
      await supabase.from('lo_rooms').delete().eq('id', roomId.value)
    } else {
      const { error } = await supabase
        .from('lo_room_players')
        .delete()
        .eq('room_id', roomId.value)
        .eq('user_id', auth.user.id)
      if (!error) {
        const { data: remainingPlayers } = await supabase
          .from('lo_room_players')
          .select('*')
          .eq('room_id', roomId.value)
        if (remainingPlayers && remainingPlayers.length === 0) {
          await supabase.from('lo_rooms').delete().eq('id', roomId.value)
        }
      }
    }
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
    const { data: existingPlayer, error: checkError } = await supabase
      .from('lo_room_players')
      .select('*')
      .eq('room_id', roomId.value)
      .eq('user_id', creatorId)
      .maybeSingle()
    if (existingPlayer && !checkError) return

    const { error: insertError } = await supabase
      .from('lo_room_players')
      .insert({ room_id: roomId.value, user_id: creatorId, joined_at: new Date().toISOString() })
    if (insertError) { console.error('방 생성자 플레이어 추가 오류:', insertError); return }

    const creatorPlayer = {
      id: creatorId,
      email: `User_${creatorId.slice(0, 8)}`,
      joinedAt: new Date().toISOString(),
      handCount: 0
    }
    players.value.unshift(creatorPlayer)
    await updateRoomPlayerCount(players.value.length)
  } catch (err) {
    console.error('방 생성자 플레이어 추가 오류:', err)
  }
}

async function findPlayerWithCloud3(gameId) {
  try {
    const { data, error } = await supabase
      .from('lo_cards')
      .select('owner_id')
      .eq('game_id', gameId)
      .eq('suit', 'cloud')
      .eq('rank', '3')
      .eq('in_hand', true)
    if (error) {
      const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
      return firstRealPlayer?.id || players.value[0]?.id
    }
    if (!data || data.length === 0) {
      const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
      return firstRealPlayer?.id || players.value[0]?.id
    }
    return data[0].owner_id
  } catch (err) {
    const firstRealPlayer = players.value.find(p => !p.id.startsWith('cpu'))
    return firstRealPlayer?.id || players.value[0]?.id
  }
}
</script>

<style scoped>
.scrollbar-thin { scrollbar-width: thin; }
.scrollbar-thumb-gray-600::-webkit-scrollbar-thumb { background: #4b5563; }
.scrollbar-track-gray-800::-webkit-scrollbar-track { background: #1f2937; }
</style>
