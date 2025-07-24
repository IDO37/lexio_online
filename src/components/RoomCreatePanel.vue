<template>
  <div class="bg-[#3d332d] rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center">
    <img src="/favicon.svg" alt="렉시오 로고" class="w-16 h-16 mb-4" />
    <h3 class="text-xl font-bold text-white mb-4">Create a new game</h3>
    <form class="flex flex-col gap-4 w-full" @submit.prevent="createRoom">
      <input v-model="name" type="text" placeholder="Room Name (optional)" class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
      <select v-model="players" class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition">
        <option value="2">2 Players</option>
        <option value="3">3 Players</option>
        <option value="4">4 Players</option>
      </select>
      <select v-model="turnLimit" class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition">
        <option value="2">2 min/turn</option>
        <option value="3">3 min/turn</option>
        <option value="5">5 min/turn</option>
      </select>
      <select v-model="isPublic" class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition">
        <option :value="true">Public</option>
        <option :value="false">Private</option>
      </select>
      <input v-if="!isPublic" v-model="password" type="password" placeholder="Password (optional)" class="rounded-lg px-4 py-2 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" />
      <button type="submit" :disabled="loading" class="bg-green-300 text-gray-900 font-bold rounded-lg px-4 py-2 mt-2 shadow-md transition hover:bg-green-400/90 disabled:opacity-50">
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
const players = ref(2)
const turnLimit = ref(2)
const isPublic = ref(true)
const password = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()

async function createRoom() {
  if (!auth.user) {
    alert('로그인 후 방을 생성할 수 있습니다.')
    return
  }
  loading.value = true
  const { data, error } = await supabase.from('LO_rooms').insert({
    name: name.value,
    status: 'waiting',
    created_by: auth.user.id,
    max_players: players.value,
    turn_limit: turnLimit.value,
    is_public: isPublic.value,
    password: isPublic.value ? null : password.value
  }).select()
  loading.value = false
  if (error) {
    alert('방 생성 실패: ' + error.message)
  } else if (data && data[0]) {
    router.push(`/game/${data[0].id}`)
  }
}
</script> 