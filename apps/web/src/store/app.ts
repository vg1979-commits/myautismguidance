import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChildProfile, ActionCard } from '@myautismguidance/shared-types'

interface AppStore {
  // Clerk identity (set on login, used in API headers)
  clerkUserId: string | null
  clerkEmail: string | null
  setClerkUser: (id: string, email: string) => void
  clearClerkUser: () => void

  // Active child
  activeChildId: string | null
  setActiveChildId: (id: string | null) => void

  // Children cache
  children: ChildProfile[]
  setChildren: (children: ChildProfile[]) => void
  addChild: (child: ChildProfile) => void

  // Current week cards (cached for offline view)
  currentCards: ActionCard[]
  setCurrentCards: (cards: ActionCard[]) => void

  // Check-in flow state
  checkinActive: boolean
  setCheckinActive: (active: boolean) => void

  // Onboarding
  onboardingStep: number
  setOnboardingStep: (step: number) => void
  onboardingData: Record<string, unknown>
  setOnboardingData: (data: Record<string, unknown>) => void
  mergeOnboardingData: (data: Record<string, unknown>) => void
}

const CHILD_RESET = {
  activeChildId: null,
  children: [],
  currentCards: [],
  onboardingStep: 1,
  onboardingData: {},
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      clerkUserId: null,
      clerkEmail: null,
      setClerkUser: (id, email) => set((s) => {
        // Different user logging in — clear all previous user's data
        if (s.clerkUserId && s.clerkUserId !== id) {
          return { ...CHILD_RESET, clerkUserId: id, clerkEmail: email }
        }
        return { clerkUserId: id, clerkEmail: email }
      }),
      clearClerkUser: () => set({ clerkUserId: null, clerkEmail: null, ...CHILD_RESET }),

      activeChildId: null,
      setActiveChildId: (id) => set({ activeChildId: id }),

      children: [],
      setChildren: (children) => set({ children }),
      addChild: (child) => set((s) => ({ children: [...s.children, child] })),

      currentCards: [],
      setCurrentCards: (cards) => set({ currentCards: cards }),

      checkinActive: false,
      setCheckinActive: (active) => set({ checkinActive: active }),

      onboardingStep: 1,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      onboardingData: {},
      setOnboardingData: (data) => set({ onboardingData: data }),
      mergeOnboardingData: (data) =>
        set((s) => ({ onboardingData: { ...s.onboardingData, ...data } })),
    }),
    {
      name: 'mag-app-store',
      partialize: (s) => ({
        clerkUserId: s.clerkUserId,   // persisted so we can detect user switches on reload
        activeChildId: s.activeChildId,
        children: s.children,
        currentCards: s.currentCards,
      }),
    }
  )
)
