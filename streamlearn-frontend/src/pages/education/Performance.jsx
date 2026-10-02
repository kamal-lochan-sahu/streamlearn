import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BookOpen, CheckCircle, Clock } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';

export default function Performance() {
  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp size={22} className="text-brand" />
          <h1 className="text-2xl font-bold">Performance</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Courses Enrolled', value: '0', icon: BookOpen, color: 'text-blue-400' },
            { label: 'Completed', value: '0', icon: CheckCircle, color: 'text-green-400' },
            { label: 'Hours Learned', value: '0', icon: Clock, color: 'text-yellow-400' },
            { label: 'Streak Days', value: '0', icon: TrendingUp, color: 'text-brand' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-bg-secondary border border-border rounded-xl p-5">
              <Icon size={20} className={`${color} mb-3`} />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            Enroll in courses to see your performance analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
