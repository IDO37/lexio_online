<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 min-h-[300px] flex flex-col items-center gap-4 border border-gray-600">
    <!-- 현재 턴 표시 -->
    <div class="flex items-center gap-3 mb-4">
      <span class="text-highlight-red font-bold text-lg">현재 턴:</span>
      <span class="text-lexio-text font-semibold text-lg">{{ currentPlayer?.name || '대기 중...' }}</span>
      <div v-if="isMyTurn" class="bg-highlight-red text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
        내 턴!
      </div>
    </div>
    
    <!-- 게임 보드 -->
    <div class="flex flex-col items-center gap-4 w-full">
      <!-- 마지막 플레이된 카드들 -->
      <div v-if="lastPlayedCards.length > 0" class="text-center">
        <div class="flex gap-2 justify-center mb-2">
          <transition-group name="card-fade" tag="div" class="flex gap-2">
            <div 
              v-for="(card, idx) in lastPlayedCards" 
              :key="`${card.suit}-${card.rank}-${idx}`" 
              class="w-16 h-20 rounded-xl shadow-lg flex items-center justify-center text-3xl font-bold bg-white text-gray-900 border-2 border-gray-300 transform hover:scale-105 transition-transform"
            >
              <span>{{ cardDisplay(card) }}</span>
            </div>
          </transition-group>
        </div>
        
        <!-- 조합 정보 -->
        <div v-if="lastPlayedCombo" class="text-center">
          <div class="text-highlight-red font-bold text-lg mb-1">
            {{ getComboName(lastPlayedCombo.type) }}
          </div>
          <div class="text-lexio-text-muted text-sm">
            {{ lastPlayedPlayerName }}님이 플레이
          </div>
        </div>
      </div>
      
      <!-- 빈 보드 상태 -->
      <div v-else class="text-center py-8">
        <div class="text-lexio-text-muted text-lg mb-2">게임 보드</div>
        <div class="text-sm text-gray-500">아직 제출된 카드가 없습니다.</div>
        <div class="text-xs text-gray-400 mt-1">첫 번째 플레이어가 카드를 제출하면 여기에 표시됩니다.</div>
      </div>
    </div>
    
    <!-- 게임 상태 정보 -->
    <div class="mt-4 text-center">
      <div class="text-sm text-lexio-text-muted">
        남은 카드: {{ remainingCards }}장
      </div>
      <div v-if="gameStatus === 'playing'" class="text-xs text-green-400 mt-1">
        게임 진행 중
      </div>
      <div v-else-if="gameStatus === 'finished'" class="text-xs text-highlight-red mt-1">
        게임 종료
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getComboName } from '../store/game.js'

const props = defineProps({
  currentPlayer: { type: Object, default: null },
  isMyTurn: { type: Boolean, default: false },
  lastPlayedCards: { type: Array, default: () => [] },
  lastPlayedCombo: { type: Object, default: null },
  lastPlayedPlayerName: { type: String, default: '' },
  remainingCards: { type: Number, default: 0 },
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