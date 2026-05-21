import { describe, it, expect } from 'vitest'
import {
  generateCandidateCards,
  hasSafetyFlag,
  SAFETY_KEYWORDS,
} from '../../../../engine/cards/generator'

function makeSignal(overrides: Partial<{
  domains_mentioned: string[]
  domain_direction: Record<string, string>
  setting_of_concern: string[]
  triggers_mentioned: string[]
  strengths_mentioned: string[]
  caregiver_tone: string
}> = {}) {
  return {
    domains_mentioned: [],
    domain_direction: {},
    setting_of_concern: [],
    triggers_mentioned: [],
    strengths_mentioned: [],
    caregiver_tone: 'neutral',
    ...overrides,
  }
}

// ── hasSafetyFlag ─────────────────────────────────────────────────────────────

describe('hasSafetyFlag', () => {
  describe('positive match on each safety keyword', () => {
    it.each(SAFETY_KEYWORDS)('detects keyword: "%s"', (keyword) => {
      expect(hasSafetyFlag([keyword])).toBe(true)
    })
  })

  it('is case-insensitive — HITTING matches hitting', () => {
    expect(hasSafetyFlag(['HITTING'])).toBe(true)
  })

  it('no false positive on innocuous emotional hurt text', () => {
    expect(hasSafetyFlag(['She is hurt that her friend moved schools'])).toBe(false)
  })
})

// ── Safety & Tier 1 Escalation ────────────────────────────────────────────────

describe('generateCandidateCards — Safety & Tier 1 Escalation', () => {
  const baseSafetySignal = makeSignal({
    domains_mentioned: ['behavior'],
    triggers_mentioned: ['hitting sibling'],
  })

  it('behavior + safety trigger (no strength) → exactly 2 cards', () => {
    const cards = generateCandidateCards(baseSafetySignal)
    expect(cards).toHaveLength(2)
  })

  it('behavior + safety trigger → slotTypes are "safety" then "home-strategy"', () => {
    const cards = generateCandidateCards(baseSafetySignal)
    expect(cards[0].slotType).toBe('safety')
    expect(cards[1].slotType).toBe('home-strategy')
  })

  it('behavior + safety trigger → setting of first card is "therapy"', () => {
    const cards = generateCandidateCards(baseSafetySignal)
    expect(cards[0].setting).toBe('therapy')
  })

  it('behavior + safety trigger + strengths → strength card prepended before safety cards', () => {
    const signal = makeSignal({
      domains_mentioned: ['behavior'],
      triggers_mentioned: ['hitting sibling'],
      strengths_mentioned: ['great at puzzles'],
    })
    const cards = generateCandidateCards(signal)
    expect(cards[0].slotType).toBe('strength')
    expect(cards[1].slotType).toBe('safety')
    expect(cards[2].slotType).toBe('home-strategy')
  })

  it('safety path returns early — no other domain cards appended after safety cards', () => {
    const signal = makeSignal({
      domains_mentioned: ['behavior', 'regulation', 'communication'],
      triggers_mentioned: ['hitting sibling'],
      setting_of_concern: ['home'],
    })
    const cards = generateCandidateCards(signal)
    const nonBehavior = cards.filter(c => c.domainCode !== 'behavior' && c.slotType !== 'strength')
    expect(nonBehavior).toHaveLength(0)
  })
})

// ── Strength Card ─────────────────────────────────────────────────────────────

describe('generateCandidateCards — Strength Card', () => {
  it('strengths_mentioned non-empty → first card is slotType "strength" and title contains the strength', () => {
    const signal = makeSignal({ strengths_mentioned: ['great at lining up blocks'] })
    const cards = generateCandidateCards(signal)
    expect(cards[0].slotType).toBe('strength')
    expect(cards[0].title).toContain('lining up blocks')
  })

  it('strengths_mentioned empty → no strength card emitted', () => {
    const signal = makeSignal({ strengths_mentioned: [] })
    const cards = generateCandidateCards(signal)
    expect(cards.find(c => c.slotType === 'strength')).toBeUndefined()
  })
})

// ── Caregiver Capacity Modifier ───────────────────────────────────────────────

