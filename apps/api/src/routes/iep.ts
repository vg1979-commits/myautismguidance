import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { parseIEPDocument } from '../llm/anthropic.js'

// In-memory job store (replace with BullMQ + Redis in production)
const iepJobs = new Map<string, { status: string; result?: unknown }>()

export async function iepRoutes(app: FastifyInstance) {
  // POST /children/:id/iep/upload
  app.post<{ Params: { id: string } }>(
    '/children/:id/iep/upload',
    async (req, reply) => {
      // In production: upload to S3, trigger async job
      // For demo: simulate job creation
      const jobId = `iep_${Date.now()}`
      iepJobs.set(jobId, { status: 'pending' })

      // Simulate async parsing (in production: use BullMQ)
      setTimeout(async () => {
        try {
          // Would extract text from PDF and call parseIEPDocument()
          // For demo, return mock parsed data
          iepJobs.set(jobId, {
            status: 'complete',
            result: {
              goals: [
                {
                  id: 'g1',
                  text: 'Student will use self-regulation strategies independently in 3 out of 5 opportunities.',
                  domainTag: 'regulation',
                  keep: true,
                },
                {
                  id: 'g2',
                  text: 'Student will initiate a conversation with a peer in 2 out of 5 opportunities.',
                  domainTag: 'social',
                  keep: true,
                },
              ],
              services: [
                { type: 'Applied Behavior Analysis (ABA)', hoursPerWeek: 10 },
                { type: 'Occupational Therapy (OT)', hoursPerWeek: 2 },
                { type: 'Speech-Language Therapy', hoursPerWeek: 2 },
              ],
              accommodations: [
                'Extended time on tests (1.5x)',
                'Preferential seating',
                'Noise-canceling headphones available',
                'Movement breaks every 45 minutes',
                'Written instructions provided',
              ],
              presentLevels: 'Student demonstrates emerging self-regulation skills with adult support. Communication is functional with familiar adults and emerging with peers.',
              meetingDate: '2026-07-15',
              parseConfidence: 0.85,
            },
          })
        } catch {
          iepJobs.set(jobId, { status: 'failed' })
        }
      }, 3000)

      return { jobId }
    }
  )

  // GET /iep/jobs/:jobId
  app.get<{ Params: { jobId: string } }>('/iep/jobs/:jobId', async (req, reply) => {
    const job = iepJobs.get(req.params.jobId)
    if (!job) return reply.status(404).send({ error: 'Job not found' })
    return job
  })

  // POST /children/:id/iep/confirm
  app.post<{ Params: { id: string }; Body: { iepData: unknown } }>(
    '/children/:id/iep/confirm',
    async (req, reply) => {
      await prisma.iEPUploadRecord.upsert({
        where: { childId: req.params.id },
        update: {
          parsedJson: JSON.stringify(req.body.iepData),
          confirmedAt: new Date(),
        },
        create: {
          childId: req.params.id,
          parseStatus: 'confirmed',
          parsedJson: JSON.stringify(req.body.iepData),
          confirmedAt: new Date(),
        },
      })
      return { success: true }
    }
  )
}
