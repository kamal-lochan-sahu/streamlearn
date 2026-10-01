import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      // Show after 30 seconds
      setTimeout(() => setShow(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    setShow(false)
  }

  if (!show || !prompt) return null

  return (
    <div className="pwa-install-prompt animate-slide-up">
      <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
        <span className="text-white font-black text-sm">S</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install StreamLearn</p>
        <p className="text-xs text-text-secondary">Add to home screen</p>
      </div>
      <button onClick={install} className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
        Install
      </button>
      <button onClick={() => setShow(false)} className="text-text-muted hover:text-white transition-colors">
        <X size={16}/>
      </button>
    </div>
  )
}
