<script setup>
import WeekBlock from './WeekBlock.vue'

const props = defineProps({
  day: { type: Object, required: true },   // { key, label, dateStr, isToday }
  blocks: { type: Array, default: () => [] },
  hours: { type: Number, default: 0 },
})

const emit = defineEmits(['block-click', 'drop', 'block-move'])

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e) {
  e.preventDefault()
  const blockId = e.dataTransfer.getData('blockId')
  const taskId  = e.dataTransfer.getData('taskId')
  if (blockId) emit('block-move', { blockId, dayKey: props.day.key })
  else if (taskId) emit('drop', { taskId, dayKey: props.day.key })
}
</script>

<template>
  <div
    class="day-col"
    :class="{ today: day.isToday }"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="day-header">
      <span class="day-label">{{ day.label }}</span>
      <span class="day-date">{{ day.dateStr }}</span>
      <span class="day-hours" :class="{ alert: hours >= 8 }">{{ hours }}h</span>
    </div>

    <div class="day-blocks">
      <WeekBlock
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        @click="$emit('block-click', block)"
        @dragstart="() => {}"
      />

      <div v-if="blocks.length === 0" class="day-empty" />
    </div>
  </div>
</template>

<style scoped>
.day-col {
  min-width: var(--day-col-min-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
  min-height: 0;
}

.day-col:first-child {
  border-left: none;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: left;
  gap: 1px;
  padding: 10px 8px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background-color: var(--color-surface);
  z-index: 10;
}

.today .day-header {
  background-color: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
}

.day-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
}

.today .day-label {
  color: var(--color-accent);
}

.day-date {
  font-size: 12px;
  color: var(--color-text);
}

.day-hours {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  margin-top: 2px;
}

.day-hours.alert {
  color: var(--color-alert);
  font-weight: 600;
}

.day-blocks {
  flex: 1;
  padding: var(--spacing-block);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-empty {
  flex: 1;
}
</style>
