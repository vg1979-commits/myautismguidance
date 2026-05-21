import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'

export async function cardRoutes(app: FastifyInstance) {
  // GET /children/:id/cards/current
  app.get<{ Params: { id: string } }>(
    '/children/:id/cards/current',
    async (req) => {
      // Get current week's cards
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const cards = await prisma.actionCard.findMany({
        where: {
          childId: req.params.id,
          generatedAt: { gte: weekStart },
        },
        include: { rating: true },
        orderBy: { generatedAt: 'asc' },
      })

      return cards.map((c) => ({
        ...c,
        watchForPositive: JSON.parse(c.watchForPositive),
        watchForNegative: JSON.parse(c.watchForNegative),
        rating: c.rating?.rating,
        ratingNote: c.rating?.noteText,
      }))
    }
  )

  // GET /cards/:id
  app.get<{ Params: { id: string } }>('/cards/:id', async (req, reply) => {
    const card = await prisma.actionCard.findUnique({
      where: { id: req.params.id },
      include: { rating: true },
    })
    if (!card) return reply.status(404).send({ error: 'Not found' })

    return {
      ...card,
      watchForPositive: JSON.parse(card.watchForPositive),
      watchForNegative: JSON.parse(card.watchForNegative),
      rating: card.rating?.rating,
      ratingNote: card.rating?.noteText,
    }
  })

  // POST /cards/:id/rate
  app.post<{ Params: { id: string }; Body: { rating: string; note?: string } }>(
    '/cards/:id/rate',
    async (req, reply) => {
      const card = await prisma.actionCard.findUnique({ where: { id: req.params.id } })
      if (!card) return reply.status(404).send({ error: 'Not found' })

      const daysSince = Math.floor(
        (Date.now() - card.generatedAt.getTime()) / 86400000
      )

      await prisma.cardRating.upsert({
        where: { cardId: req.params.id },
        update: {
          rating: req.body.rating,
          noteText: req.body.note,
          ratedAt: new Date(),
          daysSinceIssue: daysSince,
        },
        create: {
          cardId: req.params.id,
          childId: card.childId,
          rating: req.body.rating,
          noteText: req.body.note,
          daysSinceIssue: daysSince,
        },
      })

      return { success: true }
    }
  )
}
