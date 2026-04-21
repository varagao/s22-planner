import { ref, onMounted, onUnmounted } from 'vue'

export function useBreakpoint() {
  const isDesktop = ref(window.innerWidth >= 1024)
  const isMobile  = ref(window.innerWidth < 768)

  function update() {
    isDesktop.value = window.innerWidth >= 1024
    isMobile.value  = window.innerWidth < 768
  }

  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))

  return { isDesktop, isMobile }
}
