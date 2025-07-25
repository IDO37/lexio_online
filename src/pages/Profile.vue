<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth.js'
import { supabase } from '../lib/supabase.js'

const auth = useAuthStore()
const stats = ref(null)
const loading = ref(false)
const error = ref('')
const ranking = ref([])

async function fetchStats() {
  if (!auth.user) return
  loading.value = true
  const { data, error: err } = await supabase.from('lo_stats').select('*').eq('user_id', auth.user.id).single()
  if (err) {
    error.value = '전적 정보를 불러올 수 없습니다.'
    stats.value = null
  } else {
    stats.value = data
  }
  loading.value = false
}

async function fetchRanking() {
  loading.value = true
  // LO_stats와 auth.users 조인, 승수/승률 기준 내림차순
  const { data, error: err } = await supabase.rpc('get_lexio_ranking')
  if (err) {
    error.value = '랭킹 정보를 불러올 수 없습니다.'
    ranking.value = []
  } else {
    ranking.value = data
  }
  loading.value = false
}

const myRank = computed(() => {
  if (!auth.user || !ranking.value.length) return null
  return ranking.value.findIndex(r => r.user_id === auth.user.id) + 1
})

onMounted(() => {
  fetchStats()
  fetchRanking()
})
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh]">
    <div v-if="!auth.user" class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-md text-center text-yellow-400 font-bold">
      로그인 후 전적을 확인할 수 있습니다.
    </div>
    <div v-else class="bg-gray-800 rounded-xl shadow-md p-8 w-full max-w-2xl text-center">
      <h2 class="text-3xl font-bold mb-4 text-highlight-yellow">프로필</h2>
      <div class="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="w-24 h-24 mx-auto rounded-full bg-highlight-indigo flex items-center justify-center text-4xl font-bold text-white shadow-md">
            {{ auth.user.email.charAt(0).toUpperCase() }}
          </div>
          <div class="mt-2 text-lg font-semibold text-white">{{ auth.user.email }}</div>
        </div>
        <div class="flex-1">
          <div v-if="loading" class="text-gray-400">전적 불러오는 중...</div>
          <div v-else-if="error" class="text-red-400">{{ error }}</div>
          <div v-else-if="stats" class="bg-gray-900 rounded-xl p-4 shadow-inner">
            <div class="text-highlight-yellow font-bold mb-2">전적</div>
            <div class="text-gray-300">승리: {{ stats.wins }} | 패배: {{ stats.losses }} | 총 게임: {{ stats.total_games }}</div>
            <div class="text-gray-400 text-sm mt-2">최근 갱신: {{ stats.updated_at?.slice(0, 10) }}</div>
            <div v-if="myRank" class="mt-2 text-indigo-400 font-bold">내 랭킹: {{ myRank }}위</div>
          </div>
          <div v-else class="text-gray-400">아직 전적 데이터가 없습니다.</div>
        </div>
      </div>
      <div class="mt-8">
        <h3 class="text-xl font-bold mb-2 text-highlight-yellow">전체 랭킹 TOP 10</h3>
        <div v-if="loading" class="text-gray-400">랭킹 불러오는 중...</div>
        <div v-else-if="error" class="text-red-400">{{ error }}</div>
        <table v-else class="w-full text-left bg-gray-900 rounded-xl overflow-hidden">
          <thead>
            <tr class="bg-gray-800 text-highlight-yellow">
              <th class="py-2 px-4">순위</th>
              <th class="py-2 px-4">이메일</th>
              <th class="py-2 px-4">승리</th>
              <th class="py-2 px-4">패배</th>
              <th class="py-2 px-4">총 게임</th>
              <th class="py-2 px-4">승률</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in ranking.slice(0, 10)" :key="r.user_id" :class="{'bg-highlight-yellow/10': r.user_id === auth.user.id}">
              <td class="py-2 px-4 font-bold">{{ i + 1 }}</td>
              <td class="py-2 px-4">{{ r.email }}</td>
              <td class="py-2 px-4">{{ r.wins }}</td>
              <td class="py-2 px-4">{{ r.losses }}</td>
              <td class="py-2 px-4">{{ r.total_games }}</td>
              <td class="py-2 px-4">{{ r.total_games ? ((r.wins / r.total_games) * 100).toFixed(1) + '%' : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template> 