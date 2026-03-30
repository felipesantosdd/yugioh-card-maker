const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SCHEMA_VERSION = 6

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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  return dirPath
}

function getCanonicalStorageDir() {
  return ensureDir(path.join(app.getPath('appData'), 'yugioh-card-maker'))
}

function getLegacyStorageDirs() {
  const dirs = [app.getPath('userData')]
  const unique = []
  for (const dir of dirs) {
    if (dir && !unique.includes(dir)) unique.push(dir)
  }
  return unique
}

function getDbPath() {
  const canonicalPath = path.join(
    getCanonicalStorageDir(),
    'yugioh-card-maker.db'
  )
  if (fs.existsSync(canonicalPath)) return canonicalPath

  for (const dir of getLegacyStorageDirs()) {
    const legacyPath = path.join(dir, 'yugioh-card-maker.db')
    if (fs.existsSync(legacyPath)) return legacyPath
  }

  return canonicalPath
}

function open() {
  if (db) return db
  const Database = require('better-sqlite3')
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')

  const userVersion = db.pragma('user_version', { simple: true })

  // Só apaga e recria tabelas em migrações antigas (ex.: 0 ou 1). De 2 → 3 apenas adicionamos coluna.
  if (userVersion < SCHEMA_VERSION && userVersion < 2) {
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
      name TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL DEFAULT '',
      desc TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_images (
      card_id TEXT PRIMARY KEY,
      image BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_preview_images (
      card_id TEXT PRIMARY KEY,
      image BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_fullart_images (
      card_id TEXT PRIMARY KEY,
      image BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_art_variants (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      style TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT 'image/webp',
      image BLOB NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game TEXT NOT NULL DEFAULT 'yugioh',
      cover_card_id TEXT,
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
    if (userVersion === 2) {
      try {
        db.exec('ALTER TABLE decks ADD COLUMN cover_card_id TEXT')
      } catch (_) {}
    }
    if (userVersion < 4) {
      const cardCols = db.prepare('PRAGMA table_info(cards)').all()
      const hasLegacyCols = cardCols.some((c) => c.name === 'name_en')
      const hasUnifiedCols =
        cardCols.some((c) => c.name === 'name') &&
        cardCols.some((c) => c.name === 'desc')
      if (hasLegacyCols && !hasUnifiedCols) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS cards_new (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            name_en TEXT NOT NULL DEFAULT '',
            desc TEXT NOT NULL DEFAULT '',
            data TEXT NOT NULL
          );
          INSERT INTO cards_new (id, name, name_en, desc, data)
          SELECT
            id,
            COALESCE(NULLIF(name_pt, ''), NULLIF(name_en, ''), ''),
            COALESCE(NULLIF(name_en, ''), NULLIF(name_pt, ''), ''),
            COALESCE(NULLIF(desc_pt, ''), NULLIF(desc_en, ''), ''),
            data
          FROM cards;
          DROP TABLE cards;
          ALTER TABLE cards_new RENAME TO cards;
        `)
      }
    }
    if (userVersion < 5) {
      const cardCols = db.prepare('PRAGMA table_info(cards)').all()
      const hasNameEn = cardCols.some((c) => c.name === 'name_en')
      if (!hasNameEn) {
        db.exec(`ALTER TABLE cards ADD COLUMN name_en TEXT NOT NULL DEFAULT ''`)
      }
      db.exec(`
        UPDATE cards
        SET name_en = COALESCE(
          NULLIF(name_en, ''),
          NULLIF(json_extract(data, '$.name_en'), ''),
          NULLIF(json_extract(data, '$.english_name'), ''),
          ''
        )
      `)
    }
    if (userVersion < 6) {
      const migrateLegacyArtTables = db.transaction(() => {
        const hasVariantForCardAndStyle = db.prepare(
          'SELECT 1 FROM card_art_variants WHERE card_id = ? AND style = ? LIMIT 1'
        )
        const insertVariant = db.prepare(`
          INSERT INTO card_art_variants
            (id, card_id, style, label, mime_type, image, sort_order, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const legacyNormalRows = db
          .prepare('SELECT card_id, image FROM card_images')
          .all()
        for (const row of legacyNormalRows) {
          const cardId = String(row.card_id)
          const exists = hasVariantForCardAndStyle.get(cardId, 'normal')
          if (exists) continue
          insertVariant.run(
            `legacy_normal_${cardId}`,
            cardId,
            'normal',
            'Arte principal',
            'image/webp',
            row.image,
            0,
            1
          )
        }

        const legacyFullArtRows = db
          .prepare('SELECT card_id, image FROM card_fullart_images')
          .all()
        for (const row of legacyFullArtRows) {
          const cardId = String(row.card_id)
          const exists = hasVariantForCardAndStyle.get(cardId, 'fullart')
          if (exists) continue
          insertVariant.run(
            `legacy_fullart_${cardId}`,
            cardId,
            'fullart',
            'Full Art principal',
            'image/png',
            row.image,
            0,
            1
          )
        }
      })

      migrateLegacyArtTables()
    }
    db.pragma(`user_version = ${SCHEMA_VERSION}`)
  }

  // Garantir coluna cover_card_id em decks (reparo se migração 2→3 não rodou ou falhou)
  if (db.pragma('user_version', { simple: true }) >= 3) {
    const deckCols = db.prepare('PRAGMA table_info(decks)').all()
    const hasCover = deckCols.some((c) => c.name === 'cover_card_id')
    if (!hasCover) {
      try {
        db.exec('ALTER TABLE decks ADD COLUMN cover_card_id TEXT')
      } catch (_) {}
    }
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
  const rows = d.prepare('SELECT id, name, name_en, desc, data FROM cards').all()
  const cards = rows.map((r) => {
    const parsed = JSON.parse(r.data)
    return {
      ...parsed,
      id: r.id,
      name: r.name,
      name_en: r.name_en || parsed.name_en || '',
      desc: r.desc,
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
    INSERT OR REPLACE INTO cards (id, name, name_en, desc, data)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertMeta = d.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)')

  const saveAll = d.transaction(() => {
    if (Array.isArray(cards)) {
      d.prepare('DELETE FROM cards').run()
      for (const card of cards) {
        const { name, name_en, desc, ...rest } = card
        insertCard.run(
          card.id,
          name || '',
          name_en || '',
          desc || '',
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
 * Salva cards EN e depois mescla PT, sempre mantendo no campo unificado
 * a melhor versão disponível do texto.
 * Chamado em duas fases:
 *  1) saveCardsEN(enCards) — popula base com EN
 *  2) mergeCardsPT(ptCards) — substitui name/desc por PT quando disponível
 */
function saveCardsEN(enCards) {
  const d = open()
  const insert = d.prepare(`
    INSERT OR REPLACE INTO cards (id, name, name_en, desc, data)
    VALUES (?, ?, ?, ?, ?)
  `)
  const tx = d.transaction(() => {
    d.prepare('DELETE FROM cards').run()
    for (const card of enCards) {
      const data = { ...card, name_en: card.name || '', lang: 'en' }
      insert.run(
        card.id,
        card.name || '',
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
  const getCard = d.prepare('SELECT id, name_en, data FROM cards WHERE id = ?')
  const updatePt = d.prepare(`
    UPDATE cards SET name = ?, name_en = ?, desc = ?, data = ? WHERE id = ?
  `)

  const tx = d.transaction(() => {
    for (const ptCard of ptCards) {
      const existing = getCard.get(ptCard.id)
      if (!existing) continue
      const data = JSON.parse(existing.data)
      data.name_en =
        data.name_en || existing.name_en || data.english_name || data.name || ''
      data.name = ptCard.name || data.name
      data.desc = ptCard.desc || data.desc
      data.lang = 'pt'
      if (ptCard.pend_desc != null) data.pend_desc_pt = ptCard.pend_desc
      if (ptCard.monster_desc != null) data.monster_desc_pt = ptCard.monster_desc
      updatePt.run(
        ptCard.name || '',
        existing.name_en || data.name_en || '',
        ptCard.desc || '',
        JSON.stringify(data),
        ptCard.id
      )
    }
  })
  tx()
}

function backfillCardEnglishNames(enCards) {
  const d = open()
  const updateStmt = d.prepare(`
    UPDATE cards
    SET name_en = ?, data = ?
    WHERE id = ?
  `)
  const getStmt = d.prepare('SELECT data FROM cards WHERE id = ?')
  const tx = d.transaction(() => {
    for (const card of enCards || []) {
      if (!card || card.id == null) continue
      const existing = getStmt.get(card.id)
      if (!existing) continue
      const data = JSON.parse(existing.data || '{}')
      data.name_en = card.name || data.name_en || ''
      updateStmt.run(card.name || '', JSON.stringify(data), card.id)
    }
  })
  tx()
}

function updateCardBase(cardId, payload) {
  const d = open()
  const existing = d
    .prepare('SELECT id, name, name_en, desc, data FROM cards WHERE id = ?')
    .get(cardId)
  if (!existing) return false

  const existingData = JSON.parse(existing.data || '{}')
  const nextDataObject =
    payload && payload.data != null
      ? { ...existingData, ...payload.data }
      : existingData
  const nextNameValue =
    payload && Object.prototype.hasOwnProperty.call(payload, 'name')
      ? payload.name || ''
      : existing.name || ''
  const nextNameEnValue =
    payload && Object.prototype.hasOwnProperty.call(payload, 'name_en')
      ? payload.name_en || ''
      : existing.name_en || ''
  const nextDescValue =
    payload && Object.prototype.hasOwnProperty.call(payload, 'desc')
      ? payload.desc || ''
      : existing.desc || ''

  nextDataObject.name = nextNameValue
  nextDataObject.name_en = nextNameEnValue
  nextDataObject.desc = nextDescValue
  if (!nextDataObject.lang) {
    nextDataObject.lang = (payload && payload.lang) || 'pt'
  }
  const nextData = JSON.stringify(nextDataObject)

  d.prepare(`
    UPDATE cards
    SET name = ?, name_en = ?, desc = ?, data = ?
    WHERE id = ?
  `).run(
    nextNameValue,
    nextNameEnValue,
    nextDescValue,
    nextData,
    cardId
  )

  return true
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
  d.prepare("DELETE FROM card_art_variants WHERE style = 'normal'").run()
}

// --------------- Card Images ---------------

function listCardArtVariants(cardId, style = 'normal') {
  const d = open()
  return d
    .prepare(
      `
      SELECT id, card_id, style, label, mime_type, sort_order, is_default, created_at
      FROM card_art_variants
      WHERE card_id = ? AND style = ?
      ORDER BY is_default DESC, sort_order ASC, created_at ASC
    `
    )
    .all(String(cardId), String(style))
    .map((row) => ({
      id: row.id,
      card_id: row.card_id,
      style: row.style,
      label: row.label,
      mime_type: row.mime_type || 'image/webp',
      sort_order: row.sort_order,
      is_default: !!row.is_default,
      created_at: row.created_at,
    }))
}

function getCardArtVariantImage(variantId) {
  const d = open()
  const row = d
    .prepare('SELECT image FROM card_art_variants WHERE id = ?')
    .get(String(variantId))
  return row ? row.image : null
}

function getDefaultCardArtVariant(cardId, style = 'normal') {
  const d = open()
  const row = d
    .prepare(
      `
      SELECT id, card_id, style, label, mime_type, sort_order, is_default, created_at, image
      FROM card_art_variants
      WHERE card_id = ? AND style = ?
      ORDER BY is_default DESC, sort_order ASC, created_at ASC
      LIMIT 1
    `
    )
    .get(String(cardId), String(style))
  if (!row) return null
  return {
    id: row.id,
    card_id: row.card_id,
    style: row.style,
    label: row.label,
    mime_type: row.mime_type || 'image/webp',
    sort_order: row.sort_order,
    is_default: !!row.is_default,
    created_at: row.created_at,
    image: row.image,
  }
}

function saveCardArtVariant(cardId, style, buffer, options = {}) {
  const d = open()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const normalizedCardId = String(cardId)
  const normalizedStyle = String(style || 'normal')
  const label =
    typeof options.label === 'string' && options.label.trim()
      ? options.label.trim()
      : normalizedStyle === 'fullart'
      ? 'Full Art'
      : 'Arte alternativa'
  const mimeType =
    typeof options.mimeType === 'string' && options.mimeType.trim()
      ? options.mimeType.trim()
      : normalizedStyle === 'fullart'
      ? 'image/png'
      : 'image/webp'
  const setAsDefault = options.setAsDefault !== false
  const tx = d.transaction(() => {
    const currentMax = d
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) AS mx FROM card_art_variants WHERE card_id = ? AND style = ?'
      )
      .get(normalizedCardId, normalizedStyle)
    const nextOrder = Number(currentMax?.mx ?? -1) + 1
    const id = createAppId('art')
    if (setAsDefault) {
      d.prepare(
        'UPDATE card_art_variants SET is_default = 0 WHERE card_id = ? AND style = ?'
      ).run(normalizedCardId, normalizedStyle)
    }
    d.prepare(
      `
      INSERT INTO card_art_variants
        (id, card_id, style, label, mime_type, image, sort_order, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      normalizedCardId,
      normalizedStyle,
      label,
      mimeType,
      buf,
      nextOrder,
      setAsDefault ? 1 : 0
    )
    return id
  })
  return tx()
}

function updateCardArtVariant(variantId, buffer, options = {}) {
  const d = open()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const existing = d
    .prepare('SELECT id FROM card_art_variants WHERE id = ?')
    .get(String(variantId))
  if (!existing) return false
  const mimeType =
    typeof options.mimeType === 'string' && options.mimeType.trim()
      ? options.mimeType.trim()
      : null
  const label =
    typeof options.label === 'string' && options.label.trim()
      ? options.label.trim()
      : null
  if (mimeType && label) {
    d.prepare(
      'UPDATE card_art_variants SET image = ?, mime_type = ?, label = ? WHERE id = ?'
    ).run(buf, mimeType, label, String(variantId))
  } else if (mimeType) {
    d.prepare(
      'UPDATE card_art_variants SET image = ?, mime_type = ? WHERE id = ?'
    ).run(buf, mimeType, String(variantId))
  } else if (label) {
    d.prepare(
      'UPDATE card_art_variants SET image = ?, label = ? WHERE id = ?'
    ).run(buf, label, String(variantId))
  } else {
    d.prepare('UPDATE card_art_variants SET image = ? WHERE id = ?').run(
      buf,
      String(variantId)
    )
  }
  return true
}

function setDefaultCardArtVariant(cardId, style, variantId) {
  const d = open()
  const normalizedCardId = String(cardId)
  const normalizedStyle = String(style || 'normal')
  const normalizedVariantId = String(variantId)
  const tx = d.transaction(() => {
    d.prepare(
      'UPDATE card_art_variants SET is_default = 0 WHERE card_id = ? AND style = ?'
    ).run(normalizedCardId, normalizedStyle)
    d.prepare(
      'UPDATE card_art_variants SET is_default = 1 WHERE id = ? AND card_id = ? AND style = ?'
    ).run(normalizedVariantId, normalizedCardId, normalizedStyle)
  })
  tx()
}

function deleteCardArtVariant(cardId, style, variantId) {
  const d = open()
  const normalizedCardId = String(cardId)
  const normalizedStyle = String(style || 'normal')
  const normalizedVariantId = String(variantId)
  const tx = d.transaction(() => {
    const target = d
      .prepare(
        'SELECT id, is_default FROM card_art_variants WHERE id = ? AND card_id = ? AND style = ?'
      )
      .get(normalizedVariantId, normalizedCardId, normalizedStyle)
    if (!target) return false
    d.prepare('DELETE FROM card_art_variants WHERE id = ?').run(normalizedVariantId)
    if (target.is_default) {
      const fallback = d
        .prepare(
          `
          SELECT id
          FROM card_art_variants
          WHERE card_id = ? AND style = ?
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        `
        )
        .get(normalizedCardId, normalizedStyle)
      if (fallback?.id) {
        d.prepare('UPDATE card_art_variants SET is_default = 1 WHERE id = ?').run(
          fallback.id
        )
      }
    }
    return true
  })
  return tx()
}

function getCardImage(id) {
  const variant = getDefaultCardArtVariant(id, 'normal')
  if (variant?.image) return variant.image
  const d = open()
  const row = d
    .prepare('SELECT image FROM card_images WHERE card_id = ?')
    .get(String(id))
  return row ? row.image : null
}

function saveCardImage(id, buffer) {
  const d = open()
  const existingDefault = getDefaultCardArtVariant(id, 'normal')
  if (existingDefault?.id) {
    updateCardArtVariant(existingDefault.id, buffer, { mimeType: 'image/webp' })
  } else {
    saveCardArtVariant(id, 'normal', buffer, {
      label: 'Arte principal',
      mimeType: 'image/webp',
      setAsDefault: true,
    })
  }
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  d.prepare('INSERT OR REPLACE INTO card_images (card_id, image) VALUES (?, ?)').run(
    String(id),
    buf
  )
}

function getCardPreviewImage(id) {
  const d = open()
  const row = d
    .prepare('SELECT image FROM card_preview_images WHERE card_id = ?')
    .get(String(id))
  return row ? row.image : null
}

function saveCardPreviewImage(id, buffer) {
  const d = open()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  d.prepare(
    'INSERT OR REPLACE INTO card_preview_images (card_id, image) VALUES (?, ?)'
  ).run(String(id), buf)
}

function hasCardPreviewImage(id) {
  const d = open()
  const row = d
    .prepare('SELECT 1 FROM card_preview_images WHERE card_id = ?')
    .get(String(id))
  return !!row
}

function hasCardImage(id) {
  if (getDefaultCardArtVariant(id, 'normal')) return true
  const d = open()
  const row = d
    .prepare('SELECT 1 FROM card_images WHERE card_id = ?')
    .get(String(id))
  return !!row
}

function getCardFullArtImage(id) {
  const variant = getDefaultCardArtVariant(id, 'fullart')
  if (variant?.image) return variant.image
  const d = open()
  const row = d
    .prepare('SELECT image FROM card_fullart_images WHERE card_id = ?')
    .get(String(id))
  return row ? row.image : null
}

function saveCardFullArtImage(id, buffer) {
  const d = open()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const existingDefault = getDefaultCardArtVariant(id, 'fullart')
  if (existingDefault?.id) {
    updateCardArtVariant(existingDefault.id, buffer, { mimeType: 'image/png' })
  } else {
    saveCardArtVariant(id, 'fullart', buffer, {
      label: 'Full Art principal',
      mimeType: 'image/png',
      setAsDefault: true,
    })
  }
  d.prepare(
    'INSERT OR REPLACE INTO card_fullart_images (card_id, image) VALUES (?, ?)'
  ).run(String(id), buf)
}

function hasCardFullArt(id) {
  if (getDefaultCardArtVariant(id, 'fullart')) return true
  const d = open()
  const row = d
    .prepare('SELECT 1 FROM card_fullart_images WHERE card_id = ?')
    .get(String(id))
  return !!row
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

function updateDeckCover(deckId, coverCardId) {
  const d = open()
  d.prepare("UPDATE decks SET cover_card_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    coverCardId || null,
    deckId
  )
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
  backfillCardEnglishNames,
  updateCardBase,
  shouldSync,
  getSyncMeta,
  updateSyncMeta,
  clearCards,
  clearCardImages,
  listCardArtVariants,
  getCardArtVariantImage,
  saveCardArtVariant,
  updateCardArtVariant,
  setDefaultCardArtVariant,
  deleteCardArtVariant,
  getCardImage,
  saveCardImage,
  getCardPreviewImage,
  saveCardPreviewImage,
  hasCardPreviewImage,
  hasCardImage,
  getCardFullArtImage,
  saveCardFullArtImage,
  hasCardFullArt,
  getDecks,
  createDeck,
  updateDeck,
  updateDeckCover,
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