describe('generateCandidateCards — Caregiver Capacity Modifier', () => {
  it('caregiver_tone "overwhelmed" → result length ≤ 3', () => {
    const signal = makeSignal({
      caregiver_tone: 'overwhelmed',
      domains_mentioned: ['regulation', 'communication'],
      domain_direction: { regulation: 'deteriorating' },
      setting_of_concern: ['home'],
    })
    expect(generateCandidateCards(signal).length).toBeLessThanOrEqual(3)
  })

  it('caregiver_tone "overwhelmed" → only strength, regulation, and behavior domainCodes in result', () => {
    const signal = makeSignal({
      caregiver_tone: 'overwhelmed',
      domains_mentioned: ['regulation', 'communication', 'social', 'sensory', 'adl', 'academics'],
      strengths_mentioned: ['great at building'],
      domain_direction: { regulation: 'deteriorating' },
      setting_of_concern: ['home'],
    })
    const cards = generateCandidateCards(signal)
    for (const card of cards) {
      const allowed = card.slotType === 'strength' || card.domainCode === 'regulation' || card.domainCode === 'behavior'
      expect(allowed).toBe(true)
    }
  })

  it('caregiver_tone "overwhelmed" with 7 candidate domains → still ≤ 3 cards', () => {
    const signal = makeSignal({
      caregiver_tone: 'overwhelmed',
      domains_mentioned: ['regulation', 'communication', 'social', 'sensory', 'adl', 'academics', 'behavior'],
      domain_direction: { regulation: 'deteriorating', behavior: 'deteriorating' },
      setting_of_concern: ['home'],
    })
    expect(generateCandidateCards(signal).length).toBeLessThanOrEqual(3)
  })

  it.each(['coping', 'positive', 'neutral'] as const)('caregiver_tone "%s" → more than 3 cards (all domains eligible)', (tone) => {
    const signal = makeSignal({
      caregiver_tone: tone,
      domains_mentioned: ['regulation', 'communication', 'social', 'sensory', 'adl', 'academics', 'behavior', 'executive-function'],
      domain_direction: { regulation: 'deteriorating', behavior: 'deteriorating', 'executive-function': 'deteriorating' },
      setting_of_concern: ['home', 'school'],
    })
    const cards = generateCandidateCards(signal)
    expect(cards.length).toBeGreaterThan(3)
    expect(cards.length).toBeLessThanOrEqual(6)
  })
})

// ── Regulation Domain ─────────────────────────────────────────────────────────

describe('generateCandidateCards — Regulation Domain Rules', () => {
  it('regulation deteriorating → both transition warning and co-regulation cards emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['regulation'],
      domain_direction: { regulation: 'deteriorating' },
    })
    const cards = generateCandidateCards(signal)
    expect(cards.find(c => c.title.includes('5-minute warning'))).toBeDefined()
    expect(cards.find(c => c.title.includes('co-regulation'))).toBeDefined()
  })

  it('home in setting_of_concern + regulation not deteriorating → transition warning only, no co-regulation', () => {
    const signal = makeSignal({
      domains_mentioned: ['regulation'],
      domain_direction: { regulation: 'stable' },
      setting_of_concern: ['home'],
    })
    const cards = generateCandidateCards(signal)
    expect(cards.find(c => c.title.includes('5-minute warning'))).toBeDefined()
    expect(cards.find(c => c.title.includes('co-regulation'))).toBeUndefined()
  })

  it('regulation not in domains_mentioned → no regulation strategy cards emitted', () => {
    const signal = makeSignal({ domains_mentioned: [], setting_of_concern: [] })
    const cards = generateCandidateCards(signal)
    expect(cards.find(c => c.title.includes('5-minute warning'))).toBeUndefined()
    expect(cards.find(c => c.title.includes('co-regulation'))).toBeUndefined()
  })
})

// ── Communication Domain ──────────────────────────────────────────────────────

describe('generateCandidateCards — Communication Domain Rules', () => {
  it('communication improving → one card (interest-based)', () => {
    const signal = makeSignal({
      domains_mentioned: ['communication'],
      domain_direction: { communication: 'improving' },
    })
    const cards = generateCandidateCards(signal)
    const commCards = cards.filter(c => c.domainCode === 'communication' && c.slotType !== 'strength')
    expect(commCards).toHaveLength(1)
    expect(commCards[0].title).toContain('interest-based')
  })

  it('communication deteriorating → two cards (interest-based + choices)', () => {
    const signal = makeSignal({
      domains_mentioned: ['communication'],
      domain_direction: { communication: 'deteriorating' },
    })
    const cards = generateCandidateCards(signal)
    const commCards = cards.filter(c => c.domainCode === 'communication' && c.slotType !== 'strength')
    expect(commCards).toHaveLength(2)
    expect(commCards[0].title).toContain('interest-based')
    expect(commCards[1].title).toContain('choices')
  })
})

