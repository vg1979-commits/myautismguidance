import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { generateExportContent } from '../llm/anthropic.js'
import { computeAgeBand } from '../lib/age.js'

const EXPORT_TITLES: Record<string, string> = {
  'iep-summary': 'IEP Advocacy Summary',
  'teacher-card': 'Teacher Quick-Reference',
  'aba-report': 'ABA Therapist Report',
  'ot-report': 'OT Report',
  'slt-report': 'Speech-Language Report',
  'psychologist-report': 'Psychologist Report',
}

export async function exportRoutes(app: FastifyInstance) {
  // POST /children/:id/exports — generate a new export document
  app.post<{
    Params: { id: string }
    Body: { exportType: string; depth?: string }
  }>('/children/:id/exports', async (req, reply) => {
    const { exportType, depth = 'summary' } = req.body
    const childId = req.params.id

    const child = await prisma.childProfile.findUnique({ where: { id: childId } })
    if (!child) return reply.status(404).send({ error: 'Child not found' })

    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(now.getDate() - 28)

    // Fetch recent check-ins and cards for document context
    const [recentCheckins, recentCards] = await Promise.all([
      prisma.checkIn.findMany({
        where: { childId, submittedAt: { gte: periodStart } },
        orderBy: { weekNumber: 'desc' },
        take: 4,
      }),
      prisma.actionCard.findMany({
        where: { childId, generatedAt: { gte: periodStart } },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      }),
    ])

    // Generate document content with Claude Sonnet
    const htmlContent = await generateExportContent(
      exportType,
      depth,
      {
        firstName: child.firstName,
        ageBand: computeAgeBand(child.birthYear, child.birthMonth) ?? undefined,
        diagnosisStatus: child.diagnosisStatus,
        schoolSetting: child.schoolSetting ?? undefined,
        specialInterests: JSON.parse(child.specialInterests || '[]'),
      },
      recentCheckins.map((c) => ({
        rawText: c.rawText,
        caregiverTone: c.caregiverTone,
        weekNumber: c.weekNumber,
        signalJson: c.signalJson ?? undefined,
      })),
      recentCards.map((c) => ({
        title: c.title,
        domainCode: c.domainCode,
        setting: c.setting,
        strategyText: c.strategyText,
        whyNow: c.whyNow,
      })),
    )

    const record = await prisma.exportRecord.create({
      data: {
        childId,
        exportType,
        depthMode: depth,
        periodStart,
        periodEnd: now,
        content: htmlContent,
      },
    })

    return {
      id: record.id,
      childId: record.childId,
      exportType: record.exportType,
      depthMode: record.depthMode,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      generatedAt: record.generatedAt,
      downloadUrl: `/api/exports/${record.id}/download`,
    }
  })

  // GET /exports/:id/download — serve generated HTML document
  app.get<{ Params: { id: string } }>('/exports/:id/download', async (req, reply) => {
    const record = await prisma.exportRecord.findUnique({ where: { id: req.params.id } })
    if (!record || !record.content) return reply.status(404).send({ error: 'Export not found' })

    const child = await prisma.childProfile.findUnique({ where: { id: record.childId } })
    const title = EXPORT_TITLES[record.exportType] || 'Report'
    const childName = child?.firstName || 'Child'
    const generatedDate = new Date(record.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${childName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 760px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; line-height: 1.6; }
    h1 { font-size: 1.75rem; color: #1F4E79; margin-bottom: 4px; }
    h2 { font-size: 1.2rem; color: #1F4E79; margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3 { font-size: 1rem; color: #374151; margin-top: 1.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    ul { padding-left: 1.25rem; }
    li { margin-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th { background: #EFF6FF; color: #1F4E79; text-align: left; padding: 8px 12px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">For: ${childName} &nbsp;·&nbsp; Generated: ${generatedDate} &nbsp;·&nbsp; myautismguidance</p>
  ${record.content}
  <div class="footer">
    Generated by myautismguidance — based on caregiver observation. Not a clinical assessment. Always consult your child's providers.
  </div>
</body>
</html>`

    reply.header('Content-Type', 'text/html; charset=utf-8')
    reply.header('Content-Disposition', `inline; filename="${childName}-${record.exportType}-${generatedDate}.html"`)
    return reply.send(fullHtml)
  })

  // GET /children/:id/exports — list export history
  app.get<{ Params: { id: string } }>('/children/:id/exports', async (req) => {
    const records = await prisma.exportRecord.findMany({
      where: { childId: req.params.id },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, childId: true, exportType: true, depthMode: true,
        periodStart: true, periodEnd: true, generatedAt: true,
      },
    })
    return records.map((r) => ({
      ...r,
      downloadUrl: `/api/exports/${r.id}/download`,
    }))
  })
}
