import { useCallback, useEffect, useRef } from 'react';

/**
 * Saves the playback position while a video plays: at most once per `intervalMs`, on pause,
 * and once more when the page is left. (The old code reset a 5 second timer on every
 * time update, so it only ever fired after the video had been paused.)
 *
 * `save(seconds)` does the actual request. Call `finish()` when the video has ended so the
 * final flush on unmount does not bring the position back.
 */
export default function useProgressSaver(save, { intervalMs = 10000, minSeconds = 5 } = {}) {
  const saveRef = useRef(save);
  const lastSavedAt = useRef(0);
  const latest = useRef(0);
  const finished = useRef(false);
  saveRef.current = save;

  const flush = useCallback(
    (seconds) => {
      const t = Math.floor(seconds ?? latest.current);
      if (finished.current || t < minSeconds) return;
      lastSavedAt.current = Date.now();
      Promise.resolve(saveRef.current(t)).catch(() => {});
    },
    [minSeconds]
  );

  const onProgress = useCallback(
    ({ currentTime }) => {
      latest.current = currentTime;
      if (Date.now() - lastSavedAt.current >= intervalMs) flush(currentTime);
    },
    [flush, intervalMs]
  );

  const onPause = useCallback(({ currentTime }) => flush(currentTime), [flush]);
  const finish = useCallback(() => {
    finished.current = true;
  }, []);

  // leaving the page or switching video: keep the last position
  useEffect(() => () => flush(), [flush]);

  return { onProgress, onPause, finish };
}