// ── Social Domain ─────────────────────────────────────────────────────────────

describe('generateCandidateCards — Social Domain Rules', () => {
  it('school in setting_of_concern → school-request card emitted regardless of direction', () => {
    const signal = makeSignal({
      domains_mentioned: ['social'],
      setting_of_concern: ['school'],
    })
    const cards = generateCandidateCards(signal)
    const schoolCard = cards.find(c => c.domainCode === 'social' && c.setting === 'school')
    expect(schoolCard).toBeDefined()
    expect(schoolCard!.slotType).toBe('school-request')
  })

  it('social deteriorating + school NOT in concerns → home social-scripts card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['social'],
      domain_direction: { social: 'deteriorating' },
      setting_of_concern: [],
    })
    const cards = generateCandidateCards(signal)
    const homeCard = cards.find(c => c.domainCode === 'social' && c.setting === 'home')
    expect(homeCard).toBeDefined()
    expect(homeCard!.title.toLowerCase()).toContain('social scripts')
  })

  it('social deteriorating + school in concerns → only school card, no home duplicate', () => {
    const signal = makeSignal({
      domains_mentioned: ['social'],
      domain_direction: { social: 'deteriorating' },
      setting_of_concern: ['school'],
    })
    const cards = generateCandidateCards(signal)
    const socialCards = cards.filter(c => c.domainCode === 'social')
    expect(socialCards).toHaveLength(1)
    expect(socialCards[0].setting).toBe('school')
  })
})

// ── ADL Clothing Trigger ──────────────────────────────────────────────────────

describe('generateCandidateCards — ADL Clothing Trigger', () => {
  const clothingTitle = 'sensory-friendly clothing'

  it('trigger "tags on shirts" → clothing card emitted (keyword: "tags")', () => {
    const signal = makeSignal({
      domains_mentioned: ['adl'],
      triggers_mentioned: ['tags on shirts'],
    })
    expect(generateCandidateCards(signal).find(c => c.title.includes(clothingTitle))).toBeDefined()
  })

  it('trigger "getting dressed" → clothing card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['adl'],
      triggers_mentioned: ['getting dressed'],
    })
    expect(generateCandidateCards(signal).find(c => c.title.includes(clothingTitle))).toBeDefined()
  })

  it('trigger "loud noise" → no clothing card', () => {
    const signal = makeSignal({
      domains_mentioned: ['adl'],
      triggers_mentioned: ['loud noise'],
    })
    expect(generateCandidateCards(signal).find(c => c.title.includes(clothingTitle))).toBeUndefined()
  })

  it('no clothing trigger + direction not deteriorating + not overwhelmed → backward chaining card', () => {
    const signal = makeSignal({
      domains_mentioned: ['adl'],
      triggers_mentioned: ['loud noise'],
      domain_direction: { adl: 'stable' },
      caregiver_tone: 'neutral',
    })
    expect(generateCandidateCards(signal).find(c => c.title.includes('backward chaining'))).toBeDefined()
  })
})

// ── Academics Domain ──────────────────────────────────────────────────────────

describe('generateCandidateCards — Academics Domain Rules', () => {
  it('caregiver_tone "overwhelmed" → chunked-assignments card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['academics'],
      caregiver_tone: 'overwhelmed',
    })
    expect(generateCandidateCards(signal).find(c => c.title.toLowerCase().includes('chunk'))).toBeDefined()
  })

  it('academics direction "deteriorating" → chunked-assignments card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['academics'],
      domain_direction: { academics: 'deteriorating' },
    })
    expect(generateCandidateCards(signal).find(c => c.title.toLowerCase().includes('chunk'))).toBeDefined()
  })

  it('caregiver_tone "neutral" + academics "stable" → no chunked-assignments card', () => {
    const signal = makeSignal({
      domains_mentioned: ['academics'],
      domain_direction: { academics: 'stable' },
      caregiver_tone: 'neutral',
    })
    expect(generateCandidateCards(signal).find(c => c.title.toLowerCase().includes('chunk'))).toBeUndefined()
  })

  it('school in setting_of_concern → teacher check-in card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['academics'],
      setting_of_concern: ['school'],
    })
    expect(generateCandidateCards(signal).find(c => c.title.toLowerCase().includes('teacher check-in'))).toBeDefined()
  })
})

