<script setup>
import { ref, onMounted } from 'vue'
import { useTaskStore } from '../../stores/useTaskStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { fetchMembers, hasTimeBlocks } from '../../services/pb'
import BaseModal from '../BaseModal.vue'

const taskStore = useTaskStore()
const projectStore = useProjectStore()

const members = ref([])
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const error = ref('')

const STATUS_LABELS = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluído' }

const emptyForm = () => ({
  name: '',
  project: '',
  assignee: '',
  estimated_hours: 1,
  due_date: '',
  status: 'todo',
})

const form = ref(emptyForm())

onMounted(async () => {
  await Promise.all([
    taskStore.load(),
    projectStore.load(),
    fetchMembers().then(m => { members.value = m }),
  ])
})

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  error.value = ''
  showModal.value = true
}

function openEdit(task) {
  editing.value = task
  form.value = {
    name: task.name,
    project: task.project,
    assignee: task.assignee ?? '',
    estimated_hours: task.estimated_hours ?? 1,
    due_date: task.due_date ? task.due_date.split(' ')[0] : '',
    status: task.status,
  }
  error.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  error.value = ''
  saving.value = true
  try {
    const data = { ...form.value }
    if (!data.assignee) delete data.assignee
    if (!data.due_date) delete data.due_date
    await taskStore.save(data, editing.value?.id ?? null)
    closeModal()
  } catch (e) {
    error.value = 'Erro ao salvar. Verifique os dados.'
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!editing.value) return
  error.value = ''
  saving.value = true
  try {
    const blocked = await hasTimeBlocks(editing.value.id)
    if (blocked) {
      error.value = 'Esta tarefa possui blocos de tempo alocados e não pode ser excluída.'
      saving.value = false
      return
    }
    await taskStore.remove(editing.value.id)
    closeModal()
  } catch (e) {
    error.value = 'Erro ao excluir.'
  } finally {
    saving.value = false
  }
}

function projectName(task) {
  return task.expand?.project?.name ?? '—'
}

function projectColor(task) {
  return task.expand?.project?.expand?.client?.color ?? 'var(--color-border)'
}

function assigneeName(task) {
  const m = task.expand?.assignee
  return m ? (m.name || m.email) : '—'
}
</script>

<template>
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">Tarefas</h2>
      <button class="btn-primary" @click="openCreate">+ Nova tarefa</button>
    </div>

    <div v-if="taskStore.loading" class="empty">Carregando…</div>

    <div v-else-if="taskStore.tasks.length === 0" class="empty">
      Nenhuma tarefa cadastrada.
    </div>

    <ul v-else class="list">
      <li
        v-for="task in taskStore.tasks"
        :key="task.id"
        class="list-item"
        @click="openEdit(task)"
      >
        <span class="color-swatch" :style="{ backgroundColor: projectColor(task) }" />
        <span class="item-project">{{ projectName(task) }}</span>
        <span class="item-name">{{ task.name }}</span>
        <span class="item-assignee">{{ assigneeName(task) }}</span>
        <span class="badge" :class="task.status">{{ STATUS_LABELS[task.status] }}</span>
        <span class="item-action">Editar</span>
      </li>
    </ul>
  </div>

  <BaseModal
    v-if="showModal"
    :title="editing ? 'Editar tarefa' : 'Nova tarefa'"
    @close="closeModal"
  >
    <form class="form" @submit.prevent="handleSave">
      <div class="field">
        <label>Nome</label>
        <input v-model="form.name" type="text" required :disabled="saving" />
      </div>

      <div class="field">
        <label>Projeto</label>
        <select v-model="form.project" required :disabled="saving">
          <option value="" disabled>Selecione…</option>
          <option v-for="p in projectStore.projects" :key="p.id" :value="p.id">
            {{ p.expand?.client?.name ? p.expand.client.name + ' — ' : '' }}{{ p.name }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Responsável</label>
        <select v-model="form.assignee" :disabled="saving">
          <option value="">Sem responsável</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ m.name || m.email }}
          </option>
        </select>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Estimativa (h)</label>
          <input
            v-model.number="form.estimated_hours"
            type="number"
            min="0.5"
            step="0.5"
            :disabled="saving"
          />
        </div>

        <div class="field">
          <label>Data de entrega</label>
          <input v-model="form.due_date" type="date" :disabled="saving" />
        </div>
      </div>

      <div class="field">
        <label>Status</label>
        <select v-model="form.status" :disabled="saving">
          <option value="todo">A fazer</option>
          <option value="doing">Em andamento</option>
          <option value="done">Concluído</option>
        </select>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="form-actions">
        <button
          v-if="editing"
          type="button"
          class="btn-danger"
          :disabled="saving"
          @click="handleDelete"
        >
          Excluir
        </button>
        <div class="form-actions-right">
          <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  cursor: pointer;
  transition: border-color 0.15s;
}

.list-item:hover {
  border-color: var(--color-accent);
}

.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.08);
}

.item-project {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 100px;
}

.item-name {
  flex: 1;
  font-size: 14px;
}

.item-assignee {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 80px;
}

.item-action {
  font-size: 12px;
  color: var(--color-text-muted);
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background-color: var(--color-border);
  color: var(--color-text-muted);
}

.badge.doing {
  background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.badge.done {
  background-color: color-mix(in srgb, #4CAF50 15%, transparent);
  color: #2e7d32;
}

.empty {
  color: var(--color-text-muted);
  font-size: 14px;
  padding: 16px 0;
}

/* form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-row .field {
  flex: 1;
}

label {
  font-size: 13px;
  color: var(--color-text-muted);
}

input[type="text"],
input[type="number"],
input[type="date"],
select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
  width: 100%;
}

input:focus,
select:focus {
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.form-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.error {
  font-size: 13px;
  color: var(--color-alert);
}

.btn-primary {
  padding: 7px 14px;
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 7px 14px;
  background: none;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 13px;
  cursor: pointer;
}

.btn-danger {
  padding: 7px 14px;
  background: none;
  color: var(--color-alert);
  border: 1px solid var(--color-alert);
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 13px;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
