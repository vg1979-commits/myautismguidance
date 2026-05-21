import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { v4 as uuidv4 } from 'uuid'

function computeAgeBand(dob?: string): string | null {
  if (!dob) return null
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  if (age < 2) return null
  if (age <= 4) return '2-4'
  if (age <= 7) return '5-7'
  if (age <= 10) return '8-10'
  if (age <= 13) return '11-13'
  return '14-17'
}

export async function childrenRoutes(app: FastifyInstance) {
  // GET /children
  app.get('/children', async (req, reply) => {
    const userId = req.headers['x-user-id'] as string
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

    const user = await prisma.user.findFirst({ where: { clerkId: userId } })
    if (!user) return []

    return prisma.childProfile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })
  })

  // POST /children
  app.post<{ Body: {
    firstName: string
    dob?: string
    diagnosisStatus?: string
    schoolSetting?: string
    specialInterests?: string[]
    language?: string
  } }>('/children', async (req, reply) => {
    const clerkId = req.headers['x-user-id'] as string
    const email = req.headers['x-user-email'] as string || 'unknown@example.com'

    if (!clerkId) return reply.status(401).send({ error: 'Unauthorized' })

    // Upsert user
    let user = await prisma.user.findFirst({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, email },
      })
    }

    const ageBand = computeAgeBand(req.body.dob)

    const child = await prisma.childProfile.create({
      data: {
        userId: user.id,
        firstName: req.body.firstName,
        dob: req.body.dob,
        ageBand: ageBand ?? undefined,
        diagnosisStatus: req.body.diagnosisStatus || 'suspected',
        schoolSetting: req.body.schoolSetting,
        specialInterests: JSON.stringify(req.body.specialInterests || []),
        language: req.body.language || 'en',
      },
    })

    return {
      ...child,
      specialInterests: JSON.parse(child.specialInterests),
    }
  })

  // GET /children/:id
  app.get<{ Params: { id: string } }>('/children/:id', async (req, reply) => {
    const child = await prisma.childProfile.findUnique({ where: { id: req.params.id } })
    if (!child) return reply.status(404).send({ error: 'Not found' })
    return { ...child, specialInterests: JSON.parse(child.specialInterests) }
  })

  // PATCH /children/:id
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/children/:id', async (req, reply) => {
    const { specialInterests, ...rest } = req.body
    const data: Record<string, unknown> = { ...rest }
    if (specialInterests) data.specialInterests = JSON.stringify(specialInterests)

    const child = await prisma.childProfile.update({
      where: { id: req.params.id },
      data,
    })
    return { ...child, specialInterests: JSON.parse(child.specialInterests) }
  })

  // POST /children/:id/baseline
  app.post<{ Params: { id: string }; Body: {
    domainProfile?: unknown[]
    currentGoals?: string[]
    whatHasntWorked?: string[]
  } }>('/children/:id/baseline', async (req, reply) => {
    const { domainProfile, currentGoals, whatHasntWorked } = req.body

    const baseline = await prisma.baselineAssessment.upsert({
      where: { childId: req.params.id },
      update: {
        domainProfile: JSON.stringify(domainProfile || []),
        currentGoals: JSON.stringify(currentGoals || []),
        hasntWorked: JSON.stringify(whatHasntWorked || []),
        completedAt: new Date(),
      },
      create: {
        childId: req.params.id,
        domainProfile: JSON.stringify(domainProfile || []),
        currentGoals: JSON.stringify(currentGoals || []),
        hasntWorked: JSON.stringify(whatHasntWorked || []),
        completedAt: new Date(),
      },
    })

    return {
      ...baseline,
      domainProfile: JSON.parse(baseline.domainProfile),
      currentGoals: JSON.parse(baseline.currentGoals),
      whatHasntWorked: JSON.parse(baseline.hasntWorked),
    }
  })

  // GET /children/:id/baseline
  app.get<{ Params: { id: string } }>('/children/:id/baseline', async (req, reply) => {
    const baseline = await prisma.baselineAssessment.findUnique({
      where: { childId: req.params.id },
    })
    if (!baseline) return reply.status(404).send({ error: 'Not found' })
    return {
      ...baseline,
      domainProfile: JSON.parse(baseline.domainProfile),
      currentGoals: JSON.parse(baseline.currentGoals),
      whatHasntWorked: JSON.parse(baseline.hasntWorked),
    }
  })

  // GET /children/:id/progress
  app.get<{ Params: { id: string }; Querystring: { weeks?: string } }>(
    '/children/:id/progress',
    async (req, reply) => {
      const childId = req.params.id
      const weeks = Number(req.query.weeks || 4)

      const [domainStates, recentCards] = await Promise.all([
        prisma.domainState.findMany({ where: { childId } }),
        prisma.actionCard.findMany({
          where: { childId },
          include: { rating: true },
          orderBy: { generatedAt: 'desc' },
          take: 50,
        }),
      ])

      // Calculate strategy effectiveness from ratings
      const strategyMap: Record<string, { up: number; total: number }> = {}
      for (const card of recentCards) {
        const key = card.slotType
        if (!strategyMap[key]) strategyMap[key] = { up: 0, total: 0 }
        if (card.rating) {
          strategyMap[key].total++
          if (card.rating.rating === 'up') strategyMap[key].up++
        }
      }

      const topStrategies = Object.entries(strategyMap)
        .filter(([, v]) => v.total > 0)
        .map(([strategyType, { up, total }]) => ({
          strategyType,
          thumbsUpRate: up / total,
        }))
        .sort((a, b) => b.thumbsUpRate - a.thumbsUpRate)
        .slice(0, 5)

      return {
        domainStates,
        weeklyTrends: [],
        recentWins: domainStates
          .filter((d) => d.state === 'ACHIEVED')
          .map((d) => ({ domainCode: d.domainCode, achievedAt: d.enteredAt.toISOString() })),
        topStrategies,
      }
    }
  )
}
