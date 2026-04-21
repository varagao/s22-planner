<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProjectByToken, fetchTasksByProject } from '../services/pb'

const route = useRoute()

const project = ref(null)
const tasks   = ref([])
const state   = ref('loading') // loading | ok | invalid

const STATUS_LABELS = { doing: 'Em andamento', done: 'Concluído' }

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

onMounted(async () => {
  try {
    project.value = await fetchProjectByToken(route.params.token)
    tasks.value   = await fetchTasksByProject(project.value.id, route.params.token)
    state.value   = 'ok'
  } catch {
    state.value = 'invalid'
  }
})
</script>

<template>
  <div class="viewer-page">

    <!-- Loading -->
    <div v-if="state === 'loading'" class="viewer-loading">
      Carregando…
    </div>

    <!-- Token inválido -->
    <div v-else-if="state === 'invalid'" class="viewer-invalid">
      <p class="invalid-title">Link inválido ou expirado.</p>
      <p class="invalid-sub">Solicite um novo link ao responsável pelo projeto.</p>
    </div>

    <!-- Conteúdo -->
    <template v-else>
      <header class="viewer-header">
        <div
          class="viewer-accent"
          :style="{ backgroundColor: project.expand?.client?.color ?? 'var(--color-accent)' }"
        />
        <div class="viewer-title-block">
          <p class="viewer-client">{{ project.expand?.client?.name }}</p>
          <h1 class="viewer-project">{{ project.name }}</h1>
        </div>
      </header>

      <main class="viewer-main">
        <div v-if="tasks.length === 0" class="viewer-empty">
          Nenhuma entrega disponível no momento.
        </div>

        <ul v-else class="task-list">
          <li
            v-for="task in tasks"
            :key="task.id"
            class="task-row"
            :class="task.status"
          >
            <span class="task-status-dot" />
            <div class="task-info">
              <span class="task-name">{{ task.name }}</span>
              <span v-if="task.due_date" class="task-date">{{ formatDate(task.due_date) }}</span>
            </div>
            <span class="task-badge">{{ STATUS_LABELS[task.status] }}</span>
          </li>
        </ul>
      </main>
    </template>

  </div>
</template>

<style scoped>
.viewer-page {
  min-height: 100vh;
  background-color: var(--color-bg);
  font-family: var(--font-base);
}

.viewer-loading,
.viewer-invalid {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 15px;
}

.invalid-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
}

.invalid-sub {
  font-size: 14px;
  color: var(--color-text-muted);
}

/* header */
.viewer-header {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.viewer-accent {
  width: 5px;
  flex-shrink: 0;
}

.viewer-title-block {
  padding: 24px 32px;
}

.viewer-client {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.viewer-project {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
}

/* main */
.viewer-main {
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 24px;
}

.viewer-empty {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 15px;
  padding: 48px 0;
}

.task-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
}

.task-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--color-border);
}

.task-row.doing .task-status-dot {
  background-color: var(--color-accent);
}

.task-row.done .task-status-dot {
  background-color: #4CAF50;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.task-name {
  font-size: 15px;
  color: var(--color-text);
}

.task-row.done .task-name {
  color: var(--color-text-muted);
}

.task-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.task-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 99px;
  flex-shrink: 0;
  background-color: var(--color-border);
  color: var(--color-text-muted);
}

.task-row.doing .task-badge {
  background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.task-row.done .task-badge {
  background-color: color-mix(in srgb, #4CAF50 15%, transparent);
  color: #2e7d32;
}

@media (max-width: 767px) {
  .viewer-title-block { padding: 20px; }
  .viewer-project { font-size: 18px; }
  .viewer-main { padding: 24px 16px; }
  .task-name { font-size: 14px; }
}
</style>
