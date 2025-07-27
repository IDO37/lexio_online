<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
      <div class="text-sm text-gray-300 font-semibold">방 목록</div>
    </div>
    <div v-if="!isAuthed" class="text-xs text-yellow-400 mb-2">로그인해야 방 생성/입장이 가능합니다.</div>
    <div v-if="loading" class="text-center text-gray-400 py-8">불러오는 중...</div>
    <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
    <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div
        v-for="room in filteredRooms"
        :key="room.id"
        class="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-600 transition cursor-pointer focus-within:ring-2 focus-within:ring-highlight-yellow"
        tabindex="0"
        @keydown.enter="joinRoom(room)"
        :aria-label="`${room.name} 방, ${room.players}명, ${room.status === 'playing' ? '진행중' : '대기중'}`"
      >
        <div class="flex items-center gap-3">
          <span class="font-bold text-white text-base">{{ room.name }}</span>
          <span class="text-xs text-gray-400">({{ room.players }}/{{ room.max_players || 4 }})</span>
          <span v-if="room.status === 'playing'" class="ml-2 text-xs text-yellow-400">진행중</span>
          <span v-else class="ml-2 text-xs text-green-400">대기중</span>
        </div>
        <button
          class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-highlight-yellow disabled:opacity-50"
          @click.stop="joinRoom(room)"
          :disabled="!isAuthed"
          aria-label="{{ room.name }} 방 입장"
        >입장</button>
      </div>
      <div v-if="filteredRooms.length === 0" class="text-center text-gray-400 py-8">
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

const isAuthed = computed(() => !!auth.user)

// 검색 필터링된 방 목록
const filteredRooms = computed(() => {
  if (!props.search) return rooms.value
  return rooms.value.filter(room => 
    room.name.toLowerCase().includes(props.search.toLowerCase())
  )
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
    alert('로그인 후 입장할 수 있습니다.')
    return
  }
  
  try {
    // 방에 플레이어 추가
    const { error: joinError } = await supabase
      .from('lo_room_players')
      .insert({
        room_id: room.id,
        user_id: auth.user.id,
        joined_at: new Date().toISOString()
      })
    
    if (joinError) {
      // 이미 입장한 경우 무시
      if (joinError.code !== '23505') { // unique_violation
        alert('방 입장 실패: ' + joinError.message)
        return
      }
    }
    
    // 방의 플레이어 수 업데이트
    await supabase
      .from('lo_rooms')
      .update({ players: room.players + 1 })
      .eq('id', room.id)
    
    // 게임 방으로 이동
    router.push(`/game/${room.id}`)
    
  } catch (err) {
    alert('방 입장 중 오류가 발생했습니다.')
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