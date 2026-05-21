import type { AgeBand } from '@myautismguidance/shared-types'

// Computes current age band from birth year and month.
// Called live at decision time — never read from a stored/cached value.
export function computeAgeBand(birthYear?: number | null, birthMonth?: number | null): AgeBand | null {
  if (!birthYear || !birthMonth) return null
  const now = new Date()
  let age = now.getFullYear() - birthYear
  // Birthday hasn't occurred yet this year
  if (now.getMonth() + 1 < birthMonth) age--
  if (age < 2) return null
  if (age <= 4) return '2-4'
  if (age <= 7) return '5-7'
  if (age <= 10) return '8-10'
  if (age <= 13) return '11-13'
  return '14-17'
}
