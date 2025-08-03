<template>
  <div class="bg-lexio-bg-lighter rounded-xl shadow-md p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
      <div class="text-sm text-lexio-text-muted font-semibold">방 목록</div>
      <label class="flex items-center gap-2 text-xs text-lexio-text-muted">
        <input 
          type="checkbox" 
          v-model="showPasswordRooms" 
          class="accent-highlight-red"
        />
        비밀번호 방 표시
      </label>
    </div>
    <div v-if="!isAuthed" class="text-xs text-highlight-red mb-2">로그인해야 방 생성/입장이 가능합니다.</div>
    <div v-if="loading" class="text-center text-lexio-text-muted py-8">불러오는 중...</div>
    <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
    <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div
        v-for="room in filteredRooms"
        :key="room.id"
        class="flex items-center justify-between p-3 rounded-lg bg-lexio-bg hover:bg-lexio-bg-light transition cursor-pointer focus-within:ring-2 focus-within:ring-highlight-red"
        tabindex="0"
        @keydown.enter="joinRoom(room)"
        :aria-label="`${room.name} 방, ${room.players}명, ${room.status === 'playing' ? '진행중' : '대기중'}`"
      >
        <div class="flex items-center gap-3">
          <span class="font-bold text-lexio-text text-base">{{ room.name }}</span>
          <span class="text-xs text-lexio-text-muted">({{ room.players }}/{{ room.max_players || 4 }})</span>
          <span v-if="room.status === 'playing'" class="ml-2 text-xs text-highlight-red">진행중</span>
          <span v-else class="ml-2 text-xs text-green-400">대기중</span>
          <span v-if="!room.is_public" class="ml-2 text-xs text-red-400">🔒</span>
        </div>
        <button
          class="bg-highlight-red text-white font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-highlight-red-dark focus:outline-none focus:ring-2 focus:ring-highlight-red disabled:opacity-50"
          @click.stop="joinRoom(room)"
          :disabled="!isAuthed"
          aria-label="{{ room.name }} 방 입장"
        >입장</button>
      </div>
      <div v-if="filteredRooms.length === 0" class="text-center text-lexio-text-muted py-8">
        {{ search ? '검색 결과가 없습니다.' : '생성된 방이 없습니다.' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  search: {
    type: String,
    default: ''
  }
})

const auth = useAuthStore()
const rooms = ref([])
const loading = ref(false)
const error = ref('')
const router = useRouter()
const showPasswordRooms = ref(false)

const isAuthed = computed(() => !!auth.user)

// 검색 및 비밀번호 방 필터링된 방 목록
const filteredRooms = computed(() => {
  let filtered = rooms.value
  
  // 비밀번호 방 필터링
  if (!showPasswordRooms.value) {
    filtered = filtered.filter(room => room.is_public !== false)
  }
  
  // 검색 필터링
  if (props.search) {
    filtered = filtered.filter(room => 
      room.name.toLowerCase().includes(props.search.toLowerCase())
    )
  }
  
  return filtered
})

// 실시간 구독
let roomsSubscription = null

async function fetchRooms() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase
    .from('lo_rooms')
    .select('*')
    .order('created_at', { ascending: false })
  if (err) {
    error.value = '방 목록을 불러오지 못했습니다.'
    rooms.value = []
  } else {
    rooms.value = data || []
  }
  loading.value = false
}

function setupRealtimeSubscription() {
  roomsSubscription = supabase
    .channel('rooms-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lo_rooms'
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        // 새 방이 생성된 경우
        rooms.value.unshift(payload.new)
      } else if (payload.eventType === 'UPDATE') {
        // 방 정보가 업데이트된 경우
        const index = rooms.value.findIndex(r => r.id === payload.new.id)
        if (index !== -1) {
          rooms.value[index] = payload.new
        }
      } else if (payload.eventType === 'DELETE') {
        // 방이 삭제된 경우
        rooms.value = rooms.value.filter(r => r.id !== payload.old.id)
      }
    })
    .subscribe()
}

onMounted(() => {
  fetchRooms()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (roomsSubscription) {
    roomsSubscription.unsubscribe()
  }
})

async function joinRoom(room) {
  if (!isAuthed.value) {
    alert('로그인 후 입장할 수 있습니다.');
    return;
  }

  // 비밀번호 확인
  if (!room.is_public && room.password) {
    const password = prompt('비밀번호를 입력하세요:');
    if (!password || password !== room.password) {
      alert('비밀번호가 올바르지 않습니다.');
      return;
    }
  }

  try {
    // lo_room_players 테이블에 참여 정보 삽입
    const { error: joinError } = await supabase
      .from('lo_room_players')
      .insert({
        room_id: room.id,
        user_id: auth.user.id,
        joined_at: new Date().toISOString(),
      });

    if (joinError && joinError.code !== '23505') {
      alert('방 입장 실패: ' + joinError.message);
      return;
    }

    // 방 참여 인원 증가
    const currentPlayers = Number(room.players || 0);
    const { error: updateError } = await supabase
      .from('lo_rooms')
      .update({ players: currentPlayers + 1 })
      .eq('id', room.id);

    if (updateError) {
      alert('플레이어 수 업데이트 실패: ' + updateError.message);
      return;
    }

    // 게임 화면으로 이동
    router.push(`/game/${room.id}`);
  } catch (err) {
    console.error('방 입장 중 오류:', err);
    alert('방 입장 중 오류가 발생했습니다.');
  }
}

</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
}
.scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
  background: #4b5563;
}
.scrollbar-track-gray-800::-webkit-scrollbar-track {
  background: #1f2937;
}
</style> 