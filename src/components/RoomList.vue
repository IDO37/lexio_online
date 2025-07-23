<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2">
    <div class="flex justify-between items-center mb-2">
      <div class="text-sm text-gray-300 font-semibold">방 목록</div>
      <button class="bg-highlight-indigo text-white font-semibold rounded-xl px-3 py-1 text-sm shadow-md transition hover:bg-indigo-500/80">방 생성</button>
    </div>
    <div v-for="room in rooms" :key="room.id" class="flex items-center justify-between p-2 rounded-lg bg-gray-800 hover:bg-gray-600 transition cursor-pointer">
      <div class="flex items-center gap-3">
        <span class="font-bold text-white">{{ room.name }}</span>
        <span class="text-xs text-gray-400">({{ room.players }}/4)</span>
        <span v-if="room.status === 'playing'" class="ml-2 text-xs text-yellow-400">진행중</span>
        <span v-else class="ml-2 text-xs text-green-400">대기중</span>
      </div>
      <button class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-3 py-1 text-sm shadow-md transition hover:bg-yellow-400/80">입장</button>
    </div>
  </div>
</template>

<script setup>
// Mock 데이터 (실제 게임 상태 store로 대체 예정)
const rooms = [
  { id: 'r1', name: '방 1', players: 3, status: 'waiting' },
  { id: 'r2', name: '방 2', players: 4, status: 'playing' },
  { id: 'r3', name: '방 3', players: 2, status: 'waiting' }
]
</script> 