<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
import AddToWeekModal from '../components/week/AddToWeekModal.vue'

const route = useRoute()
const auth = useAuthStore()
const { isMobile } = useBreakpoint()
const { weekRef, days, weekLabel, isCurrentWeek, goNext, goPrev, goToday } = useWeekRef()
const isPreviewMode = import.meta.env.DEV && route.query.preview === '1'

const weekStore   = useWeekStore()
const taskStore   = useTaskStore()
const clientStore = useClientStore()

const members          = ref([])
const editingBlock     = ref(null)
const completingTask   = ref(null)
const addingToDay      = ref(null)
const selectedPerson   = ref(auth.isAdmin ? '' : auth.user?.id ?? '')
const loadError        = ref('')

const startDate = computed(() => days.value[0].dateISO)
const endDate   = computed(() => days.value[4].dateISO)

onMounted(async () => {
  if (isPreviewMode) {
    loadPreviewData()
    return
  }

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

watch(weekRef, () => {
  if (isPreviewMode) {
    loadPreviewData()
    return
  }

  weekStore.load(startDate.value, endDate.value)
})

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
  if (isPreviewMode) return tasks
  if (!auth.isAdmin) {
    tasks = tasks.filter(t => !t.assignee || t.assignee === auth.user?.id)
  }
  return tasks
})

async function onDrop({ taskId, dayKey }) {
  const day = dayByKey(dayKey)
  if (isPreviewMode) {
    addPreviewBlock(taskId, day.dateISO, selectedPerson.value || taskStore.tasks.find(t => t.id === taskId)?.assignee || members.value[0]?.id || '')
    return
  }
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
  if (isPreviewMode) {
    addPreviewBlock(taskId, day.dateISO, auth.user?.id || taskStore.tasks.find(t => t.id === taskId)?.assignee || members.value[0]?.id || '')
    return
  }
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
  if (isPreviewMode) {
    const idx = weekStore.blocks.findIndex(block => block.id === id)
    if (idx !== -1) {
      weekStore.blocks[idx] = {
        ...weekStore.blocks[idx],
        hours,
        person: person || weekStore.blocks[idx].person,
        date,
        expand: {
          ...weekStore.blocks[idx].expand,
          person: members.value.find(member => member.id === (person || weekStore.blocks[idx].person)) || weekStore.blocks[idx].expand?.person,
        },
      }
    }
    editingBlock.value = null
    return
  }
  await weekStore.editBlock(id, { hours, person: person || null, date })
  await weekStore.load(startDate.value, endDate.value)
  editingBlock.value = null
}

async function onBlockRemove(id) {
  if (isPreviewMode) {
    weekStore.blocks = weekStore.blocks.filter(block => block.id !== id)
    editingBlock.value = null
    return
  }
  await weekStore.removeBlock(id)
  editingBlock.value = null
}

function onBlockComplete() {
  completingTask.value = editingBlock.value?.expand?.task ?? null
  editingBlock.value = null
}

