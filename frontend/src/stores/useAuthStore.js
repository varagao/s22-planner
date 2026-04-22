import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb, { login, logout } from '../services/pb'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(pb.authStore.model)
  const token = ref(pb.authStore.token)

  const isLoggedIn = computed(() => pb.authStore.isValid)
  const role = computed(() => user.value?.role ?? null)
  const isAdmin = computed(() => role.value === 'admin')
  const isMember = computed(() => role.value === 'member')

  // Sincroniza com mudanças do authStore (ex: token expirado)
  pb.authStore.onChange((newToken, newModel) => {
    token.value = newToken
    user.value = newModel
  })

  async function signIn(email, password) {
    await login(email, password)
    user.value = pb.authStore.model
    token.value = pb.authStore.token
  }

  function signOut() {
    logout()
    user.value = null
    token.value = null
  }

  // Valida o token contra o servidor. Se inválido, faz logout.
  async function refresh() {
    if (!pb.authStore.isValid) return
    try {
      await pb.collection('users').authRefresh()
      user.value = pb.authStore.model
    } catch {
      signOut()
    }
  }

  return { user, token, isLoggedIn, role, isAdmin, isMember, signIn, signOut, refresh }
})
