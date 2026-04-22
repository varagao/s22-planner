<script setup>
defineProps({
  block: { type: Object, required: true },
})

const emit = defineEmits(['click', 'dragstart'])

function onDragStart(e, block) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('blockId', block.id)
  emit('dragstart', block)
}

function clientColor(block) {
  return block.expand?.task?.expand?.project?.expand?.client?.color ?? '#ccc'
}

function projectName(block) {
  return block.expand?.task?.expand?.project?.name ?? ''
}

function taskName(block) {
  return block.expand?.task?.name ?? '—'
}

function personName(block) {
  const p = block.expand?.person
  return p ? (p.name || p.email) : ''
}

const HOUR_HEIGHT = 52 // px por hora

function blockStyle(block) {
  const color = clientColor(block)
  return {
    backgroundColor: color + '28',
    borderColor:     color + '70',
    borderLeftColor: color,
    minHeight: `${Math.max(block.hours ?? 1, 0.5) * HOUR_HEIGHT}px`,
  }
}
</script>

<template>
  <div
    class="week-block"
    draggable="true"
    :style="blockStyle(block)"
    @click="$emit('click', block)"
    @dragstart="onDragStart($event, block)"
  >
    <span v-if="projectName(block)" class="block-project">{{ projectName(block) }}</span>
    <span class="block-task">{{ taskName(block) }}</span>
    <div class="block-meta">
      <span class="block-person">{{ personName(block) }}</span>
      <span class="block-hours">{{ block.hours }}h</span>
    </div>
  </div>
</template>

<style scoped>
.week-block {
  border: 1px solid;
  border-left: 3px solid;
  border-radius: var(--radius-block);
  padding: 6px 8px;
  cursor: pointer;
  transition: box-shadow 0.15s;
  user-select: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.week-block:hover {
  box-shadow: var(--shadow-card);
}

.block-project {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0px;
}

.block-task {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  display: block;
  word-break: break-word;
}

.block-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 4px;
}

.block-person {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-hours {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
  margin-left: 4px;
}
</style>
