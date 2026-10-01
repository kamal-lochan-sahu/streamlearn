import { useEffect } from 'react'
import { X } from 'lucide-react'
export default function Modal({ open, onClose, title, children, size='md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  const sizes = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full ${sizes[size]} bg-bg-secondary border border-border rounded-2xl shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-bg-elevated rounded-lg"><X size={20}/></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
