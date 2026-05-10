<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useClientStore } from '../stores/useClientStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useTaskStore } from '../stores/useTaskStore'
import {
  createClient, updateClient, archiveClient, unarchiveClient,
  createProject, updateProject, archiveProject, unarchiveProject,
  createTask, updateTask, archiveTask, unarchiveTask,
} from '../services/pb'

const clientStore  = useClientStore()
const projectStore = useProjectStore()
const taskStore    = useTaskStore()

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

async function startEdit(type, id, currentName) {
  editing.value = { type, id, value: currentName }
  await nextTick()
  editInputRef.value?.focus()
  editInputRef.value?.select()
}

async function startCreate(type, parentId = null) {
  editing.value = { type: `new-${type}`, parentId, value: '' }
  await nextTick()
  editInputRef.value?.focus()
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

async function onEditKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    // Capture before commitEdit clears editing
    const { type, parentId } = editing.value ?? {}
    await commitEdit()
    if (!type) return
    const baseType = type.replace('new-', '')
    await startCreate(baseType, parentId ?? resolveParentId(baseType))
  } else if (e.key === 'Tab') {
    e.preventDefault()
    await handleTab()
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
  const { type, value } = editing.value
  const name = value.trim()

  if (type === 'new-client' && name) {
    // Create the client, then zoom in and start creating a project
    const c = await createClient({ name, color: randomColor() })
    clientStore.clients.push(c)
    editing.value = null
    zoomIn('client', c.id)
    await nextTick()
    await startCreate('project', c.id)
  } else if (type === 'new-project' && name) {
    // Create the project, then zoom in and start creating a task
    const parentId = editing.value.parentId ?? focusedClient.value?.id
    const p = await createProject({ name, client: parentId, status: 'active' })
    projectStore.projects.push(p)
    editing.value = null
    zoomIn('project', p.id)
    await nextTick()
    await startCreate('task', p.id)
  }
  // Tab at task level does nothing
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
  await Promise.all([
    clientStore.load(),
    projectStore.load(),
    taskStore.load(),
  ])
})
</script>

