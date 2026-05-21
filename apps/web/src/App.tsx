import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Landing } from '@/pages/Landing'
import { Auth } from '@/pages/Auth'
import { OnboardingWelcome } from '@/pages/onboarding/Welcome'
import { OnboardingBaseline } from '@/pages/onboarding/Baseline'
import { IEPUpload } from '@/pages/onboarding/IEPUpload'
import { Dashboard } from '@/pages/Dashboard'
import { CheckIn } from '@/pages/CheckIn'
import { CardDetail } from '@/pages/CardDetail'
import { Progress } from '@/pages/Progress'
import { DomainDetail } from '@/pages/DomainDetail'
import { ExportHub } from '@/pages/ExportHub'
import { Profile } from '@/pages/Profile'
import { useAppStore } from '@/store/app'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!isSignedIn) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser()
  const children_ = useAppStore((s) => s.children)
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/auth" replace />
  if (children_.length === 0) return <Navigate to="/onboarding/welcome" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          {/* Onboarding (auth required) */}
          <Route
            path="/onboarding/welcome"
            element={<RequireAuth><OnboardingWelcome /></RequireAuth>}
          />
          <Route
            path="/onboarding/baseline"
            element={<RequireAuth><OnboardingBaseline /></RequireAuth>}
          />
          <Route
            path="/onboarding/iep-upload"
            element={<RequireAuth><IEPUpload /></RequireAuth>}
          />

          {/* Authenticated app */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/cards/:cardId" element={<CardDetail />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/progress/domain/:domainCode" element={<DomainDetail />} />
            <Route path="/share" element={<ExportHub />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Default: show landing if unauthenticated, dashboard if auth'd */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
