export default function Loader({ fullScreen = false, size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const spinner = (
    <div className={`${sizes[size]} border-2 border-white/20 border-t-brand rounded-full animate-spin`} />
  )
  if (fullScreen) return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center z-50">
      {spinner}
    </div>
  )
  return <div className="flex items-center justify-center p-8">{spinner}</div>
}
