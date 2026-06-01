import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/axios'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export type PushPermission = 'default' | 'granted' | 'denied'

export function usePushNotification() {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPermission(Notification.permission as PushPermission)

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    })
  }, [])

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return false
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)
      if (perm !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await apiClient.post('/notifications/subscribe', sub.toJSON())
      setIsSubscribed(true)
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await apiClient.delete('/notifications/subscribe')
      }
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

  return { supported, permission, isSubscribed, loading, subscribe, unsubscribe }
}
