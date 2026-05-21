import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { extractSignals, personalizeCards } from '../llm/anthropic.js'
import { generateCandidateCards } from '../engine/cards/generator.js'

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

export async function checkinRoutes(app: FastifyInstance) {
  // POST /children/:id/checkins — submit check-in
  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/children/:id/checkins',
    async (req, reply) => {
      const childId = req.params.id
      const { text } = req.body

      const child = await prisma.childProfile.findUnique({ where: { id: childId } })
      if (!child) return reply.status(404).send({ error: 'Child not found' })

      const weekNumber = getWeekNumber()

      // Prevent duplicate check-ins for the same week
      const existing = await prisma.checkIn.findFirst({ where: { childId, weekNumber } })
      if (existing) {
        return reply.status(409).send({ error: 'Already checked in this week', checkinId: existing.id })
      }

      // Create check-in record
      const checkin = await prisma.checkIn.create({
        data: {
          childId,
          weekNumber,
          rawText: text,
          caregiverTone: 'neutral',
          extractionConfidence: 0.5,
        },
      })

      try {
        // Extract signals via LLM
        const signals = await extractSignals(
          text,
          {
            firstName: child.firstName,
            ageBand: child.ageBand || undefined,
            diagnosisStatus: child.diagnosisStatus,
            schoolSetting: child.schoolSetting || undefined,
          },
          checkin.weekNumber
        )

        // Update checkin with extracted signals
        await prisma.checkIn.update({
          where: { id: checkin.id },
          data: {
            signalJson: JSON.stringify(signals),
            caregiverTone: signals.caregiver_tone,
            extractionConfidence: signals.extraction_confidence,
          },
        })

        // If follow-up needed, return questions
        if (signals.followup_needed && signals.followup_questions.length > 0) {
          return {
            checkin: { ...checkin, signalJson: signals },
            followupQuestions: signals.followup_questions,
            status: 'follow-up-needed',
          }
        }

        // Show review when confidence is moderate — let the summary speak for itself
        if (signals.extraction_confidence < 0.8) {
          return {
            checkin: { ...checkin, signalJson: signals },
            signalSummary: signals,
            status: 'review',
          }
        }

        // Generate and personalize cards
        const candidateCards = generateCandidateCards(signals)
        const personalizedCards = await personalizeCards(
          candidateCards,
          {
            firstName: child.firstName,
            ageBand: child.ageBand || undefined,
            specialInterests: JSON.parse(child.specialInterests || '[]'),
            schoolSetting: child.schoolSetting || undefined,
          },
          text,
          signals.caregiver_tone
        )

        // Save cards to database
        const savedCards = await Promise.all(
          personalizedCards.map((card) =>
            prisma.actionCard.create({
              data: {
                childId,
                checkinId: checkin.id,
                slotType: card.slotType,
                domainCode: card.domainCode,
                setting: card.setting,
                title: card.title,
                strategyText: card.strategyText,
                scriptText: card.scriptText,
                watchForPositive: JSON.stringify(card.watchForPositive),
                watchForNegative: JSON.stringify(card.watchForNegative),
                whyNow: card.whyNow,
              },
            })
          )
        )

        return {
          checkin: { ...checkin, signalJson: signals },
          cards: savedCards.map((c) => ({
            ...c,
            watchForPositive: JSON.parse(c.watchForPositive),
            watchForNegative: JSON.parse(c.watchForNegative),
          })),
          status: 'complete',
        }
      } catch (err) {
        app.log.error(err)
        // Return basic response even if AI fails
        return {
          checkin,
          status: 'follow-up-needed',
          followupQuestions: ['Can you tell me more about how the week went?'],
        }
      }
    }
  )

  // POST /checkins/:id/followup
  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/checkins/:id/followup',
    async (req, reply) => {
      const checkin = await prisma.checkIn.findUnique({ where: { id: req.params.id } })
      if (!checkin) return reply.status(404).send({ error: 'Not found' })

      await prisma.checkIn.update({
        where: { id: checkin.id },
        data: { followupText: req.body.text },
      })

      const child = await prisma.childProfile.findUnique({ where: { id: checkin.childId } })
      if (!child) return reply.status(404).send({ error: 'Child not found' })

      // Re-extract with combined text
      const combinedText = `${checkin.rawText}\n\nAdditional context: ${req.body.text}`
      try {
        const signals = await extractSignals(
          combinedText,
          {
            firstName: child.firstName,
            ageBand: child.ageBand || undefined,
            diagnosisStatus: child.diagnosisStatus,
            schoolSetting: child.schoolSetting || undefined,
          },
          checkin.weekNumber
        )

        await prisma.checkIn.update({
          where: { id: checkin.id },
          data: {
            signalJson: JSON.stringify(signals),
            caregiverTone: signals.caregiver_tone,
            extractionConfidence: signals.extraction_confidence,
          },
        })

        return {
          checkin: { ...checkin, signalJson: signals },
          signalSummary: signals,
          status: 'review',
        }
      } catch {
        return {
          checkin: { ...checkin },
          status: 'review',
        }
      }
    }
  )

  // POST /checkins/:id/confirm — user confirms signal, trigger plan gen
  app.post<{ Params: { id: string } }>(
    '/checkins/:id/confirm',
    async (req, reply) => {
      const checkin = await prisma.checkIn.findUnique({ where: { id: req.params.id } })
      if (!checkin) return reply.status(404).send({ error: 'Not found' })

      const child = await prisma.childProfile.findUnique({ where: { id: checkin.childId } })
      if (!child) return reply.status(404).send({ error: 'Child not found' })

      // Idempotency: if cards already exist for this checkin, return them
      const existingCards = await prisma.actionCard.findMany({ where: { checkinId: checkin.id } })
      if (existingCards.length > 0) {
        return {
          checkin,
          cards: existingCards.map((c) => ({
            ...c,
            watchForPositive: JSON.parse(c.watchForPositive),
            watchForNegative: JSON.parse(c.watchForNegative),
          })),
          status: 'complete',
        }
      }

      const signals = checkin.signalJson ? JSON.parse(checkin.signalJson) : {}

      try {
        const candidateCards = generateCandidateCards(signals)
        const personalizedCards = await personalizeCards(
          candidateCards,
          {
            firstName: child.firstName,
            ageBand: child.ageBand || undefined,
            specialInterests: JSON.parse(child.specialInterests || '[]'),
            schoolSetting: child.schoolSetting || undefined,
          },
          checkin.rawText,
          signals.caregiver_tone || 'neutral'
        )

        const savedCards = await Promise.all(
          personalizedCards.map((card) =>
            prisma.actionCard.create({
              data: {
                childId: child.id,
                checkinId: checkin.id,
                slotType: card.slotType,
                domainCode: card.domainCode,
                setting: card.setting,
                title: card.title,
                strategyText: card.strategyText,
                scriptText: card.scriptText,
                watchForPositive: JSON.stringify(card.watchForPositive),
                watchForNegative: JSON.stringify(card.watchForNegative),
                whyNow: card.whyNow,
              },
            })
          )
        )

        return {
          checkin,
          cards: savedCards.map((c) => ({
            ...c,
            watchForPositive: JSON.parse(c.watchForPositive),
            watchForNegative: JSON.parse(c.watchForNegative),
          })),
          status: 'complete',
        }
      } catch (err) {
        app.log.error(err)
        return { checkin, status: 'complete', cards: [] }
      }
    }
  )

  // GET /children/:id/checkins/current
  app.get<{ Params: { id: string } }>(
    '/children/:id/checkins/current',
    async (req) => {
      const weekNumber = getWeekNumber()
      return prisma.checkIn.findFirst({
        where: { childId: req.params.id, weekNumber },
        orderBy: { submittedAt: 'desc' },
      })
    }
  )

  // GET /children/:id/checkins — full history, newest first
  app.get<{ Params: { id: string } }>(
    '/children/:id/checkins',
    async (req) => {
      const checkins = await prisma.checkIn.findMany({
        where: { childId: req.params.id },
        orderBy: { submittedAt: 'desc' },
        include: { cards: { select: { id: true, title: true, domainCode: true, setting: true } } },
      })
      return checkins.map((c) => ({
        id: c.id,
        weekNumber: c.weekNumber,
        submittedAt: c.submittedAt,
        caregiverTone: c.caregiverTone,
        extractionConfidence: c.extractionConfidence,
        rawText: c.rawText,
        signalJson: c.signalJson ? JSON.parse(c.signalJson) : null,
        cardCount: c.cards.length,
        cards: c.cards,
      }))
    }
  )
}
