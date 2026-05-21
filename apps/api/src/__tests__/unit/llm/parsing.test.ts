import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted() ensures mockCreate is available inside the vi.mock factory,
// which is hoisted to run before any import statements.
const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  return { mockCreate }
})

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { extractSignals, personalizeCards, parseIEPDocument } from '../../../llm/anthropic'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── extractSignals ────────────────────────────────────────────────────────────

describe('extractSignals — LLM JSON parsing', () => {
  it('malformed JSON response → returns fallback with followup_needed=true and extraction_confidence=0.5', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{invalid json' }],
    })
    const result = await extractSignals(
      'Had a rough week',
      { firstName: 'Sam', diagnosisStatus: 'confirmed' },
      1,
    )
    expect(result.followup_needed).toBe(true)
    expect(result.extraction_confidence).toBe(0.5)
  })

  it('strips ```json code fences and parses the JSON correctly', async () => {
    const payload = {
      summary: 'Sounds like a tough week.',
      caregiver_tone: 'neutral',
      domains_mentioned: ['regulation'],
      domain_direction: { regulation: 'deteriorating' },
      setting_of_concern: ['home'],
      triggers_mentioned: ['transitions'],
      strengths_mentioned: [],
      strategy_tried: null,
      extraction_confidence: 0.88,
      followup_needed: false,
      followup_questions: [],
    }
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` }],
    })
    const result = await extractSignals(
      'Had a tough week',
      { firstName: 'Sam', diagnosisStatus: 'confirmed' },
      1,
    )
    expect(result.extraction_confidence).toBe(0.88)
    expect(result.followup_needed).toBe(false)
    expect(result.domains_mentioned).toEqual(['regulation'])
  })
})

// ── personalizeCards ──────────────────────────────────────────────────────────

describe('personalizeCards — LLM JSON parsing', () => {
  it('malformed JSON response → returns the original unmodified cards array', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{not valid json]' }],
    })
    const originalCards = [
      {
        slotType: 'home-strategy',
        domainCode: 'regulation',
        setting: 'home',
        title: 'Test card',
        strategyText: 'Strategy text',
        scriptText: 'Script',
        watchForPositive: [],
        watchForNegative: [],
        whyNow: 'Because',
      },
    ]
    const result = await personalizeCards(
      originalCards,
      { firstName: 'Sam', specialInterests: [] },
      'Check-in text',
      'neutral',
    )
    expect(result).toBe(originalCards)
  })
})

// ── parseIEPDocument ──────────────────────────────────────────────────────────

describe('parseIEPDocument — LLM JSON parsing', () => {
  it('malformed JSON response → returns empty structure with parseConfidence=0.3', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{malformed json' }],
    })
    const result = await parseIEPDocument('IEP document text here')
    expect(result.goals).toEqual([])
    expect(result.services).toEqual([])
    expect(result.accommodations).toEqual([])
    expect(result.parseConfidence).toBe(0.3)
  })
})
