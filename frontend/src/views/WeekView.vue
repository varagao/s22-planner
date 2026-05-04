<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useWeekRef } from '../composables/useWeekRef'
import { useWeekStore } from '../stores/useWeekStore'
import { useTaskStore } from '../stores/useTaskStore'
import { useClientStore } from '../stores/useClientStore'
import { fetchMembers, updateTask } from '../services/pb'
import WeekSidebar from '../components/week/WeekSidebar.vue'
import DayColumn from '../components/week/DayColumn.vue'
import BlockEditModal from '../components/week/BlockEditModal.vue'
import CompleteTaskModal from '../components/week/CompleteTaskModal.vue'
import MobileDayView from '../components/week/MobileDayView.vue'

const auth = useAuthStore()
const { isMobile } = useBreakpoint()
const { weekRef, days, weekLabel, isCurrentWeek, goNext, goPrev, goToday } = useWeekRef()

const weekStore   = useWeekStore()
const taskStore   = useTaskStore()
const clientStore = useClientStore()

const members          = ref([])
const editingBlock     = ref(null)
const completingTask   = ref(null)
const selectedPerson   = ref(auth.isAdmin ? '' : auth.user?.id ?? '')
const loadError        = ref('')

const startDate = computed(() => days.value[0].dateISO)
const endDate   = computed(() => days.value[4].dateISO)

onMounted(async () => {
  try {
    const [, , , m] = await Promise.all([
      taskStore.load(),
      clientStore.load(),
      weekStore.load(startDate.value, endDate.value),
      fetchMembers(),
    ])
    members.value = m
  } catch (e) {
    loadError.value = e?.message || 'Erro ao carregar dados. Verifique a conexão com o PocketBase.'
  }
})

watch(weekRef, () => weekStore.load(startDate.value, endDate.value))

// Total de horas alocadas por tarefa na semana visível
const taskAllocatedHours = computed(() => {
  const map = {}
  for (const block of weekStore.blocks) {
    map[block.task] = (map[block.task] || 0) + (block.hours || 0)
  }
  return map
})

function dayByKey(dayKey) {
  return days.value.find(d => d.key === dayKey)
}

function blocksForDay(dayKey) {
  const day = dayByKey(dayKey)
  if (!day) return []
  const all = weekStore.blocksForDay(day.dateISO)
  if (!selectedPerson.value) return all
  return all.filter(b => b.person === selectedPerson.value)
}

function hoursForDay(dayKey) {
  return blocksForDay(dayKey).reduce((sum, b) => sum + (b.hours || 0), 0)
}

const sidebarTasks = computed(() => {
  let tasks = taskStore.tasks.filter(t => t.status !== 'done')
  if (!auth.isAdmin) {
    tasks = tasks.filter(t => !t.assignee || t.assignee === auth.user?.id)
  }
  return tasks
})

async function onDrop({ taskId, dayKey }) {
  const day = dayByKey(dayKey)
  await weekStore.addBlock({
    task:   taskId,
    person: selectedPerson.value || auth.user?.id || null,
    date:   day.dateISO,
    hours:  1,
  })
  await weekStore.load(startDate.value, endDate.value)
}

async function onAlloc({ taskId, dayKey }) {
  const day = dayByKey(dayKey)
  await weekStore.addBlock({
    task:   taskId,
    person: auth.user?.id || null,
    date:   day.dateISO,
    hours:  1,
  })
  await weekStore.load(startDate.value, endDate.value)
}

function onBlockClick(block) {
  editingBlock.value = block
}

async function onBlockSave({ id, hours, person, date }) {
  await weekStore.editBlock(id, { hours, person: person || null, date })
  await weekStore.load(startDate.value, endDate.value)
  editingBlock.value = null
}

async function onBlockRemove(id) {
  await weekStore.removeBlock(id)
  editingBlock.value = null
}

function onTaskComplete(task) {
  completingTask.value = task
}

async function onCompleteConfirm({ taskId, actualHours }) {
  const today = new Date().toISOString().slice(0, 10)
  await updateTask(taskId, { status: 'done', actual_hours: actualHours, completed_at: today })
  await taskStore.load()
  await weekStore.load(startDate.value, endDate.value)
  completingTask.value = null
}

async function onBlockMove({ blockId, dayKey }) {
  const day = dayByKey(dayKey)
  await weekStore.editBlock(blockId, { date: day.dateISO })
  await weekStore.load(startDate.value, endDate.value)
}
</script>

<template>
  <div class="week-view">

    <div v-if="loadError" class="load-error">{{ loadError }}</div>

    <!-- ── Mobile ─────────────────────────────────────────────────────────── -->
    <template v-if="isMobile">
      <!-- Nav de semana compacto -->
      <div class="week-nav week-nav--mobile">
        <button class="nav-btn" @click="goPrev">‹ sem</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button class="nav-btn" @click="goNext">sem ›</button>
      </div>

      <MobileDayView
        :days="days"
        :tasks="sidebarTasks"
        :clients="clientStore.clients"
        :blocks-for-day="blocksForDay"
        :hours-for-day="hoursForDay"
        :task-allocated-hours="taskAllocatedHours"
        @alloc="onAlloc"
        @block-save="onBlockSave"
        @block-remove="onBlockRemove"
      />
    </template>

    <!-- ── Desktop ────────────────────────────────────────────────────────── -->
    <template v-else>
      <div class="week-nav">
        <button class="nav-btn" @click="goPrev">‹</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button class="nav-btn" @click="goNext">›</button>
        <button v-if="!isCurrentWeek" class="today-btn" @click="goToday">Hoje</button>

        <div class="nav-spacer" />

        <select v-if="auth.isAdmin" v-model="selectedPerson" class="person-filter">
          <option value="">Todas as pessoas</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ m.name || m.email }}
          </option>
        </select>
      </div>

      <div class="week-body">
        <WeekSidebar :tasks="sidebarTasks" :clients="clientStore.clients" />

        <div class="week-grid">
          <DayColumn
            v-for="day in days"
            :key="day.key"
            :day="day"
            :blocks="blocksForDay(day.key)"
            :hours="hoursForDay(day.key)"
            :task-allocated-hours="taskAllocatedHours"
            @block-click="onBlockClick"
            @drop="onDrop"
            @block-move="onBlockMove"
            @task-complete="onTaskComplete"
          />
        </div>
      </div>

      <BlockEditModal
        v-if="editingBlock"
        :block="editingBlock"
        @save="onBlockSave"
        @remove="onBlockRemove"
        @close="editingBlock = null"
      />

      <CompleteTaskModal
        v-if="completingTask"
        :task="completingTask"
        :default-hours="taskAllocatedHours[completingTask.id] || completingTask.estimated_hours || 1"
        @confirm="onCompleteConfirm"
        @close="completingTask = null"
      />
    </template>

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

.load-error {
  padding: 12px var(--spacing-page);
  background-color: color-mix(in srgb, var(--color-alert) 10%, var(--color-bg));
  color: var(--color-alert);
  font-size: 13px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-alert) 20%, transparent);
  flex-shrink: 0;
}

/* ── Nav desktop ─────────────────────────────────────────────────────────── */
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px var(--spacing-page);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
  flex-shrink: 0;
}

.week-nav--mobile {
  justify-content: space-between;
  padding: 8px var(--spacing-page);
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
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1.6;
  font-family: var(--font-base);
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

.nav-spacer { flex: 1; }

.person-filter {
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-base);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.person-filter:focus { border-color: var(--color-accent); }

/* ── Grid desktop ────────────────────────────────────────────────────────── */
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
