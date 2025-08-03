<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center border border-gray-600">
    <img src="/favicon.svg" alt="렉시오 로고" class="w-16 h-16 mb-4" />
    <h3 class="text-xl font-bold text-highlight-red mb-4">Create a new game</h3>

    <!-- 로딩 상태 -->
    <div v-if="creating" class="w-full text-center py-8">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-highlight-red mx-auto mb-6"></div>
      <p class="text-highlight-red font-bold text-lg mb-2">방을 생성하고 있습니다...</p>
      <p class="text-lexio-text-muted mb-4">잠시만 기다려주세요</p>
      <div class="bg-lexio-bg-light rounded-lg p-4 border border-gray-600">
        <p class="text-sm text-lexio-text-muted mb-2">진행 상황:</p>
        <div class="space-y-1 text-xs text-lexio-text-muted">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" :class="progressStep >= 1 ? 'bg-green-400' : 'bg-gray-400'"></div>
            <span :class="progressStep >= 1 ? 'text-green-400' : ''">방 생성 중...</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" :class="progressStep >= 2 ? 'bg-green-400' : progressStep >= 1 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'"></div>
            <span :class="progressStep >= 2 ? 'text-green-400' : progressStep >= 1 ? 'text-yellow-400' : ''">플레이어 추가 중...</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" :class="progressStep >= 3 ? 'bg-green-400' : progressStep >= 2 ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'"></div>
            <span :class="progressStep >= 3 ? 'text-green-400' : progressStep >= 2 ? 'text-blue-400' : ''">게임 방으로 이동 준비 중...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 방 생성 폼 -->
    <form v-else class="flex flex-col gap-4 w-full" @submit.prevent="createRoom">
      <input v-model="name" type="text" placeholder="Room Name (optional)" class="rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text focus:outline-none focus:ring-2 focus:ring-highlight-red transition placeholder-gray-400" />
      <select v-model="players" class="rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text focus:outline-none focus:ring-2 focus:ring-highlight-red transition">
        <option value="3">3 Players</option>
        <option value="4">4 Players</option>
        <option value="5">5 Players</option>
      </select>
      <label class="flex items-center gap-2 text-lexio-text-muted">
        <input type="checkbox" v-model="usePassword" class="accent-highlight-red" />
        비밀번호 설정
      </label>
      <input v-if="usePassword" v-model="password" type="password" placeholder="Password" class="rounded-lg px-4 py-2 bg-lexio-bg text-lexio-text focus:outline-none focus:ring-2 focus:ring-highlight-red transition placeholder-gray-400" />
      <button type="submit" :disabled="loading" class="bg-highlight-red text-white font-bold rounded-lg px-4 py-2 mt-2 shadow-md transition hover:bg-highlight-red-dark disabled:opacity-50">
        <span v-if="loading">Creating...</span>
        <span v-else>Create</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/auth.js'

const name = ref('')
const players = ref(3)
const usePassword = ref(false)
const password = ref('')
const loading = ref(false)
const creating = ref(false)
const progressStep = ref(0)
const room = ref(null)

const auth = useAuthStore()

async function waitFor(conditionFn, maxTries = 10, delay = 300) {
  let tries = 0
  while (tries < maxTries) {
    const result = await conditionFn()
    if (result) return true
    await new Promise((resolve) => setTimeout(resolve, delay))
    tries++
  }
  return false
}

async function createRoom() {
  if (!auth.user) {
    alert('로그인 후 방을 생성할 수 있습니다.')
    return
  }

  loading.value = true
  creating.value = true
  progressStep.value = 0

  try {
    // 1단계: 방 생성
    progressStep.value = 1
    const { data, error } = await supabase.from('lo_rooms').insert({
      name: name.value || `Room ${Date.now()}`,
      status: 'waiting',
      created_by: auth.user.id,
      max_players: players.value,
      is_public: !usePassword.value,
      password: usePassword.value ? password.value : null,
      players: 1
    }).select()

    if (error || !data || !data[0]) {
      throw new Error(error?.message || '방 생성 실패')
    }

    room.value = data[0]

    // 2단계: 플레이어 추가
    progressStep.value = 2
    const { error: joinError } = await supabase.from('lo_room_players').insert({
      room_id: room.value.id,
      user_id: auth.user.id,
      joined_at: new Date().toISOString()
    })

    if (joinError) {
      throw new Error('플레이어 추가 실패: ' + joinError.message)
    }

    // 3단계: 방 생성 확인
    progressStep.value = 3
    const roomConfirmed = await waitFor(async () => {
      const { data: confirmData } = await supabase
        .from('lo_rooms')
        .select('id')
        .eq('id', room.value.id)
        .single()
      return !!confirmData
    })

    const playerConfirmed = await waitFor(async () => {
      const { data: playerData } = await supabase
        .from('lo_room_players')
        .select('user_id')
        .eq('room_id', room.value.id)
        .eq('user_id', auth.user.id)
        .single()
      return !!playerData
    })

    if (!roomConfirmed || !playerConfirmed) {
      throw new Error('방 또는 플레이어 정보 확인 실패')
    }

    // 게임방으로 이동
    setTimeout(() => {
      window.location.href = `/game/${room.value.id}`
    }, 2000)
  } catch (err) {
    console.error('방 생성 중 오류:', err)
    alert('오류 발생: ' + err.message)
    progressStep.value = 0
    creating.value = false
  } finally {
    loading.value = false
  }
}
</script>
