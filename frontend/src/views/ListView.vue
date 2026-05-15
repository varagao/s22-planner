<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useClientStore } from '../stores/useClientStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useTaskStore } from '../stores/useTaskStore'
import {
  createClient, updateClient, archiveClient, unarchiveClient,
  createProject, updateProject, archiveProject, unarchiveProject,
  createTask, updateTask, archiveTask, unarchiveTask,
} from '../services/pb'

const route = useRoute()
const clientStore  = useClientStore()
const projectStore = useProjectStore()
const taskStore    = useTaskStore()
const isPreviewMode = import.meta.env.DEV && route.query.preview === '1'

// ── Focus path (breadcrumb) ───────────────────────────────────────────────────
// [] = top level (clients)
// [{type:'client', id}] = inside a client (projects)
// [{type:'client', id}, {type:'project', id}] = inside a project (tasks)
const focusPath = ref([])

const focusedClient = computed(() =>
  focusPath.value.length >= 1
    ? clientStore.clients.find(c => c.id === focusPath.value[0].id)
    : null
)

const focusedProject = computed(() =>
  focusPath.value.length >= 2
    ? projectStore.projects.find(p => p.id === focusPath.value[1].id)
    : null
)

// What items are shown at the current root level
const currentLevel = computed(() => focusPath.value.length)
// 0 = clients, 1 = projects of focusedClient, 2 = tasks of focusedProject

function zoomIn(type, id) {
  if (type === 'client')  focusPath.value = [{ type: 'client', id }]
  if (type === 'project') focusPath.value = [focusPath.value[0], { type: 'project', id }]
}

function zoomOut() {
  focusPath.value = focusPath.value.slice(0, -1)
}

// ── Collapsed state ────────────────────────────────────────────────────────────
// Plain reactive object: key = id, value = true when collapsed.
const collapsed = reactive({})
const archiveExpanded = reactive({ clients: false, projects: {}, tasks: {} })

function toggleCollapse(id) {
  collapsed[id] = !collapsed[id]
}

// ── Derived lists ──────────────────────────────────────────────────────────────
const activeClients = computed(() =>
  clientStore.clients.filter(c => !c.archived)
)
const archivedClients = computed(() =>
  clientStore.clients.filter(c => c.archived)
)

function projectsForClient(clientId) {
  return projectStore.projects.filter(p => p.client === clientId && !p.archived)
}
function archivedProjectsForClient(clientId) {
  return projectStore.projects.filter(p => p.client === clientId && p.archived)
}

function tasksForProject(projectId) {
  return taskStore.tasks.filter(t => t.project === projectId && !t.archived)
}
function archivedTasksForProject(projectId) {
  return taskStore.tasks.filter(t => t.project === projectId && t.archived)
}

// Filtered to current zoom level
const visibleClients = computed(() => {
  if (currentLevel.value === 0) return activeClients.value
  return []
})

const visibleProjects = computed(() => {
  if (currentLevel.value === 1 && focusedClient.value)
    return projectsForClient(focusedClient.value.id)
  return []
})

const visibleTasks = computed(() => {
  if (currentLevel.value === 2 && focusedProject.value)
    return tasksForProject(focusedProject.value.id)
  return []
})

// ── Inline editing ────────────────────────────────────────────────────────────
// editing: { type: 'client'|'project'|'task'|'new-client'|'new-project'|'new-task', id?, parentId?, value }
const editing = ref(null)
const editInputRef = ref(null)
let suppressBlur = false

async function startEdit(type, id, currentName) {
  editing.value = { type, id, value: currentName }
  await nextTick()
  focusInput()
}

async function startCreate(type, parentId = null) {
  editing.value = { type: `new-${type}`, parentId, value: '' }
  await nextTick()
  focusInput()
}

function focusInput() {
  const el = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value
  el?.focus()
  el?.select()
}

