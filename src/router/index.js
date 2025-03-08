import { createRouter, createWebHistory } from 'vue-router'
import SystemStatus from '../views/SystemStatus.vue'
import DataQuery from '../views/DataQuery.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/system-status'
    },
    {
      path: '/system-status',
      name: 'system-status',
      component: SystemStatus
    },
    {
      path: '/data-query',
      name: 'data-query',
      component: DataQuery
    }
  ]
})

export default router
