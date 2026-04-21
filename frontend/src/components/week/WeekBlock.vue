<script setup>
defineProps({
  block: { type: Object, required: true },
})

defineEmits(['click'])

function clientColor(block) {
  return block.expand?.task?.expand?.project?.expand?.client?.color ?? '#ccc'
}

function taskName(block) {
  return block.expand?.task?.name ?? '—'
}

function personName(block) {
  const p = block.expand?.person
  return p ? (p.name || p.email) : ''
}
</script>

<template>
  <div
    class="week-block"
    :style="{ borderLeftColor: clientColor(block) }"
    @click="$emit('click', block)"
  >
    <span class="block-task">{{ taskName(block) }}</span>
    <div class="block-meta">
      <span class="block-person">{{ personName(block) }}</span>
      <span class="block-hours">{{ block.hours }}h</span>
    </div>
  </div>
</template>

<style scoped>
.week-block {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid;
  border-radius: var(--radius-block);
  padding: 6px 8px;
  cursor: pointer;
  transition: box-shadow 0.15s;
  user-select: none;
}

.week-block:hover {
  box-shadow: var(--shadow-card);
}

.block-task {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3px;
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
