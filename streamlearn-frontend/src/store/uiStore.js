import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  modalOpen: false,
  modalContent: null,
  theme: 'dark',
  navTransparent: true,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),
  setNavTransparent: (val) => set({ navTransparent: val }),
}))
