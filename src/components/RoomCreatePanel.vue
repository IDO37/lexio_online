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
import { useRouter } from 'vue-router'

const name = ref('')
const players = ref(3)
const usePassword = ref(false)
const password = ref('')
const loading = ref(false)
const creating = ref(false)
const progressStep = ref(0) // 진행 상황 단계
const auth = useAuthStore()
const router = useRouter()

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
      password: usePassword.value ? password.value : null
    }).select()
    
    if (error) {
      console.error('방 생성 오류:', error)
      alert('방 생성 실패: ' + error.message)
      creating.value = false
      return
    }
    
    if (data && data[0]) {
      const room = data[0]
      
      // 2단계: 방 생성자를 플레이어로 추가
      progressStep.value = 2
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
      
      // 3단계: 방 정보가 확실히 반영되었는지 확인
      progressStep.value = 3
      let retryCount = 0
      let roomConfirmed = false
      
      while (retryCount < 10 && !roomConfirmed) {
        const { data: confirmData, error: confirmError } = await supabase
          .from('lo_rooms')
          .select('*')
          .eq('id', room.id)
          .single()
        
        if (confirmData && !confirmError) {
          console.log('방 생성 확인됨:', confirmData.id)
          roomConfirmed = true
          break
        }
        
        console.log(`방 생성 확인 재시도 ${retryCount + 1}/10`)
        await new Promise(resolve => setTimeout(resolve, 300))
        retryCount++
      }
      
      if (!roomConfirmed) {
        console.error('방 생성 확인 실패')
        alert('방 생성에 실패했습니다. 다시 시도해주세요.')
        creating.value = false
        progressStep.value = 0
        return
      }
      
      // 플레이어 추가도 확인
      let playerConfirmed = false
      retryCount = 0
      
      while (retryCount < 10 && !playerConfirmed) {
        const { data: playerData, error: playerError } = await supabase
          .from('lo_room_players')
          .select('*')
          .eq('room_id', room.id)
          .eq('user_id', auth.user.id)
          .single()
        
        if (playerData && !playerError) {
          console.log('플레이어 추가 확인됨:', playerData.user_id)
          playerConfirmed = true
          break
        }
        
        console.log(`플레이어 추가 확인 재시도 ${retryCount + 1}/10`)
        await new Promise(resolve => setTimeout(resolve, 300))
        retryCount++
      }
      
      if (!playerConfirmed) {
        console.error('플레이어 추가 확인 실패')
        alert('플레이어 추가에 실패했습니다. 다시 시도해주세요.')
        creating.value = false
        progressStep.value = 0
        return
      }
      
      console.log('방 생성 및 플레이어 추가 완료, 새로고침하여 게임 방으로 이동합니다.')
      
      // 3초 후 새로고침하여 게임 방으로 이동 (로딩 애니메이션 표시)
      setTimeout(() => {
        // 새로고침하여 게임 방으로 이동
        window.location.href = `/game/${room.id}`
      }, 3000)
      
    }
  } catch (err) {
    console.error('방 생성 중 오류:', err)
    alert('방 생성 중 오류가 발생했습니다.')
    creating.value = false
    progressStep.value = 0
  } finally {
    loading.value = false
  }
}
</script> 