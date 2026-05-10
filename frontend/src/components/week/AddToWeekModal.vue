<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '../BaseModal.vue'
import { useClientStore } from '../../stores/useClientStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { createTask } from '../../services/pb'

const props = defineProps({
  day: { type: Object, required: true },
})

const emit = defineEmits(['add', 'close'])

const clientStore  = useClientStore()
const projectStore = useProjectStore()
const taskStore    = useTaskStore()

const selectedClientId  = ref('')
const selectedProjectId = ref('')
const selectedTaskId    = ref('')
const newTaskName       = ref('')
const hours             = ref(1)

const activeClients = computed(() =>
  clientStore.clients.filter(c => !c.archived)
)

const projectsForClient = computed(() =>
  selectedClientId.value
    ? projectStore.projects.filter(
        p => p.client === selectedClientId.value && !p.archived
      )
    : []
)

const tasksForProject = computed(() =>
  selectedProjectId.value
    ? taskStore.tasks.filter(
        t => t.project === selectedProjectId.value && !t.archived && t.status !== 'done'
      )
    : []
)

watch(selectedClientId, () => {
  selectedProjectId.value = ''
  selectedTaskId.value = ''
  newTaskName.value = ''
})

watch(selectedProjectId, () => {
  selectedTaskId.value = ''
  newTaskName.value = ''
})

const canAdd = computed(() =>
  selectedProjectId.value && (selectedTaskId.value || newTaskName.value.trim())
)

async function handleAdd() {
  if (!canAdd.value) return

  let taskId = selectedTaskId.value

  if (!taskId && newTaskName.value.trim()) {
    const created = await createTask({
      name: newTaskName.value.trim(),
      project: selectedProjectId.value,
      status: 'todo',
      estimated_hours: hours.value,
    })
    taskStore.tasks.push(created)
    taskId = created.id
  }

  emit('add', { taskId, dayKey: props.day.key, hours: hours.value })
}
</script>

<template>
  <BaseModal @close="$emit('close')">
    <template #title>Adicionar bloco — {{ day.label }}</template>

    <div class="form">
      <div class="field">
        <label class="label">Cliente</label>
        <select v-model="selectedClientId" class="select">
          <option value="">Selecionar...</option>
          <option v-for="c in activeClients" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="field" :class="{ disabled: !selectedClientId }">
        <label class="label">Projeto</label>
        <select v-model="selectedProjectId" class="select" :disabled="!selectedClientId">
          <option value="">Selecionar...</option>
          <option v-for="p in projectsForClient" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <div class="field" :class="{ disabled: !selectedProjectId }">
        <label class="label">Tarefa</label>
        <select v-model="selectedTaskId" class="select" :disabled="!selectedProjectId">
          <option value="">Selecionar ou criar nova...</option>
          <option v-for="t in tasksForProject" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>

      <div v-if="selectedProjectId && !selectedTaskId" class="field">
        <label class="label">Nome da nova tarefa</label>
        <input
          v-model="newTaskName"
          class="input"
          placeholder="Ex: Revisão de briefing"
          @keydown.enter="handleAdd"
        />
      </div>

      <div class="field field--small">
        <label class="label">Horas</label>
        <input
          v-model.number="hours"
          class="input input--hours"
          type="number"
          min="0.5"
          max="8"
          step="0.5"
        />
      </div>
    </div>

    <template #actions>
      <button class="btn btn--ghost" @click="$emit('close')">Cancelar</button>
      <button class="btn btn--primary" :disabled="!canAdd" @click="handleAdd">Adicionar</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.select,
.input {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.select:focus,
.input:focus {
  border-color: var(--color-accent);
}

.input--hours {
  width: 80px;
}

.btn {
  padding: 7px 16px;
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  border: 1px solid transparent;
}

.btn--ghost {
  background: none;
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.btn--ghost:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.btn--primary {
  background: var(--color-accent);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 85%, #000);
}

.btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
