import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-200">
        <div className="text-2xl font-bold text-zinc-900">Reffed</div>
        <div className="flex gap-4">
          <Button variant="ghost">Login</Button>
          <Button>Get Started</Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-zinc-900 mb-6 leading-tight">
            AI improves applications. We improve verification.
          </h1>
          <p className="text-xl text-zinc-600 mb-8 leading-relaxed">
            Pre-interview reference-check platform for the India HR Tech market. 
            Get structured reference checks before your first interview.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="text-base px-8">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8">
              Request Demo
            </Button>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 border border-zinc-200 rounded-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Before the Interview</h3>
            <p className="text-zinc-600">
              Move reference checks before the first interview to save time and improve hiring quality.
            </p>
          </div>
          <div className="p-6 border border-zinc-200 rounded-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Structured Feedback</h3>
            <p className="text-zinc-600">
              Get qualitative, detailed feedback from referees with our standardized questionnaires.
            </p>
          </div>
          <div className="p-6 border border-zinc-200 rounded-lg">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Built for India</h3>
            <p className="text-zinc-600">
              Designed for mid-size companies, scaling startups, and recruitment agencies in India.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 px-8 py-8 text-center text-zinc-600">
        <p>© 2026 Reffed. All rights reserved.</p>
      </footer>
    </div>
  )
}
