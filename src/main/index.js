const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const database = require('./database')
const cardArt = require('./card-art')

let mainWindow = null

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
    mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  // Cards (base)
  ipcMain.handle('ygoDb:getDB', () => database.getDB())
  ipcMain.handle('ygoDb:saveCards', (_e, cards, databaseVersion) => database.saveCards(cards, databaseVersion))
  ipcMain.handle('ygoDb:saveCardsEN', (_e, enCards) => database.saveCardsEN(enCards))
  ipcMain.handle('ygoDb:mergeCardsPT', (_e, ptCards) => database.mergeCardsPT(ptCards))
  ipcMain.handle('ygoDb:updateCardTranslation', (_e, cardId, namePt, descPt) => database.updateCardTranslation(cardId, namePt, descPt))
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

  // Decks
  ipcMain.handle('ygoDb:getDecks', (_e, game) => database.getDecks(game))
  ipcMain.handle('ygoDb:createDeck', (_e, name, game) => database.createDeck(name, game))
  ipcMain.handle('ygoDb:updateDeck', (_e, id, name) => database.updateDeck(id, name))
  ipcMain.handle('ygoDb:deleteDeck', (_e, id) => database.deleteDeck(id))

  // Deck cards
  ipcMain.handle('ygoDb:getDeckCards', (_e, deckId) => database.getDeckCards(deckId))
  ipcMain.handle('ygoDb:addCardToDeck', (_e, deckId, cardId, cardData) => database.addCardToDeck(deckId, cardId, cardData))
  ipcMain.handle('ygoDb:updateDeckCard', (_e, id, cardData) => database.updateDeckCard(id, cardData))
  ipcMain.handle('ygoDb:removeDeckCard', (_e, id) => database.removeDeckCard(id))

  // Card art filesystem
  ipcMain.handle('cardArt:get', async (_e, id, imageUrl) => {
    const buf = await cardArt.getCardArt(id, imageUrl)
    return buf ? buf.toString('base64') : null
  })
  ipcMain.handle('cardArt:exists', (_e, id) => cardArt.cardArtExists(id))
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
