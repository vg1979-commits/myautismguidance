import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeAgeBand } from '../../../lib/age'

// Fix the clock so age calculations are deterministic.
// All tests run as if the current date is 2026-05-21.
const FIXED_DATE = new Date('2026-05-21T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('computeAgeBand', () => {
  it('birthYear null → returns null', () => {
    expect(computeAgeBand(null, 3)).toBeNull()
  })

  it('birthMonth null → returns null', () => {
    expect(computeAgeBand(2021, null)).toBeNull()
  })

  // Current date: May 2026. Child born Jan 2023: 2026-2023=3, Jan<May so no decrement → age 3 → "2-4"
  it('child born Jan 2023 (age ~3) → "2-4"', () => {
    expect(computeAgeBand(2023, 1)).toBe('2-4')
  })

  // Child born May 2021: age = 2026-2021 = 5, birthday is this month (May=5), 5 < 5 is false → no decrement → "5-7"
  it('child turns 5 this month (May) → "5-7"', () => {
    expect(computeAgeBand(2021, 5)).toBe('5-7')
  })

  // Child born Jun 2021: age = 2026-2021 = 5, Jun(6) > May(5) → decrement → age 4 → "2-4"
  it("child's birthday is next month (Jun) → age decremented correctly → '2-4'", () => {
    expect(computeAgeBand(2021, 6)).toBe('2-4')
  })

  // Child born Mar 2009: age = 2026-2009 = 17, Mar(3) < May(5) → no decrement → "14-17"
  it('child born in year making them 17 → "14-17"', () => {
    expect(computeAgeBand(2009, 3)).toBe('14-17')
  })

  // Child born Mar 2008: age = 2026-2008 = 18 → still capped at "14-17" (platform ceiling)
  it('child born in year making them 18 → "14-17" (platform ceiling, no band above)', () => {
    expect(computeAgeBand(2008, 3)).toBe('14-17')
  })

  // Child born Mar 2025: age = 2026-2025 = 1 → below minimum → null
  it('child born in year making them 1 → null (below minimum)', () => {
    expect(computeAgeBand(2025, 3)).toBeNull()
  })
})
