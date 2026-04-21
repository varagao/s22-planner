<script setup>
import { ref, onMounted } from 'vue'
import { useProjectStore } from '../../stores/useProjectStore'
import { useClientStore } from '../../stores/useClientStore'
import { generateViewerToken, revokeViewerToken } from '../../services/pb'
import BaseModal from '../BaseModal.vue'

const projectStore = useProjectStore()
const clientStore  = useClientStore()

const showModal  = ref(false)
const editing    = ref(null)
const form       = ref({ name: '', client: '', status: 'active' })
const saving     = ref(false)
const error      = ref('')
const tokenBusy  = ref(false)
const copied     = ref(false)

const STATUS_LABELS = { active: 'Ativo', paused: 'Pausado', done: 'Concluído' }

const appBase = () => import.meta.env.VITE_APP_URL || window.location.origin

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
  form.value = { name: project.name, client: project.client, status: project.status }
  error.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  copied.value = false
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

async function handleGenerateToken() {
  if (!editing.value) return
  tokenBusy.value = true
  try {
    const updated = await generateViewerToken(editing.value.id)
    const idx = projectStore.projects.findIndex(p => p.id === editing.value.id)
    if (idx !== -1) projectStore.projects[idx] = { ...projectStore.projects[idx], viewer_token: updated.viewer_token }
    editing.value = { ...editing.value, viewer_token: updated.viewer_token }
  } finally {
    tokenBusy.value = false
  }
}

async function handleRevokeToken() {
  if (!editing.value) return
  tokenBusy.value = true
  try {
    await revokeViewerToken(editing.value.id)
    const idx = projectStore.projects.findIndex(p => p.id === editing.value.id)
    if (idx !== -1) projectStore.projects[idx] = { ...projectStore.projects[idx], viewer_token: '' }
    editing.value = { ...editing.value, viewer_token: '' }
    copied.value = false
  } finally {
    tokenBusy.value = false
  }
}

async function copyLink() {
  const url = `${appBase()}/view/${editing.value.viewer_token}`
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
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
        <span v-if="project.viewer_token" class="token-indicator" title="Link de cliente ativo">●</span>
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

      <!-- Link do cliente — só aparece ao editar -->
      <div v-if="editing" class="token-section">
        <div class="token-label">Link de cliente</div>

        <div v-if="editing.viewer_token" class="token-active">
          <code class="token-url">{{ appBase() }}/view/{{ editing.viewer_token }}</code>
          <div class="token-actions">
            <button type="button" class="btn-copy" @click="copyLink">
              {{ copied ? 'Copiado!' : 'Copiar link' }}
            </button>
            <button
              type="button"
              class="btn-revoke"
              :disabled="tokenBusy"
              @click="handleRevokeToken"
            >
              Revogar
            </button>
          </div>
        </div>

        <div v-else class="token-empty">
          <span class="token-none">Nenhum link ativo.</span>
          <button
            type="button"
            class="btn-generate"
            :disabled="tokenBusy"
            @click="handleGenerateToken"
          >
            {{ tokenBusy ? 'Gerando…' : 'Gerar link' }}
          </button>
        </div>
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

.section-title { font-size: 16px; font-weight: 600; }

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

.list-item:hover { border-color: var(--color-accent); }

.color-swatch {
  width: 16px; height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.08);
}

.item-client { font-size: 12px; color: var(--color-text-muted); min-width: 80px; }
.item-name   { flex: 1; font-size: 14px; }
.item-action { font-size: 12px; color: var(--color-text-muted); }

.token-indicator {
  font-size: 10px;
  color: var(--color-accent);
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

.empty { color: var(--color-text-muted); font-size: 14px; padding: 16px 0; }

/* form */
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }

label { font-size: 13px; color: var(--color-text-muted); }

input[type="text"], select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
}

input[type="text"]:focus, select:focus { border-color: var(--color-accent); }

/* token */
.token-section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.token-active { display: flex; flex-direction: column; gap: 8px; }

.token-url {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  word-break: break-all;
  background: var(--color-bg);
  padding: 6px 8px;
  border-radius: var(--radius-block);
  border: 1px solid var(--color-border);
}

.token-actions { display: flex; gap: 8px; }

.token-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.token-none { font-size: 13px; color: var(--color-text-muted); }

.btn-generate {
  padding: 5px 12px;
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 12px;
  cursor: pointer;
}

.btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-copy {
  padding: 5px 12px;
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 12px;
  cursor: pointer;
}

.btn-revoke {
  padding: 5px 12px;
  background: none;
  border: 1px solid var(--color-alert);
  color: var(--color-alert);
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 12px;
  cursor: pointer;
}

.btn-revoke:disabled { opacity: 0.6; cursor: not-allowed; }

/* form actions */
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

.error { font-size: 13px; color: var(--color-alert); }

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

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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
