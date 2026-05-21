import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../helpers/app'
import { cleanDb, createUser, createChild, createCheckin } from '../../fixtures/index'
import { prisma } from '../../../db/client'

// ── LLM mock setup ────────────────────────────────────────────────────────────

const mockExtractSignals = vi.hoisted(() => vi.fn())
const mockPersonalizeCards = vi.hoisted(() => vi.fn())

vi.mock('../../../llm/anthropic', () => ({
  extractSignals: mockExtractSignals,
  personalizeCards: mockPersonalizeCards,
  generateExportContent: vi.fn(),
  parseIEPDocument: vi.fn(),
}))

// Default high-confidence complete signal
const defaultSignal = {
  summary: 'It sounds like a solid week overall.',
  caregiver_tone: 'neutral',
  domains_mentioned: ['regulation', 'communication'],
  domain_direction: { regulation: 'stable', communication: 'improving' },
  setting_of_concern: ['home'],
  triggers_mentioned: ['transitions'],
  strengths_mentioned: ['eye contact'],
  strategy_tried: null,
  extraction_confidence: 0.85,
  followup_needed: false,
  followup_questions: [],
}

// Default personalizeCards: passes cards through unchanged
function defaultPersonalizeCards(cards: unknown[]) {
  return Promise.resolve(cards)
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/children/:id/checkins', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    mockExtractSignals.mockResolvedValue({ ...defaultSignal })
    mockPersonalizeCards.mockImplementation(defaultPersonalizeCards)
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns HTTP 200 with status "complete" and non-empty cards array', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'We had a good week overall. Alex did well with transitions.' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('complete')
    expect(Array.isArray(body.cards)).toBe(true)
    expect(body.cards.length).toBeGreaterThan(0)
  })

  it('returned cards have all required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Good week with some sensory challenges.' },
    })
    const body = response.json()
    expect(body.status).toBe('complete')
    for (const card of body.cards) {
      expect(card).toHaveProperty('id')
      expect(card).toHaveProperty('title')
      expect(card).toHaveProperty('strategyText')
      expect(card).toHaveProperty('scriptText')
      expect(card).toHaveProperty('watchForPositive')
      expect(card).toHaveProperty('watchForNegative')
      expect(card).toHaveProperty('whyNow')
      expect(card).toHaveProperty('setting')
      expect(card).toHaveProperty('domainCode')
    }
  })

  it('persists CheckIn record in DB with correct caregiverTone and extractionConfidence', async () => {
    mockExtractSignals.mockResolvedValue({
      ...defaultSignal,
      caregiver_tone: 'positive',
      extraction_confidence: 0.9,
    })
    await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Really positive week for Alex!' },
    })
    const checkin = await prisma.checkIn.findFirst({ where: { childId } })
    expect(checkin).not.toBeNull()
    expect(checkin!.caregiverTone).toBe('positive')
    expect(checkin!.extractionConfidence).toBeCloseTo(0.9)
  })

  it('persists ActionCard records, count matches returned cards', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Communication and regulation were on my mind this week.' },
    })
    const body = response.json()
    expect(body.status).toBe('complete')
    const dbCards = await prisma.actionCard.findMany({ where: { childId } })
    expect(dbCards.length).toBe(body.cards.length)
  })

  it('returns watchForPositive and watchForNegative as arrays (not strings)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Alex did great with transitions this week.' },
    })
    const body = response.json()
    expect(body.status).toBe('complete')
    for (const card of body.cards) {
      expect(Array.isArray(card.watchForPositive)).toBe(true)
      expect(Array.isArray(card.watchForNegative)).toBe(true)
    }
  })

  // ── Follow-up path ─────────────────────────────────────────────────────────

  it('returns status "follow-up-needed" with followupQuestions when confidence < 0.65 and followup_needed=true', async () => {
    mockExtractSignals.mockResolvedValue({
      ...defaultSignal,
      extraction_confidence: 0.5,
      followup_needed: true,
      followup_questions: ['Can you tell me more about a specific moment?', 'How did Alex react?'],
    })
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'It was a week.' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('follow-up-needed')
    expect(Array.isArray(body.followupQuestions)).toBe(true)
    expect(body.followupQuestions.length).toBeGreaterThanOrEqual(1)
    expect(body.followupQuestions.length).toBeLessThanOrEqual(2)
  })

  it('does not create ActionCard records when follow-up is needed', async () => {
    mockExtractSignals.mockResolvedValue({
      ...defaultSignal,
      extraction_confidence: 0.5,
      followup_needed: true,
      followup_questions: ['Can you share more?'],
    })
    await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'ok' },
    })
    const cards = await prisma.actionCard.findMany({ where: { childId } })
    expect(cards.length).toBe(0)
  })

  // ── Review path ────────────────────────────────────────────────────────────

  it('returns status "review" with signalSummary when confidence is 0.65–0.79', async () => {
    mockExtractSignals.mockResolvedValue({
      ...defaultSignal,
      extraction_confidence: 0.72,
      followup_needed: false,
    })
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Things were okay this week, somewhat mixed.' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('review')
    expect(body.signalSummary).toBeDefined()
  })

  it('signalSummary contains extraction_confidence field', async () => {
    mockExtractSignals.mockResolvedValue({
      ...defaultSignal,
      extraction_confidence: 0.7,
      followup_needed: false,
    })
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Mixed week.' },
    })
    const body = response.json()
    expect(body.signalSummary.extraction_confidence).toBeDefined()
  })

  // ── Duplicate prevention ───────────────────────────────────────────────────

  it('returns HTTP 409 with error message on duplicate checkin for same week', async () => {
    // First check-in succeeds
    await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'First check-in this week.' },
    })
    // Second check-in same week should be rejected
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Second check-in same week.' },
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.error).toBe('Already checked in this week')
    expect(body.checkinId).toBeDefined()
  })

  // ── Not found ──────────────────────────────────────────────────────────────

  it('returns HTTP 404 for unknown childId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/children/nonexistent-child-id/checkins',
      payload: { text: 'Check-in text' },
    })
    expect(response.statusCode).toBe(404)
  })

  // ── LLM failure degradation ────────────────────────────────────────────────

  it('returns HTTP 200 with status "follow-up-needed" when LLM throws (not 500)', async () => {
    mockExtractSignals.mockRejectedValue(new Error('LLM API unavailable'))
    const response = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Check-in text when LLM is down.' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('follow-up-needed')
  })

  it('persists CheckIn record even when LLM throws', async () => {
    mockExtractSignals.mockRejectedValue(new Error('LLM API unavailable'))
    await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'Check-in text when LLM is down.' },
    })
    const checkin = await prisma.checkIn.findFirst({ where: { childId } })
    expect(checkin).not.toBeNull()
  })
})

