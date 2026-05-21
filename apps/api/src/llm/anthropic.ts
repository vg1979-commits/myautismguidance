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
  summary: string
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
    max_tokens: 1500,
    system: `You are a warm, empathetic assistant helping parents of autistic children reflect on their week and build a support plan.

Extract structured signals from the caregiver's check-in text. The child is referred to as "${pseudonym}" internally.

Child context:
- Age band: ${childProfile.ageBand || 'unknown'}
- School setting: ${childProfile.schoolSetting || 'unknown'}
- Diagnosis: ${childProfile.diagnosisStatus}
- Week number: ${weekNumber}

Output ONLY valid JSON with this exact schema:
{
  "summary": string,  // 2-3 warm, conversational sentences reflecting back what the caregiver shared. Written in second person ("It sounds like...", "You mentioned...", "This week seems to have..."). Use the child's name (${childProfile.firstName}). Empathetic but not patronising. Never clinical.
  "caregiver_tone": "overwhelmed" | "coping" | "positive" | "neutral",
  "domains_mentioned": string[],  // from: communication, social, regulation, sensory, adl, academics, behavior, executive-function
  "domain_direction": { [domain]: "improving" | "stable" | "deteriorating" | "unknown" },
  "setting_of_concern": string[],  // from: home, school, therapy, community
  "triggers_mentioned": string[],
  "strengths_mentioned": string[],
  "strategy_tried": { "card_id": "unknown", "outcome": "worked" | "partial" | "failed" | "not_tried" } | null,
  "extraction_confidence": number,  // 0.0-1.0
  "followup_needed": boolean,  // true only if text is too vague to build a useful plan (confidence < 0.65)
  "followup_questions": string[]  // max 2, warm conversational questions, only if followup_needed=true
}

Rules for summary:
- Reflect specific things the caregiver mentioned — not generic observations
- Acknowledge difficulty before noting strengths (not the other way around)
- End with a forward-leaning sentence ("Let me put together some ideas based on what you've shared.")
- Never use clinical terms like "domains", "signals", "extraction"
- Never compare ${childProfile.firstName} to other children

Rules for extraction:
- followup_needed = true only when the text genuinely lacks enough detail to generate specific strategies
- Maximum 2 follow-up questions, warm and specific (not "Can you tell me more?")`,
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
    return {
      summary: "Thanks for sharing — let me put together some ideas based on what you've described.",
      caregiver_tone: 'neutral',
      domains_mentioned: [],
      domain_direction: {},
      setting_of_concern: [],
      triggers_mentioned: [],
      strengths_mentioned: [],
      strategy_tried: null,
      extraction_confidence: 0.5,
      followup_needed: true,
      followup_questions: ['Can you share a specific moment from this week that stood out — good or hard?'],
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

// ── Export document generation (Sonnet) ───────────────────────────────────────

const EXPORT_SYSTEM_PROMPTS: Record<string, string> = {
  'iep-summary': `You generate IEP advocacy summary documents for parents of autistic children.
Write a structured, professional HTML document the parent can bring to their IEP meeting.
Include: a brief child overview, progress observations by domain, SMART goal talking points, and suggested questions for the IEP team.
Label everything "Based on caregiver observation" — never as clinical assessment.
Use warm, empowering language. Never compare to neurotypical peers.`,

  'teacher-card': `You generate teacher quick-reference cards for parents of autistic children.
Write a concise, single-page HTML document (a "cheat sheet") for the teacher.
Include: what helps this child, what to watch for, communication preferences, and how to respond to dysregulation.
Keep it practical and scannable — bullet points, not paragraphs. Max 400 words of content.`,

  'aba-report': `You generate ABA therapist progress reports for parents of autistic children.
Write a structured HTML document summarizing home behavior observations for an ABA therapist.
Include: behavior patterns observed at home, strategies tried and outcomes, generalization opportunities, and caregiver questions.
Use ABA-adjacent language (antecedents, behaviors, consequences) where appropriate, but keep accessible.`,

  'ot-report': `You generate OT (occupational therapy) progress reports for parents of autistic children.
Write a structured HTML document summarizing sensory and ADL observations for an OT.
Include: sensory observations (seeking/avoiding), ADL progress, home environment notes, and strategies that helped.
Use OT-friendly language (sensory processing, proprioceptive, vestibular) where relevant.`,

  'slt-report': `You generate speech-language therapy progress reports for parents of autistic children.
Write a structured HTML document summarizing communication observations for an SLT.
Include: communication modalities used, turn-taking patterns, scripts that worked, vocabulary gains, and concerns.
Note AAC use if mentioned.`,

  'psychologist-report': `You generate psychologist/mental health progress reports for parents of autistic children.
Write a structured HTML document summarizing emotional and behavioral observations.
Include: regulation patterns, anxiety triggers observed, coping strategies tried, behavioral context, and caregiver concerns.
Use clinical-adjacent language (dysregulation, co-regulation, executive function) where appropriate.`,
}

export async function generateExportContent(
  exportType: string,
  depth: string,
  childProfile: {
    firstName: string
    ageBand?: string
    diagnosisStatus: string
    schoolSetting?: string
    specialInterests: string[]
  },
  recentCheckins: Array<{ rawText: string; caregiverTone: string; weekNumber: number; signalJson?: string }>,
  recentCards: Array<{ title: string; domainCode: string; setting: string; strategyText: string; whyNow: string }>,
): Promise<string> {
  const systemPrompt = EXPORT_SYSTEM_PROMPTS[exportType] || EXPORT_SYSTEM_PROMPTS['iep-summary']
  const pseudonym = 'CHILD'
  const interests = childProfile.specialInterests.slice(0, 3).join(', ')

  const checkinSummary = recentCheckins
    .slice(0, 4)
    .map((c) => `Week ${c.weekNumber} (tone: ${c.caregiverTone}): ${c.rawText.slice(0, 300)}`)
    .join('\n\n')

  const cardSummary = recentCards
    .slice(0, 6)
    .map((c) => `- [${c.domainCode}/${c.setting}] ${c.title}: ${c.strategyText.slice(0, 120)}`)
    .join('\n')

  const userPrompt = `Generate a ${depth === 'clinical' ? 'detailed clinical' : 'parent-friendly summary'} ${exportType} document.

Child context (use pseudonym ${pseudonym}):
- Age band: ${childProfile.ageBand || 'unknown'}
- School setting: ${childProfile.schoolSetting || 'unknown'}
- Diagnosis status: ${childProfile.diagnosisStatus}
- Special interests: ${interests || 'not specified'}

Recent check-in observations (last 4 weeks):
${checkinSummary || 'No check-ins yet.'}

Recent action cards (strategies in use):
${cardSummary || 'No cards generated yet.'}

Generate a complete, formatted HTML document (use <h1>, <h2>, <ul>, <p>, <table> as appropriate).
Include this footer on every page: "Generated by myautismguidance — based on caregiver observation. Not a clinical assessment."
Replace ${pseudonym} with "${childProfile.firstName}" in the final output.
Do not include <html>, <head>, or <body> tags — just the inner document content.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}
