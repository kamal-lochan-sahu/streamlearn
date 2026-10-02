import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';

export default function Doubts() {
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-doubts'],
    queryFn: () => api.get('/content?type=course').then((r) => r.data.data?.items || []),
  });

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle size={22} className="text-brand" />
          <h1 className="text-2xl font-bold">Doubts</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HelpCircle size={48} className="text-text-muted mb-4" />
          <h3 className="text-xl font-bold mb-2">No doubts posted</h3>
          <p className="text-text-secondary text-sm">
            Ask doubts while watching lectures in a course.
          </p>
        </div>
      </div>
    </div>
  );
}
