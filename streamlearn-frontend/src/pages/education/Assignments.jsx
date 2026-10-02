import { FileText } from 'lucide-react';
import Navbar from '../../components/common/Navbar';

export default function Assignments() {
  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText size={22} className="text-brand" />
          <h1 className="text-2xl font-bold">Assignments</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText size={48} className="text-text-muted mb-4" />
          <h3 className="text-xl font-bold mb-2">No assignments</h3>
          <p className="text-text-secondary text-sm">
            Assignments from your enrolled courses will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
