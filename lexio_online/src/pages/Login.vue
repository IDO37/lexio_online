<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-highlight-yellow">로그인</h2>
      <form class="flex flex-col gap-4">
        <input type="email" placeholder="이메일" class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <input type="password" placeholder="비밀번호" class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <button type="submit" class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">로그인</button>
      </form>
      <div class="mt-4 text-sm text-gray-400">
        계정이 없으신가요?
        <router-link to="/register" class="text-highlight-indigo hover:underline ml-1">회원가입</router-link>
      </div>
    </div>
  </section>
</template> 