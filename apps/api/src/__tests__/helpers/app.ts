import Fastify from 'fastify'
import { childrenRoutes } from '../../routes/children'
import { checkinRoutes } from '../../routes/checkins'
import { cardRoutes } from '../../routes/cards'
import { exportRoutes } from '../../routes/exports'
import { iepRoutes } from '../../routes/iep'

export function buildApp() {
  const app = Fastify({ logger: false })

  app.register(childrenRoutes, { prefix: '/api' })
  app.register(checkinRoutes, { prefix: '/api' })
  app.register(cardRoutes, { prefix: '/api' })
  app.register(exportRoutes, { prefix: '/api' })
  app.register(iepRoutes, { prefix: '/api' })

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  return app
}
