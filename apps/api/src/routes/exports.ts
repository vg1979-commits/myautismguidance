import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'

export async function exportRoutes(app: FastifyInstance) {
  // POST /children/:id/exports
  app.post<{
    Params: { id: string }
    Body: { exportType: string; depth?: string }
  }>('/children/:id/exports', async (req, reply) => {
    const { exportType, depth = 'summary' } = req.body
    const childId = req.params.id

    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(now.getDate() - 28)

    const record = await prisma.exportRecord.create({
      data: {
        childId,
        exportType,
        depthMode: depth,
        periodStart,
        periodEnd: now,
      },
    })

    // In production: trigger PDF generation job and return S3 URL
    // For now, return a placeholder
    return {
      ...record,
      downloadUrl: null,
      message: 'Export generation queued. In production, a PDF will be generated and a download link provided.',
    }
  })

  // GET /children/:id/exports
  app.get<{ Params: { id: string } }>('/children/:id/exports', async (req) => {
    return prisma.exportRecord.findMany({
      where: { childId: req.params.id },
      orderBy: { generatedAt: 'desc' },
    })
  })
}
