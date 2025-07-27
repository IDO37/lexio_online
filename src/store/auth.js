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
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          this.error = error.message
          this.user = null
        } else {
          this.user = data?.user || null
          this.error = ''
        }
      } catch (err) {
        this.error = '사용자 정보를 불러오지 못했습니다.'
        this.user = null
      } finally {
        this.loading = false
      }
    },
    
    async login(email, password) {
      this.loading = true
      this.error = ''
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          this.error = error.message
          this.user = null
          return { success: false, error: error.message }
        } else {
          this.user = data.user
          this.error = ''
          return { success: true }
        }
      } catch (err) {
        this.error = '로그인 중 오류가 발생했습니다.'
        this.user = null
        return { success: false, error: '로그인 중 오류가 발생했습니다.' }
      } finally {
        this.loading = false
      }
    },
    
    async logout() {
      this.loading = true
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          this.error = error.message
        } else {
          this.user = null
          this.error = ''
        }
      } catch (err) {
        this.error = '로그아웃 중 오류가 발생했습니다.'
      } finally {
        this.loading = false
      }
    },
    
    // 실시간 인증 상태 구독
    subscribeToAuthChanges() {
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (event === 'SIGNED_IN' && session) {
          this.user = session.user
          this.error = ''
        } else if (event === 'SIGNED_OUT') {
          this.user = null
          this.error = ''
        }
      })
    }
  }
}) 