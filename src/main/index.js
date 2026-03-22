const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const database = require('./database')
const cardArt = require('./card-art')
const silhouettePdf = require('./silhouette-pdf')

let mainWindow = null
let devServerRetryTimer = null

function clearDevServerRetryTimer() {
  if (devServerRetryTimer) {
    clearTimeout(devServerRetryTimer)
    devServerRetryTimer = null
  }
}

function scheduleDevServerReload(window, url, attempt = 1) {
  if (!window || window.isDestroyed()) return

  clearDevServerRetryTimer()
  const delay = Math.min(1000 * attempt, 5000)

  devServerRetryTimer = setTimeout(() => {
    devServerRetryTimer = null
    if (!window.isDestroyed()) {
      window.loadURL(url).catch(() => {
        scheduleDevServerReload(window, url, attempt + 1)
      })
    }
  }, delay)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Criador de Cartas Yu-Gi-Oh!',
    icon: path.join(__dirname, '../../static/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.DEV_SERVER_PORT || 9080
    const devServerUrl = `http://localhost:${port}`

    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, _errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return
        if (validatedURL !== devServerUrl) return
        if (errorCode === -102 || errorCode === -105 || errorCode === -300) {
          scheduleDevServerReload(mainWindow, devServerUrl)
        }
      }
    )

    mainWindow.webContents.on('did-finish-load', () => {
      clearDevServerRetryTimer()
    })

    mainWindow.loadURL(devServerUrl).catch(() => {
      scheduleDevServerReload(mainWindow, devServerUrl)
    })
    // DevTools: abrir manualmente com F12 se precisar (evita erro dragEvent ao trocar abas)
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    clearDevServerRetryTimer()
    mainWindow = null
  })
}

function registerIpcHandlers() {
  // Cards (base)
  ipcMain.handle('ygoDb:getDB', () => database.getDB())
  ipcMain.handle('ygoDb:saveCards', (_e, cards, databaseVersion) => database.saveCards(cards, databaseVersion))
  ipcMain.handle('ygoDb:saveCardsEN', (_e, enCards) => database.saveCardsEN(enCards))
  ipcMain.handle('ygoDb:mergeCardsPT', (_e, ptCards) => database.mergeCardsPT(ptCards))
  ipcMain.handle('ygoDb:updateCardBase', (_e, cardId, payload) =>
    database.updateCardBase(cardId, payload)
  )
  ipcMain.handle('ygoDb:shouldSync', (_e, lastSync) => database.shouldSync(lastSync))
  ipcMain.handle('ygoDb:getSyncMeta', (_e, key) => database.getSyncMeta(key))
  ipcMain.handle('ygoDb:updateSyncMeta', (_e, key, value) => database.updateSyncMeta(key, value))
  ipcMain.handle('ygoDb:clearCards', () => database.clearCards())
  ipcMain.handle('ygoDb:clearCardImages', () => database.clearCardImages())

  // Card images
  ipcMain.handle('ygoDb:getCardImage', (_e, id) => {
    const buf = database.getCardImage(id)
    return buf ? buf.toString('base64') : null
  })
  ipcMain.handle('ygoDb:saveCardImage', (_e, id, base64) => {
    const buf = Buffer.from(base64, 'base64')
    database.saveCardImage(id, buf)
  })
  ipcMain.handle('ygoDb:hasCardImage', (_e, id) => database.hasCardImage(id))
  ipcMain.handle('ygoDb:getCardPreviewImage', (_e, id) => {
    const buf = database.getCardPreviewImage(id)
    return buf ? buf.toString('base64') : null
  })
  ipcMain.handle('ygoDb:saveCardPreviewImage', (_e, id, base64) => {
    const buf = Buffer.from(base64, 'base64')
    database.saveCardPreviewImage(id, buf)
  })
  ipcMain.handle('ygoDb:hasCardPreviewImage', (_e, id) =>
    database.hasCardPreviewImage(id)
  )
  ipcMain.handle('ygoDb:getCardFullArtImage', (_e, id) => {
    const buf = database.getCardFullArtImage(id)
    return buf ? buf.toString('base64') : null
  })
  ipcMain.handle('ygoDb:saveCardFullArtImage', (_e, id, base64) => {
    const buf = Buffer.from(base64, 'base64')
    database.saveCardFullArtImage(id, buf)
  })
  ipcMain.handle('ygoDb:hasCardFullArt', (_e, id) =>
    database.hasCardFullArt(id)
  )

  // Decks
  ipcMain.handle('ygoDb:getDecks', (_e, game) => database.getDecks(game))
  ipcMain.handle('ygoDb:createDeck', (_e, name, game) => database.createDeck(name, game))
  ipcMain.handle('ygoDb:updateDeck', (_e, id, name) => database.updateDeck(id, name))
  ipcMain.handle('ygoDb:updateDeckCover', (_e, deckId, coverCardId) => database.updateDeckCover(deckId, coverCardId))
  ipcMain.handle('ygoDb:deleteDeck', (_e, id) => database.deleteDeck(id))

  // Deck cards
  ipcMain.handle('ygoDb:getDeckCards', (_e, deckId) => database.getDeckCards(deckId))
  ipcMain.handle('ygoDb:getDeckCardsByGame', (_e, game) => database.getDeckCardsByGame(game))
  ipcMain.handle('ygoDb:addCardToDeck', (_e, deckId, cardId, cardData, insertAfterSortOrder) => database.addCardToDeck(deckId, cardId, cardData, insertAfterSortOrder))
  ipcMain.handle('ygoDb:updateDeckCard', (_e, id, cardData) => database.updateDeckCard(id, cardData))
  ipcMain.handle('ygoDb:updateDeckCardsBulk', (_e, updates) => database.updateDeckCardsBulk(updates))
  ipcMain.handle('ygoDb:removeDeckCard', (_e, id) => database.removeDeckCard(id))
  ipcMain.handle('ygoDb:replaceDeckCards', (_e, deckId, cards) => database.replaceDeckCards(deckId, cards))
  ipcMain.handle('ygoDb:importDeckWithCards', (_e, name, game, cards) => database.importDeckWithCards(name, game, cards))

  // Card art filesystem
  ipcMain.handle('cardArt:get', async (_e, id, imageUrl) => {
    const buf = await cardArt.getCardArt(id, imageUrl)
    return buf ? buf.toString('base64') : null
  })
  ipcMain.handle('cardArt:getUrl', (_e, id, imageUrl) =>
    cardArt.getCardArtUrl(id, imageUrl)
  )
  ipcMain.handle('cardArt:exists', (_e, id) => cardArt.cardArtExists(id))

  // PDF para Silhouette/Cricut (integrado, sem Python externo)
  ipcMain.handle('silhouette:generatePdf', async (_e, { images, cardSize = 'japanese', paperSize = 'a4', cardsTouch = false, includeImages = true }) => {
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('Informe ao menos uma imagem (array de { base64 } ou strings base64).')
    }
    const list = images.map((img) => (typeof img === 'string' ? { base64: img } : img))
    return silhouettePdf.generateSilhouettePdf(list, cardSize, paperSize, { cardsTouch, includeImages })
  })
  ipcMain.handle('silhouette:getTemplate', (_e, templateFileName) => {
    const buf = silhouettePdf.getTemplateBuffer(templateFileName)
    return buf.toString('base64')
  })
  ipcMain.handle('silhouette:getCardSizeOptions', () => silhouettePdf.getCardSizeOptions())
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  database.close()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
