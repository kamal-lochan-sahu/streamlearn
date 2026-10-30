import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const MAX_RETRIES = 3;

/**
 * HLS player. `startTime` (seconds) is read when `src` changes, so the caller must pass the final
 * resume position together with the link (the stream endpoints return it as `resumeAt`).
 */
export default function VideoPlayer({
  src,
  poster,
  onProgress,
  onPause,
  onEnded,
  startTime = 0,
  options = {},
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const startRef = useRef(startTime);
  const [error, setError] = useState(null);

  startRef.current = startTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!src || !video) return undefined;
    setError(null);
    const start = startRef.current > 0 ? startRef.current : 0;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        startPosition: start || -1,
      });
      hlsRef.current = hls;
      let retries = 0;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        // A short network or decoding hiccup should not kill the video
        if (retries < MAX_RETRIES) {
          retries += 1;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) return hls.startLoad();
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) return hls.recoverMediaError();
        }
        setError('Stream error. Please reload the page and try again.');
      });
    } else {
      // Safari plays HLS natively; plain files (mp4) also end up here
      const seek = () => {
        if (start > 0) video.currentTime = start;
      };
      video.addEventListener('loadedmetadata', seek, { once: true });
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v) onProgress?.({ currentTime: v.currentTime, duration: v.duration });
  };

  const handlePause = () => {
    const v = videoRef.current;
    // `pause` also fires right before `ended`; the ended handler covers that case
    if (v && !v.ended) onPause?.({ currentTime: v.currentTime, duration: v.duration });
  };

  if (error)
    return (
      <div className="aspect-video bg-black flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );

  return (
    <div className="relative bg-black aspect-video w-full">
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={onEnded}
        {...options}
      />
    </div>
  );
}
