<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh] gap-8">
    <div class="bg-gray-800 rounded-xl shadow-md p-8 max-w-xl w-full text-center">
      <h1 class="text-4xl font-bold mb-4 text-highlight-yellow">렉시오 온라인</h1>
      <p class="mb-6 text-lg text-gray-300">카드 배치와 전략이 만나는 보드게임, 렉시오를 온라인에서 즐기세요!</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link to="/game" class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">게임 시작</router-link>
        <router-link to="/login" class="bg-highlight-indigo text-white font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-indigo-500/80">로그인</router-link>
        <router-link to="/register" class="border border-highlight-yellow text-highlight-yellow font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/10">회원가입</router-link>
      </div>
    </div>
  </section>
</template> 