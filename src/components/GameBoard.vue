<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-6 min-h-[220px] flex flex-col items-center gap-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-highlight-yellow font-bold">현재 턴:</span>
      <span class="text-white font-semibold">{{ currentPlayer.name }}</span>
    </div>
    <div class="flex flex-col items-center gap-2">
      <transition-group name="card-fade" tag="div" class="flex gap-2">
        <div v-for="(card, idx) in board.cards" :key="cardKey(card, idx)" class="w-12 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl font-bold bg-yellow-200 text-yellow-900 border-2 border-yellow-400">
          <span>{{ cardDisplay(card) }}</span>
        </div>
      </transition-group>
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
function cardKey(card, idx) {
  // 카드 중복 방지용 고유키
  return `${card.suit}-${card.rank}-${idx}`
}
</script>

<style scoped>
.card-fade-enter-active, .card-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-fade-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.9);
}
.card-fade-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.card-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.card-fade-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}
</style> 