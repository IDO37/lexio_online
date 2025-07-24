<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
      <div class="text-sm text-gray-300 font-semibold">방 목록</div>
      <button
        class="bg-highlight-indigo text-white font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-highlight-indigo"
        @click="createRoom"
        aria-label="방 생성"
        :disabled="loading"
      >방 생성</button>
    </div>
    <div v-if="loading" class="text-center text-gray-400 py-8">불러오는 중...</div>
    <div v-else-if="error" class="text-center text-red-400 py-8">{{ error }}</div>
    <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-600 transition cursor-pointer focus-within:ring-2 focus-within:ring-highlight-yellow"
        tabindex="0"
        @keydown.enter="joinRoom(room)"
        :aria-label="`${room.name} 방, ${room.players}명, ${room.status === 'playing' ? '진행중' : '대기중'}`"
      >
        <div class="flex items-center gap-3">
          <span class="font-bold text-white text-base">{{ room.name }}</span>
          <span class="text-xs text-gray-400">({{ room.players }}/4)</span>
          <span v-if="room.status === 'playing'" class="ml-2 text-xs text-yellow-400">진행중</span>
          <span v-else class="ml-2 text-xs text-green-400">대기중</span>
        </div>
        <button
          class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-highlight-yellow"
          @click.stop="joinRoom(room)"
          aria-label="{{ room.name }} 방 입장"
        >입장</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const rooms = ref([])
const loading = ref(false)
const error = ref('')

async function fetchRooms() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase.from('rooms').select('*').order('created_at', { ascending: false })
  if (err) {
    error.value = '방 목록을 불러오지 못했습니다.'
    rooms.value = []
  } else {
    rooms.value = data || []
  }
  loading.value = false
}

onMounted(fetchRooms)

async function createRoom() {
  const name = prompt('방 이름을 입력하세요')
  if (!name) return
  loading.value = true
  const { data, error: err } = await supabase.from('rooms').insert([{ name, players: 1, status: 'waiting' }]).select()
  if (err) {
    error.value = '방 생성 실패: ' + err.message
  } else if (data && data[0]) {
    rooms.value.unshift(data[0])
  }
  loading.value = false
}

function joinRoom(room) {
  alert(`${room.name}에 입장합니다! (실제 구현은 추후)`)
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