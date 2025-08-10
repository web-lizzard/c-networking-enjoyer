export { default as routes } from './routes'

export const tcpModule = {
  name: 'TCP',
  description: 'Transmission Control Protocol',
  version: '1.0.0',
  routes: () => import('./routes'),
}
