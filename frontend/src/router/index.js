import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/view/:token',
    name: 'viewer',
    component: () => import('../views/ViewerView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'week',
    component: () => import('../views/WeekView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/manage',
    name: 'manage',
    component: () => import('../views/ManageView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/people',
    name: 'people',
    component: () => import('../views/PeopleView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  // Valida token contra o servidor — JWT local pode parecer válido mas ser rejeitado
  await auth.refresh()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'week' }
  }

  return true
})

export default router
