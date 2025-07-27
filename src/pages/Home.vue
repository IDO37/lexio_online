<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-lexio-bg py-8">
    <div class="text-center max-w-4xl mx-auto px-4">
      <h1 class="text-5xl font-bold text-lexio-text mb-6">
        <span class="text-highlight-red">LEXIO</span> 온라인
      </h1>
      <p class="text-xl text-lexio-text-muted mb-8">
        전략적 카드 게임 렉시오를 온라인에서 즐겨보세요
      </p>
      
      <!-- 게임 스크린샷 플레이스홀더 -->
      <div class="bg-lexio-bg-light rounded-xl p-8 mb-8 border border-gray-600">
        <div class="text-lexio-text-muted text-lg">
          게임 스크린샷이 여기에 표시됩니다
        </div>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link 
          to="/game" 
          class="bg-highlight-red text-white font-bold rounded-xl px-8 py-4 text-lg shadow-lg transition hover:bg-highlight-red-dark"
        >
          게임 시작하기
        </router-link>
        <router-link 
          to="/rules" 
          class="bg-lexio-bg-light text-lexio-text font-bold rounded-xl px-8 py-4 text-lg border border-gray-600 transition hover:bg-lexio-bg-lighter"
        >
          게임 규칙 보기
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// Home 컴포넌트 로직
</script> 