<template>
  <div class="bg-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2">
    <div class="text-sm text-gray-300 mb-1">내 패</div>
    <div class="flex gap-2 flex-wrap">
      <div v-for="(card, idx) in myHand" :key="idx"
        class="w-12 h-16 rounded-xl shadow-md flex items-center justify-center text-2xl font-bold cursor-pointer select-none bg-white text-gray-900 border-2 border-gray-300 hover:border-highlight-yellow transition"
        :class="selectedIdxs.includes(idx) ? 'border-4 border-highlight-yellow ring-2 ring-yellow-300' : ''"
        @click="toggleSelect(idx)"
        :aria-disabled="!isMyTurn || submitting"
        :tabindex="isMyTurn && !submitting ? 0 : -1"
      >
        <span>{{ cardDisplay(card) }}</span>
      </div>
    </div>
    <button
      class="mt-3 bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-4 py-2 shadow-md transition hover:bg-yellow-400/80 disabled:opacity-50"
      :disabled="selectedIdxs.length === 0 || !isMyTurn || submitting"
      @click="submitSelected"
    >선택 제출</button>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import { useRoute } from 'vue-router'

const props = defineProps({
  myHand: { type: Array, required: true },
  isMyTurn: { type: Boolean, required: true }
})
const emit = defineEmits(['after-submit'])
const selectedIdxs = ref([])
const auth = useAuthStore()
const route = useRoute()
const roomId = route.params.roomId
const submitting = ref(false)

function cardDisplay(card) {
  const suitMap = { sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️' }
  return `${suitMap[card.suit] || ''} ${card.rank}`
}
function toggleSelect(idx) {
  if (!props.isMyTurn || submitting.value) return
  if (selectedIdxs.value.includes(idx)) {
    selectedIdxs.value = selectedIdxs.value.filter(i => i !== idx)
  } else {
    selectedIdxs.value.push(idx)
  }
}

async function submitSelected() {
  if (!props.isMyTurn || submitting.value) return
  submitting.value = true
  const selectedCards = selectedIdxs.value.map(i => props.myHand[i])
  // lo_cards에서 in_hand=false로 변경
  for (const card of selectedCards) {
    await supabase.from('lo_cards').update({ in_hand: false }).eq('game_id', card.game_id).eq('owner_id', card.owner_id).eq('suit', card.suit).eq('rank', card.rank)
  }
  // lo_game_turns에 기록
  await supabase.from('lo_game_turns').insert({
    game_id: selectedCards[0]?.game_id,
    player_id: auth.user.id,
    action: 'play',
    cards: selectedCards
  })
  // 턴 넘기기: lo_games.current_turn_user_id를 다음 플레이어로 변경 (간단 mock)
  // 실제로는 서버에서 다음 턴 로직을 처리하는 것이 안전
  emit('after-submit')
  selectedIdxs.value = []
  submitting.value = false
}
</script> 