import type { RouteRecordRaw } from 'vue-router'

const tcpRoutes: RouteRecordRaw[] = [
  {
    path: '/tcp',
    name: 'TcpModule',
    redirect: '/tcp/overview',
    children: [
      {
        path: 'overview',
        name: 'TcpOverview',
        component: () => import('./views/TcpOverview.vue'),
        meta: { title: 'TCP Overview' }
      },
]
  }
]

export default tcpRoutes
