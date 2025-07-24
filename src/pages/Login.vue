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
  <section class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-highlight-yellow">로그인</h2>
      <form class="flex flex-col gap-4" @submit.prevent="login">
        <input v-model="email" type="email" placeholder="이메일" required class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <input v-model="password" type="password" placeholder="비밀번호" required class="rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
        <button type="submit" :disabled="loading" class="bg-highlight-yellow text-gray-900 font-semibold rounded-xl px-6 py-3 shadow-md transition hover:bg-yellow-400/80">로그인</button>
      </form>
      <div v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</div>
      <div class="mt-4 text-sm text-gray-400">
        계정이 없으신가요?
        <router-link to="/register" class="text-highlight-indigo hover:underline ml-1">회원가입</router-link>
      </div>
    </div>
  </section>
</template> 