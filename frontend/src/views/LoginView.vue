<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const route  = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.signIn(email.value, password.value)
    router.push(route.query.redirect || '/')
  } catch (e) {
    error.value = 'Email ou senha incorretos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleLogin">
      <h1 class="login-title">Semana Planner</h1>

      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :disabled="loading"
        />
      </div>

      <div class="field">
        <label for="password">Senha</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          :disabled="loading"
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
}

.login-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 40px 36px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  margin-bottom: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  color: var(--color-text-muted);
}

input {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

input:focus {
  border-color: var(--color-accent);
}

input:disabled {
  opacity: 0.6;
}

button {
  padding: 9px;
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  font-size: 13px;
  color: var(--color-alert);
  text-align: center;
}
</style>
