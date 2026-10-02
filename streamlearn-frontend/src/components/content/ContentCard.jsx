import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, ChevronDown } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

export default function ContentCard({ content, size = 'md' }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  if (!content) return null;

  const sizes = {
    sm: 'w-28 xs:w-32 sm:w-36 md:w-44',
    md: 'w-36 xs:w-40 sm:w-44 md:w-52',
    lg: 'w-44 xs:w-48 sm:w-52 md:w-64',
  };

  return (
    <div
      className={`${sizes[size]} flex-shrink-0 cursor-pointer group relative`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/watch/${content.slug}`)}
    >
      {/* Thumbnail */}
      <div className="relative rounded-md overflow-hidden aspect-video bg-bg-surface transition-all duration-200 md:group-hover:scale-105 md:group-hover:z-10 active:scale-95">
        {content.thumbnail ? (
          <img
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-elevated text-text-muted text-xs">
            No Image
          </div>
        )}

        {/* Mobile: show play overlay on tap */}
        <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Play size={28} className="text-white fill-white drop-shadow-lg" />
          </div>
        </div>

        {/* Duration */}
        {content.duration && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            {formatDuration(content.duration)}
          </span>
        )}

        {/* Rating */}
        {content.rating?.average > 0 && (
          <span className="absolute top-1 left-1 bg-brand/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {content.rating.average.toFixed(1)}★
          </span>
        )}
      </div>

      {/* Title (mobile: always visible) */}
      <div className="mt-1.5 px-0.5 md:hidden">
        <p className="text-xs font-medium text-text-secondary truncate">{content.title}</p>
      </div>

      {/* Desktop hover card */}
      {hovered && (
        <div className="hidden md:block absolute top-full left-0 right-0 bg-bg-surface border border-border rounded-b-xl p-3 z-20 shadow-2xl animate-fade-in">
          <div className="flex gap-2 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/player/${content._id}`);
              }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/90"
            >
              <Play size={13} className="text-black fill-black ml-0.5" />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-white"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-white ml-auto"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <p className="font-semibold text-sm truncate">{content.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
            {content.releaseYear && <span>{content.releaseYear}</span>}
            {content.ageRating && (
              <span className="border border-border px-1">{content.ageRating}</span>
            )}
            {content.genre?.[0] && <span>{content.genre[0]}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
