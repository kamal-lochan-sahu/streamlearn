export default function Button({ children, variant='primary', size='md', loading, disabled, onClick, type='button', className='' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none'
  const variants = {
    primary:   'bg-brand hover:bg-red-700 text-white',
    secondary: 'bg-bg-surface hover:bg-bg-elevated text-white border border-border',
    ghost:     'hover:bg-bg-surface text-text-secondary hover:text-white',
    danger:    'bg-red-600 hover:bg-red-700 text-white',
  }
  const sizes = { sm:'px-3 py-1.5 text-xs', md:'px-5 py-2.5 text-sm', lg:'px-7 py-3.5 text-base' }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled||loading?'opacity-50 cursor-not-allowed':''} ${className}`}>
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
      {children}
    </button>
  )
}