// ── POST /checkins/:id/confirm ─────────────────────────────────────────────────

describe('POST /api/checkins/:id/confirm', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    mockExtractSignals.mockResolvedValue({ ...defaultSignal })
    mockPersonalizeCards.mockImplementation(defaultPersonalizeCards)
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
  })

  it('returns HTTP 404 for unknown checkinId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/checkins/nonexistent-checkin-id/confirm',
    })
    expect(response.statusCode).toBe(404)
  })

  it('is idempotent: calling confirm twice returns same cards, no duplicates in DB', async () => {
    // Create a checkin with signalJson
    const checkin = await createCheckin(childId, {
      signalJson: JSON.stringify(defaultSignal),
    })

    const response1 = await app.inject({
      method: 'POST',
      url: `/api/checkins/${checkin.id}/confirm`,
    })
    expect(response1.statusCode).toBe(200)
    const body1 = response1.json()
    const firstCount = body1.cards.length

    // Second confirm call — should return the same cards without creating new records
    const response2 = await app.inject({
      method: 'POST',
      url: `/api/checkins/${checkin.id}/confirm`,
    })
    expect(response2.statusCode).toBe(200)
    const body2 = response2.json()
    expect(body2.cards.length).toBe(firstCount)

    // Verify DB has no duplicates
    const dbCards = await prisma.actionCard.findMany({ where: { checkinId: checkin.id } })
    expect(dbCards.length).toBe(firstCount)
  })

  it('handles null signalJson gracefully, returns cards with status "complete"', async () => {
    const checkin = await createCheckin(childId, { signalJson: undefined })
    const response = await app.inject({
      method: 'POST',
      url: `/api/checkins/${checkin.id}/confirm`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('complete')
    expect(Array.isArray(body.cards)).toBe(true)
  })
})

// ── GET /children/:id/checkins ─────────────────────────────────────────────────

describe('GET /api/children/:id/checkins', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    mockExtractSignals.mockResolvedValue({ ...defaultSignal })
    mockPersonalizeCards.mockImplementation(defaultPersonalizeCards)
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
  })

  it('returns array sorted newest-first', async () => {
    // Create two checkins with different weekNumbers so ordering is deterministic
    await createCheckin(childId, { weekNumber: 1, rawText: 'First week check-in' })
    // Small delay to ensure different submittedAt timestamps
    await new Promise((r) => setTimeout(r, 10))
    await createCheckin(childId, { weekNumber: 2, rawText: 'Second week check-in' })

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.length).toBe(2)
    // Newest first — weekNumber 2 should come before weekNumber 1
    expect(body[0].weekNumber).toBe(2)
    expect(body[1].weekNumber).toBe(1)
  })

  it('each item includes cardCount as an integer >= 0', async () => {
    await createCheckin(childId, { weekNumber: 1 })
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins`,
    })
    const body = response.json()
    for (const item of body) {
      expect(typeof item.cardCount).toBe('number')
      expect(item.cardCount).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns signalJson as parsed object, not raw string', async () => {
    const signal = { extraction_confidence: 0.85, domains_mentioned: ['regulation'] }
    await createCheckin(childId, {
      weekNumber: 1,
      signalJson: JSON.stringify(signal),
    })
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins`,
    })
    const body = response.json()
    expect(body.length).toBeGreaterThan(0)
    expect(typeof body[0].signalJson).toBe('object')
    expect(body[0].signalJson).not.toBeNull()
    expect(body[0].signalJson.extraction_confidence).toBe(0.85)
  })

  it('returns empty array when child has no check-ins', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(0)
  })
})

// ── GET /children/:id/checkins/current ────────────────────────────────────────

describe('GET /api/children/:id/checkins/current', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    mockExtractSignals.mockResolvedValue({ ...defaultSignal })
    mockPersonalizeCards.mockImplementation(defaultPersonalizeCards)
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
  })

  it('returns the current-week check-in when one exists', async () => {
    // Use the API to create a check-in so it gets the correct current weekNumber
    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/children/${childId}/checkins`,
      payload: { text: 'This week was great.' },
    })
    expect(createResponse.statusCode).toBe(200)
    const created = createResponse.json()

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins/current`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).not.toBeNull()
    expect(body.id).toBe(created.checkin.id)
  })

  it('returns null when child has no check-in this week', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/checkins/current`,
    })
    expect(response.statusCode).toBe(200)
    // Fastify serializes null as null body
    const text = response.body
    expect(text === 'null' || text === '').toBeTruthy()
  })
})
