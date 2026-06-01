import { toast } from '@/lib/toast'

// Wrapper để tương thích với các file dùng const { toast } = useToast()
export function useToast() {
  return { toast }
}

export { toast }
