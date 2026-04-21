<script setup>
import { watch, onMounted } from 'vue'
import { useWeekRef } from '../composables/useWeekRef'
import { useWeekStore } from '../stores/useWeekStore'
import { useTaskStore } from '../stores/useTaskStore'
import { useClientStore } from '../stores/useClientStore'
import WeekSidebar from '../components/week/WeekSidebar.vue'
import DayColumn from '../components/week/DayColumn.vue'

const { weekRef, days, weekLabel, isCurrentWeek, goNext, goPrev, goToday } = useWeekRef()

const weekStore   = useWeekStore()
const taskStore   = useTaskStore()
const clientStore = useClientStore()

onMounted(async () => {
  await Promise.all([
    taskStore.load(),
    clientStore.load(),
    weekStore.load(weekRef.value),
  ])
})

watch(weekRef, (val) => weekStore.load(val))

async function onDrop({ taskId, dayKey }) {
  await weekStore.addBlock({
    task: taskId,
    person: null,   // será editável no bloco — item 7
    day_of_week: dayKey,
    hours: 1,
    week_ref: weekRef.value,
  })
}

function onBlockClick(block) {
  // Edição de horas — item 7
}
</script>

<template>
  <div class="week-view">
    <!-- Header de navegação de semana -->
    <div class="week-nav">
      <button class="nav-btn" @click="goPrev">‹</button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="nav-btn" @click="goNext">›</button>
      <button v-if="!isCurrentWeek" class="today-btn" @click="goToday">Hoje</button>
    </div>

    <!-- Corpo: sidebar + grade -->
    <div class="week-body">
      <WeekSidebar
        :tasks="taskStore.tasks"
        :clients="clientStore.clients"
      />

      <div class="week-grid">
        <DayColumn
          v-for="day in days"
          :key="day.key"
          :day="day"
          :blocks="weekStore.blocksForDay(day.key)"
          :hours="weekStore.hoursForDay(day.key)"
          @block-click="onBlockClick"
          @drop="onDrop"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  margin: calc(-1 * var(--spacing-page));
  overflow: hidden;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px var(--spacing-page);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
  flex-shrink: 0;
}

.week-label {
  font-size: 14px;
  font-weight: 500;
  min-width: 160px;
  text-align: center;
}

.nav-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 3px 10px;
  font-size: 16px;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1.4;
  transition: color 0.15s, border-color 0.15s;
}

.nav-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.today-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 3px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-accent);
  font-family: var(--font-base);
  transition: background-color 0.15s;
}

.today-btn:hover {
  background-color: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.week-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.week-grid {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
}
</style>
