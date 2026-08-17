const DB_NAME = 'widget-launcher'
const DB_VERSION = 1
const STORE_NAME = 'coverImages'
const SWEEP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type ImageRow = {
  sessionId: string
  dataUrl: string
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open image store.'))
  })
}

export async function putImage(sessionId: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const row: ImageRow = { sessionId, dataUrl, updatedAt: Date.now() }
    tx.objectStore(STORE_NAME).put(row)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save image.'))
  })
  db.close()
}

export async function getImage(sessionId: string): Promise<string | null> {
  const db = await openDb()
  const dataUrl = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(sessionId)
    req.onsuccess = () => resolve((req.result as ImageRow | undefined)?.dataUrl ?? null)
    req.onerror = () => reject(req.error ?? new Error('Could not load image.'))
  })
  db.close()
  return dataUrl
}

export async function deleteImage(sessionId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(sessionId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete image.'))
  })
  db.close()
}

/** Bounds unbounded growth from tabs that were closed rather than reset. */
export async function sweepOlderThan(maxAgeMs: number = SWEEP_MAX_AGE_MS): Promise<void> {
  const db = await openDb()
  const cutoff = Date.now() - maxAgeMs
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      const row = cursor.value as ImageRow
      if (row.updatedAt < cutoff) cursor.delete()
      cursor.continue()
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not sweep image store.'))
  })
  db.close()
}
