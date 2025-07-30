<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-600">
    <!-- 게임 보드 제목 -->
    <div class="flex items-center justify-between">
      <div class="text-lg font-bold text-lexio-text">게임 보드</div>
      <div class="text-sm text-lexio-text-muted">{{ remainingCards }}장 남음</div>
    </div>
    
    <!-- 턴 전환 애니메이션 -->
    <div v-if="turnTransitioning" class="text-center py-4">
      <div class="inline-flex items-center gap-2 bg-highlight-red bg-opacity-20 text-highlight-red px-4 py-2 rounded-lg animate-pulse">
        <div class="w-4 h-4 border-2 border-highlight-red border-t-transparent rounded-full animate-spin"></div>
        <span class="font-bold">턴 전환 중...</span>
      </div>
    </div>
    
    <!-- 현재 턴 표시 -->
    <div v-if="isMyTurn" class="bg-highlight-red text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
      내 턴입니다!
    </div>
    
    <!-- 마지막 플레이된 카드들 -->
    <div v-if="lastPlayedCards && lastPlayedCards.length > 0" class="bg-lexio-bg rounded-lg p-4 border border-gray-600">
      <div class="text-sm text-lexio-text-muted mb-2">
        마지막 플레이: {{ lastPlayedPlayerName }}
      </div>
      <div class="flex gap-2 flex-wrap">
        <div 
          v-for="(card, index) in lastPlayedCards" 
          :key="`${card.suit}-${card.rank}-${index}`"
          class="w-12 h-16 rounded-lg shadow-md flex items-center justify-center text-lg font-bold bg-white text-gray-900 border-2 border-gray-300"
        >
          <span>{{ cardDisplay(card) }}</span>
        </div>
      </div>
      <div v-if="lastPlayedCombo" class="mt-2 text-highlight-red font-bold">
        {{ getComboName(lastPlayedCombo.type) }}
      </div>
    </div>
    
    <!-- 빈 보드 상태 -->
    <div v-else class="bg-lexio-bg rounded-lg p-8 border border-gray-600 text-center">
      <div class="text-lexio-text-muted mb-2">아직 플레이된 카드가 없습니다</div>
      <div class="text-sm text-lexio-text-muted">첫 번째 플레이어가 카드를 내면 여기에 표시됩니다</div>
    </div>
    
    <!-- 게임 상태 -->
    <div class="flex justify-between items-center text-sm">
      <span class="text-lexio-text-muted">현재 플레이어:</span>
      <span class="text-lexio-text font-semibold">{{ currentPlayer || '대기 중' }}</span>
    </div>
  </div>
</template>

<script setup>
import { getComboName } from '../store/game.js'

const props = defineProps({
  isMyTurn: { type: Boolean, default: false },
  currentPlayer: { type: String, default: '' },
  lastPlayedCards: { type: Array, default: () => [] },
  lastPlayedCombo: { type: Object, default: null },
  lastPlayedPlayerName: { type: String, default: '' },
  remainingCards: { type: Number, default: 0 },
  turnTransitioning: { type: Boolean, default: false },
  gameStatus: { type: String, default: 'waiting' }
})

function cardDisplay(card) {
  const suitMap = { 
    'sun': '☀️', 
    'moon': '🌙', 
    'star': '⭐', 
    'cloud': '☁️' 
  }
  return `${suitMap[card.suit] || card.suit} ${card.rank}`
}
</script>

<style scoped>
.card-fade-enter-active, .card-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-fade-enter-from {
  opacity: 0;
  transform: translateY(-40px) scale(0.8);
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
  transform: translateY(40px) scale(0.8);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style> 