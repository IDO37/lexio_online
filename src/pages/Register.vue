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
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-lexio-bg py-8">
    <div class="bg-lexio-bg-light rounded-xl shadow-lg p-8 w-full max-w-md border border-gray-600">
      <h2 class="text-2xl font-bold text-lexio-text mb-6 text-center">회원가입</h2>
      <form @submit.prevent="handleRegister" class="space-y-4">
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
            :class="[
              'w-full rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text border focus:outline-none focus:ring-2 focus:ring-highlight-red transition',
              password.length > 0 && password.length < 6 ? 'border-red-500' : 'border-gray-600'
            ]"
            placeholder="비밀번호를 입력하세요 (최소 6자)"
          />
          <div v-if="password.length > 0 && password.length < 6" class="text-red-400 text-xs mt-1">
            비밀번호는 최소 6자 이상이어야 합니다.
          </div>
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-lexio-text-muted mb-2">비밀번호 확인</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            :class="[
              'w-full rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text border focus:outline-none focus:ring-2 focus:ring-highlight-red transition',
              confirmPassword.length > 0 && password !== confirmPassword ? 'border-red-500' : 'border-gray-600'
            ]"
            placeholder="비밀번호를 다시 입력하세요"
          />
          <div v-if="confirmPassword.length > 0 && password !== confirmPassword" class="text-red-400 text-xs mt-1">
            비밀번호가 일치하지 않습니다.
          </div>
        </div>
        <div v-if="error" class="text-red-400 text-sm text-center">{{ error }}</div>
        <div v-if="success" class="text-green-400 text-sm text-center">{{ success }}</div>
        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="w-full bg-highlight-red text-white font-bold rounded-lg px-4 py-2 transition hover:bg-highlight-red-dark disabled:opacity-50"
        >
          {{ loading ? '가입 중...' : '회원가입' }}
        </button>
      </form>
      <div class="mt-4 text-center">
        <span class="text-lexio-text-muted">이미 계정이 있으신가요? </span>
        <router-link to="/login" class="text-highlight-red hover:underline">로그인</router-link>
      </div>
    </div>
  </div>
</template> 