// ── Behavior Domain (Non-Safety) ──────────────────────────────────────────────

describe('generateCandidateCards — Behavior Domain (Non-Safety)', () => {
  it('behavior deteriorating + no safety flag → ABC tracking card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['behavior'],
      domain_direction: { behavior: 'deteriorating' },
      triggers_mentioned: ['noisy environments'],
    })
    expect(generateCandidateCards(signal).find(c => c.title.includes('ABC'))).toBeDefined()
  })

  it('behavior stable → extinction burst warning card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['behavior'],
      domain_direction: { behavior: 'stable' },
    })
    expect(generateCandidateCards(signal).find(c => c.title.toLowerCase().includes('extinction burst'))).toBeDefined()
  })

  it('behavior deteriorating + school in setting_of_concern → school behavior-data card emitted', () => {
    const signal = makeSignal({
      domains_mentioned: ['behavior'],
      domain_direction: { behavior: 'deteriorating' },
      setting_of_concern: ['school'],
    })
    const cards = generateCandidateCards(signal)
    expect(cards.find(c => c.domainCode === 'behavior' && c.setting === 'school')).toBeDefined()
  })
})

// ── Community & Therapy Setting Cards ─────────────────────────────────────────

describe('generateCandidateCards — Community & Therapy Setting Cards', () => {
  it('community in setting_of_concern → exactly 2 community cards emitted', () => {
    const signal = makeSignal({ setting_of_concern: ['community'] })
    const cards = generateCandidateCards(signal)
    expect(cards.filter(c => c.setting === 'community')).toHaveLength(2)
  })

  it('community not in setting_of_concern → no community cards', () => {
    const signal = makeSignal({ setting_of_concern: [] })
    expect(generateCandidateCards(signal).filter(c => c.setting === 'community')).toHaveLength(0)
  })

  it('therapy in setting_of_concern → therapy alignment card with domainCode = first domain in domains_mentioned', () => {
    const signal = makeSignal({
      domains_mentioned: ['regulation'],
      setting_of_concern: ['therapy'],
    })
    const cards = generateCandidateCards(signal)
    const therapyCard = cards.find(c => c.slotType === 'therapy-bridge')
    expect(therapyCard).toBeDefined()
    expect(therapyCard!.domainCode).toBe('regulation')
  })

  it('therapy not in setting_of_concern → no therapy alignment card', () => {
    const signal = makeSignal({ setting_of_concern: [] })
    expect(generateCandidateCards(signal).find(c => c.slotType === 'therapy-bridge')).toBeUndefined()
  })
})

// ── Minimum Card Guarantee ────────────────────────────────────────────────────

describe('generateCandidateCards — Minimum Card Guarantee', () => {
  it('empty signal (no domains, no settings) → exactly 3 fallback cards', () => {
    const signal = makeSignal({ domains_mentioned: [], setting_of_concern: [] })
    expect(generateCandidateCards(signal)).toHaveLength(3)
  })

  it('1 low-yield domain (sensory, no extra settings) → result padded to at least 3 cards', () => {
    const signal = makeSignal({
      domains_mentioned: ['sensory'],
      setting_of_concern: [],
    })
    expect(generateCandidateCards(signal).length).toBeGreaterThanOrEqual(3)
  })

  it('all 8 domains with many settings → capped at exactly 6 cards', () => {
    const signal = makeSignal({
      domains_mentioned: ['regulation', 'communication', 'social', 'sensory', 'adl', 'academics', 'behavior', 'executive-function'],
      domain_direction: {
        regulation: 'deteriorating', communication: 'deteriorating',
        social: 'deteriorating', behavior: 'deteriorating',
        academics: 'deteriorating', 'executive-function': 'deteriorating',
      },
      setting_of_concern: ['home', 'school', 'therapy', 'community'],
    })
    expect(generateCandidateCards(signal)).toHaveLength(6)
  })
})