<template>
  <div class="list-view">

    <!-- Breadcrumb / zoom title -->
    <div v-if="focusPath.length > 0" class="breadcrumb">
      <button class="back-btn" @click="zoomOut">‹</button>
      <span class="breadcrumb-title">
        <template v-if="focusPath.length === 1 && focusedClient">
          <span class="client-dot" :style="{ background: focusedClient.color }" />
          {{ focusedClient.name }}
        </template>
        <template v-else-if="focusPath.length === 2 && focusedProject">
          {{ focusedProject.name }}
        </template>
      </span>
    </div>

    <div class="list-body">

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
              @click="toggleCollapse(client.id)"
            >
              {{ collapsed[client.id] ? '▶' : '▼' }}
            </button>
            <span class="client-dot" :style="{ background: client.color }" />
            <span
              v-if="editing?.id === client.id && editing?.type === 'client'"
              class="node-input-wrap"
            >
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                @keydown="onEditKeydown"
                @blur="commitEdit"
              />
            </span>
            <span
              v-else
              class="node-label"
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
                  @click="toggleCollapse(project.id)"
                >
                  {{ collapsed[project.id] ? '▶' : '▼' }}
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
                    @blur="commitEdit"
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
                    <span class="task-bullet" />
                    <span
                      v-if="editing?.id === task.id && editing?.type === 'task'"
                      class="node-input-wrap"
                    >
                      <input
                        ref="editInputRef"
                        v-model="editing.value"
                        class="node-input"
                        @keydown="onEditKeydown"
                        @blur="commitEdit"
                      />
                    </span>
                    <span v-else class="node-label">{{ task.name }}</span>
                    <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
                  </div>
                </div>

                <!-- New task inline input -->
                <div v-if="editing?.type === 'new-task' && editing?.parentId === project.id" class="list-node list-node--task">
                  <div class="node-row">
                    <span class="task-bullet" />
                    <span class="node-input-wrap">
                      <input
                        ref="editInputRef"
                        v-model="editing.value"
                        class="node-input"
                        placeholder="Nova tarefa..."
                        @keydown="onEditKeydown"
                        @blur="commitEdit"
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
                    {{ archiveExpanded.tasks[project.id] ? '▼' : '▶' }} Arquivo
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
                      <span class="task-bullet archived" />
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
                <span class="collapse-btn" style="visibility:hidden">▼</span>
                <span class="node-input-wrap">
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    placeholder="Novo projeto..."
                    @keydown="onEditKeydown"
                    @blur="commitEdit"
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
                {{ archiveExpanded.projects[client.id] ? '▼' : '▶' }} Arquivo
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
                  <span class="collapse-btn" style="visibility:hidden">▶</span>
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
            <span class="client-dot" style="background: var(--color-border)" />
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Novo cliente..."
                @keydown="onEditKeydown"
                @blur="commitEdit"
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
            {{ archiveExpanded.clients ? '▼' : '▶' }} Arquivo
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
              <span class="client-dot" :style="{ background: client.color }" />
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
              @click="toggleCollapse(project.id)"
            >
              {{ collapsed[project.id] ? '▶' : '▼' }}
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
                @blur="commitEdit"
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
                <span class="task-bullet" />
                <span
                  v-if="editing?.id === task.id && editing?.type === 'task'"
                  class="node-input-wrap"
                >
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    @keydown="onEditKeydown"
                    @blur="commitEdit"
                  />
                </span>
                <span v-else class="node-label">{{ task.name }}</span>
                <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
              </div>
            </div>

            <div v-if="editing?.type === 'new-task' && editing?.parentId === project.id" class="list-node list-node--task">
              <div class="node-row">
                <span class="task-bullet" />
                <span class="node-input-wrap">
                  <input
                    ref="editInputRef"
                    v-model="editing.value"
                    class="node-input"
                    placeholder="Nova tarefa..."
                    @keydown="onEditKeydown"
                    @blur="commitEdit"
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
                {{ archiveExpanded.tasks[project.id] ? '▼' : '▶' }} Arquivo
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
                  <span class="task-bullet archived" />
                  <span class="archived-label">{{ task.name }}</span>
                  <button class="unarchive-btn" @click="unarchive('task', task.id)">↩</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="editing?.type === 'new-project' && editing?.parentId === focusedClient.id" class="list-node">
          <div class="node-row">
            <span class="collapse-btn" style="visibility:hidden">▼</span>
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Novo projeto..."
                @keydown="onEditKeydown"
                @blur="commitEdit"
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
            {{ archiveExpanded.projects[focusedClient.id] ? '▼' : '▶' }} Arquivo
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
            <span class="task-bullet" />
            <span
              v-if="editing?.id === task.id && editing?.type === 'task'"
              class="node-input-wrap"
            >
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                @keydown="onEditKeydown"
                @blur="commitEdit"
              />
            </span>
            <span v-else class="node-label">{{ task.name }}</span>
            <button class="edit-btn" @click="startEdit('task', task.id, task.name)">✎</button>
          </div>
        </div>

        <div v-if="editing?.type === 'new-task' && editing?.parentId === focusedProject.id" class="list-node">
          <div class="node-row">
            <span class="task-bullet" />
            <span class="node-input-wrap">
              <input
                ref="editInputRef"
                v-model="editing.value"
                class="node-input"
                placeholder="Nova tarefa..."
                @keydown="onEditKeydown"
                @blur="commitEdit"
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
            {{ archiveExpanded.tasks[focusedProject.id] ? '▼' : '▶' }} Arquivo
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
              <span class="task-bullet archived" />
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
  gap: 8px;
}

/* ── List nodes ───────────────────────────────────────────────────────────── */
.list-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-node {
  border-radius: var(--radius-block);
}

.list-node--project {
  margin-left: 24px;
}

.list-node--task {
  margin-left: 24px;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: var(--radius-block);
  min-height: 32px;
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
  font-size: 10px;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: 2px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.12s;
}

.collapse-btn:hover {
  color: var(--color-text);
}

.client-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.task-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
  flex-shrink: 0;
  margin-left: 8px;
  display: inline-block;
}

.task-bullet.archived {
  background: var(--color-border);
}

.node-label {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  cursor: default;
  user-select: none;
  line-height: 1.4;
}

.node-input-wrap {
  flex: 1;
}

.node-input {
  width: 100%;
  font-family: var(--font-base);
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-block);
  padding: 2px 6px;
  outline: none;
  line-height: 1.4;
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
  gap: 1px;
  margin-top: 1px;
}

/* ── Archive zone ─────────────────────────────────────────────────────────── */
.archive-zone {
  margin-left: 24px;
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
  gap: 6px;
  background: none;
  border: none;
  font-family: var(--font-base);
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--radius-block);
  transition: color 0.12s;
}

.archive-toggle:hover {
  color: var(--color-text);
}

.archive-count {
  background: var(--color-border);
  color: var(--color-text-muted);
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
  gap: 6px;
  padding: 3px 6px;
  border-radius: var(--radius-block);
}

.archived-label {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--color-border);
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
  .list-node--project { margin-left: 16px; }
  .list-node--task    { margin-left: 16px; }
  .archive-zone       { margin-left: 16px; }
  .fab { bottom: 20px; right: 20px; }
}
</style>
