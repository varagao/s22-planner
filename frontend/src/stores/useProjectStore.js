import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchProjects, createProject, updateProject } from '../services/pb'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      projects.value = await fetchProjects()
    } finally {
      loading.value = false
    }
  }

  async function save(data, id = null) {
    if (id) {
      const updated = await updateProject(id, data)
      const idx = projects.value.findIndex(p => p.id === id)
      if (idx !== -1) projects.value[idx] = updated
    } else {
      const created = await createProject(data)
      projects.value.push(created)
    }
  }

  return { projects, loading, load, save }
})
