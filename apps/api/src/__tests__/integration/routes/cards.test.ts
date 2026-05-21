import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../helpers/app'
import { cleanDb, createUser, createChild, createCheckin, createCard } from '../../fixtures/index'
import { prisma } from '../../../db/client'

// ── LLM mock (not needed for card routes, included for consistency) ────────────

vi.mock('../../../llm/anthropic', () => ({
  extractSignals: vi.fn(),
  personalizeCards: vi.fn(),
  generateExportContent: vi.fn(),
  parseIEPDocument: vi.fn(),
}))

// ── Test suite ────────────────────────────────────────────────────────────────

describe('GET /api/children/:id/cards/current', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string
  let checkinId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
    const checkin = await createCheckin(childId)
    checkinId = checkin.id
  })

  it('returns all current-week cards for the child', async () => {
    await createCard(childId, checkinId, { title: 'Card One', domainCode: 'regulation' })
    await createCard(childId, checkinId, { title: 'Card Two', domainCode: 'communication' })

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/cards/current`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(2)
  })

  it('returns cards with watchForPositive and watchForNegative as arrays', async () => {
    await createCard(childId, checkinId)

    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/cards/current`,
    })
    const body = response.json()
    expect(body.length).toBeGreaterThan(0)
    expect(Array.isArray(body[0].watchForPositive)).toBe(true)
    expect(Array.isArray(body[0].watchForNegative)).toBe(true)
  })

  it('returns empty array when child has no cards this week', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}/cards/current`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(0)
  })
})

describe('POST /api/cards/:id/rate', () => {
  let app: FastifyInstance
  let userId: string
  let childId: string
  let checkinId: string
  let cardId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanDb()
    const user = await createUser()
    userId = user.id
    const child = await createChild(userId)
    childId = child.id
    const checkin = await createCheckin(childId)
    checkinId = checkin.id
    const card = await createCard(childId, checkinId)
    cardId = card.id
  })

  it('returns 200 with success: true for a thumbs-up rating', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'up' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
  })

  it('persists CardRating record in DB for a thumbs-up rating', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'up' },
    })
    const rating = await prisma.cardRating.findUnique({ where: { cardId } })
    expect(rating).not.toBeNull()
    expect(rating!.rating).toBe('up')
  })

  it('returns 200 with success: true for a thumbs-down rating with note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'down', note: "Didn't work for us" },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
  })

  it('persists note text in CardRating record for thumbs-down rating', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'down', note: "Didn't work for us" },
    })
    const rating = await prisma.cardRating.findUnique({ where: { cardId } })
    expect(rating).not.toBeNull()
    expect(rating!.rating).toBe('down')
    expect(rating!.noteText).toBe("Didn't work for us")
  })

  it('returns HTTP 404 for unknown cardId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards/nonexistent-card-id/rate',
      payload: { rating: 'up' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('is idempotent: rating the same card twice updates, does not duplicate', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'up' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rate`,
      payload: { rating: 'down', note: 'Changed my mind' },
    })
    const ratings = await prisma.cardRating.findMany({ where: { cardId } })
    expect(ratings.length).toBe(1)
    expect(ratings[0].rating).toBe('down')
  })
})
