import { createRouter, createWebHistory } from 'vue-router'

import Home from '../pages/Home.vue'
import Game from '../pages/Game.vue'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'
import Rules from '../pages/Rules.vue'
import Profile from '../pages/Profile.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/game', component: Game },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/rules', component: Rules },
  { path: '/profile', component: Profile },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router 