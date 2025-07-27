<template>
  <div class="bg-lexio-bg-light rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center border border-gray-600">
    <img src="/favicon.svg" alt="렉시오 로고" class="w-16 h-16 mb-4" />
    <h3 class="text-xl font-bold text-highlight-red mb-4">Create a new game</h3>
    
    <!-- 로딩 상태 -->
    <div v-if="creating" class="w-full text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-highlight-red mx-auto mb-4"></div>
      <p class="text-lexio-text-muted">방을 생성하고 있습니다...</p>
      <p class="text-sm text-lexio-text-muted mt-2">잠시만 기다려주세요</p>
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
import { useRouter } from 'vue-router'

const name = ref('')
const players = ref(3)
const usePassword = ref(false)
const password = ref('')
const loading = ref(false)
const creating = ref(false)
const auth = useAuthStore()
const router = useRouter()

async function createRoom() {
  if (!auth.user) {
    alert('로그인 후 방을 생성할 수 있습니다.')
    return
  }
  
  loading.value = true
  creating.value = true
  
  try {
    // 방 생성
    const { data, error } = await supabase.from('lo_rooms').insert({
      name: name.value || `Room ${Date.now()}`,
      status: 'waiting',
      created_by: auth.user.id,
      max_players: players.value,
      is_public: !usePassword.value,
      password: usePassword.value ? password.value : null
    }).select()
    
    if (error) {
      alert('방 생성 실패: ' + error.message)
      creating.value = false
      return
    }
    
    if (data && data[0]) {
      const room = data[0]
      
      // 방 생성자를 플레이어로 추가
      const { error: joinError } = await supabase
        .from('lo_room_players')
        .insert({
          room_id: room.id,
          user_id: auth.user.id,
          joined_at: new Date().toISOString()
        })
      
      if (joinError) {
        console.error('플레이어 추가 실패:', joinError)
      }
      
      // 방 정보가 확실히 반영되었는지 확인
      let retryCount = 0
      while (retryCount < 5) {
        const { data: confirmData, error: confirmError } = await supabase
          .from('lo_rooms')
          .select('*')
          .eq('id', room.id)
          .single()
        
        if (confirmData && !confirmError) {
          break
        }
        
        await new Promise(resolve => setTimeout(resolve, 200))
        retryCount++
      }
      
      // 1초 후 게임 방으로 이동 (로딩 애니메이션 표시)
      setTimeout(() => {
        // 라우터를 사용하여 게임 방으로 이동
        router.push(`/game/${room.id}`)
      }, 1000)
      
    }
  } catch (err) {
    alert('방 생성 중 오류가 발생했습니다.')
    creating.value = false
  } finally {
    loading.value = false
  }
}
</script> 