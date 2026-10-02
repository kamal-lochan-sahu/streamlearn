import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';

export default function MyCourses() {
  const navigate = useNavigate();
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/content?type=course').then((r) => r.data.data?.items || []),
  });

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">My Courses</h1>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <button
                key={course._id}
                onClick={() => navigate(`/watch/${course.slug}`)}
                className="bg-bg-secondary border border-border rounded-xl overflow-hidden hover:border-brand/40 transition-all text-left"
              >
                <div className="aspect-video overflow-hidden bg-bg-surface">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={24} className="text-text-muted" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm mb-1 line-clamp-2">{course.title}</p>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    {course.totalLectures > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={11} />
                        {course.totalLectures} lectures
                      </span>
                    )}
                    {course.totalDuration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(course.totalDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <BookOpen size={48} className="text-text-muted mb-4" />
            <h3 className="text-xl font-bold mb-2">No courses yet</h3>
            <p className="text-text-secondary text-sm">Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
