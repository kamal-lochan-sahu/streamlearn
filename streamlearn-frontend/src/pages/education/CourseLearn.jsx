import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  BookOpen,
  FileText,
  ChevronDown,
} from 'lucide-react';
import VideoPlayer from '../../components/player/VideoPlayer';
import useProgressSaver from '../../hooks/useProgressSaver';
import Loader from '../../components/common/Loader';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';
import toast from 'react-hot-toast';

const BLOCKED_TEXT = {
  401: 'Please sign in to watch this lecture.',
  403: 'Subscription or purchase required to watch this lecture.',
  404: 'Video not available yet.',
};

// The player lives in its own component, keyed by lecture: every lecture starts with fresh
// saving state, and the previous lecture's last position is saved against the previous lecture.
function LecturePlayer({ courseId, lectureId, streamData, onEnded }) {
  const { onProgress, onPause, finish } = useProgressSaver((seconds) =>
    api.put(
      '/progress/timestamp',
      { contentId: courseId, lectureId, timestamp: seconds },
      { silent: true }
    )
  );
  return (
    <VideoPlayer
      src={streamData.url}
      startTime={streamData.resumeAt || 0}
      onProgress={onProgress}
      onPause={onPause}
      onEnded={() => {
        finish();
        onEnded();
      }}
      options={{ autoPlay: true }}
    />
  );
}

