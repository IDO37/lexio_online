<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <Navbar />
    <main class="pt-20">
      <router-view />
    </main>
  </div>
</template>
