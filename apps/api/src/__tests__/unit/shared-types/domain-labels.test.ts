import { describe, it, expect } from 'vitest'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { DomainCode } from '@myautismguidance/shared-types'

const ALL_DOMAIN_CODES: DomainCode[] = [
  'communication',
  'social',
  'regulation',
  'sensory',
  'adl',
  'academics',
  'behavior',
  'executive-function',
]

describe('DOMAIN_LABELS', () => {
  it('contains an entry for every DomainCode value', () => {
    for (const code of ALL_DOMAIN_CODES) {
      expect(DOMAIN_LABELS).toHaveProperty(code)
    }
  })

  it('has no duplicate DomainCode keys', () => {
    const keys = Object.keys(DOMAIN_LABELS)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('all label values are non-empty strings', () => {
    for (const [code, label] of Object.entries(DOMAIN_LABELS)) {
      expect(typeof label, `label for "${code}" should be a string`).toBe('string')
      expect(label.length, `label for "${code}" should not be empty`).toBeGreaterThan(0)
    }
  })

  it('no DomainCode value is undefined or empty string', () => {
    for (const code of ALL_DOMAIN_CODES) {
      expect(code).toBeTruthy()
      expect(typeof code).toBe('string')
    }
  })
})
