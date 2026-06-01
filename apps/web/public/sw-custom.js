// Service Worker custom logic
// vite-plugin-pwa sẽ inject workbox runtime vào đây khi build

// Lắng nghe push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tuấn Đạt MES', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: data.url,
      vibrate: [200, 100, 200],
    }),
  )
})

// Khi click notification → mở app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data ?? '/'
  event.waitUntil(clients.openWindow(url))
})

// Background sync cho offline output queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-daily-output') {
    event.waitUntil(syncDailyOutput())
  }
})

async function syncDailyOutput() {
  // Sẽ implement ở Giai đoạn 6 (offline mode)
  console.log('[SW] Syncing daily output queue...')
}
