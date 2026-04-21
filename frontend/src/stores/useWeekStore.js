import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchTimeBlocks, createTimeBlock, updateTimeBlock, deleteTimeBlock } from '../services/pb'

export const useWeekStore = defineStore('week', () => {
  const blocks = ref([])
  const loading = ref(false)

  async function load(weekRef) {
    loading.value = true
    try {
      blocks.value = await fetchTimeBlocks(weekRef)
    } finally {
      loading.value = false
    }
  }

  async function addBlock(data) {
    const created = await createTimeBlock(data)
    blocks.value.push(created)
    return created
  }

  async function editBlock(id, data) {
    const updated = await updateTimeBlock(id, data)
    const idx = blocks.value.findIndex(b => b.id === id)
    if (idx !== -1) blocks.value[idx] = updated
  }

  async function removeBlock(id) {
    await deleteTimeBlock(id)
    blocks.value = blocks.value.filter(b => b.id !== id)
  }

  function blocksForDay(dayKey) {
    return blocks.value.filter(b => b.day_of_week === dayKey)
  }

  function hoursForDay(dayKey) {
    return blocksForDay(dayKey).reduce((sum, b) => sum + (b.hours || 0), 0)
  }

  return { blocks, loading, load, addBlock, editBlock, removeBlock, blocksForDay, hoursForDay }
})
