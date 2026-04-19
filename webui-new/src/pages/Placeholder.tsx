import { Link } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <Settings size={48} className="text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-400">This page will be implemented in the next phase.</p>
        <Link to="/config" className="inline-flex items-center gap-1 mt-4 text-sm text-brand hover:underline">
          Go to Config Manager →
        </Link>
      </div>
    </div>
  )
}
