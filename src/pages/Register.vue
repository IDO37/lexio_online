<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()

// 폼 유효성 검사
const isFormValid = computed(() => {
  return email.value && 
         password.value.length >= 6 && 
         password.value === confirmPassword.value
})

async function handleRegister() {
  error.value = ''
  success.value = ''
  
  if (password.value.length < 6) {
    error.value = '비밀번호는 6자 이상이어야 합니다.'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = '비밀번호가 일치하지 않습니다.'
    return
  }
  
  loading.value = true
  
  try {
    const { error: err } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })
    
    if (err) {
      error.value = err.message
    } else {
      success.value = '회원가입이 완료되었습니다. 자동으로 로그인됩니다.'
      
      // 회원가입 후 자동 로그인 시도
      try {
        const loginResult = await auth.login(email.value, password.value)
        if (loginResult.success) {
          // 로그인 성공 시 홈으로 이동
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          success.value = '회원가입이 완료되었습니다. 로그인 페이지에서 로그인해주세요.'
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
      } catch (loginErr) {
        success.value = '회원가입이 완료되었습니다. 로그인 페이지에서 로그인해주세요.'
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
      
      // 폼 초기화
      email.value = ''
      password.value = ''
      confirmPassword.value = ''
    }
  } catch (err) {
    error.value = '회원가입 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
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