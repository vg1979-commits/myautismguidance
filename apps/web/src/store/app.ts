import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChildProfile, ActionCard } from '@myautismguidance/shared-types'

interface AppStore {
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

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
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
        activeChildId: s.activeChildId,
        children: s.children,
        currentCards: s.currentCards,
      }),
    }
  )
)
