<script setup>
import { ref, onMounted } from 'vue'
import { useClientStore } from '../../stores/useClientStore'
import BaseModal from '../BaseModal.vue'

const store = useClientStore()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', color: '#2B7FBF' })
const saving = ref(false)
const error = ref('')

onMounted(() => store.load())

function openCreate() {
  editing.value = null
  form.value = { name: '', color: '#2B7FBF' }
  error.value = ''
  showModal.value = true
}

function openEdit(client) {
  editing.value = client
  form.value = { name: client.name, color: client.color }
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
    await store.save(form.value, editing.value?.id ?? null)
    closeModal()
  } catch (e) {
    error.value = 'Erro ao salvar. Verifique os dados.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">Clientes</h2>
      <button class="btn-primary" @click="openCreate">+ Novo cliente</button>
    </div>

    <div v-if="store.loading" class="empty">Carregando…</div>

    <div v-else-if="store.clients.length === 0" class="empty">
      Nenhum cliente cadastrado.
    </div>

    <ul v-else class="list">
      <li
        v-for="client in store.clients"
        :key="client.id"
        class="list-item"
        @click="openEdit(client)"
      >
        <span class="color-swatch" :style="{ backgroundColor: client.color }" />
        <span class="item-name">{{ client.name }}</span>
        <span class="item-action">Editar</span>
      </li>
    </ul>
  </div>

  <BaseModal
    v-if="showModal"
    :title="editing ? 'Editar cliente' : 'Novo cliente'"
    @close="closeModal"
  >
    <form class="form" @submit.prevent="handleSave">
      <div class="field">
        <label>Nome</label>
        <input v-model="form.name" type="text" required :disabled="saving" />
      </div>

      <div class="field">
        <label>Cor</label>
        <div class="color-row">
          <input
            v-model="form.color"
            type="color"
            class="color-input"
            :disabled="saving"
          />
          <input
            v-model="form.color"
            type="text"
            class="color-text"
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
            :disabled="saving"
          />
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

.item-name {
  flex: 1;
  font-size: 14px;
}

.item-action {
  font-size: 12px;
  color: var(--color-text-muted);
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

input[type="text"] {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
}

input[type="text"]:focus {
  border-color: var(--color-accent);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 40px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  cursor: pointer;
}

.color-text {
  flex: 1;
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
