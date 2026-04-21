<script setup>
import { computed } from 'vue'
import BaseModal from '../BaseModal.vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
  dayLabel: { type: String, default: '' },
})

const emit = defineEmits(['select', 'close'])

// Agrupa tarefas por cliente → projeto (mesmo padrão da sidebar)
const grouped = computed(() => {
  const map = new Map()

  for (const client of props.clients) {
    map.set(client.id, { client, projects: new Map() })
  }

  for (const task of props.tasks) {
    const project = task.expand?.project
    const client  = project?.expand?.client
    if (!project || !client) continue

    if (!map.has(client.id)) {
      map.set(client.id, { client, projects: new Map() })
    }
    const ce = map.get(client.id)
    if (!ce.projects.has(project.id)) {
      ce.projects.set(project.id, { project, tasks: [] })
    }
    ce.projects.get(project.id).tasks.push(task)
  }

  return [...map.values()].filter(c => c.projects.size > 0)
})
</script>

<template>
  <BaseModal :title="`Alocar em ${dayLabel}`" @close="$emit('close')">
    <div v-if="grouped.length === 0" class="empty">
      Nenhuma tarefa disponível.
    </div>

    <div v-for="entry in grouped" :key="entry.client.id" class="client-group">
      <div class="client-label">
        <span class="client-dot" :style="{ backgroundColor: entry.client.color }" />
        {{ entry.client.name }}
      </div>

      <div
        v-for="proj in [...entry.projects.values()]"
        :key="proj.project.id"
        class="project-group"
      >
        <div class="project-label">{{ proj.project.name }}</div>

        <button
          v-for="task in proj.tasks"
          :key="task.id"
          class="task-btn"
          @click="$emit('select', task)"
        >
          <span class="task-dot" :style="{ backgroundColor: entry.client.color }" />
          {{ task.name }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.empty {
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.client-group {
  margin-bottom: 16px;
}

.client-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.client-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-group {
  margin-bottom: 8px;
}

.project-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
  padding-left: 15px;
  margin-bottom: 4px;
}

.task-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px 9px 15px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  margin-bottom: 4px;
  transition: border-color 0.15s;
}

.task-btn:hover {
  border-color: var(--color-accent);
}

.task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
}
</style>
