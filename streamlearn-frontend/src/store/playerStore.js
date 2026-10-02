import { create } from 'zustand';

export const usePlayerStore = create((set, get) => ({
  currentContent: null,
  currentEpisode: null,
  currentLecture: null,
  isPlaying: false,
  volume: 1,
  muted: false,
  quality: 'auto',
  speed: 1,
  showNotes: false,
  showSubtitles: true,
  timestamp: 0,
  duration: 0,

  setContent: (content, episode, lecture) =>
    set({ currentContent: content, currentEpisode: episode, currentLecture: lecture }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume, muted: volume === 0 }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setQuality: (quality) => set({ quality }),
  setSpeed: (speed) => set({ speed }),
  toggleNotes: () => set((s) => ({ showNotes: !s.showNotes })),
  setTimestamp: (timestamp) => set({ timestamp }),
  setDuration: (duration) => set({ duration }),
  reset: () =>
    set({
      currentContent: null,
      currentEpisode: null,
      currentLecture: null,
      isPlaying: false,
      timestamp: 0,
    }),
}));
