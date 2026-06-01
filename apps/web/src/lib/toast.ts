import { create } from 'zustand'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastStore {
  toasts: ToastItem[]
  add: (item: Omit<ToastItem, 'id'>) => void
  remove: (id: number) => void
}

let _nextId = 1

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (item) => {
    const id = _nextId++
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().add({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().add({ type: 'error', message }),
  info: (message: string) => useToastStore.getState().add({ type: 'info', message }),
}
