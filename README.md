# myautismguidance

Personalized weekly guidance for parents and caregivers of autistic children (Level 1 ASD, ages 2–17).

## What it does

- **Weekly check-in** — caregiver types how the week went in plain language
- **AI engine** (Claude API) extracts structured signals and generates 3–6 action cards
- **Setting-aware cards** — Home, School, Therapy, Community
- **Feedback loop** — thumbs up/down ratings teach the engine what works for each child
- **School & therapist exports** — IEP advocacy docs, teacher quick-reference, therapy reports

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Design | Atlas Design System (Newsreader + Geist, warm paper palette) |
| State | Zustand + React Query |
| Routing | React Router v6 |
| Icons | Lucide React |
| API | Node.js + Fastify + TypeScript |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| AI | Anthropic Claude API (Haiku for extraction, Sonnet for personalization) |
| Auth | Clerk |

## Project structure

```
myautismguidance/
├── apps/
│   ├── web/          React frontend (Vite)
│   └── api/          Fastify API server
└── packages/
    └── shared-types/ TypeScript types shared between web and api
```

## Getting started

### Prerequisites
- Node.js 20+
- npm 10+
- Clerk account (free) — for auth
- Anthropic API key — for AI features

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

**Frontend** (`apps/web/.env.local`):
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
```

**API** (`apps/api/.env`):
```
ANTHROPIC_API_KEY=sk-ant-your-key
DATABASE_URL="file:./dev.db"
CLERK_SECRET_KEY=sk_test_your_clerk_key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Set up database

```bash
cd apps/api
npx prisma db push
```

### 4. Run development servers

```bash
# Run both frontend and API
npm run dev

# Or separately
npm run dev:web   # http://localhost:5173
npm run dev:api   # http://localhost:3001
```

## Screens

| Screen | Route |
|---|---|
| Landing | `/` (unauth) |
| Auth | `/auth` |
| Onboarding | `/onboarding/welcome`, `/onboarding/baseline` |
| IEP upload | `/onboarding/iep-upload` |
| Dashboard | `/` (auth) |
| Check-in | `/checkin` |
| Card detail | `/cards/[id]` |
| Progress | `/progress` |
| Domain detail | `/progress/domain/[code]` |
| Export hub | `/share` |
| Profile | `/profile` |

## AI engine pipeline

1. Caregiver submits free-text check-in
2. **Claude Haiku** extracts structured signals (domains, tone, triggers, strengths)
3. If confidence < 0.7: up to 2 follow-up questions
4. **Rule engine** generates 3–6 candidate action cards
5. **Claude Sonnet** personalizes card text with child's name, interests, and caregiver language
6. Cards delivered to frontend via API response

## Deploying to production

- **Frontend**: Deploy `apps/web` to Vercel
- **API**: Deploy `apps/api` to Railway or Render
- **Database**: Swap SQLite for PostgreSQL (update `DATABASE_URL` in Prisma schema)

## Clinical notes

- This app is **not a clinical tool** and does not replace professional guidance
- All recommendations are framed as supportive strategies for caregivers
- No data is sent to providers without explicit caregiver action
- Child's full name is never sent to the Anthropic API (pseudonymized)
- All exports include a disclaimer: "Based on caregiver observation. Not a clinical assessment."
