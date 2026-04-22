<script setup>
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="shell">
    <header class="shell-header">
      <span class="shell-logo">Semana Planner</span>

      <nav class="shell-nav">
        <RouterLink to="/">Semana</RouterLink>
        <template v-if="auth.isAdmin">
          <RouterLink to="/manage">Gestão</RouterLink>
          <RouterLink to="/people">Pessoas</RouterLink>
        </template>
      </nav>

      <div class="shell-user">
        <span class="shell-username">{{ auth.user?.name || auth.user?.email }}</span>
        <button class="shell-logout" @click="handleLogout">Sair</button>
      </div>
    </header>

    <main class="shell-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.shell-header {
  height: var(--header-height);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-page);
  gap: 32px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.shell-logo {
  font-weight: 600;
  font-size: 15px;
  color: var(--color-text);
  white-space: nowrap;
}

.shell-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.shell-nav a {
  padding: 5px 12px;
  border-radius: var(--radius-block);
  color: var(--color-text);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s, background-color 0.15s;
}

.shell-nav a:hover {
  color: var(--color-text);
  background-color: var(--color-border);
}

.shell-nav a.router-link-active {
  color: var(--color-accent);
  background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.shell-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.shell-username {
  font-size: 13px;
  color: var(--color-text-muted);
}

.shell-logout {
  font-size: 13px;
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 4px 10px;
  cursor: pointer;
  font-family: var(--font-base);
  transition: color 0.15s, border-color 0.15s;
}

.shell-logout:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.shell-main {
  flex: 1;
  padding: var(--spacing-page);
}
</style>
