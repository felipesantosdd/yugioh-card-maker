/**
 * Plugin client-only: banco local Yu-Gi-Oh! em IndexedDB.
 * - getDB(): carrega { cards, lastSync, databaseVersion }
 * - saveDB(cards, databaseVersion): persiste cards, lastSync=now e databaseVersion
 * - shouldSync(lastSync): true se não há dados ou passou > 24h
 * - clearDB(): limpa store de cards
 * - clearCardImages(): limpa store de imagens
 * Imagens são salvas em WebP para economizar espaço.
 */

const DB_NAME = 'yugioh-card-maker'
const DB_VERSION = 3
const STORE_NAME = 'ygo'
const CARD_IMAGES_STORE = 'card_images'
const COLLECTION_STORE = 'user_collection'
const KEY = 'local'
const MS_PER_DAY = 24 * 60 * 60 * 1000
const WEBP_QUALITY = 0.88

function blobToWebP(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (webpBlob) => (webpBlob ? resolve(webpBlob) : reject(new Error('toBlob failed'))),
        'image/webp',
        WEBP_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

const defaultData = () => ({
  cards: [],
  lastSync: null,
  databaseVersion: null,
})

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(CARD_IMAGES_STORE)) {
        db.createObjectStore(CARD_IMAGES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
        db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' })
      }
    }
  })
}

function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

function collectionPut(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTION_STORE, 'readwrite')
    const req = tx.objectStore(COLLECTION_STORE).put(item)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function collectionDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLLECTION_STORE, 'readwrite')
    const req = tx.objectStore(COLLECTION_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function get(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(KEY)
    req.onsuccess = () => resolve(req.result ? { ...defaultData(), ...req.result } : defaultData())
    req.onerror = () => reject(req.error)
  })
}

function set(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(value, KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export default function ({ app }, inject) {
  const ygoDb = {
    async getDB() {
      const db = await openDB()
      const data = await get(db)
      db.close()
      return data
    },

    async saveDB(cards, databaseVersion) {
      const db = await openDB()
      const current = await get(db)
      const payload = {
        cards: Array.isArray(cards) ? cards : current.cards,
        lastSync: Date.now(),
        databaseVersion: databaseVersion != null ? databaseVersion : current.databaseVersion,
      }
      await set(db, payload)
      db.close()
    },

    shouldSync(lastSync) {
      if (lastSync == null) return true
      return Date.now() - lastSync >= MS_PER_DAY
    },

    async clearDB() {
      const db = await openDB()
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },

    async clearCardImages() {
      const db = await openDB()
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CARD_IMAGES_STORE, 'readwrite')
        tx.objectStore(CARD_IMAGES_STORE).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },

    async getCardImage(id) {
      const db = await openDB()
      const blob = await new Promise((resolve, reject) => {
        const tx = db.transaction(CARD_IMAGES_STORE, 'readonly')
        const req = tx.objectStore(CARD_IMAGES_STORE).get(String(id))
        req.onsuccess = () => resolve(req.result ? req.result.blob : null)
        req.onerror = () => reject(req.error)
      })
      db.close()
      return blob
    },

    async getCollection() {
      const db = await openDB()
      const items = await getAll(db, COLLECTION_STORE)
      db.close()
      return items
    },

    async addToCollection(item) {
      const db = await openDB()
      const id = item.id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      await collectionPut(db, { ...item, id })
      db.close()
      return id
    },

    async updateInCollection(id, item) {
      const db = await openDB()
      await collectionPut(db, { ...item, id })
      db.close()
    },

    async removeFromCollection(id) {
      const db = await openDB()
      await collectionDelete(db, id)
      db.close()
    },

    async saveCardImage(id, blob) {
      if (!(blob instanceof Blob)) return
      let toSave = blob
      if (blob.type !== 'image/webp') {
        try {
          toSave = await blobToWebP(blob)
        } catch (e) {
          return
        }
      }
      const db = await openDB()
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CARD_IMAGES_STORE, 'readwrite')
        const req = tx.objectStore(CARD_IMAGES_STORE).put({ id: String(id), blob: toSave })
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
      db.close()
    },
  }

  inject('ygoDb', ygoDb)
}
