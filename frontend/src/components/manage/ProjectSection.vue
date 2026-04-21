<script setup>
import { ref, onMounted } from 'vue'
import { useProjectStore } from '../../stores/useProjectStore'
import { useClientStore } from '../../stores/useClientStore'
import BaseModal from '../BaseModal.vue'

const projectStore = useProjectStore()
const clientStore = useClientStore()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', client: '', status: 'active' })
const saving = ref(false)
const error = ref('')

const STATUS_LABELS = { active: 'Ativo', paused: 'Pausado', done: 'Concluído' }

onMounted(async () => {
  await Promise.all([projectStore.load(), clientStore.load()])
})

function openCreate() {
  editing.value = null
  form.value = { name: '', client: clientStore.clients[0]?.id ?? '', status: 'active' }
  error.value = ''
  showModal.value = true
}

function openEdit(project) {
  editing.value = project
  form.value = {
    name: project.name,
    client: project.client,
    status: project.status,
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
    await projectStore.save(form.value, editing.value?.id ?? null)
    closeModal()
  } catch (e) {
    error.value = 'Erro ao salvar. Verifique os dados.'
  } finally {
    saving.value = false
  }
}

function clientName(project) {
  return project.expand?.client?.name ?? '—'
}

function clientColor(project) {
  return project.expand?.client?.color ?? 'var(--color-border)'
}
</script>

<template>
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">Projetos</h2>
      <button class="btn-primary" @click="openCreate">+ Novo projeto</button>
    </div>

    <div v-if="projectStore.loading" class="empty">Carregando…</div>

    <div v-else-if="projectStore.projects.length === 0" class="empty">
      Nenhum projeto cadastrado.
    </div>

    <ul v-else class="list">
      <li
        v-for="project in projectStore.projects"
        :key="project.id"
        class="list-item"
        @click="openEdit(project)"
      >
        <span class="color-swatch" :style="{ backgroundColor: clientColor(project) }" />
        <span class="item-client">{{ clientName(project) }}</span>
        <span class="item-name">{{ project.name }}</span>
        <span class="badge" :class="project.status">{{ STATUS_LABELS[project.status] }}</span>
        <span class="item-action">Editar</span>
      </li>
    </ul>
  </div>

  <BaseModal
    v-if="showModal"
    :title="editing ? 'Editar projeto' : 'Novo projeto'"
    @close="closeModal"
  >
    <form class="form" @submit.prevent="handleSave">
      <div class="field">
        <label>Nome</label>
        <input v-model="form.name" type="text" required :disabled="saving" />
      </div>

      <div class="field">
        <label>Cliente</label>
        <select v-model="form.client" required :disabled="saving">
          <option value="" disabled>Selecione…</option>
          <option v-for="c in clientStore.clients" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Status</label>
        <select v-model="form.status" :disabled="saving">
          <option value="active">Ativo</option>
          <option value="paused">Pausado</option>
          <option value="done">Concluído</option>
        </select>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
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

.item-client {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 80px;
}

.item-name {
  flex: 1;
  font-size: 14px;
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

.badge.active {
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

label {
  font-size: 13px;
  color: var(--color-text-muted);
}

input[type="text"],
select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
}

input[type="text"]:focus,
select:focus {
  border-color: var(--color-accent);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
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
</style>
