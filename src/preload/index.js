const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ygoDb', {
  // Cards (base)
  getDB: () => ipcRenderer.invoke('ygoDb:getDB'),
  saveCards: (cards, databaseVersion) => ipcRenderer.invoke('ygoDb:saveCards', cards, databaseVersion),
  saveCardsEN: (enCards) => ipcRenderer.invoke('ygoDb:saveCardsEN', enCards),
  mergeCardsPT: (ptCards) => ipcRenderer.invoke('ygoDb:mergeCardsPT', ptCards),
  updateCardBase: (cardId, payload) => ipcRenderer.invoke('ygoDb:updateCardBase', cardId, payload),
  shouldSync: (lastSync) => ipcRenderer.invoke('ygoDb:shouldSync', lastSync),
  getSyncMeta: (key) => ipcRenderer.invoke('ygoDb:getSyncMeta', key),
  updateSyncMeta: (key, value) => ipcRenderer.invoke('ygoDb:updateSyncMeta', key, value),
  clearCards: () => ipcRenderer.invoke('ygoDb:clearCards'),
  clearCardImages: () => ipcRenderer.invoke('ygoDb:clearCardImages'),

  // Card images
  getCardImage: async (id) => {
    const base64 = await ipcRenderer.invoke('ygoDb:getCardImage', id)
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'image/webp' })
  },

  saveCardImage: async (id, blob) => {
    if (!(blob instanceof Blob)) return
    const arrayBuf = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    return ipcRenderer.invoke('ygoDb:saveCardImage', id, base64)
  },
  hasCardImage: (id) => ipcRenderer.invoke('ygoDb:hasCardImage', id),
  getCardPreviewImage: async (id) => {
    const base64 = await ipcRenderer.invoke('ygoDb:getCardPreviewImage', id)
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'image/webp' })
  },
  saveCardPreviewImage: async (id, blob) => {
    if (!(blob instanceof Blob)) return
    const arrayBuf = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    return ipcRenderer.invoke('ygoDb:saveCardPreviewImage', id, base64)
  },
  hasCardPreviewImage: (id) => ipcRenderer.invoke('ygoDb:hasCardPreviewImage', id),
  getCardFullArtImage: async (id) => {
    const base64 = await ipcRenderer.invoke('ygoDb:getCardFullArtImage', id)
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'image/png' })
  },
  saveCardFullArtImage: async (id, blob) => {
    if (!(blob instanceof Blob)) return
    const arrayBuf = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    return ipcRenderer.invoke('ygoDb:saveCardFullArtImage', id, base64)
  },
  hasCardFullArt: (id) => ipcRenderer.invoke('ygoDb:hasCardFullArt', id),

  // Decks
  getDecks: (game) => ipcRenderer.invoke('ygoDb:getDecks', game),
  createDeck: (name, game) => ipcRenderer.invoke('ygoDb:createDeck', name, game),
  updateDeck: (id, name) => ipcRenderer.invoke('ygoDb:updateDeck', id, name),
  updateDeckCover: (deckId, coverCardId) => ipcRenderer.invoke('ygoDb:updateDeckCover', deckId, coverCardId),
  deleteDeck: (id) => ipcRenderer.invoke('ygoDb:deleteDeck', id),

  // Deck cards
  getDeckCards: (deckId) => ipcRenderer.invoke('ygoDb:getDeckCards', deckId),
  getDeckCardsByGame: (game) => ipcRenderer.invoke('ygoDb:getDeckCardsByGame', game),
  addCardToDeck: (deckId, cardId, cardData, insertAfterSortOrder) => ipcRenderer.invoke('ygoDb:addCardToDeck', deckId, cardId, cardData, insertAfterSortOrder),
  updateDeckCard: (id, cardData) => ipcRenderer.invoke('ygoDb:updateDeckCard', id, cardData),
  updateDeckCardsBulk: (updates) => ipcRenderer.invoke('ygoDb:updateDeckCardsBulk', updates),
  removeDeckCard: (id) => ipcRenderer.invoke('ygoDb:removeDeckCard', id),
  replaceDeckCards: (deckId, cards) => ipcRenderer.invoke('ygoDb:replaceDeckCards', deckId, cards),
  importDeckWithCards: (name, game, cards) => ipcRenderer.invoke('ygoDb:importDeckWithCards', name, game, cards),
})

contextBridge.exposeInMainWorld('cardArt', {
  get: (id, imageUrl) => ipcRenderer.invoke('cardArt:get', id, imageUrl),
  getUrl: (id, imageUrl) => ipcRenderer.invoke('cardArt:getUrl', id, imageUrl),
  exists: (id) => ipcRenderer.invoke('cardArt:exists', id),
})

contextBridge.exposeInMainWorld('silhouette', {
  /** Gera PDF para Silhouette/Cricut. Retorna { pdfBase64, templateFileName, templateBase64 }. */
  generatePdf: (options) => ipcRenderer.invoke('silhouette:generatePdf', options),
  getTemplate: (templateFileName) => ipcRenderer.invoke('silhouette:getTemplate', templateFileName),
  /** Lista de tamanhos de card: [{ key, label, widthMm, heightMm }]. */
  getCardSizeOptions: () => ipcRenderer.invoke('silhouette:getCardSizeOptions'),
})
