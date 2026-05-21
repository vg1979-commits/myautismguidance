import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import { CheckInHistory } from '@/pages/CheckInHistory'
import { CardDetail } from '@/pages/CardDetail'
import { Progress } from '@/pages/Progress'
import { DomainDetail } from '@/pages/DomainDetail'
import { ExportHub } from '@/pages/ExportHub'
import { Profile } from '@/pages/Profile'
import { useAppStore } from '@/store/app'
import { getChildren } from '@/lib/api'

// Syncs Clerk identity into Zustand so api.ts interceptor can read it
function ClerkUserSync() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { setClerkUser, clearClerkUser } = useAppStore()

  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn && user) {
      setClerkUser(user.id, user.primaryEmailAddress?.emailAddress ?? '')
    } else {
      clearClerkUser()
    }
  }, [isLoaded, isSignedIn, user?.id])

  return null
}

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
  if (!isSignedIn) return <Navigate to="/landing" replace />
  return <>{children}</>
}

// Wraps authenticated app routes — redirects to onboarding if no child profile
function RequireProfile({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser()
  const { children: storedChildren, setChildren, setActiveChildId } = useAppStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setChecking(false); return }
    if (storedChildren.length > 0) { setChecking(false); return }

    // Try fetching from API in case store was cleared (e.g. new device/browser)
    getChildren()
      .then((kids) => {
        if (kids.length > 0) {
          setChildren(kids)
          setActiveChildId(kids[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [isLoaded, isSignedIn])

  if (!isLoaded || checking) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!isSignedIn) return <Navigate to="/landing" replace />
  if (storedChildren.length === 0) return <Navigate to="/onboarding/welcome" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkUserSync />
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

          {/* Authenticated app — redirects to onboarding if no child profile */}
          <Route
            element={
              <RequireProfile>
                <AppLayout />
              </RequireProfile>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/history" element={<CheckInHistory />} />
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
