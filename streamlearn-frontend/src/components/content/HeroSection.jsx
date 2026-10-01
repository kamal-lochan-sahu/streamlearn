import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Info } from 'lucide-react'

export default function HeroSection({ items = [] }) {
  const navigate  = useNavigate()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % items.length), 7000)
    return () => clearInterval(t)
  }, [items.length])

  const item = items[current]
  if (!item) return null

  return (
    <div className="relative h-[55vh] sm:h-[65vh] md:h-[80vh] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={item.banner || item.thumbnail} alt={item.title}
          className="w-full h-full object-cover object-top"
          loading="eager"/>
        <div className="absolute inset-0 hero-gradient"/>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-14 md:max-w-3xl">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-2 md:mb-3 leading-tight drop-shadow-lg line-clamp-2">
          {item.title}
        </h1>

        {item.rating?.average > 0 && (
          <div className="flex items-center gap-3 mb-2 md:mb-3 text-sm">
            <span className="text-green-400 font-semibold">{Math.round(item.rating.average * 20)}% Match</span>
            {item.releaseYear && <span className="text-text-secondary">{item.releaseYear}</span>}
            {item.ageRating && <span className="border border-white/40 px-1.5 text-xs py-0.5">{item.ageRating}</span>}
          </div>
        )}

        <p className="hidden sm:block text-text-secondary text-sm mb-5 line-clamp-2 leading-relaxed max-w-lg">
          {item.shortDesc || item.description}
        </p>

        <div className="flex gap-2 sm:gap-3">
          <button onClick={() => navigate(`/player/${item._id}`)}
            className="flex items-center gap-1.5 sm:gap-2 bg-white text-black px-4 sm:px-7 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-white/90 transition-colors">
            <Play size={18} fill="black"/> Play
          </button>
          <button onClick={() => navigate(`/watch/${item.slug}`)}
            className="flex items-center gap-1.5 sm:gap-2 bg-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-white/30 transition-colors backdrop-blur-sm">
            <Info size={18}/> <span className="hidden sm:inline">More Info</span><span className="sm:hidden">Info</span>
          </button>
        </div>
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 sm:right-8 flex gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}/>
          ))}
        </div>
      )}
    </div>
  )
}
