export default function Skeleton({ className='' }) {
  return <div className={`animate-pulse bg-bg-elevated rounded ${className}`}/>
}
export function ContentCardSkeleton() {
  return (
    <div className="w-44 flex-shrink-0">
      <div className="aspect-video bg-bg-elevated rounded-md mb-2 animate-pulse"/>
      <div className="h-3 bg-bg-elevated rounded w-3/4 mb-1 animate-pulse"/>
      <div className="h-3 bg-bg-elevated rounded w-1/2 animate-pulse"/>
    </div>
  )
}
export function ContentRowSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-5 bg-bg-elevated rounded w-40 mb-3 ml-8 animate-pulse"/>
      <div className="flex gap-3 px-8">
        {[...Array(6)].map((_,i) => <ContentCardSkeleton key={i}/>)}
      </div>
    </div>
  )
}