async function onCompleteConfirm({ taskId, actualHours }) {
  if (isPreviewMode) {
    const idx = taskStore.tasks.findIndex(task => task.id === taskId)
    if (idx !== -1) {
      taskStore.tasks[idx] = {
        ...taskStore.tasks[idx],
        status: 'done',
        actual_hours: actualHours,
        completed_at: new Date().toISOString().slice(0, 10),
      }
    }
    completingTask.value = null
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  await updateTask(taskId, { status: 'done', actual_hours: actualHours, completed_at: today })
  await taskStore.load()
  await weekStore.load(startDate.value, endDate.value)
  completingTask.value = null
}

async function onBlockMove({ blockId, dayKey }) {
  const day = dayByKey(dayKey)
  if (isPreviewMode) {
    const idx = weekStore.blocks.findIndex(block => block.id === blockId)
    if (idx !== -1) {
      weekStore.blocks[idx] = { ...weekStore.blocks[idx], date: day.dateISO }
    }
    return
  }
  await weekStore.editBlock(blockId, { date: day.dateISO })
  await weekStore.load(startDate.value, endDate.value)
}

function openAddModal(day) {
  addingToDay.value = day
}

async function onAddBlock({ taskId, dayKey, hours }) {
  const day = dayByKey(dayKey)
  if (isPreviewMode) {
    addPreviewBlock(taskId, day.dateISO, selectedPerson.value || taskStore.tasks.find(t => t.id === taskId)?.assignee || members.value[0]?.id || '', hours)
    addingToDay.value = null
    return
  }
  await weekStore.addBlock({
    task:   taskId,
    person: selectedPerson.value || auth.user?.id || null,
    date:   day.dateISO,
    hours,
  })
  await weekStore.load(startDate.value, endDate.value)
  addingToDay.value = null
}

function loadPreviewData() {
  const previewClients = [
    { id: 'client-1', name: 'Cliente Alpha', color: '#111111', archived: false },
    { id: 'client-2', name: 'Cliente Beta', color: '#444444', archived: false },
  ]

  const previewProjects = [
    { id: 'project-1', client: 'client-1', name: 'Reposicionamento', archived: false, status: 'active' },
    { id: 'project-2', client: 'client-1', name: 'Campanha de lancamento', archived: false, status: 'active' },
    { id: 'project-3', client: 'client-2', name: 'Diagnostico', archived: false, status: 'active' },
  ]

  const previewMembers = [
    { id: 'user-1', name: 'Ana', email: 'ana@s22.test', role: 'admin' },
    { id: 'user-2', name: 'Bia', email: 'bia@s22.test', role: 'member' },
  ]

  const previewTasks = [
    {
      id: 'task-1',
      project: 'project-1',
      assignee: 'user-1',
      name: 'Entrevistas com stakeholders',
      archived: false,
      status: 'doing',
      estimated_hours: 6,
      expand: {
        project: {
          ...previewProjects[0],
          expand: { client: previewClients[0] },
        },
      },
    },
    {
      id: 'task-2',
      project: 'project-1',
      assignee: 'user-2',
      name: 'Mapa de narrativa',
      archived: false,
      status: 'todo',
      estimated_hours: 4,
      expand: {
        project: {
          ...previewProjects[0],
          expand: { client: previewClients[0] },
        },
      },
    },
    {
      id: 'task-3',
      project: 'project-2',
      assignee: 'user-1',
      name: 'Texto de manifesto',
      archived: false,
      status: 'doing',
      estimated_hours: 3,
      expand: {
        project: {
          ...previewProjects[1],
          expand: { client: previewClients[0] },
        },
      },
    },
    {
      id: 'task-4',
      project: 'project-3',
      assignee: 'user-2',
      name: 'Analise competitiva',
      archived: false,
      status: 'doing',
      estimated_hours: 5,
      expand: {
        project: {
          ...previewProjects[2],
          expand: { client: previewClients[1] },
        },
      },
    },
  ]

  const previewBlocks = [
    createPreviewBlock('block-1', previewTasks[0], previewMembers[0], days.value[0].dateISO, 2),
    createPreviewBlock('block-2', previewTasks[2], previewMembers[0], days.value[1].dateISO, 1.5),
    createPreviewBlock('block-3', previewTasks[1], previewMembers[1], days.value[2].dateISO, 2),
    createPreviewBlock('block-4', previewTasks[3], previewMembers[1], days.value[3].dateISO, 3),
    createPreviewBlock('block-5', previewTasks[0], previewMembers[0], days.value[4].dateISO, 2.5),
  ]

  clientStore.clients = previewClients
  taskStore.tasks = previewTasks
  members.value = previewMembers
  weekStore.blocks = previewBlocks
  loadError.value = ''
}

function createPreviewBlock(id, task, person, dateISO, hours) {
  return {
    id,
    task: task.id,
    person: person.id,
    date: dateISO,
    hours,
    expand: {
      task,
      person,
    },
  }
}

function addPreviewBlock(taskId, dateISO, personId, hours = 1) {
  const task = taskStore.tasks.find(item => item.id === taskId)
  const person = members.value.find(member => member.id === personId) || members.value[0]
  if (!task || !person) return

  weekStore.blocks = [
    ...weekStore.blocks,
    createPreviewBlock(`block-${crypto.randomUUID()}`, task, person, dateISO, hours),
  ]
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
        <WeekSidebar
          :tasks="sidebarTasks"
          :clients="clientStore.clients"
          :task-allocated-hours="taskAllocatedHours"
        />

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
            @empty-click="openAddModal(day)"
          />
        </div>
      </div>

      <!-- FAB para adicionar bloco -->
      <button class="week-fab" @click="openAddModal(days[0])" title="Adicionar bloco">+</button>

      <AddToWeekModal
        v-if="addingToDay"
        :day="addingToDay"
        @add="onAddBlock"
        @close="addingToDay = null"
      />

      <BlockEditModal
        v-if="editingBlock"
        :block="editingBlock"
        @save="onBlockSave"
        @remove="onBlockRemove"
        @complete="onBlockComplete"
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

/* ── FAB ─────────────────────────────────────────────────────────────────── */
.week-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-accent);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, transform 0.1s;
  z-index: 50;
}

.week-fab:hover {
  background-color: color-mix(in srgb, var(--color-accent) 85%, #000);
  transform: scale(1.06);
}

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
