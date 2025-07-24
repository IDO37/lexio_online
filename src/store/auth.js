import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: ''
  }),
  actions: {
    async fetchUser() {
      this.loading = true
      const { data, error } = await supabase.auth.getUser()
      this.user = data?.user || null
      this.error = error ? error.message : ''
      this.loading = false
    },
    async logout() {
      this.loading = true
      const { error } = await supabase.auth.signOut()
      if (!error) this.user = null
      this.error = error ? error.message : ''
      this.loading = false
    }
  }
}) 