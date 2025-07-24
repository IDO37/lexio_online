<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] bg-[#18181b] py-8">
    <div class="w-full max-w-6xl flex flex-col md:flex-row gap-8">
      <!-- 좌측: 방 생성 패널 -->
      <div class="w-full md:w-1/3 flex flex-col items-center">
        <RoomCreatePanel />
        <div class="mt-8 flex flex-col items-center gap-2">
          <a href="https://discord.gg/" target="_blank" class="text-indigo-400 font-bold flex items-center gap-2 hover:underline">
            <span>JOIN US ON</span> <span class="text-2xl">DISCORD</span>
          </a>
          <span class="text-xs text-gray-400 mt-2">Tip Jar</span>
        </div>
      </div>
      <!-- 우측: 방 목록/검색 -->
      <div class="w-full md:w-2/3">
        <div class="flex items-center gap-2 mb-4">
          <input type="text" placeholder="Search rooms" class="w-full rounded-xl px-4 py-2 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-highlight-yellow transition" v-model="search" />
        </div>
        <RoomList :search="search" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RoomCreatePanel from '../components/RoomCreatePanel.vue'
import RoomList from '../components/RoomList.vue'
const search = ref('')
</script> 