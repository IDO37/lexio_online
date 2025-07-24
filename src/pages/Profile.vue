<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth.js'
import { supabase } from '../lib/supabase.js'

const auth = useAuthStore()
const stats = ref(null)
const loading = ref(false)
const error = ref('')

async function fetchStats() {
  if (!auth.user) return
  loading.value = true
  const { data, error: err } = await supabase.from('LO_stats').select('*').eq('user_id', auth.user.id).single()
  if (err) {
    error.value = '전적 정보를 불러올 수 없습니다.'
    stats.value = null
  } else {
    stats.value = data
  }
  loading.value = false
}

onMounted(fetchStats)
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh]">
    <div v-if="!auth.user" class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md text-center text-yellow-400 font-bold">
      로그인 후 전적을 확인할 수 있습니다.
    </div>
    <div v-else class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md text-center">
      <h2 class="text-3xl font-bold mb-4 text-highlight-yellow">프로필</h2>
      <div class="mb-4">
        <div class="w-24 h-24 mx-auto rounded-full bg-highlight-indigo flex items-center justify-center text-4xl font-bold text-white shadow-md">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
        <div class="mt-2 text-lg font-semibold text-white">{{ auth.user.email }}</div>
      </div>
      <div v-if="loading" class="text-gray-400">전적 불러오는 중...</div>
      <div v-else-if="error" class="text-red-400">{{ error }}</div>
      <div v-else-if="stats" class="bg-gray-900 rounded-xl p-4 shadow-inner">
        <div class="text-highlight-yellow font-bold mb-2">전적</div>
        <div class="text-gray-300">승리: {{ stats.wins }} | 패배: {{ stats.losses }} | 총 게임: {{ stats.total_games }}</div>
        <div class="text-gray-400 text-sm mt-2">최근 갱신: {{ stats.updated_at?.slice(0, 10) }}</div>
      </div>
      <div v-else class="text-gray-400">아직 전적 데이터가 없습니다.</div>
    </div>
  </section>
</template> 