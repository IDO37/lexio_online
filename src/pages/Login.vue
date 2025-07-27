<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function login() {
  error.value = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  loading.value = false
  if (err) {
    error.value = err.message
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-lexio-bg py-8">
    <div class="bg-lexio-bg-light rounded-xl shadow-lg p-8 w-full max-w-md border border-gray-600">
      <h2 class="text-2xl font-bold text-lexio-text mb-6 text-center">로그인</h2>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-lexio-text-muted mb-2">이메일</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text border border-gray-600 focus:outline-none focus:ring-2 focus:ring-highlight-red transition"
            placeholder="이메일을 입력하세요"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-lexio-text-muted mb-2">비밀번호</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text border border-gray-600 focus:outline-none focus:ring-2 focus:ring-highlight-red transition"
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        <div v-if="error" class="text-red-400 text-sm text-center">{{ error }}</div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-highlight-red text-white font-bold rounded-lg px-4 py-2 transition hover:bg-highlight-red-dark disabled:opacity-50"
        >
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>
      <div class="mt-4 text-center">
        <span class="text-lexio-text-muted">계정이 없으신가요? </span>
        <router-link to="/register" class="text-highlight-red hover:underline">회원가입</router-link>
      </div>
    </div>
  </div>
</template> 