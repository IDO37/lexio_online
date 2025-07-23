<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-6 min-h-[220px] flex flex-col items-center gap-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-highlight-yellow font-bold">현재 턴:</span>
      <span class="text-white font-semibold">{{ currentPlayer.name }}</span>
    </div>
    <div class="flex flex-col items-center gap-2">
      <div class="flex gap-2">
        <div v-for="(card, idx) in board.cards" :key="idx" class="w-12 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl font-bold bg-yellow-200 text-yellow-900 border-2 border-yellow-400">
          <span>{{ cardDisplay(card) }}</span>
        </div>
      </div>
      <div v-if="board.combo" class="text-sm text-gray-300 mt-1">{{ board.combo }} (by {{ board.playerName }})</div>
      <div v-else class="text-sm text-gray-400 mt-1">아직 제출된 카드가 없습니다.</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  board: { type: Object, required: true },
  currentPlayer: { type: Object, required: true }
})
function cardDisplay(card) {
  const suitMap = { sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️' }
  return `${suitMap[card.suit] || ''} ${card.rank}`
}
</script> 