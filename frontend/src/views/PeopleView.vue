<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/pb'
import BaseModal from '../components/BaseModal.vue'

const auth = useAuthStore()

const users   = ref([])
const loading = ref(false)
const showModal  = ref(false)
const editing    = ref(null)   // null = convidar, objeto = editar
const saving     = ref(false)
const removing   = ref(false)
const error      = ref('')

const ROLE_LABELS = { admin: 'Admin', member: 'Membro' }

const emptyForm = () => ({
  name:            '',
  email:           '',
  role:            'member',
  password:        '',
  passwordConfirm: '',
})

const form = ref(emptyForm())

async function load() {
  loading.value = true
  try {
    users.value = await fetchUsers()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openInvite() {
  editing.value = null
  form.value    = emptyForm()
  error.value   = ''
  showModal.value = true
}

function openEdit(user) {
  editing.value = user
  form.value    = { name: user.name ?? '', email: user.email, role: user.role, password: '', passwordConfirm: '' }
  error.value   = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  error.value = ''

  // Validação de senha no convite
  if (!editing.value && form.value.password.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (!editing.value && form.value.password !== form.value.passwordConfirm) {
    error.value = 'As senhas não coincidem.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      const data = { name: form.value.name, role: form.value.role }
      if (form.value.password) {
        data.password        = form.value.password
        data.passwordConfirm = form.value.passwordConfirm
      }
      const updated = await updateUser(editing.value.id, data)
      const idx = users.value.findIndex(u => u.id === editing.value.id)
      if (idx !== -1) users.value[idx] = updated
    } else {
      const created = await createUser({
        name:            form.value.name,
        email:           form.value.email,
        role:            form.value.role,
        password:        form.value.password,
        passwordConfirm: form.value.passwordConfirm,
        emailVisibility: true,
      })
      users.value.push(created)
    }
    closeModal()
  } catch (e) {
    error.value = e?.response?.data?.email?.message
      ?? e?.response?.data?.password?.message
      ?? 'Erro ao salvar. Verifique os dados.'
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  if (!editing.value) return
  if (editing.value.id === auth.user?.id) {
    error.value = 'Você não pode remover sua própria conta.'
    return
  }
  removing.value = true
  try {
    await deleteUser(editing.value.id)
    users.value = users.value.filter(u => u.id !== editing.value.id)
    closeModal()
  } catch {
    error.value = 'Erro ao remover. O usuário pode ter registros associados.'
  } finally {
    removing.value = false
  }
}

function initials(user) {
  const name = user.name || user.email || '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function isSelf(user) {
  return user.id === auth.user?.id
}
</script>

<template>
  <div class="people">
    <div class="people-header">
      <h2 class="people-title">Pessoas</h2>
      <button class="btn-primary" @click="openInvite">+ Convidar</button>
    </div>

    <div v-if="loading" class="empty">Carregando…</div>

    <div v-else-if="users.length === 0" class="empty">
      Nenhum usuário encontrado.
    </div>

    <ul v-else class="user-list">
      <li
        v-for="user in users"
        :key="user.id"
        class="user-row"
        @click="openEdit(user)"
      >
        <div class="user-avatar">{{ initials(user) }}</div>
        <div class="user-info">
          <span class="user-name">
            {{ user.name || user.email }}
            <span v-if="isSelf(user)" class="user-self">(você)</span>
          </span>
          <span class="user-email">{{ user.email }}</span>
        </div>
        <span class="role-badge" :class="user.role">
          {{ ROLE_LABELS[user.role] ?? user.role }}
        </span>
        <span class="user-action">Editar</span>
      </li>
    </ul>
  </div>

  <BaseModal
    v-if="showModal"
    :title="editing ? 'Editar pessoa' : 'Convidar pessoa'"
    @close="closeModal"
  >
    <form class="form" @submit.prevent="handleSave">

      <div class="field">
        <label>Nome</label>
        <input v-model="form.name" type="text" :disabled="saving" />
      </div>

      <div class="field">
        <label>Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          :disabled="saving || !!editing"
        />
      </div>

      <div class="field">
        <label>Role</label>
        <select v-model="form.role" :disabled="saving">
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div class="field">
        <label>{{ editing ? 'Nova senha (opcional)' : 'Senha temporária' }}</label>
        <input
          v-model="form.password"
          type="password"
          :required="!editing"
          :disabled="saving"
          placeholder="Mínimo 8 caracteres"
          autocomplete="new-password"
        />
      </div>

      <div v-if="form.password || !editing" class="field">
        <label>Confirmar senha</label>
        <input
          v-model="form.passwordConfirm"
          type="password"
          :required="!editing || !!form.password"
          :disabled="saving"
          autocomplete="new-password"
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="form-actions">
        <button
          v-if="editing && !isSelf(editing)"
          type="button"
          class="btn-danger"
          :disabled="saving || removing"
          @click="handleRemove"
        >
          {{ removing ? 'Removendo…' : 'Remover' }}
        </button>
        <div class="form-actions-right">
          <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving || removing">
            {{ saving ? 'Salvando…' : editing ? 'Salvar' : 'Convidar' }}
          </button>
        </div>
      </div>

    </form>
  </BaseModal>
</template>

<style scoped>
.people {
  max-width: 640px;
}

.people-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.people-title {
  font-size: 16px;
  font-weight: 600;
}

.user-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  cursor: pointer;
  transition: border-color 0.15s;
}

.user-row:hover {
  border-color: var(--color-accent);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-self {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}

.user-email {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-action {
  font-size: 12px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  flex-shrink: 0;
  background-color: var(--color-border);
  color: var(--color-text-muted);
}

.role-badge.admin {
  background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.empty {
  color: var(--color-text-muted);
  font-size: 14px;
  padding: 16px 0;
}

/* form */
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }

label { font-size: 13px; color: var(--color-text-muted); }

input[type="text"],
input[type="email"],
input[type="password"],
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

input:focus, select:focus { border-color: var(--color-accent); }
input:disabled, select:disabled { opacity: 0.6; }

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.form-actions-right { display: flex; gap: 8px; }

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

.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
