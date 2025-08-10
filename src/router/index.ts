import { createRouter, createWebHistory } from 'vue-router'

import {routes as TcpRoutes} from '@/modules/tcp/'


const routes = [
  ...TcpRoutes
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

export default router
