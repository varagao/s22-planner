import { ref, computed } from 'vue'

function toWeekRef(date) {
  // Calcula a semana ISO (YYYY-Www) a partir de uma Date
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function mondayOf(weekRef) {
  // Retorna a Date da segunda-feira da semana ISO
  const [year, week] = weekRef.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7)
  return monday
}

export function useWeekRef() {
  const today = new Date()
  const currentWeekRef = toWeekRef(today)
  const weekRef = ref(currentWeekRef)

  const monday = computed(() => mondayOf(weekRef.value))

  const days = computed(() => {
    const names = ['seg', 'ter', 'qua', 'qui', 'sex']
    const keys  = ['mon', 'tue', 'wed', 'thu', 'fri']
    return keys.map((key, i) => {
      const date = new Date(monday.value)
      date.setUTCDate(monday.value.getUTCDate() + i)
      return {
        key,
        label: names[i],
        date,
        dateStr: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
        isToday: toWeekRef(today) === weekRef.value && date.getUTCDate() === today.getDate(),
      }
    })
  })

  const weekLabel = computed(() => {
    const start = monday.value
    const end = new Date(monday.value)
    end.setUTCDate(start.getUTCDate() + 4)
    const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    return `${fmt(start)} – ${fmt(end)}`
  })

  const isCurrentWeek = computed(() => weekRef.value === currentWeekRef)

  function goNext() {
    const d = mondayOf(weekRef.value)
    d.setUTCDate(d.getUTCDate() + 7)
    weekRef.value = toWeekRef(d)
  }

  function goPrev() {
    const d = mondayOf(weekRef.value)
    d.setUTCDate(d.getUTCDate() - 7)
    weekRef.value = toWeekRef(d)
  }

  function goToday() {
    weekRef.value = currentWeekRef
  }

  return { weekRef, days, weekLabel, isCurrentWeek, goNext, goPrev, goToday }
}
