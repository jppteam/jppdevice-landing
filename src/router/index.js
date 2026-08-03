import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue'),
  },
  {
    path: '/manager',
    name: 'manager',
    component: () => import('../pages/ManagerPage.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      const el = document.querySelector(to.hash)
      if (el) return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

export default router
