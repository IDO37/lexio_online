<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-600">
    <div class="flex items-center justify-between">
      <div class="text-lg font-bold text-lexio-text">내 패</div>
      <div class="text-sm text-lexio-text-muted">{{ myHand.length }}장</div>
    </div>
    
    <!-- 카드 목록 -->
    <div class="flex gap-2 flex-wrap min-h-[120px]">
      <div 
        v-for="(card, idx) in myHand" 
        :key="`${card.suit}-${card.rank}-${idx}`"
        class="w-14 h-18 rounded-xl shadow-md flex items-center justify-center text-xl font-bold cursor-pointer select-none bg-white text-gray-900 border-2 transition-all duration-200"
        :class="[
          selectedCards.includes(idx) 
            ? 'border-highlight-red ring-2 ring-highlight-red ring-opacity-50 transform scale-105' 
            : 'border-gray-300 hover:border-highlight-red hover:scale-105',
          !canInteract ? 'opacity-50 cursor-not-allowed' : ''
        ]"
        @click="toggleCard(idx)"
        :aria-disabled="!canInteract"
        :tabindex="canInteract ? 0 : -1"
      >
        <span>{{ cardDisplay(card) }}</span>
      </div>
    </div>
    
    <!-- 선택된 카드 조합 정보 -->
    <div v-if="selectedCards.length > 0" class="bg-lexio-bg rounded-lg p-3 border border-gray-600">
      <div class="text-sm text-lexio-text-muted mb-2">선택된 카드:</div>
      <div class="flex gap-1 mb-2">
        <div 
          v-for="idx in selectedCards" 
          :key="idx"
          class="w-8 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-highlight-red text-white"
        >
          {{ cardDisplay(myHand[idx]) }}
        </div>
      </div>
      <div v-if="selectedCombo" class="text-highlight-red font-bold">
        {{ getComboName(selectedCombo.type) }}
      </div>
      <div v-else class="text-red-400 text-sm">
        유효하지 않은 조합입니다
      </div>
    </div>
    
    <!-- 액션 버튼들 -->
    <div class="flex gap-2 mt-2">
      <button
        class="flex-1 bg-highlight-red text-white font-bold rounded-lg px-4 py-3 shadow-md transition hover:bg-highlight-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canPlay || !canInteract"
        @click="playCards"
      >
        <span v-if="loading">제출 중...</span>
        <span v-else-if="selectedCards.length === 0">카드를 선택하세요</span>
        <span v-else-if="!selectedCombo">유효한 조합이 아닙니다</span>
        <span v-else>카드 제출</span>
      </button>
      
      <button
        class="bg-lexio-bg text-lexio-text font-bold rounded-lg px-4 py-3 border border-gray-600 transition hover:bg-lexio-bg-lighter disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canInteract"
        @click="pass"
      >
        패스
      </button>
    </div>
    
    <!-- 턴 안내 -->
    <div v-if="!isMyTurn" class="text-center text-lexio-text-muted text-sm">
      {{ currentPlayerName }}님의 턴을 기다리는 중...
    </div>
    
    <!-- 첫 턴 안내 -->
    <div v-if="isMyTurn && isFirstTurn" class="text-center text-highlight-red text-sm font-bold bg-highlight-red bg-opacity-20 rounded-lg p-2 mb-2">
      첫 턴입니다! 원하는 카드를 플레이하세요.
    </div>
    
    <!-- 오류 메시지 -->
    <div v-if="error" class="text-red-400 text-sm text-center">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore, getComboName, getCombo } from '../store/game.js'

const props = defineProps({
  myHand: { type: Array, required: true },
  isMyTurn: { type: Boolean, required: true },
  currentPlayerName: { type: String, default: '' },
  isFirstTurn: { type: Boolean, default: false },
  turnTransitioning: { type: Boolean, default: false }
})

const gameStore = useGameStore()

// 선택된 카드들
const selectedCards = computed(() => gameStore.selectedCards)

// 선택된 카드들의 조합 분석
const selectedCombo = computed(() => {
  if (selectedCards.value.length === 0) return null
  const cards = selectedCards.value.map(i => props.myHand[i])
  return getCombo(cards)
})

// 카드 제출 가능 여부
const canPlay = computed(() => {
  if (!props.isMyTurn) return false
  if (selectedCards.value.length === 0) return false
  return selectedCombo.value !== null
})

// 로딩 상태
const loading = computed(() => gameStore.loading)

// 오류 메시지
const error = computed(() => gameStore.error)

// 카드 클릭 가능 여부
const canInteract = computed(() => props.isMyTurn && !props.turnTransitioning && !loading.value)

function cardDisplay(card) {
  const suitMap = { 
    'sun': '☀️', 
    'moon': '🌙', 
    'star': '⭐', 
    'cloud': '☁️' 
  }
  return `${suitMap[card.suit] || card.suit} ${card.rank}`
}

function toggleCard(idx) {
  if (!canInteract.value) return
  gameStore.toggleCard(idx)
}

async function playCards() {
  if (!canPlay.value || !canInteract.value) return
  await gameStore.playCards()
}

async function pass() {
  if (!canInteract.value) return
  await gameStore.pass()
}


</script> 