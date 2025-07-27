<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-6 flex flex-col gap-3 border border-gray-600">
    <div class="text-lg font-bold text-lexio-text mb-2">플레이어 목록</div>
    
    <div v-if="players.length === 0" class="text-center text-lexio-text-muted py-8">
      플레이어 정보를 불러오는 중...
    </div>
    
    <div v-else class="flex flex-col gap-2">
      <div 
        v-for="player in players" 
        :key="player.id" 
        class="flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
        :class="[
          player.isTurn 
            ? 'bg-highlight-red bg-opacity-20 border border-highlight-red' 
            : 'bg-lexio-bg hover:bg-lexio-bg-lighter'
        ]"
      >
        <!-- 플레이어 아바타 -->
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
          :class="[
            player.isMe 
              ? 'bg-highlight-red' 
              : player.isTurn 
                ? 'bg-highlight-red animate-pulse' 
                : 'bg-gray-500'
          ]"
        >
          {{ player.name.charAt(0).toUpperCase() }}
        </div>
        
        <!-- 플레이어 정보 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-lexio-text truncate">{{ player.name }}</span>
            <span v-if="player.isMe" class="text-xs text-highlight-red font-bold bg-highlight-red bg-opacity-20 px-2 py-1 rounded-full">
              나
            </span>
            <span v-if="player.isTurn" class="text-xs text-highlight-red font-bold bg-highlight-red bg-opacity-20 px-2 py-1 rounded-full animate-pulse">
              턴
            </span>
          </div>
          <div class="text-xs text-lexio-text-muted">
            패: {{ player.handCount }}장
          </div>
        </div>
        
        <!-- 플레이어 상태 -->
        <div class="flex flex-col items-end gap-1">
          <div 
            class="w-3 h-3 rounded-full"
            :class="[
              player.isOnline 
                ? 'bg-green-400' 
                : 'bg-gray-400'
            ]"
          ></div>
          <div v-if="player.isTurn" class="text-xs text-highlight-red font-bold">
            플레이 중
          </div>
        </div>
      </div>
    </div>
    
    <!-- 게임 정보 -->
    <div class="mt-4 pt-4 border-t border-gray-600">
      <div class="flex justify-between items-center text-sm">
        <span class="text-lexio-text-muted">총 플레이어:</span>
        <span class="text-lexio-text font-semibold">{{ players.length }}명</span>
      </div>
      <div class="flex justify-between items-center text-sm mt-1">
        <span class="text-lexio-text-muted">게임 상태:</span>
        <span 
          class="font-semibold"
          :class="[
            gameStatus === 'waiting' ? 'text-yellow-400' : '',
            gameStatus === 'playing' ? 'text-green-400' : '',
            gameStatus === 'finished' ? 'text-highlight-red' : ''
          ]"
        >
          {{ getGameStatusText(gameStatus) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  players: {
    type: Array,
    default: () => []
  },
  gameStatus: {
    type: String,
    default: 'waiting'
  }
})

function getGameStatusText(status) {
  const statusMap = {
    'waiting': '대기 중',
    'playing': '진행 중',
    'finished': '종료'
  }
  return statusMap[status] || '알 수 없음'
}
</script>

<style scoped>
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