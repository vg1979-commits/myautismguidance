import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './db/client.js'
import { childrenRoutes } from './routes/children.js'
import { checkinRoutes } from './routes/checkins.js'
import { cardRoutes } from './routes/cards.js'
import { exportRoutes } from './routes/exports.js'
import { iepRoutes } from './routes/iep.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})

// Prefix all routes with /api
app.register(childrenRoutes, { prefix: '/api' })
app.register(checkinRoutes, { prefix: '/api' })
app.register(cardRoutes, { prefix: '/api' })
app.register(exportRoutes, { prefix: '/api' })
app.register(iepRoutes, { prefix: '/api' })

app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Start server
const port = Number(process.env.PORT || 3001)
try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`API running on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
