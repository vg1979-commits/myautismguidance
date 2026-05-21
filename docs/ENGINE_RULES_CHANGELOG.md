# Engine Rules Changelog

All changes to the card generation rule engine (`apps/api/src/engine/cards/generator.ts`).

---

## 2026-05-21 — Full domain coverage: ADL, Academics, Behavior, Executive Function

### Summary
Expanded the rule engine from 5 rules covering 4 domains to a full 8-domain implementation with 28 distinct card rules, safety escalation, setting-triggered cards, and capacity-aware pruning.

### What changed

#### New domain rule sets

**ADL (Activities of Daily Living)** — `setting: home` only
- Visual routine board card: first-line support for morning/evening sequence breakdowns; uses step-completion prompting
- Sensory clothing choice card: triggered when clothing/dressing keywords appear in `triggers_mentioned`; recommends pre-selection the night before + seamless/tagless clothing
- Backward chaining hygiene card: for ADL deterioration without clothing trigger; child completes only the final step, always experiencing success

**Academics** — school-primary, home-secondary
- Homework decompression window card: 20-minute unstructured break before homework; targets the regulatory depletion that occurs after a full school day
- Teacher daily check-in request card: triggered when `school` in `setting_of_concern`; 2-minute end-of-day connection point; escalates to IEP/504 request if not followed through
- Chunked assignments request card: triggered on deteriorating academics or overwhelmed caregiver tone; requests assignments broken into discrete checkable sections

**Behavior** — setting varies by severity
- Tier 1 safety escalation (new): triggered by `SAFETY_KEYWORDS` in `triggers_mentioned`; generates a therapy-aligned safety card + immediate calm-down kit card; **returns early** — safety cards replace the rest of the plan when triggered
- ABC tracking card: for deteriorating or unknown behavior direction; teaches Antecedent-Behavior-Consequence observation logging for function identification
- Extinction burst awareness card: for deteriorating or stable behavior; prepares caregiver for the "it gets worse before it gets better" phase when starting a new strategy
- School behavior data request card: triggered when `school` in `setting_of_concern` and behavior is deteriorating/unknown

**Executive Function** — school + home
- Visual timer card: highest-priority EF card; always generated when EF is mentioned; addresses task initiation by making time concrete and visible
- First-then board card: triggered on deteriorating EF; externalises the first/then sequence as a physical board
- Visual daily schedule request card: triggered when `school` in `setting_of_concern`; requests personal desk schedule from teacher; escalates to IEP accommodation if declined
- Task checklist card: for deteriorating EF without school concern; physical checkbox list for multi-step tasks, max 5 items

#### New setting-triggered cards (not domain-gated)

**Community setting** — triggered when `community` in `setting_of_concern`
- Pre-outing preparation routine card: review destination, identify exit plan, establish quiet signal
- Portable sensory regulation kit card: child-curated travel bag with 2–3 known tools

**Therapy alignment** — triggered when `therapy` in `setting_of_concern`
- Home-to-therapy bridge card: structured prompt to share 1–3 bullet-point observations with provider before/after session; targets the home-therapy generalisation gap

#### Improved existing rules

- **Regulation**: Added second card (co-regulation / name the feeling) for deteriorating direction
- **Communication**: Added second card (offer choices instead of open questions) for deteriorating direction; tightened `whyNow` language
- **Social**: Added second card (scripted responses practice) when deteriorating and school not flagged
- **Sensory**: Added school accommodation request card when `school` in `setting_of_concern`

#### Safety escalation logic

```typescript
const SAFETY_KEYWORDS = [
  'hit', 'hitting', 'bite', 'biting', 'scratch', 'scratching',
  'self-harm', 'self harm', 'hurt', 'hurting', 'sib',
  'aggression', 'aggressive', 'head-bang', 'head bang',
  'threw', 'throwing', 'violent', 'destroy', 'destroying',
]
```

When any keyword matches `triggers_mentioned`, the engine:
1. Generates a `slotType: 'safety'` card directing to therapy/clinical provider
2. Generates an immediate calm-down kit card for home
3. Returns these two cards immediately (plus any strength card) — no other domains run

#### Capacity-aware pruning (updated)

When `caregiver_tone === 'overwhelmed'`:
- Maximum 3 cards returned (was already capped, now preserved)
- Prioritisation order: strength → regulation → behavior → all others
- Removes community, therapy-bridge, and complex school-request cards from overwhelmed plans

### Clinical basis

Rules derived from:
- `docs/Engine_DeepDive_KnowledgeBase.docx` — goal tiers, setting allocation, pivot signals, co-occurring condition modifiers
- `docs/Level1_Autism_Knowledge_Base.docx` — ABA, OT, SLT, education strategies
- `docs/myautismguidance_CheckIn_Plan_Architecture.docx` — card format spec, feedback loop

Key clinical principles applied:
- **Tier 1 first**: Safety, attention, and emotional regulation block all other goals
- **Setting allocation**: ADL = home-owned; ABA skill acquisition = therapy-owned; sensory diet = OT + home; academics = school-primary; community prep = home-initiated
- **Strength-first**: A strength card is always generated first when strengths are present
- **Function-based behavior**: All behavior cards avoid consequence-only framing; ABC tracking is the non-safety entry point
- **Capacity awareness**: Overwhelmed caregiver tone reduces plan to 3 simplified cards

### Files changed

- `apps/api/src/engine/cards/generator.ts` — complete rewrite, all 8 domains, 28 card rules
- `docs/ENGINE_RULES_CHANGELOG.md` — this file (created)

---

## 2026-05-20 — Initial rule engine (5 rules)

### Summary
Bootstrapped rule engine with coverage for: strength (always-on), regulation, communication, social/school, sensory.

### Files changed
- `apps/api/src/engine/cards/generator.ts` — initial implementation