async function commitEdit() {
  if (!editing.value) return
  const { type, id, parentId, value } = editing.value
  const name = value.trim()
  if (!name) { editing.value = null; return }

  if (type === 'new-client') {
    const c = await createClient({ name, color: randomColor() })
    clientStore.clients.push(c)
  } else if (type === 'new-project') {
    const p = await createProject({ name, client: parentId, status: 'active' })
    projectStore.projects.push(p)
  } else if (type === 'new-task') {
    const t = await createTask({ name, project: parentId, status: 'todo', estimated_hours: 1 })
    taskStore.tasks.push(t)
  } else if (type === 'client') {
    const updated = await updateClient(id, { name })
    const idx = clientStore.clients.findIndex(c => c.id === id)
    if (idx !== -1) clientStore.clients[idx] = { ...clientStore.clients[idx], ...updated }
  } else if (type === 'project') {
    const updated = await updateProject(id, { name })
    const idx = projectStore.projects.findIndex(p => p.id === id)
    if (idx !== -1) projectStore.projects[idx] = { ...projectStore.projects[idx], ...updated }
  } else if (type === 'task') {
    const updated = await updateTask(id, { name })
    const idx = taskStore.tasks.findIndex(t => t.id === id)
    if (idx !== -1) taskStore.tasks[idx] = { ...taskStore.tasks[idx], ...updated }
  }

  editing.value = null
}

async function onBlurEdit() {
  if (suppressBlur) return
  await commitEdit()
}

async function onEditKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const { type, parentId } = editing.value ?? {}
    await commitEdit()
    if (!type) return
    const baseType = type.replace('new-', '')
    await startCreate(baseType, parentId ?? resolveParentId(baseType))
  } else if (e.key === 'Tab') {
    e.preventDefault()
    suppressBlur = true
    await handleTab()
    suppressBlur = false
  } else if (e.key === 'Escape') {
    editing.value = null
  }
}

function resolveParentId(type) {
  if (type === 'project') return focusedClient.value?.id ?? null
  if (type === 'task') return focusedProject.value?.id ?? null
  return null
}

async function handleTab() {
  if (!editing.value) return
  const { type, value, parentId } = editing.value
  const name = value.trim()

  if (type === 'new-client' && name) {
    // Cria o cliente e abre input de projeto aninhado na mesma view (sem zoomIn)
    const c = await createClient({ name, color: randomColor() })
    clientStore.clients.push(c)
    collapsed[c.id] = false
    editing.value = null
    await nextTick()
    await startCreate('project', c.id)
  } else if (type === 'new-project' && name) {
    // Cria o projeto e abre input de tarefa aninhado na mesma view (sem zoomIn)
    const clientId = parentId ?? focusedClient.value?.id
    const p = await createProject({ name, client: clientId, status: 'active' })
    projectStore.projects.push(p)
    collapsed[p.id] = false
    editing.value = null
    await nextTick()
    await startCreate('task', p.id)
  }
  // Tab no nível de tarefa não faz nada
}

function randomColor() {
  const palette = ['#2B7FBF', '#BF7F2B', '#7FBF2B', '#BF2B7F', '#2BBF7F', '#7F2BBF']
  return palette[Math.floor(Math.random() * palette.length)]
}

// Used in template to zoom into a project from the top-level view
function zoomIntoProject(clientId, projectId) {
  focusPath.value = [{ type: 'client', id: clientId }]
  // After setting path, zoomIn appends the project segment
  focusPath.value = [{ type: 'client', id: clientId }, { type: 'project', id: projectId }]
}

function colorForClient(client) {
  return client?.color ?? 'var(--color-text-muted)'
}

function colorForProject(project) {
  const client = clientStore.clients.find(c => c.id === project?.client)
  return colorForClient(client)
}

function colorForFocusedClient() {
  return colorForClient(focusedClient.value)
}

function colorForFocusedProject() {
  return colorForProject(focusedProject.value)
}

// ── Archive drag and drop ─────────────────────────────────────────────────────
const draggingItem = ref(null) // { type, id }
const dragOverArchive = ref(null) // type key

function onDragStart(e, type, id) {
  draggingItem.value = { type, id }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', `${type}:${id}`)
}

function onArchiveDragOver(e, zoneKey) {
  e.preventDefault()
  dragOverArchive.value = zoneKey
}

