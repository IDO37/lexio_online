<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function register() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = '비밀번호는 6자 이상이어야 합니다.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = '비밀번호가 일치하지 않습니다.'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  })
  loading.value = false
  if (err) {
    error.value = err.message
  } else {
    alert('회원가입이 완료되었습니다. 이메일 인증을 확인해 주세요.')
    router.push('/login')
  }
}
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-highlight-yellow">회원가입</h2>
      <form class="flex flex-col gap-4" @submit.prevent="register">
        <input v-model="email" type="email" placeholder="이메일" required class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <input v-model="password" type="password" placeholder="비밀번호(6자 이상)" required class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <input v-model="passwordConfirm" type="password" placeholder="비밀번호 확인" required class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <button type="submit" :disabled="loading" class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">
          <span v-if="loading">가입 중...</span>
          <span v-else>회원가입</span>
        </button>
      </form>
      <div v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</div>
      <div class="mt-4 text-sm text-gray-400">
        이미 계정이 있으신가요?
        <router-link to="/login" class="text-highlight-indigo hover:underline ml-1">로그인</router-link>
      </div>
    </div>
  </section>
</template> 