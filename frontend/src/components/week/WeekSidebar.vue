<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
})

defineEmits(['drag-start'])

// Agrupa tarefas por cliente → projeto
const grouped = computed(() => {
  const map = new Map()

  for (const client of props.clients) {
    map.set(client.id, { client, projects: new Map() })
  }

  for (const task of props.tasks) {
    const project  = task.expand?.project
    if (!project) continue
    const clientId = project.client
    const client   = props.clients.find(c => c.id === clientId)
    if (!client) continue

    if (!map.has(client.id)) {
      map.set(client.id, { client, projects: new Map() })
    }

    const clientEntry = map.get(client.id)
    if (!clientEntry.projects.has(project.id)) {
      clientEntry.projects.set(project.id, { project, tasks: [] })
    }
    clientEntry.projects.get(project.id).tasks.push(task)
  }

  // Filtra clientes sem tarefas
  return [...map.values()].filter(c => c.projects.size > 0)
})

function onDragStart(e, task) {
  e.dataTransfer.setData('taskId', task.id)
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-title">Tarefas</div>

    <div v-if="grouped.length === 0" class="sidebar-empty">
      Nenhuma tarefa ativa.
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

        <div
          v-for="task in proj.tasks"
          :key="task.id"
          class="task-item"
          draggable="true"
          @dragstart="onDragStart($event, task)"
        >
          <span
            class="task-dot"
            :style="{ backgroundColor: entry.client.color }"
          />
          {{ task.name }}
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--spacing-block) 0;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  padding: 0 var(--spacing-block) 10px;
}

.sidebar-empty {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 0 var(--spacing-block);
}

.client-group {
  margin-bottom: 16px;
}

.client-label {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px var(--spacing-block);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
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
  padding: 2px var(--spacing-block) 2px calc(var(--spacing-block) + 15px);
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px var(--spacing-block) 5px calc(var(--spacing-block) + 15px);
  font-size: 13px;
  color: var(--color-text);
  cursor: grab;
  border-radius: var(--radius-block);
  transition: background-color 0.12s;
}

.task-item:hover {
  background-color: var(--color-surface);
}

.task-item:active {
  cursor: grabbing;
}

.task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
}
</style>
