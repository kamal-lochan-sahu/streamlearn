import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';

export default function Certificates() {
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-certs'],
    queryFn: () => api.get('/content?type=course').then((r) => r.data.data?.items || []),
  });

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Award size={22} className="text-yellow-400" />
          <h1 className="text-2xl font-bold">My Certificates</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Award size={56} className="text-yellow-400/40 mb-4" />
          <h3 className="text-xl font-bold mb-2">No certificates yet</h3>
          <p className="text-text-secondary text-sm mb-6">
            Complete a course to earn your certificate.
          </p>
          <a
            href="/my-courses"
            className="bg-brand hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
          >
            Browse Courses
          </a>
        </div>
      </div>
    </div>
  );
}
