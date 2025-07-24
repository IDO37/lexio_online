<template>
  <nav class="fixed top-0 left-0 w-full z-50 bg-gray-950 bg-opacity-90 shadow-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
      <div class="flex items-center gap-3">
        <router-link to="/" class="flex items-center gap-2 text-highlight-yellow font-bold text-xl">
          <span class="inline-block w-6 h-6 bg-highlight-indigo rounded-full"></span>
          렉시오 온라인
        </router-link>
      </div>
      <div class="hidden md:flex gap-6 items-center">
        <router-link to="/game" class="hover:text-highlight-yellow transition">게임</router-link>
        <router-link to="/rules" class="hover:text-highlight-yellow transition">규칙</router-link>
        <router-link to="/profile" class="hover:text-highlight-yellow transition">프로필</router-link>
        <template v-if="user">
          <span class="text-sm text-gray-300">{{ user.email }}</span>
          <button @click="handleLogout" class="ml-2 bg-gray-700 text-white rounded-xl px-3 py-1 text-sm hover:bg-gray-600 transition">로그아웃</button>
        </template>
        <template v-else>
          <router-link to="/login" class="hover:text-highlight-indigo transition">로그인</router-link>
          <router-link to="/register" class="hover:text-highlight-indigo transition">회원가입</router-link>
        </template>
      </div>
      <div class="md:hidden">
        <!-- 모바일 메뉴(추후 구현) -->
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../store/auth.js'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const { user, loading } = storeToRefs(auth)
const router = useRouter()

onMounted(() => {
  auth.fetchUser()
})

function handleLogout() {
  auth.logout()
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