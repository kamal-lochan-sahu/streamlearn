export default function Badge({ children, variant='default', size='sm', className='' }) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary',
    brand:   'bg-brand/20 text-brand',
    green:   'bg-green-500/20 text-green-400',
    yellow:  'bg-yellow-500/20 text-yellow-400',
    red:     'bg-red-500/20 text-red-400',
    blue:    'bg-blue-500/20 text-blue-400',
  }
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm' }
  return <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>{children}</span>
}