function onArchiveDragLeave() {
  dragOverArchive.value = null
}

async function onArchiveDrop(e, type) {
  e.preventDefault()
  dragOverArchive.value = null
  if (!draggingItem.value || draggingItem.value.type !== type) return
  const { id } = draggingItem.value
  draggingItem.value = null

  if (type === 'client') {
    await archiveClient(id)
    const idx = clientStore.clients.findIndex(c => c.id === id)
    if (idx !== -1) clientStore.clients[idx] = { ...clientStore.clients[idx], archived: true }
  } else if (type === 'project') {
    await archiveProject(id)
    const idx = projectStore.projects.findIndex(p => p.id === id)
    if (idx !== -1) projectStore.projects[idx] = { ...projectStore.projects[idx], archived: true }
  } else if (type === 'task') {
    await archiveTask(id)
    const idx = taskStore.tasks.findIndex(t => t.id === id)
    if (idx !== -1) taskStore.tasks[idx] = { ...taskStore.tasks[idx], archived: true }
  }
}

async function unarchive(type, id) {
  if (type === 'client') {
    await unarchiveClient(id)
    const idx = clientStore.clients.findIndex(c => c.id === id)
    if (idx !== -1) clientStore.clients[idx] = { ...clientStore.clients[idx], archived: false }
  } else if (type === 'project') {
    await unarchiveProject(id)
    const idx = projectStore.projects.findIndex(p => p.id === id)
    if (idx !== -1) projectStore.projects[idx] = { ...projectStore.projects[idx], archived: false }
  } else if (type === 'task') {
    await unarchiveTask(id)
    const idx = taskStore.tasks.findIndex(t => t.id === id)
    if (idx !== -1) taskStore.tasks[idx] = { ...taskStore.tasks[idx], archived: false }
  }
}

// ── FAB + button ───────────────────────────────────────────────────────────────
async function fabCreate() {
  if (currentLevel.value === 0) {
    await startCreate('client')
  } else if (currentLevel.value === 1) {
    await startCreate('project', focusedClient.value?.id)
  } else {
    await startCreate('task', focusedProject.value?.id)
  }
}

// ── Load data ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await Promise.all([
      clientStore.load(),
      projectStore.load(),
      taskStore.load(),
    ])
  } catch (error) {
    if (!isPreviewMode) throw error
    loadPreviewData()
  }
})

function loadPreviewData() {
  clientStore.clients = [
    { id: 'client-1', name: 'Cliente Alpha', color: '#111111', archived: false },
    { id: 'client-2', name: 'Cliente Beta', color: '#444444', archived: false },
  ]

  projectStore.projects = [
    { id: 'project-1', client: 'client-1', name: 'Reposicionamento', archived: false, status: 'active' },
    { id: 'project-2', client: 'client-1', name: 'Campanha de lancamento', archived: false, status: 'active' },
    { id: 'project-3', client: 'client-2', name: 'Diagnostico', archived: false, status: 'active' },
  ]

  taskStore.tasks = [
    { id: 'task-1', project: 'project-1', name: 'Entrevistas com stakeholders', archived: false, status: 'doing' },
    { id: 'task-2', project: 'project-1', name: 'Mapa de narrativa', archived: false, status: 'todo' },
    { id: 'task-3', project: 'project-2', name: 'Texto de manifesto', archived: false, status: 'todo' },
    { id: 'task-4', project: 'project-3', name: 'Analise competitiva', archived: false, status: 'doing' },
  ]
}
</script>

