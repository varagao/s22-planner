<script setup>
import { ref, computed } from 'vue'
import WeekBlock from './WeekBlock.vue'
import MobileAllocModal from './MobileAllocModal.vue'
import BlockEditModal from './BlockEditModal.vue'

const props = defineProps({
  days: { type: Array, required: true },
  tasks: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
  blocksForDay: { type: Function, required: true },
  hoursForDay: { type: Function, required: true },
})

const emit = defineEmits(['alloc', 'block-save', 'block-remove'])

const dayIndex    = ref(new Date().getDay() === 0 || new Date().getDay() === 6 ? 0 : new Date().getDay() - 1)
const showAlloc   = ref(false)
const editingBlock = ref(null)

const currentDay   = computed(() => props.days[dayIndex.value])
const currentBlocks = computed(() => props.blocksForDay(currentDay.value?.key))
const currentHours  = computed(() => props.hoursForDay(currentDay.value?.key))

function goPrev() { if (dayIndex.value > 0) dayIndex.value-- }
function goNext() { if (dayIndex.value < 4) dayIndex.value++ }

function onTaskSelect(task) {
  showAlloc.value = false
  emit('alloc', { taskId: task.id, dayKey: currentDay.value.key })
}

function onBlockClick(block) {
  editingBlock.value = block
}
</script>

<template>
  <div class="mobile-view">
    <!-- Navegação de dia -->
    <div class="day-nav">
      <button class="nav-btn" :disabled="dayIndex === 0" @click="goPrev">‹</button>

      <div class="day-info">
        <span class="day-label" :class="{ today: currentDay?.isToday }">
          {{ currentDay?.label?.toUpperCase() }}
        </span>
        <span class="day-date">{{ currentDay?.dateStr }}</span>
      </div>

      <button class="nav-btn" :disabled="dayIndex === 4" @click="goNext">›</button>
    </div>

    <!-- Contador de horas -->
    <div class="hours-bar">
      <span class="hours-count" :class="{ alert: currentHours >= 8 }">
        {{ currentHours }}h alocadas
      </span>
    </div>

    <!-- Lista de blocos do dia -->
    <div class="blocks-list">
      <WeekBlock
        v-for="block in currentBlocks"
        :key="block.id"
        :block="block"
        @click="onBlockClick(block)"
      />

      <div v-if="currentBlocks.length === 0" class="empty">
        Nenhum bloco alocado neste dia.
      </div>
    </div>

    <!-- Botão alocar -->
    <button class="alloc-btn" @click="showAlloc = true">＋ Alocar tarefa</button>

    <!-- Modal de seleção de tarefa -->
    <MobileAllocModal
      v-if="showAlloc"
      :tasks="tasks"
      :clients="clients"
      :day-label="`${currentDay?.label} ${currentDay?.dateStr}`"
      @select="onTaskSelect"
      @close="showAlloc = false"
    />

    <!-- Modal de edição de bloco -->
    <BlockEditModal
      v-if="editingBlock"
      :block="editingBlock"
      @save="(p) => { $emit('block-save', p); editingBlock = null }"
      @remove="(id) => { $emit('block-remove', id); editingBlock = null }"
      @close="editingBlock = null"
    />
  </div>
</template>

<style scoped>
.mobile-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  margin: calc(-1 * var(--spacing-page));
}

.day-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--spacing-page);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

.day-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.day-label.today {
  color: var(--color-accent);
}

.day-date {
  font-size: 13px;
  color: var(--color-text-muted);
}

.nav-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 6px 14px;
  font-size: 18px;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1.2;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.hours-bar {
  padding: 8px var(--spacing-page);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.hours-count {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.hours-count.alert {
  color: var(--color-alert);
  font-weight: 600;
}

.blocks-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-block) var(--spacing-page);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty {
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 16px 0;
}

.alloc-btn {
  margin: var(--spacing-block) var(--spacing-page);
  padding: 12px;
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-block);
  font-family: var(--font-base);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.alloc-btn:hover {
  opacity: 0.9;
}
</style>
