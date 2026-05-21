import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Star, Share2 } from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    headline: 'Weekly check-in',
    description: 'Share how the week went in your own words. No forms, no categories.',
  },
  {
    icon: Star,
    headline: 'Action cards',
    description: 'Get 3–5 specific things to try this week — with scripts you can use right now.',
  },
  {
    icon: Share2,
    headline: 'Share with your team',
    description: 'One-tap reports for school IEP meetings and therapist sessions.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-line bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-dashboard mx-auto h-full flex items-center justify-between px-5 md:px-8">
          <span className="font-serif text-xl text-ink-1 tracking-tight">myautismguidance</span>
          <Link
            to="/auth"
            className="text-sm font-medium text-ink-3 hover:text-ink-2 transition-colors no-underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 py-20 md:py-32">
        <div className="max-w-reading mx-auto">
          <p className="eyebrow mb-5">For autism caregivers</p>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-ink-1 leading-tight tracking-tight mb-5">
            Personalized weekly guidance<br className="hidden md:block" /> for autism caregivers
          </h1>
          <p className="lead text-ink-3 max-w-[520px] mx-auto mb-10">
            Tell us about your child. Get a specific plan for this week — at home,
            at school, and with their therapist.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg">Get started — it's free</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="secondary">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature callouts */}
      <section className="border-t border-line bg-white py-16 px-5 md:px-8">
        <div className="max-w-dashboard mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {features.map(({ icon: Icon, headline, description }) => (
            <div key={headline} className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-accent-soft mb-4">
                <Icon size={20} strokeWidth={1.5} className="text-accent" />
              </div>
              <h3 className="font-semibold text-ink-1 mb-2">{headline}</h3>
              <p className="text-sm text-ink-3 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-6 px-5 md:px-8">
        <div className="max-w-dashboard mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-4">
          <span>© 2026 myautismguidance. Not a clinical tool.</span>
          <div className="flex gap-5">
            <a href="#" className="text-ink-4 hover:text-ink-2 no-underline">Privacy policy</a>
            <a href="#" className="text-ink-4 hover:text-ink-2 no-underline">Terms</a>
            <a href="#" className="text-ink-4 hover:text-ink-2 no-underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
