<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
  taskAllocatedHours: { type: Object, default: () => ({}) },
})

// Agrupa tarefas por cliente -> projeto para espelhar a visualizacao da Lista.
const grouped = computed(() => {
  const map = new Map()

  for (const client of props.clients) {
    map.set(client.id, { client, projects: new Map() })
  }

  for (const task of props.tasks) {
    const project = task.expand?.project
    if (!project) continue

    const client = props.clients.find(c => c.id === project.client)
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

  return [...map.values()].filter(entry => entry.projects.size > 0)
})

function onDragStart(e, task) {
  e.dataTransfer.setData('taskId', task.id)
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="sidebar">
    <div v-if="grouped.length === 0" class="sidebar-empty">
      Nenhuma tarefa ativa.
    </div>

    <div v-for="entry in grouped" :key="entry.client.id" class="client-group">
      <div class="client-row">
        <span class="client-label">{{ entry.client.name }}</span>
      </div>

      <div
        v-for="proj in [...entry.projects.values()]"
        :key="proj.project.id"
        class="project-group"
      >
        <div class="project-row">
          <span class="node-slot" aria-hidden="true" />
          <span class="project-label">{{ proj.project.name }}</span>
        </div>

        <div
          v-for="task in proj.tasks"
          :key="task.id"
          class="task-row"
          :class="{ 'is-allocated': (taskAllocatedHours[task.id] || 0) > 0 }"
          draggable="true"
          @dragstart="onDragStart($event, task)"
        >
          <span class="node-slot" aria-hidden="true" />
          <span class="task-label">{{ task.name }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  --list-indent: 24px;
  --list-marker-size: 16px;
  width: var(--sidebar-width);
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 10px 6px 14px;
}

.sidebar-empty {
  padding: 2px 6px;
  font-size: 16.5px;
  line-height: 1.2;
  color: #b7aa9d;
}

.client-group {
  display: flex;
  flex-direction: column;
}

.project-group {
  display: flex;
  flex-direction: column;
  margin-left: var(--list-indent);
}

.client-row,
.project-row,
.task-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 2px 6px;
  border-radius: var(--radius-block);
}

.task-row {
  margin-left: var(--list-indent);
  cursor: grab;
  transition: background-color 0.12s, opacity 0.12s;
}

.task-row:hover {
  background-color: var(--color-surface);
}

.task-row:active {
  cursor: grabbing;
}

.node-slot {
  width: var(--list-marker-size);
  min-width: var(--list-marker-size);
  height: 1px;
  flex-shrink: 0;
  display: inline-block;
}

.client-label {
  font-size: 16.5px;
  font-weight: 700;
  line-height: 1.2;
  color: #000;
}

.project-label,
.task-label {
  font-size: 16.5px;
  font-weight: 400;
  line-height: 1.2;
  color: #000;
}

.task-row.is-allocated {
  opacity: 0.42;
}
</style>
