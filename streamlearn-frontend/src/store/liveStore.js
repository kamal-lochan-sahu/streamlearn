import { create } from 'zustand'

export const useLiveStore = create((set, get) => ({
  currentStream: null,
  messages: [],
  viewers: 0,
  activePoll: null,
  isConnected: false,

  setStream: (stream) => set({ currentStream: stream }),
  addMessage: (msg) => set(s => ({ messages: [...s.messages.slice(-200), msg] })),
  setViewers: (count) => set({ viewers: count }),
  setActivePoll: (poll) => set({ activePoll: poll }),
  setConnected: (val) => set({ isConnected: val }),
  reset: () => set({ currentStream: null, messages: [], viewers: 0, activePoll: null }),
}))
