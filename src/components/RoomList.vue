<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
      <div class="text-sm text-gray-300 font-semibold">방 목록</div>
      <button
        class="bg-highlight-indigo text-white font-semibold rounded-xl px-4 py-2 text-base shadow-md transition hover:bg-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-highlight-indigo"
        @click="createRoom"
        aria-label="방 생성"
      >방 생성</button>
    </div>
    <div class="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const rooms = ref([
  { id: 'r1', name: '방 1', players: 3, status: 'waiting' },
  { id: 'r2', name: '방 2', players: 4, status: 'playing' },
  { id: 'r3', name: '방 3', players: 2, status: 'waiting' }
])

async function createRoom() {
  const name = prompt('방 이름을 입력하세요')
  if (!name) return
  // 실제 Supabase 연동 예시
  // const { data, error } = await supabase.from('rooms').insert([{ name, players: 1, status: 'waiting' }])
  // if (!error) rooms.value.push({ id: data[0].id, name, players: 1, status: 'waiting' })
  // else alert('방 생성 실패')
  // Mock
  rooms.value.push({ id: `r${rooms.value.length + 1}`, name, players: 1, status: 'waiting' })
}

function joinRoom(room) {
  // 실제 입장 로직: 라우팅, 상태 갱신, 알림 등
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