import type { CreateOutputPayload } from '../output.api'

const DB_NAME = 'tuandat-mes-offline'
const STORE_NAME = 'output-queue'
const DB_VERSION = 1

interface QueueItem {
  id?: number
  payload: CreateOutputPayload
  queuedAt: string
  retries: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addToOfflineQueue(payload: CreateOutputPayload): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const item: QueueItem = { payload, queuedAt: new Date().toISOString(), retries: 0 }
    const req = store.add(item)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflineQueue(): Promise<QueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Gọi khi online lại: sync tất cả items trong queue
export async function syncOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue()
  if (queue.length === 0) return 0

  const { outputApi } = await import('../output.api')
  let synced = 0

  for (const item of queue) {
    try {
      await outputApi.upsert(item.payload)
      await removeFromQueue(item.id!)
      synced++
    } catch {
      // giữ lại để retry sau
    }
  }

  return synced
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await getOfflineQueue()
  return queue.length
}
