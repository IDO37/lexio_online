<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './store/auth.js'
import Navbar from './components/Navbar.vue'

const auth = useAuthStore()

onMounted(async () => {
  // 앱 시작 시 사용자 정보 로드
  await auth.fetchUser()
  
  // 인증 상태 변화 구독
  auth.subscribeToAuthChanges()
})
</script>

<template>
  <div class="min-h-screen bg-lexio-bg text-lexio-text">
    <Navbar />
    <router-view />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