<template>
  <div class="list-view">

    <!-- Breadcrumb / zoom title -->
    <div v-if="focusPath.length > 0" class="breadcrumb">
      <button class="back-btn" @click="zoomOut">‹</button>
      <span class="breadcrumb-title">
        <template v-if="focusPath.length === 1 && focusedClient">
          {{ focusedClient.name }}
        </template>
        <template v-else-if="focusPath.length === 2 && focusedProject">
          {{ focusedProject.name }}
        </template>
      </span>
    </div>

    <div class="list-body" :class="{ 'list-body--focused': focusPath.length > 0 }">

      <!-- ── Level 0: Clients ─────────────────────────────────────────────── -->
      <template v-if="currentLevel === 0">
        <div
          v-for="client in visibleClients"
          :key="client.id"
          class="list-node"
          draggable="true"
          @dragstart="onDragStart($event, 'client', client.id)"
        >
          <div class="node-row">
            <button
              class="collapse-btn"
              :class="{ expanded: !collapsed[client.id] }"
              :style="{ color: colorForClient(client) }"
              @click="toggleCollapse(client.id)"
            >
              <span class="caret-icon" aria-hidden="true" />
            </button>
            <span
              v-if="editing?.id === client.id && editing?.type === 'client'"
              class="node-input-wrap"
            >
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
            <span
              v-else
              class="node-label node-label--client"
              @dblclick="zoomIn('client', client.id)"
              @click.stop
            >
              {{ client.name }}
            </span>
            <button class="edit-btn" @click="startEdit('client', client.id, client.name)">✎</button>
          </div>

          <!-- Projects nested inside client -->
          <div v-if="!collapsed[client.id]" class="node-children">
            <div
              v-for="project in projectsForClient(client.id)"
              :key="project.id"
              class="list-node list-node--project"
              draggable="true"
              @dragstart.stop="onDragStart($event, 'project', project.id)"
            >
              <div class="node-row">
                <button
                  class="collapse-btn"
                  :class="{ expanded: !collapsed[project.id] }"
                  :style="{ color: colorForProject(project) }"
                  @click="toggleCollapse(project.id)"
                >
                  <span class="caret-icon" aria-hidden="true" />
                </button>
                <span
                  v-if="editing?.id === project.id && editing?.type === 'project'"
                  class="node-input-wrap"
                >
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    @keydown="onEditKeydown"
                    @blur="onBlurEdit"
                  />
                </span>
                <span
                  v-else
                  class="node-label"
                  @dblclick="zoomIntoProject(client.id, project.id)"
                  @click.stop
                >
                  {{ project.name }}
                </span>
                <button class="edit-btn" @click="startEdit('project', project.id, project.name)">✎</button>
              </div>

              <!-- Tasks nested inside project -->
              <div v-if="!collapsed[project.id]" class="node-children">
                <div
                  v-for="task in tasksForProject(project.id)"
                  :key="task.id"
                  class="list-node list-node--task"
                  draggable="true"
                  @dragstart.stop="onDragStart($event, 'task', task.id)"
                >
                  <div class="node-row">
                    <span class="node-slot" aria-hidden="true" />
                    <span
                      v-if="editing?.id === task.id && editing?.type === 'task'"
                      class="node-input-wrap"
                    >
                      <input
                        ref="editInputRef"
                        v-model="editing.value"
                        class="node-input"
                        @keydown="onEditKeydown"
                        @blur="onBlurEdit"
                      />
                    </span>
                    <span v-else class="node-label">{{ task.name }}</span>
                    <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
                  </div>
                </div>

                <!-- New task inline input -->
                <div v-if="editing?.type === 'new-task' && editing?.parentId === project.id" class="list-node list-node--task">
                  <div class="node-row">
                    <span class="node-slot" aria-hidden="true" />
                    <span class="node-input-wrap">
                      <input
                        ref="editInputRef"
                        v-model="editing.value"
                        class="node-input"
                        placeholder="Nova tarefa..."
                        @keydown="onEditKeydown"
                        @blur="onBlurEdit"
                      />
                    </span>
                  </div>
                </div>

                <!-- Archive zone for tasks -->
                <div
                  class="archive-zone"
                  :class="{ 'archive-zone--over': dragOverArchive === `tasks-${project.id}` }"
                  @dragover="onArchiveDragOver($event, `tasks-${project.id}`)"
                  @dragleave="onArchiveDragLeave"
                  @drop="onArchiveDrop($event, 'task')"
                >
                  <button
                    class="archive-toggle"
                    @click="archiveExpanded.tasks[project.id] = !archiveExpanded.tasks[project.id]"
                  >
                    <span
                      class="archive-caret"
                      :class="{ expanded: archiveExpanded.tasks[project.id] }"
                      :style="{ color: colorForProject(project) }"
                      aria-hidden="true"
                    >
                      <span class="caret-icon" />
                    </span>
                    <span>Arquivo</span>
                    <span v-if="archivedTasksForProject(project.id).length > 0" class="archive-count">
                      {{ archivedTasksForProject(project.id).length }}
                    </span>
                  </button>
                  <div v-if="archiveExpanded.tasks[project.id]" class="archived-items">
                    <div
                      v-for="task in archivedTasksForProject(project.id)"
                      :key="task.id"
                      class="archived-item"
                    >
                      <span class="node-slot" aria-hidden="true" />
                      <span class="archived-label">{{ task.name }}</span>
                      <button class="unarchive-btn" @click="unarchive('task', task.id)">↩</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- New project inline input -->
            <div v-if="editing?.type === 'new-project' && editing?.parentId === client.id" class="list-node list-node--project">
              <div class="node-row">
                <span class="node-slot" aria-hidden="true" />
                <span class="node-input-wrap">
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    placeholder="Novo projeto..."
                    @keydown="onEditKeydown"
                    @blur="onBlurEdit"
                  />
                </span>
              </div>
            </div>

            <!-- Archive zone for projects -->
            <div
              class="archive-zone"
              :class="{ 'archive-zone--over': dragOverArchive === `projects-${client.id}` }"
              @dragover="onArchiveDragOver($event, `projects-${client.id}`)"
              @dragleave="onArchiveDragLeave"
              @drop="onArchiveDrop($event, 'project')"
            >
              <button
                class="archive-toggle"
                @click="archiveExpanded.projects[client.id] = !archiveExpanded.projects[client.id]"
              >
                <span
                  class="archive-caret"
                  :class="{ expanded: archiveExpanded.projects[client.id] }"
                  :style="{ color: colorForClient(client) }"
                  aria-hidden="true"
                >
                  <span class="caret-icon" />
                </span>
                <span>Arquivo</span>
                <span v-if="archivedProjectsForClient(client.id).length > 0" class="archive-count">
                  {{ archivedProjectsForClient(client.id).length }}
                </span>
              </button>
              <div v-if="archiveExpanded.projects[client.id]" class="archived-items">
                <div
                  v-for="proj in archivedProjectsForClient(client.id)"
                  :key="proj.id"
                  class="archived-item"
                >
                  <span class="node-slot" aria-hidden="true" />
                  <span class="archived-label">{{ proj.name }}</span>
                  <button class="unarchive-btn" @click="unarchive('project', proj.id)">↩</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- New client inline input -->
        <div v-if="editing?.type === 'new-client'" class="list-node">
          <div class="node-row">
            <span class="collapse-btn" style="visibility:hidden">▼</span>
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Novo cliente..."
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
          </div>
        </div>

        <!-- Archive zone for clients -->
        <div
          class="archive-zone archive-zone--top"
          :class="{ 'archive-zone--over': dragOverArchive === 'clients' }"
          @dragover="onArchiveDragOver($event, 'clients')"
          @dragleave="onArchiveDragLeave"
          @drop="onArchiveDrop($event, 'client')"
        >
          <button
            class="archive-toggle"
            @click="archiveExpanded.clients = !archiveExpanded.clients"
          >
            <span class="archive-caret" :class="{ expanded: archiveExpanded.clients }" aria-hidden="true">
              <span class="caret-icon" />
            </span>
            <span>Arquivo</span>
            <span v-if="archivedClients.length > 0" class="archive-count">
              {{ archivedClients.length }}
            </span>
          </button>
          <div v-if="archiveExpanded.clients" class="archived-items">
            <div
              v-for="client in archivedClients"
              :key="client.id"
              class="archived-item"
            >
              <span class="node-slot" aria-hidden="true" />
              <span class="archived-label">{{ client.name }}</span>
              <button class="unarchive-btn" @click="unarchive('client', client.id)">↩</button>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Level 1: Projects of a client ───────────────────────────────── -->
      <template v-else-if="currentLevel === 1 && focusedClient">
        <div
          v-for="project in visibleProjects"
          :key="project.id"
          class="list-node"
          draggable="true"
          @dragstart="onDragStart($event, 'project', project.id)"
        >
          <div class="node-row">
            <button
              class="collapse-btn"
              :class="{ expanded: !collapsed[project.id] }"
              :style="{ color: colorForFocusedClient() }"
              @click="toggleCollapse(project.id)"
            >
              <span class="caret-icon" aria-hidden="true" />
            </button>
            <span
              v-if="editing?.id === project.id && editing?.type === 'project'"
              class="node-input-wrap"
            >
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
            <span
              v-else
              class="node-label"
              @dblclick="zoomIn('project', project.id)"
              @click.stop
            >
              {{ project.name }}
            </span>
            <button class="edit-btn" @click="startEdit('project', project.id, project.name)">✎</button>
          </div>

          <div v-if="!collapsed[project.id]" class="node-children">
            <div
              v-for="task in tasksForProject(project.id)"
              :key="task.id"
              class="list-node list-node--task"
              draggable="true"
              @dragstart.stop="onDragStart($event, 'task', task.id)"
            >
              <div class="node-row">
                <span class="node-slot" aria-hidden="true" />
                <span
                  v-if="editing?.id === task.id && editing?.type === 'task'"
                  class="node-input-wrap"
                >
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    @keydown="onEditKeydown"
                    @blur="onBlurEdit"
                  />
                </span>
                <span v-else class="node-label">{{ task.name }}</span>
                <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
              </div>
            </div>

            <div v-if="editing?.type === 'new-task' && editing?.parentId === project.id" class="list-node list-node--task">
              <div class="node-row">
                <span class="node-slot" aria-hidden="true" />
                <span class="node-input-wrap">
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    placeholder="Nova tarefa..."
                    @keydown="onEditKeydown"
                    @blur="onBlurEdit"
                  />
                </span>
              </div>
            </div>

            <div
              class="archive-zone"
              :class="{ 'archive-zone--over': dragOverArchive === `tasks-${project.id}` }"
              @dragover="onArchiveDragOver($event, `tasks-${project.id}`)"
              @dragleave="onArchiveDragLeave"
              @drop="onArchiveDrop($event, 'task')"
            >
              <button
                class="archive-toggle"
                @click="archiveExpanded.tasks[project.id] = !archiveExpanded.tasks[project.id]"
              >
                <span
                  class="archive-caret"
                  :class="{ expanded: archiveExpanded.tasks[project.id] }"
                  :style="{ color: colorForFocusedClient() }"
                  aria-hidden="true"
                >
                  <span class="caret-icon" />
                </span>
                <span>Arquivo</span>
                <span v-if="archivedTasksForProject(project.id).length > 0" class="archive-count">
                  {{ archivedTasksForProject(project.id).length }}
                </span>
              </button>
              <div v-if="archiveExpanded.tasks[project.id]" class="archived-items">
                <div
                  v-for="task in archivedTasksForProject(project.id)"
                  :key="task.id"
                  class="archived-item"
                >
                  <span class="node-slot" aria-hidden="true" />
                  <span class="archived-label">{{ task.name }}</span>
                  <button class="unarchive-btn" @click="unarchive('task', task.id)">↩</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="editing?.type === 'new-project' && editing?.parentId === focusedClient.id" class="list-node">
          <div class="node-row">
            <span class="node-slot" aria-hidden="true" />
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Novo projeto..."
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
          </div>
        </div>

        <div
          class="archive-zone archive-zone--top"
          :class="{ 'archive-zone--over': dragOverArchive === `projects-${focusedClient.id}` }"
          @dragover="onArchiveDragOver($event, `projects-${focusedClient.id}`)"
          @dragleave="onArchiveDragLeave"
          @drop="onArchiveDrop($event, 'project')"
        >
          <button
            class="archive-toggle"
            @click="archiveExpanded.projects[focusedClient.id] = !archiveExpanded.projects[focusedClient.id]"
          >
            <span
              class="archive-caret"
              :class="{ expanded: archiveExpanded.projects[focusedClient.id] }"
              :style="{ color: colorForFocusedClient() }"
              aria-hidden="true"
            >
              <span class="caret-icon" />
            </span>
            <span>Arquivo</span>
            <span v-if="archivedProjectsForClient(focusedClient.id).length > 0" class="archive-count">
              {{ archivedProjectsForClient(focusedClient.id).length }}
            </span>
          </button>
          <div v-if="archiveExpanded.projects[focusedClient.id]" class="archived-items">
            <div
              v-for="proj in archivedProjectsForClient(focusedClient.id)"
              :key="proj.id"
              class="archived-item"
            >
              <span class="node-slot" aria-hidden="true" />
              <span class="archived-label">{{ proj.name }}</span>
              <button class="unarchive-btn" @click="unarchive('project', proj.id)">↩</button>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Level 2: Tasks of a project ─────────────────────────────────── -->
      <template v-else-if="currentLevel === 2 && focusedProject">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="list-node"
          draggable="true"
          @dragstart="onDragStart($event, 'task', task.id)"
        >
          <div class="node-row">
            <span class="node-slot" aria-hidden="true" />
            <span
              v-if="editing?.id === task.id && editing?.type === 'task'"
              class="node-input-wrap"
            >
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
            <span v-else class="node-label">{{ task.name }}</span>
            <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
          </div>
        </div>

        <div v-if="editing?.type === 'new-task' && editing?.parentId === focusedProject.id" class="list-node">
          <div class="node-row">
            <span class="node-slot" aria-hidden="true" />
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Nova tarefa..."
                @keydown="onEditKeydown"
                @blur="onBlurEdit"
              />
            </span>
          </div>
        </div>

        <div
          class="archive-zone archive-zone--top"
          :class="{ 'archive-zone--over': dragOverArchive === `tasks-${focusedProject.id}` }"
          @dragover="onArchiveDragOver($event, `tasks-${focusedProject.id}`)"
          @dragleave="onArchiveDragLeave"
          @drop="onArchiveDrop($event, 'task')"
        >
          <button
            class="archive-toggle"
            @click="archiveExpanded.tasks[focusedProject.id] = !archiveExpanded.tasks[focusedProject.id]"
          >
            <span
              class="archive-caret"
              :class="{ expanded: archiveExpanded.tasks[focusedProject.id] }"
              :style="{ color: colorForFocusedProject() }"
              aria-hidden="true"
            >
              <span class="caret-icon" />
            </span>
            <span>Arquivo</span>
            <span v-if="archivedTasksForProject(focusedProject.id).length > 0" class="archive-count">
              {{ archivedTasksForProject(focusedProject.id).length }}
            </span>
          </button>
          <div v-if="archiveExpanded.tasks[focusedProject.id]" class="archived-items">
            <div
              v-for="task in archivedTasksForProject(focusedProject.id)"
              :key="task.id"
              class="archived-item"
            >
              <span class="node-slot" aria-hidden="true" />
              <span class="archived-label">{{ task.name }}</span>
              <button class="unarchive-btn" @click="unarchive('task', task.id)">↩</button>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- FAB -->
    <button class="fab" @click="fabCreate" title="Criar item">+</button>

  </div>
