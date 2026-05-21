import axios from 'axios'
import { useAppStore } from '@/store/app'
import type {
  ChildProfile,
  CheckIn,
  CheckInResponse,
  ActionCard,
  ProgressData,
  ExportRecord,
  BaselineAssessment,
} from '@myautismguidance/shared-types'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  // Read Clerk user identity from the Zustand store (set in App.tsx on auth load)
  const { clerkUserId, clerkEmail } = useAppStore.getState()
  if (clerkUserId) config.headers['x-user-id'] = clerkUserId
  if (clerkEmail) config.headers['x-user-email'] = clerkEmail
  return config
})

// ── Children ──────────────────────────────────────────────────────────────────

export async function getChildren(): Promise<ChildProfile[]> {
  const { data } = await client.get('/children')
  return data
}

export async function getChild(id: string): Promise<ChildProfile> {
  const { data } = await client.get(`/children/${id}`)
  return data
}

export async function createChild(payload: Partial<ChildProfile>): Promise<ChildProfile> {
  const { data } = await client.post('/children', payload)
  return data
}

export async function updateChild(id: string, payload: Partial<ChildProfile>): Promise<ChildProfile> {
  const { data } = await client.patch(`/children/${id}`, payload)
  return data
}

// ── Baseline ──────────────────────────────────────────────────────────────────

export async function saveBaseline(childId: string, payload: Partial<BaselineAssessment>): Promise<BaselineAssessment> {
  const { data } = await client.post(`/children/${childId}/baseline`, payload)
  return data
}

export async function getBaseline(childId: string): Promise<BaselineAssessment> {
  const { data } = await client.get(`/children/${childId}/baseline`)
  return data
}

// ── Check-in ──────────────────────────────────────────────────────────────────

export async function submitCheckin(childId: string, text: string): Promise<CheckInResponse> {
  const { data } = await client.post(`/children/${childId}/checkins`, { text })
  return data
}

export async function submitFollowup(checkinId: string, text: string): Promise<CheckInResponse> {
  const { data } = await client.post(`/checkins/${checkinId}/followup`, { text })
  return data
}

export async function confirmSignal(checkinId: string): Promise<CheckInResponse> {
  const { data } = await client.post(`/checkins/${checkinId}/confirm`)
  return data
}

export async function getCurrentCheckin(childId: string): Promise<CheckIn | null> {
  const { data } = await client.get(`/children/${childId}/checkins/current`)
  return data
}

export async function getCheckinHistory(childId: string): Promise<CheckInHistoryItem[]> {
  const { data } = await client.get(`/children/${childId}/checkins`)
  return data
}

export interface CheckInHistoryItem {
  id: string
  weekNumber: number
  submittedAt: string
  caregiverTone: string
  extractionConfidence: number
  rawText: string
  signalJson: import('@myautismguidance/shared-types').CheckInSignal | null
  cardCount: number
  cards: { id: string; title: string; domainCode: string; setting: string }[]
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export async function getCurrentCards(childId: string): Promise<ActionCard[]> {
  const { data } = await client.get(`/children/${childId}/cards/current`)
  return data
}

export async function getCard(cardId: string): Promise<ActionCard> {
  const { data } = await client.get(`/cards/${cardId}`)
  return data
}

export async function rateCard(cardId: string, rating: 'up' | 'down', note?: string): Promise<void> {
  await client.post(`/cards/${cardId}/rate`, { rating, note })
}

// ── Progress ──────────────────────────────────────────────────────────────────

export async function getProgress(childId: string, weeks = 4): Promise<ProgressData> {
  const { data } = await client.get(`/children/${childId}/progress?weeks=${weeks}`)
  return data
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function generateExport(
  childId: string,
  exportType: string,
  depth: 'clinical' | 'summary' = 'summary'
): Promise<ExportRecord> {
  const { data } = await client.post(`/children/${childId}/exports`, { exportType, depth })
  return data
}

export async function getExports(childId: string): Promise<ExportRecord[]> {
  const { data } = await client.get(`/children/${childId}/exports`)
  return data
}

// ── IEP ───────────────────────────────────────────────────────────────────────

export async function uploadIEP(childId: string, file: File): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('iep', file)
  const { data } = await client.post(`/children/${childId}/iep/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getIEPStatus(jobId: string): Promise<{ status: string; result?: unknown }> {
  const { data } = await client.get(`/iep/jobs/${jobId}`)
  return data
}

export async function confirmIEP(childId: string, iepData: unknown): Promise<void> {
  await client.post(`/children/${childId}/iep/confirm`, { iepData })
}
