import { Download, HardDrive, Trash2 } from 'lucide-react'
import Navbar from '../../components/common/Navbar'

export default function Downloads() {
  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Download size={22} className="text-brand"/>
          <h1 className="text-2xl font-bold">Downloads</h1>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 text-text-secondary">
            <HardDrive size={18}/>
            <span className="text-sm">Storage: 0 MB used</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Download size={48} className="text-text-muted mb-4"/>
          <h3 className="text-xl font-bold mb-2">No downloads yet</h3>
          <p className="text-text-secondary text-sm mb-2">Download content to watch offline.</p>
          <p className="text-text-muted text-xs">Available on Premium plans. Look for the download icon on content.</p>
        </div>
      </div>
    </div>
  )
}