</template>

<style scoped>
.list-view {
  --list-indent: 24px;
  --list-marker-size: 16px;
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 80px;
}

/* ── Breadcrumb ───────────────────────────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-left: 6px;
}

.back-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-block);
  padding: 2px 10px;
  font-size: 18px;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1.4;
  font-family: var(--font-base);
  transition: color 0.15s, border-color 0.15s;
}

.back-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.breadcrumb-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

/* ── List nodes ───────────────────────────────────────────────────────────── */
.list-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-body--focused {
  padding-left: 52px;
}

.list-node {
  border-radius: var(--radius-block);
}

.list-node--project {
  margin-left: var(--list-indent);
}

.list-node--task {
  margin-left: var(--list-indent);
}

.node-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: var(--radius-block);
  min-height: 26px;
  transition: background-color 0.1s;
}

.node-row:hover {
  background-color: var(--color-surface);
}

.node-row:hover .edit-btn {
  opacity: 1;
}

/* ── Controls ─────────────────────────────────────────────────────────────── */
.collapse-btn {
  background: none;
  border: none;
  width: var(--list-marker-size);
  min-width: var(--list-marker-size);
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  line-height: 0;
  flex-shrink: 0;
  transition: color 0.12s;
}

.collapse-btn:hover {
  filter: brightness(0.82);
}

