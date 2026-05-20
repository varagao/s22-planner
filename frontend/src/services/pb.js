import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://localhost:8090')

// Redireciona ao login quando o token expira
pb.authStore.onChange(() => {
  if (!pb.authStore.isValid && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
})

export default pb

// ── Auth ─────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  pb.collection('users').authWithPassword(email, password)

export const logout = () => pb.authStore.clear()

export const currentUser = () => pb.authStore.model

export const isLoggedIn = () => pb.authStore.isValid

// ── Client ───────────────────────────────────────────────────────────────────

export const fetchClients = () =>
  pb.collection('client').getFullList({ sort: 'sort_order,name' })

export const createClient = (data) =>
  pb.collection('client').create(data)

export const updateClient = (id, data) =>
  pb.collection('client').update(id, data)

export const archiveClient = (id) =>
  pb.collection('client').update(id, { archived: true })

export const unarchiveClient = (id) =>
  pb.collection('client').update(id, { archived: false })

// ── Project ──────────────────────────────────────────────────────────────────

export const fetchProjects = (filter = '') =>
  pb.collection('project').getFullList({ sort: 'sort_order,name', expand: 'client', filter })

export const createProject = (data) =>
  pb.collection('project').create(data)

export const updateProject = (id, data) =>
  pb.collection('project').update(id, data)

export const archiveProject = (id) =>
  pb.collection('project').update(id, { archived: true })

export const unarchiveProject = (id) =>
  pb.collection('project').update(id, { archived: false })

// Busca um projeto pelo viewer_token (acesso público sem auth)
// O token é passado como query param para satisfazer a rule do PocketBase
export const fetchProjectByToken = (token) =>
  pb.collection('project').getFirstListItem('', {
    expand: 'client',
    query:  { token },
  })

export const generateViewerToken = (id) =>
  pb.collection('project').update(id, { viewer_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') })

export const revokeViewerToken = (id) =>
  pb.collection('project').update(id, { viewer_token: '' })

// ── Task ─────────────────────────────────────────────────────────────────────

export const fetchTasks = (filter = '') =>
  pb.collection('task').getFullList({ sort: 'sort_order,name', expand: 'project,assignee', filter })

export const fetchTasksByProject = (projectId, token = null) =>
  pb.collection('task').getFullList({
    filter: `project="${projectId}" && status != "todo"`,
    sort:   'sort_order,due_date',
    ...(token ? { query: { token } } : {}),
  })

export const createTask = (data) =>
  pb.collection('task').create(data)

export const updateTask = (id, data) =>
  pb.collection('task').update(id, data)

export const deleteTask = (id) =>
  pb.collection('task').delete(id)

export const archiveTask = (id) =>
  pb.collection('task').update(id, { archived: true })

export const unarchiveTask = (id) =>
  pb.collection('task').update(id, { archived: false })

// ── Time Block ───────────────────────────────────────────────────────────────

export const fetchTimeBlocks = (startDate, endDate) =>
  pb.collection('time_block').getFullList({
    filter: `date >= "${startDate} 00:00:00" && date <= "${endDate} 23:59:59"`,
    expand: 'task,task.project,task.project.client,person',
  })

export const createTimeBlock = (data) =>
  pb.collection('time_block').create(data)

export const updateTimeBlock = (id, data) =>
  pb.collection('time_block').update(id, data)

export const deleteTimeBlock = (id) =>
  pb.collection('time_block').delete(id)

// ── Users ─────────────────────────────────────────────────────────────────────

export const fetchMembers = () =>
  pb.collection('users').getFullList({ sort: 'name', filter: 'role != "viewer"' })

export const fetchUsers = () =>
  pb.collection('users').getFullList({ sort: 'name' })

export const createUser = (data) =>
  pb.collection('users').create(data)

export const updateUser = (id, data) =>
  pb.collection('users').update(id, data)

export const deleteUser = (id) =>
  pb.collection('users').delete(id)

// ── Utilitários ───────────────────────────────────────────────────────────────

export const hasTimeBlocks = (taskId) =>
  pb.collection('time_block')
    .getList(1, 1, { filter: `task="${taskId}"` })
    .then(r => r.totalItems > 0)
