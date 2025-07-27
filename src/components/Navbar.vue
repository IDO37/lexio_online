<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-lexio-bg-light border-b border-gray-600 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="flex items-center space-x-2 text-highlight-red font-bold text-xl hover:text-highlight-red-dark transition">
            <span>LEXIO</span>
          </router-link>
        </div>
        
        <div class="flex items-center space-x-4">
          <router-link to="/" class="text-lexio-text-muted hover:text-highlight-red transition px-3 py-2 rounded-md text-sm font-medium">홈</router-link>
          <router-link to="/game" class="text-lexio-text-muted hover:text-highlight-red transition px-3 py-2 rounded-md text-sm font-medium">게임</router-link>
          <router-link to="/rules" class="text-lexio-text-muted hover:text-highlight-red transition px-3 py-2 rounded-md text-sm font-medium">규칙</router-link>
          <router-link to="/profile" class="text-lexio-text-muted hover:text-highlight-red transition px-3 py-2 rounded-md text-sm font-medium">프로필</router-link>
          
          <div v-if="auth.user" class="flex items-center space-x-2">
            <span class="text-lexio-text-muted text-sm">{{ auth.user.email }}</span>
            <button 
              @click="handleLogout" 
              :disabled="auth.loading"
              class="bg-highlight-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-highlight-red-dark transition disabled:opacity-50"
            >
              {{ auth.loading ? '로그아웃 중...' : '로그아웃' }}
            </button>
          </div>
          <div v-else class="flex items-center space-x-2">
            <router-link to="/login" class="text-lexio-text-muted hover:text-highlight-red transition px-3 py-2 rounded-md text-sm font-medium">로그인</router-link>
            <router-link to="/register" class="bg-highlight-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-highlight-red-dark transition">
              회원가입
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../store/auth.js'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<style scoped>
.text-highlight-yellow {
  color: #facc15;
}
.bg-highlight-indigo {
  background-color: #6366f1;
}
</style> 