.caret-icon {
  width: 0;
  height: 0;
  display: inline-block;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid currentColor;
  transform: rotate(0deg);
  transform-origin: 45% 50%;
  transition: transform 0.12s;
}

.collapse-btn.expanded .caret-icon,
.archive-caret.expanded .caret-icon {
  transform: rotate(90deg);
}

.node-slot {
  width: var(--list-marker-size);
  min-width: var(--list-marker-size);
  height: 1px;
  flex-shrink: 0;
  display: inline-block;
}

.node-label {
  flex: 1;
  font-size: 15px;
  font-weight: 400;
  color: #000;
  cursor: default;
  user-select: none;
  line-height: 1.2;
}

.node-label--client {
  font-weight: 700;
}

.node-input-wrap {
  flex: 1;
}

.node-input {
  width: 100%;
  font-family: var(--font-base);
  font-size: 15px;
  font-weight: 400;
  color: #000;
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-block);
  padding: 2px 6px;
  outline: none;
  line-height: 1.2;
}

.edit-btn {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: var(--color-text-muted);
  opacity: 0;
  padding: 2px 4px;
  border-radius: 2px;
  transition: color 0.12s, opacity 0.12s;
  flex-shrink: 0;
}

.edit-btn:hover {
  color: var(--color-text);
}

