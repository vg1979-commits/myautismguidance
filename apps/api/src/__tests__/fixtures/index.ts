import { prisma } from '../../db/client'

let counter = 0

export async function createUser(overrides?: {
  clerkId?: string
  email?: string
  name?: string
}) {
  counter++
  return prisma.user.create({
    data: {
      clerkId: overrides?.clerkId ?? `test_clerk_${Date.now()}_${counter}`,
      email: overrides?.email ?? `test${counter}_${Date.now()}@example.com`,
      name: overrides?.name ?? null,
    },
  })
}

export async function createChild(
  userId: string,
  overrides?: {
    firstName?: string
    diagnosisStatus?: string
    specialInterests?: string
    schoolSetting?: string
    birthYear?: number
    birthMonth?: number
  }
) {
  return prisma.childProfile.create({
    data: {
      userId,
      firstName: overrides?.firstName ?? 'Alex',
      diagnosisStatus: overrides?.diagnosisStatus ?? 'confirmed',
      specialInterests: overrides?.specialInterests ?? '[]',
      schoolSetting: overrides?.schoolSetting ?? null,
      birthYear: overrides?.birthYear ?? null,
      birthMonth: overrides?.birthMonth ?? null,
    },
  })
}

export async function createCheckin(
  childId: string,
  overrides?: {
    weekNumber?: number
    rawText?: string
    caregiverTone?: string
    extractionConfidence?: number
    signalJson?: string
    followupText?: string
  }
) {
  return prisma.checkIn.create({
    data: {
      childId,
      weekNumber: overrides?.weekNumber ?? 1,
      rawText: overrides?.rawText ?? 'Had a good week',
      caregiverTone: overrides?.caregiverTone ?? 'neutral',
      extractionConfidence: overrides?.extractionConfidence ?? 0.5,
      signalJson: overrides?.signalJson ?? null,
      followupText: overrides?.followupText ?? null,
    },
  })
}

export async function createCard(
  childId: string,
  checkinId: string,
  overrides?: {
    slotType?: string
    domainCode?: string
    setting?: string
    title?: string
    strategyText?: string
    scriptText?: string
    watchForPositive?: string
    watchForNegative?: string
    whyNow?: string
    cardType?: string
  }
) {
  return prisma.actionCard.create({
    data: {
      childId,
      checkinId,
      slotType: overrides?.slotType ?? 'home-strategy',
      domainCode: overrides?.domainCode ?? 'regulation',
      setting: overrides?.setting ?? 'home',
      title: overrides?.title ?? 'Test card title',
      strategyText: overrides?.strategyText ?? 'A helpful strategy',
      scriptText: overrides?.scriptText ?? '"Try this script."',
      watchForPositive: overrides?.watchForPositive ?? '["Good sign"]',
      watchForNegative: overrides?.watchForNegative ?? '["Watch out"]',
      whyNow: overrides?.whyNow ?? 'Because now is the right time',
      cardType: overrides?.cardType ?? 'strategy',
    },
  })
}

export async function cleanDb() {
  // Delete in FK-safe order
  await prisma.cardRating.deleteMany()
  await prisma.actionCard.deleteMany()
  await prisma.checkIn.deleteMany()
  await prisma.exportRecord.deleteMany()
  await prisma.iEPUploadRecord.deleteMany()
  await prisma.domainState.deleteMany()
  await prisma.baselineAssessment.deleteMany()
  await prisma.childProfile.deleteMany()
  await prisma.user.deleteMany()
}
