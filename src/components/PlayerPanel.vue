<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2">
    <div v-for="player in players" :key="player.id" class="flex items-center gap-3 p-2 rounded-lg" :class="player.isTurn ? 'bg-highlight-yellow/20' : ''">
      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" :class="player.isMe ? 'bg-highlight-indigo' : 'bg-gray-500'">
        {{ player.name.charAt(0) }}
      </div>
      <div class="flex-1">
        <span class="font-semibold text-white">{{ player.name }}</span>
        <span v-if="player.isMe" class="ml-2 text-xs text-highlight-indigo">(나)</span>
        <span v-if="player.isTurn" class="ml-2 text-xs text-highlight-yellow font-bold">턴</span>
      </div>
      <div class="text-sm text-gray-300">패: {{ player.handCount }}</div>
    </div>
  </div>
</template>

<script setup>
// Mock 데이터 (실제 게임 상태 store로 대체 예정)
const players = [
  { id: 'u1', name: '플레이어1', handCount: 7, isTurn: true, isMe: true },
  { id: 'u2', name: '플레이어2', handCount: 5, isTurn: false, isMe: false },
  { id: 'u3', name: '플레이어3', handCount: 2, isTurn: false, isMe: false }
]
</script> 