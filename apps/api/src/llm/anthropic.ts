import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Signal extraction (Haiku) ──────────────────────────────────────────────────

export async function extractSignals(
  checkinText: string,
  childProfile: {
    firstName: string
    ageBand?: string
    diagnosisStatus: string
    schoolSetting?: string
  },
  weekNumber: number
): Promise<{
  caregiver_tone: string
  domains_mentioned: string[]
  domain_direction: Record<string, string>
  setting_of_concern: string[]
  triggers_mentioned: string[]
  strengths_mentioned: string[]
  strategy_tried: { card_id: string; outcome: string } | null
  extraction_confidence: number
  followup_needed: boolean
  followup_questions: string[]
}> {
  const pseudonym = 'CHILD'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a clinical signal extraction engine for a caregiver support platform for parents of autistic children.

Extract structured signals from the caregiver's check-in text. The child is referred to as "${pseudonym}" internally.

Child context:
- Age band: ${childProfile.ageBand || 'unknown'}
- School setting: ${childProfile.schoolSetting || 'unknown'}
- Diagnosis: ${childProfile.diagnosisStatus}
- Week number: ${weekNumber}

Output ONLY valid JSON with this exact schema:
{
  "caregiver_tone": "overwhelmed" | "coping" | "positive" | "neutral",
  "domains_mentioned": string[],  // from: communication, social, regulation, sensory, adl, academics, behavior, executive-function
  "domain_direction": { [domain]: "improving" | "stable" | "deteriorating" | "unknown" },
  "setting_of_concern": string[],  // from: home, school, therapy, community
  "triggers_mentioned": string[],
  "strengths_mentioned": string[],
  "strategy_tried": { "card_id": "unknown", "outcome": "worked" | "partial" | "failed" | "not_tried" } | null,
  "extraction_confidence": number,  // 0.0-1.0
  "followup_needed": boolean,  // true if confidence < 0.7
  "followup_questions": string[]  // max 2, natural language, only if followup_needed=true
}

Rules:
- Never include the child's real name in output
- If the caregiver mentions emotional keywords like "exhausted", "frustrated", "desperate" = overwhelmed
- Extraction confidence below 0.7 means the text was too vague to generate a specific plan
- Maximum 2 follow-up questions, conversational tone`,
    messages: [
      {
        role: 'user',
        content: `Caregiver check-in text:\n\n${checkinText}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  try {
    return JSON.parse(content.text)
  } catch {
    // Fallback extraction
    return {
      caregiver_tone: 'neutral',
      domains_mentioned: [],
      domain_direction: {},
      setting_of_concern: [],
      triggers_mentioned: [],
      strengths_mentioned: [],
      strategy_tried: null,
      extraction_confidence: 0.5,
      followup_needed: true,
      followup_questions: ['Can you tell me more about what happened this week?'],
    }
  }
}

// ── Card personalization (Sonnet) ─────────────────────────────────────────────

export async function personalizeCards(
  cards: Array<{
    slotType: string
    domainCode: string
    setting: string
    title: string
    strategyText: string
    scriptText: string
    watchForPositive: string[]
    watchForNegative: string[]
    whyNow: string
  }>,
  childProfile: {
    firstName: string
    ageBand?: string
    specialInterests: string[]
    schoolSetting?: string
  },
  checkinText: string,
  caregiverTone: string
): Promise<typeof cards> {
  const pseudonym = 'CHILD'
  const interests = childProfile.specialInterests.slice(0, 3).join(', ')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are the card personalization engine for a caregiver support platform for autistic children.

Personalize the action cards using the child's profile and this week's check-in language. Make the scripts feel natural and specific to this family.

Child context (use pseudonym ${pseudonym} internally):
- Age band: ${childProfile.ageBand || 'unknown'}
- Special interests: ${interests || 'not specified'}
- School setting: ${childProfile.schoolSetting || 'unknown'}
- Caregiver tone this week: ${caregiverTone}

Rules:
- Scripts must be under 40 words and feel natural to speak aloud
- Use the child's interests in scripts where genuinely relevant (don't force it)
- If tone is "overwhelmed", simplify language and reduce cognitive load in scripts
- Never use clinical jargon in scripts — parents should be able to say this naturally
- Keep "Why now" grounded in what the caregiver actually mentioned
- Output the same JSON array with updated text only — do not change structure

Output ONLY a valid JSON array of the same cards with updated title, strategyText, scriptText, and whyNow fields.`,
    messages: [
      {
        role: 'user',
        content: `Check-in text: "${checkinText.slice(0, 500)}"\n\nCards to personalize:\n${JSON.stringify(cards, null, 2)}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return cards

  try {
    return JSON.parse(content.text)
  } catch {
    return cards
  }
}

// ── IEP parsing (Sonnet) ──────────────────────────────────────────────────────

export async function parseIEPDocument(rawText: string): Promise<{
  goals: Array<{ id: string; text: string; domainTag: string; keep: boolean }>
  services: Array<{ type: string; hoursPerWeek: number }>
  presentLevels?: string
  accommodations: string[]
  meetingDate?: string
  parseConfidence: number
}> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are an IEP document parser for a caregiver support platform.

Extract structured data from IEP (Individualized Education Program) documents.

Output ONLY valid JSON with this schema:
{
  "goals": [{ "id": "g1", "text": string, "domainTag": string, "keep": true }],
  "services": [{ "type": string, "hoursPerWeek": number }],
  "presentLevels": string | null,
  "accommodations": string[],
  "meetingDate": "YYYY-MM-DD" | null,
  "parseConfidence": number  // 0.0-1.0
}

Domain tags must be one of: communication, social, regulation, sensory, adl, academics, behavior, executive-function

If a field cannot be found, use null or empty array. Never fabricate data.`,
    messages: [
      {
        role: 'user',
        content: `IEP document text:\n\n${rawText.slice(0, 8000)}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  try {
    return JSON.parse(content.text)
  } catch {
    return {
      goals: [],
      services: [],
      accommodations: [],
      parseConfidence: 0.3,
    }
  }
}
