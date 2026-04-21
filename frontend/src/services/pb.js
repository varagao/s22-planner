import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://localhost:8090')

export default pb

// ── Auth ─────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  pb.collection('users').authWithPassword(email, password)

export const logout = () => pb.authStore.clear()

export const currentUser = () => pb.authStore.model

export const isLoggedIn = () => pb.authStore.isValid

// ── Client ───────────────────────────────────────────────────────────────────

export const fetchClients = () =>
  pb.collection('client').getFullList({ sort: 'name' })

export const createClient = (data) =>
  pb.collection('client').create(data)

export const updateClient = (id, data) =>
  pb.collection('client').update(id, data)

// ── Project ──────────────────────────────────────────────────────────────────

export const fetchProjects = (filter = '') =>
  pb.collection('project').getFullList({ sort: 'name', expand: 'client', filter })

export const createProject = (data) =>
  pb.collection('project').create(data)

export const updateProject = (id, data) =>
  pb.collection('project').update(id, data)

// Busca um projeto pelo viewer_token (acesso público sem auth)
export const fetchProjectByToken = (token) =>
  pb.collection('project').getFirstListItem(`viewer_token="${token}"`, { expand: 'client' })

// ── Task ─────────────────────────────────────────────────────────────────────

export const fetchTasks = (filter = '') =>
  pb.collection('task').getFullList({ sort: 'name', expand: 'project,assignee', filter })

export const createTask = (data) =>
  pb.collection('task').create(data)

export const updateTask = (id, data) =>
  pb.collection('task').update(id, data)

export const deleteTask = (id) =>
  pb.collection('task').delete(id)

// ── Time Block ───────────────────────────────────────────────────────────────

export const fetchTimeBlocks = (weekRef) =>
  pb.collection('time_block').getFullList({
    filter: `week_ref="${weekRef}"`,
    expand: 'task,task.project,task.project.client,person',
  })

export const createTimeBlock = (data) =>
  pb.collection('time_block').create(data)

export const updateTimeBlock = (id, data) =>
  pb.collection('time_block').update(id, data)

export const deleteTimeBlock = (id) =>
  pb.collection('time_block').delete(id)

// ── Users (members) ──────────────────────────────────────────────────────────

export const fetchMembers = () =>
  pb.collection('users').getFullList({ sort: 'name', filter: 'role != "viewer"' })
