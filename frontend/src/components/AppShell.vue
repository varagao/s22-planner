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

      <!-- Logo -->
      <RouterLink to="/" class="shell-logo">
        <img src="/logo.svg" alt="S22" class="logo-img" />
      </RouterLink>

      <nav class="shell-nav">
        <RouterLink to="/">Semana</RouterLink>

        <!-- Criar (dropdown) -->
        <div v-if="auth.isAdmin" class="dropdown">
          <RouterLink to="/manage" class="dropdown-trigger">Criar</RouterLink>
          <div class="dropdown-menu">
            <RouterLink to="/manage?tab=clients">Cliente</RouterLink>
            <RouterLink to="/manage?tab=projects">Projeto</RouterLink>
            <RouterLink to="/manage?tab=tasks">Tarefa</RouterLink>
          </div>
        </div>
      </nav>

      <!-- Perfil (dropdown) -->
      <div class="shell-user">
        <div v-if="auth.isAdmin" class="dropdown dropdown--right">
          <span class="shell-username dropdown-trigger">{{ auth.user?.name || auth.user?.email }}</span>
          <div class="dropdown-menu">
            <RouterLink to="/people">Pessoas</RouterLink>
            <button class="menu-logout" @click="handleLogout">Sair</button>
          </div>
        </div>
        <template v-else>
          <span class="shell-username">{{ auth.user?.name || auth.user?.email }}</span>
          <button class="shell-logout" @click="handleLogout">Sair</button>
        </template>
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
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* ── Logo ───────────────────────────────────────────────────────────────────── */
.shell-logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  text-decoration: none;
}

.logo-img {
  height: 24px;
  width: auto;
  display: block;
}

/* ── Nav ────────────────────────────────────────────────────────────────────── */
.shell-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.shell-nav > a,
.shell-nav .dropdown-trigger {
  padding: 4px 12px;
  border-radius: var(--radius-block);
  color: var(--color-text);
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid transparent;
  transition: border-color 0.15s;
  cursor: pointer;
  background: none;
  white-space: nowrap;
}

.shell-nav > a:hover,
.shell-nav .dropdown-trigger:hover {
  border-color: var(--color-border);
}

.shell-nav > a.router-link-active,
.shell-nav .dropdown > a.router-link-active {
  border-color: var(--color-text);
  color: var(--color-text);
  background: none;
}

/* ── Dropdown genérico ──────────────────────────────────────────────────────── */
.dropdown {
  position: relative;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  min-width: 140px;
  padding: 4px;
  z-index: 200;
  flex-direction: column;
  gap: 2px;
}

.dropdown--right .dropdown-menu {
  left: auto;
  right: 0;
}

.dropdown:hover .dropdown-menu {
  display: flex;
}

.dropdown-menu a,
.dropdown-menu .menu-logout {
  display: block;
  padding: 7px 12px;
  color: var(--color-text);
  font-size: 14px;
  text-decoration: none;
  border-radius: var(--radius-block);
  border: none;
  background: none;
  font-family: var(--font-base);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.12s;
}

.dropdown-menu a:hover,
.dropdown-menu .menu-logout:hover {
  background-color: var(--color-border);
}

/* ── Perfil ─────────────────────────────────────────────────────────────────── */
.shell-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.shell-username {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  cursor: default;
  white-space: nowrap;
}

.dropdown--right .shell-username {
  cursor: pointer;
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

/* ── Main ───────────────────────────────────────────────────────────────────── */
.shell-main {
  flex: 1;
  padding: var(--spacing-page);
}
</style>
