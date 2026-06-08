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

// Đối số kiểu shadcn: toast({ title, description, variant })
interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

const add = (type: ToastItem['type'], message: string) =>
  useToastStore.getState().add({ type, message })

// `toast` vừa gọi trực tiếp được (toast({ title, ... })) vừa có .success/.error/.info(string)
// để tương thích cả 2 quy ước đang dùng trong codebase.
function toastFn(arg: string | ToastOptions) {
  if (typeof arg === 'string') return add('info', arg)
  const message = [arg.title, arg.description].filter(Boolean).join(' — ')
  add(arg.variant === 'destructive' ? 'error' : 'success', message)
}

export const toast = Object.assign(toastFn, {
  success: (message: string) => add('success', message),
  error: (message: string) => add('error', message),
  info: (message: string) => add('info', message),
})
