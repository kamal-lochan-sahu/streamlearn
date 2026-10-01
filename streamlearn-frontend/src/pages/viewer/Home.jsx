import { useQuery } from '@tanstack/react-query'
import Navbar from '../../components/common/Navbar'
import HeroSection from '../../components/content/HeroSection'
import ContentRow from '../../components/content/ContentRow'
import { ContentRowSkeleton } from '../../components/ui/Skeleton'
import api from '../../services/api'

export default function Home() {
  const { data: featured, isLoading: fl } = useQuery({
    queryKey: ['content','featured'],
    queryFn: () => api.get('/content/featured').then(r => r.data.data),
  })
  const { data: trending } = useQuery({
    queryKey: ['content','trending'],
    queryFn: () => api.get('/content/trending').then(r => r.data.data),
  })
  const { data: newReleases } = useQuery({
    queryKey: ['content','new-releases'],
    queryFn: () => api.get('/content/new-releases').then(r => r.data.data),
  })
  const { data: continueWatching } = useQuery({
    queryKey: ['content','continue-watching'],
    queryFn: () => api.get('/content/continue-watching').then(r => r.data.data),
  })
  const { data: recommendations } = useQuery({
    queryKey: ['content','recommendations'],
    queryFn: () => api.get('/content/recommendations').then(r => r.data.data),
  })
  const { data: movies } = useQuery({
    queryKey: ['content','movies'],
    queryFn: () => api.get('/content?type=movie').then(r => r.data.data?.items),
  })
  const { data: courses } = useQuery({
    queryKey: ['content','courses'],
    queryFn: () => api.get('/content?type=course').then(r => r.data.data?.items),
  })
  const { data: series } = useQuery({
    queryKey: ['content','series'],
    queryFn: () => api.get('/content?type=series').then(r => r.data.data?.items),
  })

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar/>
      {fl
        ? <div className="h-[85vh] bg-bg-secondary animate-pulse"/>
        : <HeroSection items={featured || []}/>
      }
      <div className="relative z-10 -mt-16 pb-16">
        {continueWatching?.length > 0 && <ContentRow title="▶ Continue Watching" items={continueWatching}/>}
        {trending?.length > 0       && <ContentRow title="🔥 Trending Now"       items={trending}/>}
        {newReleases?.length > 0    && <ContentRow title="✨ New Releases"       items={newReleases}/>}
        {recommendations?.length > 0&& <ContentRow title="⭐ Recommended"        items={recommendations}/>}
        {movies?.length > 0         && <ContentRow title="🎬 Movies"             items={movies}/>}
        {series?.length > 0         && <ContentRow title="📺 Series"             items={series}/>}
        {courses?.length > 0        && <ContentRow title="📚 Courses"            items={courses}/>}
        {!fl && !trending?.length && !featured?.length && (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="text-6xl mb-6">🎬</div>
            <h2 className="text-2xl font-bold mb-2">No content yet</h2>
            <p className="text-text-secondary mb-6">Upload your first video from the Admin Panel.</p>
            <a href="/admin/content" className="bg-brand hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Go to Admin Panel</a>
          </div>
        )}
      </div>
    </div>
  )
}
