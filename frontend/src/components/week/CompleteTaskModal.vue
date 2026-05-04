<script setup>
import { ref } from 'vue'
import BaseModal from '../BaseModal.vue'

const props = defineProps({
  task:          { type: Object, required: true },
  defaultHours:  { type: Number, default: 0 },
})

const emit = defineEmits(['confirm', 'close'])

const actualHours = ref(props.defaultHours || props.task.estimated_hours || 1)
const saving      = ref(false)

async function handleConfirm() {
  saving.value = true
  try {
    await emit('confirm', { taskId: props.task.id, actualHours: actualHours.value })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal title="Concluir tarefa" @close="$emit('close')">
    <div class="task-info">
      <div class="task-name">{{ task.name }}</div>
      <div v-if="task.expand?.project?.name" class="task-project">
        {{ task.expand.project.name }}
      </div>
    </div>

    <form class="form" @submit.prevent="handleConfirm">
      <div class="field">
        <label>Qual o tempo total desta tarefa?</label>
        <div class="hours-row">
          <button
            type="button"
            class="hours-btn"
            :disabled="actualHours <= 0.5 || saving"
            @click="actualHours = Math.max(0.5, actualHours - 0.5)"
          >−</button>
          <input
            v-model.number="actualHours"
            type="number"
            min="0.5"
            step="0.5"
            class="hours-input"
            :disabled="saving"
          />
          <button
            type="button"
            class="hours-btn"
            :disabled="saving"
            @click="actualHours = actualHours + 0.5"
          >+</button>
        </div>
        <div v-if="task.estimated_hours" class="hours-hint">
          Estimado: {{ task.estimated_hours }}h
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$emit('close')">
          Cancelar
        </button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? 'Salvando…' : 'Concluir tarefa' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.task-info {
  margin-bottom: 20px;
  padding: 10px 12px;
  background-color: var(--color-bg);
  border-radius: var(--radius-block);
  border: 1px solid var(--color-border);
}

.task-name {
  font-size: 14px;
  font-weight: 600;
}

.task-project {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.hours-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
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
</style>
