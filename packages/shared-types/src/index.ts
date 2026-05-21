// ── Child & User ─────────────────────────────────────────────────────────────

export type AgeBand = '2-4' | '5-7' | '8-10' | '11-13' | '14-17'
export type DiagnosisStatus = 'confirmed' | 'suspected' | 'seeking-evaluation'
export type SchoolSetting = 'general-ed' | 'resource-room' | 'self-contained' | 'therapeutic-day' | 'home-school' | 'not-in-school'
export type CaregiverTone = 'overwhelmed' | 'coping' | 'positive' | 'neutral'

export interface ChildProfile {
  id: string
  userId: string
  firstName: string
  dob?: string
  ageBand?: AgeBand
  diagnosisConfirmed: boolean
  diagnosisStatus: DiagnosisStatus
  schoolSetting?: SchoolSetting
  language: string
  specialInterests: string[]
  createdAt: string
}

// ── Domains ───────────────────────────────────────────────────────────────────

export type DomainCode =
  | 'communication'
  | 'social'
  | 'regulation'
  | 'sensory'
  | 'adl'
  | 'academics'
  | 'behavior'
  | 'executive-function'

export const DOMAIN_LABELS: Record<DomainCode, string> = {
  communication: 'Communication',
  social: 'Social skills',
  regulation: 'Emotional regulation',
  sensory: 'Sensory processing',
  adl: 'Daily living skills',
  academics: 'Academics',
  behavior: 'Behavior',
  'executive-function': 'Executive function',
}

export type DomainStateCode =
  | 'CALIBRATING'
  | 'ACTIVE'
  | 'PLATEAU'
  | 'REGRESSING'
  | 'ACHIEVED'
  | 'GENERALIZING'
  | 'ARCHIVED'

export type TrendDirection = 'improving' | 'stable' | 'deteriorating' | 'unknown'

export interface DomainState {
  id: string
  childId: string
  domainCode: DomainCode
  state: DomainStateCode
  trendDirection: TrendDirection
  weeksInState: number
  enteredAt: string
}

// ── Check-in & Signals ────────────────────────────────────────────────────────

export type SettingType = 'home' | 'school' | 'therapy' | 'community'

export interface CheckInSignal {
  checkin_week: number
  caregiver_tone: CaregiverTone
  domains_mentioned: DomainCode[]
  domain_direction: Partial<Record<DomainCode, TrendDirection>>
  setting_of_concern: SettingType[]
  triggers_mentioned: string[]
  strengths_mentioned: string[]
  strategy_tried: { card_id: string; outcome: 'worked' | 'partial' | 'failed' | 'not_tried' } | null
  extraction_confidence: number
  followup_needed: boolean
  followup_questions: string[]
}

export interface CheckIn {
  id: string
  childId: string
  weekNumber: number
  submittedAt: string
  rawText: string
  followupText?: string
  signalJson?: CheckInSignal
  caregiverTone: CaregiverTone
  extractionConfidence: number
  correctionsMade: boolean
}

// ── Action Cards ──────────────────────────────────────────────────────────────

export type CardSlotType =
  | 'strength'
  | 'home-strategy'
  | 'school-request'
  | 'therapy-alignment'
  | 'community-bridge'
  | 'iep-prep'

export interface ActionCard {
  id: string
  childId: string
  checkinId: string
  slotType: CardSlotType
  domainCode: DomainCode
  setting: SettingType
  title: string
  strategyText: string
  scriptText: string
  watchForPositive: string[]
  watchForNegative: string[]
  whyNow: string
  generatedAt: string
  rating?: 'up' | 'down'
  ratingNote?: string
}

// ── Exports ───────────────────────────────────────────────────────────────────

export type ExportType =
  | 'iep-summary'
  | 'teacher-card'
  | 'aba-report'
  | 'ot-report'
  | 'slt-report'
  | 'psychologist-report'

export type ExportDepth = 'clinical' | 'summary'

export interface ExportRecord {
  id: string
  childId: string
  exportType: string
  depthMode: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  downloadUrl?: string | null
}

// ── IEP ───────────────────────────────────────────────────────────────────────

export interface IEPGoal {
  id: string
  text: string
  domainTag: DomainCode
  keep: boolean
}

export interface IEPService {
  type: string
  hoursPerWeek: number
}

export interface IEPData {
  goals: IEPGoal[]
  services: IEPService[]
  presentLevels?: string
  accommodations: string[]
  meetingDate?: string
  parseConfidence: number
}

// ── Baseline Assessment ───────────────────────────────────────────────────────

export interface DomainProfileEntry {
  domainCode: DomainCode
  level: 1 | 2 | 3 | 4  // 1=emerging, 4=strong
  notes?: string
}

export interface BaselineAssessment {
  id: string
  childId: string
  completedAt?: string
  domainProfile: DomainProfileEntry[]
  currentGoals: string[]
  whatHasntWorked: string[]
  iepData?: IEPData
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface CheckInResponse {
  checkin: CheckIn
  followupQuestions?: string[]
  signalSummary?: CheckInSignal
  cards?: ActionCard[]
  status: 'extracting' | 'follow-up-needed' | 'review' | 'complete'
}

export interface ProgressData {
  domainStates: DomainState[]
  weeklyTrends: { week: number; domain: DomainCode; direction: TrendDirection }[]
  recentWins: { domainCode: DomainCode; achievedAt: string }[]
  topStrategies: { strategyType: string; thumbsUpRate: number }[]
}
