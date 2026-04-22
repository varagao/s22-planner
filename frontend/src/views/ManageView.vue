<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import ClientSection from '../components/manage/ClientSection.vue'
import ProjectSection from '../components/manage/ProjectSection.vue'
import TaskSection from '../components/manage/TaskSection.vue'

const route = useRoute()

const tabs = [
  { key: 'clients', label: 'Clientes' },
  { key: 'projects', label: 'Projetos' },
  { key: 'tasks', label: 'Tarefas' },
]

const validTabs = tabs.map(t => t.key)
const initialTab = validTabs.includes(route.query.tab) ? route.query.tab : 'clients'
const activeTab = ref(initialTab)
</script>

<template>
  <div class="manage">
    <div class="manage-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="manage-content">
      <ClientSection v-if="activeTab === 'clients'" />
      <ProjectSection v-if="activeTab === 'projects'" />
      <TaskSection v-if="activeTab === 'tasks'" />
    </div>
  </div>
</template>

<style scoped>
.manage {
  max-width: 800px;
}

.manage-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.tab {
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-family: var(--font-base);
  font-size: 14px;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 500;
}
</style>
