import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import Navbar from '../../components/common/Navbar'
import ContentCard from '../../components/content/ContentCard'
import { ContentCardSkeleton } from '../../components/ui/Skeleton'
import api from '../../services/api'

const TRENDING = ['Action','Comedy','Web Development','Fitness','Drama','React','Machine Learning']

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  useEffect(() => setInput(q), [q])

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}`).then(r => r.data.data),
    enabled: q.length > 0,
  })

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar/>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <form onSubmit={e => { e.preventDefault(); if(input.trim()) setParams({q:input.trim()}) }} className="relative mb-10">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"/>
          <input value={input} onChange={e => setInput(e.target.value)} autoFocus
            placeholder="Search movies, series, courses..."
            className="w-full bg-bg-secondary border border-border rounded-2xl pl-14 pr-6 py-5 text-white placeholder:text-text-muted focus:outline-none focus:border-brand text-base"/>
        </form>

        {!q && (
          <div>
            <p className="text-text-secondary text-sm mb-4">Trending searches</p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map(t => (
                <button key={t} onClick={() => setParams({q:t})}
                  className="px-4 py-2 bg-bg-secondary border border-border rounded-full text-sm hover:border-brand hover:text-brand transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_,i) => <ContentCardSkeleton key={i}/>)}
          </div>
        )}

        {!isLoading && q && data && (
          <>
            <p className="text-text-secondary text-sm mb-6">
              {data.total>0 ? `${data.total} results for "${q}"` : `No results for "${q}"`}
            </p>
            {data.results?.length > 0
              ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.results.map(item => <ContentCard key={item._id} content={item}/>)}
                </div>
              : <div className="text-center py-20"><div className="text-5xl mb-4">🔍</div><p className="text-text-secondary">Nothing found. Try a different keyword.</p></div>
            }
          </>
        )}
      </div>
    </div>
  )
}
