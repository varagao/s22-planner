import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchClients, createClient, updateClient } from '../services/pb'

export const useClientStore = defineStore('client', () => {
  const clients = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      clients.value = await fetchClients()
    } catch (e) {
      console.error('[clientStore] load:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function save(data, id = null) {
    if (id) {
      const updated = await updateClient(id, data)
      const idx = clients.value.findIndex(c => c.id === id)
      if (idx !== -1) clients.value[idx] = updated
    } else {
      const created = await createClient(data)
      clients.value.push(created)
    }
  }

  return { clients, loading, load, save }
})
