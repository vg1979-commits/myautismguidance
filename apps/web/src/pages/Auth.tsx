import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSignIn, useSignUp, useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff } from 'lucide-react'

type Mode = 'signin' | 'signup'
type Stage = 'credentials' | 'verify-email'

export function Auth() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [stage, setStage] = useState<Stage>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) navigate('/')
  }, [isSignedIn])

  useEffect(() => {
    setError('')
    setStage('credentials')
  }, [mode])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!signUp) return
    setError('')
    setLoading(true)

    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStage('verify-email')
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; longMessage?: string }[] }
      setError(
        clerkErr?.errors?.[0]?.longMessage ||
        clerkErr?.errors?.[0]?.message ||
        'Could not create account. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!signUp || !setActiveSignUp) return
    setError('')
    setLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode })
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        navigate('/onboarding/welcome')
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] }
      setError(clerkErr?.errors?.[0]?.message || 'Invalid code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn || !setActiveSignIn) return
    setError('')
    setLoading(true)

    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        navigate('/')
      } else {
        // Handle any additional factors if needed
        setError('Sign-in requires additional verification. Check your email.')
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; longMessage?: string }[] }
      setError(
        clerkErr?.errors?.[0]?.longMessage ||
        clerkErr?.errors?.[0]?.message ||
        'Incorrect email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-5 py-12">
      <Link to="/landing" className="font-serif text-2xl text-ink-1 mb-8 no-underline tracking-tight">
        myautismguidance
      </Link>

      <div className="card w-full max-w-[400px] p-8">
        {/* Email verification step */}
        {stage === 'verify-email' ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-semibold text-ink-1 text-lg">Check your email</h2>
              <p className="text-sm text-ink-4 mt-1">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            <Input
              label="Verification code"
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              autoComplete="one-time-code"
              autoFocus
            />

            {error && (
              <p className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-sm">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading} size="lg">
              Verify and continue
            </Button>

            <button
              type="button"
              onClick={() => setStage('credentials')}
              className="w-full text-sm text-ink-4 hover:text-ink-2 transition-colors text-center"
            >
              ← Use a different email
            </button>
          </form>
        ) : (
          <>
            {/* Mode tabs */}
            <div className="flex border border-line rounded-sm mb-6 overflow-hidden">
              {(['signup', 'signin'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors duration-1 ${
                    mode === m ? 'bg-accent text-white' : 'text-ink-3 hover:bg-paper-2'
                  }`}
                >
                  {m === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              ))}
            </div>

            <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-8 text-ink-4 hover:text-ink-2 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'signup' && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-accent"
                    required
                  />
                  <span className="text-sm text-ink-3">
                    I agree to the{' '}
                    <a href="#" className="text-accent">
                      Privacy Policy
                    </a>
                  </span>
                </label>
              )}

              {error && (
                <p className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-sm">{error}</p>
              )}

              <Button type="submit" className="w-full" loading={loading} size="lg">
                {mode === 'signup' ? 'Create my account' : 'Sign in'}
              </Button>
            </form>

            {mode === 'signin' && (
              <p className="text-center mt-4">
                <a href="#" className="text-sm text-ink-4 hover:text-ink-2">
                  Forgot password?
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
