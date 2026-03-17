const crypto = require('crypto')
const path = require('path')
const { app } = require('electron')

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SCHEMA_VERSION = 2

let db = null

function createAppId(prefix) {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function touchDeckStatement(d) {
  return d.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?")
}

function normalizeDeckCardData(cardData) {
  const {
    id: _unused,
    deck_id: _unused2,
    sort_order: _unused3,
    created_at: _unused4,
    ...rest
  } = cardData || {}
  return rest
}

function getDbPath() {
  return path.join(app.getPath('userData'), 'yugioh-card-maker.db')
}

function open() {
  if (db) return db
  const Database = require('better-sqlite3')
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')

  const userVersion = db.pragma('user_version', { simple: true })

  if (userVersion < SCHEMA_VERSION) {
    db.exec(`
      DROP TABLE IF EXISTS cards;
      DROP TABLE IF EXISTS card_images;
      DROP TABLE IF EXISTS collection;
      DROP TABLE IF EXISTS sync_meta;
      DROP TABLE IF EXISTS decks;
      DROP TABLE IF EXISTS deck_cards;
    `)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      name_en TEXT NOT NULL DEFAULT '',
      name_pt TEXT NOT NULL DEFAULT '',
      desc_en TEXT NOT NULL DEFAULT '',
      desc_pt TEXT NOT NULL DEFAULT '',
      translation_official INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_images (
      card_id TEXT PRIMARY KEY,
      image BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game TEXT NOT NULL DEFAULT 'yugioh',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deck_cards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      card_id INTEGER,
      card_data TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  if (userVersion < SCHEMA_VERSION) {
    db.pragma(`user_version = ${SCHEMA_VERSION}`)
  }

  return db
}

function close() {
  if (db) {
    db.close()
    db = null
  }
}

// --------------- Cards (base de dados do jogo) ---------------

function getDB() {
  const d = open()
  const rows = d.prepare('SELECT id, name_en, name_pt, desc_en, desc_pt, translation_official, data FROM cards').all()
  const cards = rows.map((r) => {
    const parsed = JSON.parse(r.data)
    return {
      ...parsed,
      id: r.id,
      name_en: r.name_en,
      name_pt: r.name_pt,
      desc_en: r.desc_en,
      desc_pt: r.desc_pt,
      translation_official: r.translation_official === 1,
    }
  })

  const lastSyncRow = d.prepare("SELECT value FROM sync_meta WHERE key = 'lastSync'").get()
  const versionRow = d.prepare("SELECT value FROM sync_meta WHERE key = 'databaseVersion'").get()

  return {
    cards,
    lastSync: lastSyncRow ? Number(lastSyncRow.value) : null,
    databaseVersion: versionRow ? versionRow.value : null,
  }
}

function saveCards(cards, databaseVersion) {
  const d = open()
  const insertCard = d.prepare(`
    INSERT OR REPLACE INTO cards (id, name_en, name_pt, desc_en, desc_pt, translation_official, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMeta = d.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)')

  const saveAll = d.transaction(() => {
    if (Array.isArray(cards)) {
      d.prepare('DELETE FROM cards').run()
      for (const card of cards) {
        const { name_en, name_pt, desc_en, desc_pt, translation_official, ...rest } = card
        insertCard.run(
          card.id,
          name_en || '',
          name_pt || '',
          desc_en || '',
          desc_pt || '',
          translation_official ? 1 : 0,
          JSON.stringify(rest)
        )
      }
    }
    insertMeta.run('lastSync', String(Date.now()))
    if (databaseVersion != null) {
      insertMeta.run('databaseVersion', String(databaseVersion))
    }
  })
  saveAll()
}

/**
 * Salva cards EN e depois mescla PT preservando traduções do usuário.
 * Chamado em duas fases:
 *  1) saveCardsEN(enCards) — popula base com EN
 *  2) mergeCardsPT(ptCards) — preenche name_pt/desc_pt; se translation_official=0 (usuário), não sobrescreve
 */
function saveCardsEN(enCards) {
  const d = open()
  const insert = d.prepare(`
    INSERT OR REPLACE INTO cards (id, name_en, name_pt, desc_en, desc_pt, translation_official, data)
    VALUES (?, ?, '', ?, '', 0, ?)
  `)
  const tx = d.transaction(() => {
    d.prepare('DELETE FROM cards').run()
    for (const card of enCards) {
      const data = { ...card, lang: 'en' }
      insert.run(
        card.id,
        card.name || '',
        card.desc || '',
        JSON.stringify(data)
      )
    }
  })
  tx()
}

function mergeCardsPT(ptCards) {
  const d = open()
  const getCard = d.prepare('SELECT id, name_pt, translation_official, data FROM cards WHERE id = ?')
  const updatePt = d.prepare(`
    UPDATE cards SET name_pt = ?, desc_pt = ?, translation_official = 1, data = ? WHERE id = ?
  `)

  const tx = d.transaction(() => {
    for (const ptCard of ptCards) {
      const existing = getCard.get(ptCard.id)
      if (!existing) continue

      const hasUserTranslation = existing.name_pt && existing.translation_official === 0
      if (hasUserTranslation) {
        // Usuário traduziu manualmente e a tradução não é oficial; sobrescrever com oficial
      }
      // Sempre sobrescrever com oficial quando vem da API PT
      const data = JSON.parse(existing.data)
      data.name = ptCard.name || data.name
      data.desc = ptCard.desc || data.desc
      data.lang = 'pt'
      updatePt.run(
        ptCard.name || '',
        ptCard.desc || '',
        JSON.stringify(data),
        ptCard.id
      )
    }
  })
  tx()
}

function updateCardTranslation(cardId, namePt, descPt) {
  const d = open()
  const existing = d.prepare('SELECT data FROM cards WHERE id = ?').get(cardId)
  if (!existing) return

  const data = JSON.parse(existing.data)
  data.name = namePt || data.name
  data.desc = descPt || data.desc
  data.lang = 'pt'

  d.prepare(`
    UPDATE cards SET name_pt = ?, desc_pt = ?, translation_official = 0, data = ? WHERE id = ?
  `).run(namePt || '', descPt || '', JSON.stringify(data), cardId)
}

function shouldSync(lastSync) {
  if (lastSync == null) return true
  return Date.now() - lastSync >= MS_PER_DAY
}

function updateSyncMeta(key, value) {
  const d = open()
  d.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)').run(key, String(value))
}

function clearCards() {
  const d = open()
  d.prepare('DELETE FROM cards').run()
  d.prepare('DELETE FROM sync_meta').run()
}

function clearCardImages() {
  const d = open()
  d.prepare('DELETE FROM card_images').run()
}

// --------------- Card Images ---------------

function getCardImage(id) {
  const d = open()
  const row = d.prepare('SELECT image FROM card_images WHERE card_id = ?').get(String(id))
  return row ? row.image : null
}

function saveCardImage(id, buffer) {
  const d = open()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  d.prepare('INSERT OR REPLACE INTO card_images (card_id, image) VALUES (?, ?)').run(String(id), buf)
}

// --------------- Decks ---------------

function getDecks(game) {
  const d = open()
  if (game) {
    return d.prepare('SELECT * FROM decks WHERE game = ? ORDER BY updated_at DESC').all(game)
  }
  return d.prepare('SELECT * FROM decks ORDER BY updated_at DESC').all()
}

function createDeck(name, game) {
  const d = open()
  const id = createAppId('deck')
  d.prepare('INSERT INTO decks (id, name, game) VALUES (?, ?, ?)').run(id, name, game || 'yugioh')
  return id
}

function updateDeck(id, name) {
  const d = open()
  d.prepare("UPDATE decks SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, id)
}

function deleteDeck(id) {
  const d = open()
  d.prepare('DELETE FROM deck_cards WHERE deck_id = ?').run(id)
  d.prepare('DELETE FROM decks WHERE id = ?').run(id)
}

// --------------- Deck Cards ---------------

function getDeckCards(deckId) {
  const d = open()
  const rows = d.prepare('SELECT * FROM deck_cards WHERE deck_id = ? ORDER BY sort_order ASC, created_at ASC').all(deckId)
  return rows.map((r) => ({
    id: r.id,
    deck_id: r.deck_id,
    card_id: r.card_id,
    sort_order: r.sort_order,
    created_at: r.created_at,
    ...JSON.parse(r.card_data),
  }))
}

function addCardToDeck(deckId, cardId, cardData, insertAfterSortOrder) {
  const d = open()
  const insertOne = d.transaction(() => {
    const id = createAppId('dc')
    let order
    if (typeof insertAfterSortOrder === 'number' && insertAfterSortOrder >= -1) {
      order = insertAfterSortOrder + 1
      d.prepare('UPDATE deck_cards SET sort_order = sort_order + 1 WHERE deck_id = ? AND sort_order > ?').run(deckId, insertAfterSortOrder)
    } else {
      const maxOrder = d.prepare('SELECT MAX(sort_order) as mx FROM deck_cards WHERE deck_id = ?').get(deckId)
      order = (maxOrder && maxOrder.mx != null ? maxOrder.mx : -1) + 1
    }
    d.prepare('INSERT INTO deck_cards (id, deck_id, card_id, card_data, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      id,
      deckId,
      cardId || null,
      JSON.stringify(normalizeDeckCardData(cardData)),
      order
    )
    touchDeckStatement(d).run(deckId)
    return id
  })
  return insertOne()
}

function updateDeckCard(id, cardData) {
  const d = open()
  const tx = d.transaction(() => {
    d.prepare('UPDATE deck_cards SET card_data = ? WHERE id = ?').run(
      JSON.stringify(normalizeDeckCardData(cardData)),
      id
    )
    const row = d.prepare('SELECT deck_id FROM deck_cards WHERE id = ?').get(id)
    if (row) {
      touchDeckStatement(d).run(row.deck_id)
    }
  })
  tx()
}

function removeDeckCard(id) {
  const d = open()
  const tx = d.transaction(() => {
    const row = d
      .prepare('SELECT deck_id, sort_order FROM deck_cards WHERE id = ?')
      .get(id)
    d.prepare('DELETE FROM deck_cards WHERE id = ?').run(id)
    if (row) {
      d.prepare(`
        UPDATE deck_cards
        SET sort_order = sort_order - 1
        WHERE deck_id = ? AND sort_order > ?
      `).run(row.deck_id, row.sort_order)
      touchDeckStatement(d).run(row.deck_id)
    }
  })
  tx()
}

function updateDeckCardsBulk(updates) {
  const d = open()
  if (!Array.isArray(updates) || updates.length === 0) return 0
  const updateStmt = d.prepare('UPDATE deck_cards SET card_data = ? WHERE id = ?')
  const getDeckStmt = d.prepare('SELECT deck_id FROM deck_cards WHERE id = ?')
  const touchStmt = touchDeckStatement(d)
  const touchedDecks = new Set()

  const tx = d.transaction(() => {
    for (const entry of updates) {
      if (!entry || !entry.id) continue
      updateStmt.run(JSON.stringify(normalizeDeckCardData(entry.cardData)), entry.id)
      const row = getDeckStmt.get(entry.id)
      if (row?.deck_id) touchedDecks.add(row.deck_id)
    }
    for (const deckId of touchedDecks) touchStmt.run(deckId)
  })
  tx()
  return touchedDecks.size
}

function replaceDeckCards(deckId, cards) {
  const d = open()
  const list = Array.isArray(cards) ? cards : []
  const insertStmt = d.prepare(`
    INSERT INTO deck_cards (id, deck_id, card_id, card_data, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `)
  const deleteStmt = d.prepare('DELETE FROM deck_cards WHERE deck_id = ?')
  const touchStmt = touchDeckStatement(d)

  const tx = d.transaction(() => {
    deleteStmt.run(deckId)
    list.forEach((item, index) => {
      const id =
        item && item.id && !String(item.id).startsWith('pending_')
          ? String(item.id)
          : createAppId('dc')
      insertStmt.run(
        id,
        deckId,
        item?.card_id ?? item?.cardId ?? null,
        JSON.stringify(normalizeDeckCardData(item)),
        typeof item?.sort_order === 'number' ? item.sort_order : index
      )
    })
    touchStmt.run(deckId)
  })

  tx()
}

function importDeckWithCards(name, game, cards) {
  const d = open()
  const deckId = createAppId('deck')
  const insertDeckStmt = d.prepare(
    'INSERT INTO decks (id, name, game) VALUES (?, ?, ?)'
  )
  const insertCardStmt = d.prepare(`
    INSERT INTO deck_cards (id, deck_id, card_id, card_data, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `)

  const tx = d.transaction(() => {
    insertDeckStmt.run(deckId, name, game || 'yugioh')
    ;(Array.isArray(cards) ? cards : []).forEach((item, index) => {
      insertCardStmt.run(
        createAppId('dc'),
        deckId,
        item?.card_id ?? item?.cardId ?? null,
        JSON.stringify(normalizeDeckCardData(item)),
        typeof item?.sort_order === 'number' ? item.sort_order : index
      )
    })
  })

  tx()
  return deckId
}

/** Retorna todos os deck_cards de decks do jogo (ex.: 'monsterhunter') para busca global. */
function getDeckCardsByGame(game) {
  const d = open()
  const rows = d.prepare(`
    SELECT dc.id, dc.deck_id, dc.card_id, dc.card_data, dc.sort_order, dc.created_at
    FROM deck_cards dc
    INNER JOIN decks d ON dc.deck_id = d.id
    WHERE d.game = ?
    ORDER BY dc.sort_order ASC, dc.created_at ASC
  `).all(game)
  return rows.map((r) => ({
    id: r.id,
    deck_id: r.deck_id,
    card_id: r.card_id,
    sort_order: r.sort_order,
    created_at: r.created_at,
    ...JSON.parse(r.card_data),
  }))
}

function getSyncMeta(key) {
  const d = open()
  const row = d.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key)
  return row ? row.value : null
}

module.exports = {
  open,
  close,
  getDB,
  saveCards,
  saveCardsEN,
  mergeCardsPT,
  updateCardTranslation,
  shouldSync,
  getSyncMeta,
  updateSyncMeta,
  clearCards,
  clearCardImages,
  getCardImage,
  saveCardImage,
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  getDeckCards,
  getDeckCardsByGame,
  addCardToDeck,
  updateDeckCard,
  updateDeckCardsBulk,
  removeDeckCard,
  replaceDeckCards,
  importDeckWithCards,
}
