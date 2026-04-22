import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/pb'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      tasks.value = await fetchTasks()
    } catch (e) {
      console.error('[taskStore] load:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function save(data, id = null) {
    if (id) {
      const updated = await updateTask(id, data)
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
    } else {
      const created = await createTask(data)
      tasks.value.push(created)
    }
  }

  async function remove(id) {
    await deleteTask(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  return { tasks, loading, load, save, remove }
})
