import { createRouter, createWebHistory } from 'vue-router'

// One-time migration shim: this site used to be a hash-routed SPA
// (`/#/manager`), so old bookmarks/shared links carry a `#/...` fragment.
// Now that we're on HTML5 history mode, rewrite that fragment into a real
// path *before* the router resolves its first location, so e.g.
// `/#/manager` lands on `/manager` directly with no visible flash/reload.
// Real in-page anchors (`#top`, `#what`, ...) never start with `#/`, so this
// can't misfire on those.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const legacyPath = window.location.hash.slice(1) // e.g. '/manager' or '/verify?serial=7&cert=...'
  const [path, legacyQuery = ''] = legacyPath.split('?')
  const query = [window.location.search.slice(1), legacyQuery].filter(Boolean).join('&')
  history.replaceState(null, '', path + (query ? '?' + query : ''))
}

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
  {
    path: '/verify',
    name: 'verify',
    component: () => import('../pages/VerifyPage.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
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
