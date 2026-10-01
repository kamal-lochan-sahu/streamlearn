import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'

export default function ContentRow({ title, items = [], size = 'md' }) {
  const rowRef = useRef(null)
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 500, behavior: 'smooth' })

  if (!items.length) return null

  return (
    <section className="mb-6 sm:mb-8 group/row">
      <h2 className="text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3 px-4 sm:px-6 md:px-8">
        {title}
      </h2>
      <div className="relative">
        {/* Desktop scroll buttons */}
        <button onClick={() => scroll(-1)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full bg-gradient-to-r from-bg-primary opacity-0 group-hover/row:opacity-100 transition-opacity items-center justify-center">
          <ChevronLeft size={24}/>
        </button>

        <div ref={rowRef}
          className="content-row flex gap-2 sm:gap-3 overflow-x-auto px-4 sm:px-6 md:px-8 pb-4 scroll-smooth">
          {items.map(item => <ContentCard key={item._id} content={item} size={size}/>)}
        </div>

        <button onClick={() => scroll(1)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full bg-gradient-to-l from-bg-primary opacity-0 group-hover/row:opacity-100 transition-opacity items-center justify-center">
          <ChevronRight size={24}/>
        </button>
      </div>
    </section>
  )
}