// /learn/:courseId/:lectureId?   courseId is the course slug (an id works too)
export default function CourseLearn() {
  const { courseId: courseRef, lectureId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [doubt, setDoubt] = useState('');
  const [expandSection, setExpandSection] = useState(0);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseRef],
    queryFn: () => api.get(`/content/${courseRef}`).then((r) => r.data.data),
  });
  const courseId = course?._id; // the progress, doubt and certificate APIs work with the id
  const { data: progress } = useQuery({
    queryKey: ['progress', courseId],
    queryFn: () => api.get(`/progress/content/${courseId}`).then((r) => r.data.data),
    enabled: !!courseId,
  });
  const { data: streamData } = useQuery({
    queryKey: ['lec-stream', lectureId],
    enabled: !!lectureId,
    staleTime: 0, // signed links expire and the resume position changes
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      try {
        const res = await api.get(`/lectures/${lectureId}/stream`, { silent: true });
        return res.data.data;
      } catch (err) {
        return { blocked: err.response?.status || 404, message: err.response?.data?.message };
      }
    },
  });
  const { data: doubts = [] } = useQuery({
    queryKey: ['doubts', lectureId],
    queryFn: () =>
      lectureId ? api.get(`/doubts/lecture/${lectureId}`).then((r) => r.data.data) : [],
    enabled: !!lectureId && activeTab === 'doubts',
  });

  const markComplete = useMutation({
    mutationFn: () => api.put(`/progress/lecture/${lectureId}`, { contentId: courseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress', courseId] });
      toast.success('Lecture completed ✓');
    },
  });
  const postDoubt = useMutation({
    mutationFn: () => api.post('/doubts', { contentId: courseId, lectureId, question: doubt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doubts', lectureId] });
      setDoubt('');
      toast.success('Doubt posted');
    },
  });

  const allLectures = course?.sections?.flatMap((s) => s.lectures) || [];
  const currentIdx = allLectures.findIndex((l) => l._id === lectureId);
  const currentLec = allLectures[currentIdx];
  const prevLec = allLectures[currentIdx - 1];
  const nextLec = allLectures[currentIdx + 1];
  const isCompleted = progress?.completedLectures?.includes(lectureId);

  // /learn/:course without a lecture: continue where the student stopped, else the first lecture
  const firstLectureId = allLectures[0]?._id;
  const resumeLectureId = allLectures.some((l) => l._id === progress?.lastLecture)
    ? progress.lastLecture
    : firstLectureId;
  useEffect(() => {
    if (!lectureId && course && progress !== undefined && resumeLectureId)
      navigate(`/learn/${courseRef}/${resumeLectureId}`, { replace: true });
  }, [lectureId, course, progress, resumeLectureId, courseRef, navigate]);

  if (isLoading) return <Loader fullScreen />;
  if (!course)
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-3">
        <p className="text-text-secondary">Course not found.</p>
        <button onClick={() => navigate('/')} className="text-brand hover:underline text-sm">
          Go home
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <div className="bg-bg-secondary border-b border-border px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={() => navigate(`/watch/${course?.slug}`)}
          className="text-text-secondary hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-secondary truncate">{course?.title}</p>
          <p className="text-sm font-semibold truncate">
            {currentLec?.title || 'Select a lecture'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
          <span>
            {progress?.completedLectures?.length || 0}/{allLectures.length}
          </span>
          <div className="w-20 bg-bg-elevated rounded-full h-1.5">
            <div
              className="bg-brand h-1.5 rounded-full"
              style={{ width: `${progress?.completionPercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="bg-black">
            {streamData?.url ? (
              <LecturePlayer
                key={lectureId}
                courseId={courseId}
                lectureId={lectureId}
                streamData={streamData}
                onEnded={() => {
                  if (!isCompleted) markComplete.mutate();
                  if (nextLec) navigate(`/learn/${courseRef}/${nextLec._id}`);
                }}
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center gap-3 text-text-secondary px-4 text-center">
                <BookOpen size={40} />
                <p className="text-sm">
                  {!lectureId
                    ? 'Select a lecture'
                    : streamData?.blocked
                      ? streamData.message || BLOCKED_TEXT[streamData.blocked] || BLOCKED_TEXT[404]
                      : 'Loading...'}
                </p>
                {streamData?.blocked === 403 && (
                  <button
                    onClick={() => navigate(`/watch/${course.slug}`)}
                    className="text-brand hover:underline text-sm"
                  >
                    See how to get access
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-border">
            <div className="flex px-4">
              {['overview', 'notes', 'doubts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-brand text-white' : 'border-transparent text-text-secondary hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">{currentLec?.title}</h2>
                  {lectureId &&
                    (isCompleted ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-400">
                        <CheckCircle size={16} /> Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => markComplete.mutate()}
                        className="flex items-center gap-1.5 text-sm text-brand hover:text-white"
                      >
                        <CheckCircle size={16} /> Mark Complete
                      </button>
                    ))}
                </div>
                {currentLec?.description && (
                  <p className="text-text-secondary text-sm leading-relaxed mb-4">
                    {currentLec.description}
                  </p>
                )}
                <div className="flex gap-3">
                  {prevLec && (
                    <button
                      onClick={() => navigate(`/learn/${courseRef}/${prevLec._id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-bg-surface border border-border rounded-lg text-sm hover:border-white transition-colors"
                    >
                      <ChevronLeft size={15} /> Previous
                    </button>
                  )}
                  {nextLec && (
                    <button
                      onClick={() => navigate(`/learn/${courseRef}/${nextLec._id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      Next <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notes' &&
              (streamData?.notes ? (
                <a
                  href={streamData.notes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand hover:underline text-sm"
                >
                  <FileText size={16} /> Download PDF Notes
                </a>
              ) : (
                <p className="text-text-secondary text-sm">No notes for this lecture.</p>
              ))}

            {activeTab === 'doubts' && (
              <div>
                <div className="mb-6">
                  <textarea
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    placeholder="Ask a question..."
                    rows={3}
                    className="w-full bg-bg-surface border border-border rounded-xl p-4 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-brand resize-none"
                  />
                  <button
                    onClick={() => doubt.trim() && postDoubt.mutate()}
                    disabled={!doubt.trim() || postDoubt.isPending}
                    className="mt-2 px-5 py-2 bg-brand text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Post Doubt
                  </button>
                </div>
                <div className="space-y-4">
                  {doubts.map((d) => (
                    <div key={d._id} className="bg-bg-surface border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-xs font-bold">
                          {d.userId?.name?.[0]}
                        </div>
                        <span className="font-medium text-sm">{d.userId?.name}</span>
                        {d.isResolved && (
                          <span className="text-xs text-green-400 ml-auto">✓ Resolved</span>
                        )}
                      </div>
                      <p className="text-sm">{d.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-72 bg-bg-secondary border-l border-border hidden lg:block overflow-y-auto">
          <div className="p-4 border-b border-border">
            <p className="font-semibold text-sm">Course Content</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {progress?.completedLectures?.length || 0}/{allLectures.length} completed
            </p>
          </div>
          {course?.sections?.map((section, si) => (
            <div key={section._id} className="border-b border-border">
              <button
                onClick={() => setExpandSection(expandSection === si ? null : si)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated text-left transition-colors"
              >
                <p className="text-sm font-medium">{section.title}</p>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${expandSection === si ? 'rotate-180' : ''}`}
                />
              </button>
              {expandSection === si &&
                section.lectures?.map((lec) => {
                  const done = progress?.completedLectures?.includes(lec._id);
                  const active = lec._id === lectureId;
                  return (
                    <button
                      key={lec._id}
                      onClick={() => navigate(`/learn/${courseRef}/${lec._id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t border-border/50 transition-colors ${active ? 'bg-brand/10' : 'hover:bg-bg-elevated'}`}
                    >
                      {done ? (
                        <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle
                          size={14}
                          className={`flex-shrink-0 ${active ? 'text-brand' : 'text-text-muted'}`}
                        />
                      )}
                      <span
                        className={`text-xs flex-1 leading-tight ${active ? 'text-white font-medium' : 'text-text-secondary'}`}
                      >
                        {lec.title}
                      </span>
                      {lec.duration && (
                        <span className="text-xs text-text-muted">
                          {formatDuration(lec.duration)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
