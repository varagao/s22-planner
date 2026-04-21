<script setup>
import { ref, onMounted } from 'vue'
import { fetchMembers } from '../../services/pb'
import BaseModal from '../BaseModal.vue'

const props = defineProps({
  block: { type: Object, required: true },
})

const emit = defineEmits(['save', 'remove', 'close'])

const members = ref([])
const hours = ref(props.block.hours)
const person = ref(props.block.person ?? '')
const saving = ref(false)

onMounted(async () => {
  members.value = await fetchMembers()
})

function taskName() {
  return props.block.expand?.task?.name ?? '—'
}

function projectName() {
  return props.block.expand?.task?.expand?.project?.name ?? ''
}

function clientColor() {
  return props.block.expand?.task?.expand?.project?.expand?.client?.color ?? 'var(--color-border)'
}

async function handleSave() {
  saving.value = true
  try {
    await emit('save', { id: props.block.id, hours: hours.value, person: person.value || null })
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  saving.value = true
  try {
    await emit('remove', props.block.id)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal title="Editar bloco" @close="$emit('close')">
    <div class="block-info">
      <span class="block-color" :style="{ backgroundColor: clientColor() }" />
      <div>
        <div class="block-task">{{ taskName() }}</div>
        <div class="block-project">{{ projectName() }}</div>
      </div>
    </div>

    <form class="form" @submit.prevent="handleSave">
      <div class="field">
        <label>Horas</label>
        <div class="hours-row">
          <button
            type="button"
            class="hours-btn"
            :disabled="hours <= 0.5 || saving"
            @click="hours = Math.max(0.5, hours - 0.5)"
          >−</button>
          <input
            v-model.number="hours"
            type="number"
            min="0.5"
            max="8"
            step="0.5"
            class="hours-input"
            :disabled="saving"
          />
          <button
            type="button"
            class="hours-btn"
            :disabled="hours >= 8 || saving"
            @click="hours = Math.min(8, hours + 0.5)"
          >+</button>
        </div>
      </div>

      <div class="field">
        <label>Pessoa</label>
        <select v-model="person" :disabled="saving">
          <option value="">Sem pessoa</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ m.name || m.email }}
          </option>
        </select>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn-danger"
          :disabled="saving"
          @click="handleRemove"
        >
          Remover
        </button>
        <div class="form-actions-right">
          <button type="button" class="btn-secondary" @click="$emit('close')">
            Cancelar
          </button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.block-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 10px 12px;
  background-color: var(--color-bg);
  border-radius: var(--radius-block);
  border: 1px solid var(--color-border);
}

.block-color {
  width: 12px;
  height: 32px;
  border-radius: 3px;
  flex-shrink: 0;
}

.block-task {
  font-size: 14px;
  font-weight: 500;
}

.block-project {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

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

.hours-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hours-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.hours-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.hours-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hours-input {
  width: 72px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 15px;
  text-align: center;
  outline: none;
}

.hours-input:focus {
  border-color: var(--color-accent);
}

select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 14px;
  outline: none;
}

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
