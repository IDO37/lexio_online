<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2">
    <div class="text-sm text-gray-300 mb-1">내 패</div>
    <div class="flex gap-2 flex-wrap">
      <div v-for="(card, idx) in myHand" :key="idx"
        class="w-12 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl font-bold cursor-pointer select-none bg-white text-gray-900 border-2 border-gray-300 hover:border-highlight-yellow transition"
        :class="selectedIdxs.includes(idx) ? 'border-4 border-highlight-yellow ring-2 ring-yellow-300' : ''"
        @click="toggleSelect(idx)">
        <span>{{ cardDisplay(card) }}</span>
      </div>
    </div>
    <button
      class="mt-3 bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-4 py-2 shadow-md transition hover:bg-yellow-400/80 disabled:opacity-50"
      :disabled="selectedIdxs.length === 0"
      @click="submitSelected"
    >선택 제출</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['submit-cards'])

const myHand = ref([
  { suit: 'sun', rank: 2 },
  { suit: 'moon', rank: 12 },
  { suit: 'star', rank: 7 },
  { suit: 'cloud', rank: 5 },
  { suit: 'sun', rank: 8 }
])
const selectedIdxs = ref([])

function cardDisplay(card) {
  const suitMap = { sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️' }
  return `${suitMap[card.suit] || ''} ${card.rank}`
}
function toggleSelect(idx) {
  if (selectedIdxs.value.includes(idx)) {
    selectedIdxs.value = selectedIdxs.value.filter(i => i !== idx)
  } else {
    selectedIdxs.value.push(idx)
  }
}
function submitSelected() {
  const selectedCards = selectedIdxs.value.map(i => myHand.value[i])
  emit('submit-cards', selectedCards)
  // 제출된 카드는 내 패에서 제거 (mock)
  myHand.value = myHand.value.filter((_, i) => !selectedIdxs.value.includes(i))
  selectedIdxs.value = []
}
</script> 