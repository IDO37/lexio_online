<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-8">
    <div class="w-full max-w-4xl bg-gray-800 rounded-xl shadow-md p-6 flex flex-col gap-6">
      <div class="flex flex-col md:flex-row gap-6">
        <div class="flex-1">
          <GameBoard :board="game.board" :current-player="game.currentPlayer" />
        </div>
        <div class="w-full md:w-1/3 flex flex-col gap-4">
          <PlayerPanel :players="game.players" />
          <CardDeck :my-hand="game.myHand" @submit-cards="game.submitCards" />
        </div>
      </div>
      <RoomList />
      <div v-if="game.turnMessage" class="mt-4 text-highlight-yellow font-bold text-center animate-pulse">{{ game.turnMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../store/game.js'
import { storeToRefs } from 'pinia'
import GameBoard from '../components/GameBoard.vue'
import PlayerPanel from '../components/PlayerPanel.vue'
import CardDeck from '../components/CardDeck.vue'
import RoomList from '../components/RoomList.vue'

const game = useGameStore()
</script> 