/* ── Children ──────────────────────────────────────────────────────────────── */
.node-children {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
}

/* ── Archive zone ─────────────────────────────────────────────────────────── */
.archive-zone {
  margin-left: var(--list-indent);
  margin-top: 4px;
  border-radius: var(--radius-block);
  border: 1px dashed transparent;
  transition: border-color 0.15s, background-color 0.15s;
}

.archive-zone--top {
  margin-left: 0;
  margin-top: 12px;
}

.archive-zone--over {
  border-color: var(--color-accent);
  background-color: color-mix(in srgb, var(--color-accent) 6%, transparent);
}

.archive-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  font-family: var(--font-base);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.2;
  color: #b7aa9d;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-block);
  transition: color 0.12s;
}

.archive-toggle:hover {
  color: #9b8d80;
}

.archive-caret {
  width: var(--list-marker-size);
  min-width: var(--list-marker-size);
  line-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.archive-count {
  background: var(--color-border);
  color: #9b8d80;
  font-size: 10px;
  border-radius: 10px;
  padding: 0 5px;
  font-family: var(--font-mono);
}

.archived-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0 4px;
}

.archived-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: var(--radius-block);
}

.archived-label {
  flex: 1;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.2;
  color: #b7aa9d;
  text-decoration: line-through;
  text-decoration-color: #d8ccc1;
}

.unarchive-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  padding: 2px 4px;
  border-radius: 2px;
  transition: color 0.12s, opacity 0.12s;
}

.archived-item:hover .unarchive-btn {
  opacity: 1;
}

.unarchive-btn:hover {
  color: var(--color-accent);
}

/* ── FAB ──────────────────────────────────────────────────────────────────── */
.fab {
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

.fab:hover {
  background-color: color-mix(in srgb, var(--color-accent) 85%, #000);
  transform: scale(1.06);
}

/* ── Mobile ───────────────────────────────────────────────────────────────── */
@media (max-width: 767px) {
  .list-view { --list-indent: 24px; }
  .list-body--focused { padding-left: 52px; }
  .fab { bottom: 20px; right: 20px; }
}
</style>
