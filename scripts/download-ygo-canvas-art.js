const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const sharp = require('sharp')

const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const OUTPUT_DIR = path.resolve(__dirname, '../static/ygo/pics')
const FAILED_IDS_PATH = path.resolve(
  __dirname,
  '../static/ygo/failed-canvas-art.json'
)
const WEBP_QUALITY = 88
const DEFAULT_CONCURRENCY = 8
const DEFAULT_BATCH_SIZE = 500
const REQUEST_TIMEOUT_MS = 30000

function parseArgs(argv) {
  const options = {
    force: false,
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
    batchSize: DEFAULT_BATCH_SIZE,
  }

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length)) || null
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency =
        Number(arg.slice('--concurrency='.length)) || DEFAULT_CONCURRENCY
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize =
        Number(arg.slice('--batch-size='.length)) || DEFAULT_BATCH_SIZE
    }
  }

  return options
}

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

function writeFailedIdsFile(failedIds) {
  const sorted = [...new Set(failedIds)].sort((a, b) => Number(a) - Number(b))
  fs.writeFileSync(FAILED_IDS_PATH, JSON.stringify(sorted, null, 2) + '\n')
}

function fetchBuffer(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'))
      return
    }

    const client = url.startsWith('https://') ? https : http
    const req = client.get(url, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        fetchBuffer(res.headers.location, redirectCount + 1).then(
          resolve,
          reject
        )
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }

      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout after ${REQUEST_TIMEOUT_MS}ms`))
    })

    req.on('error', reject)
  })
}

async function fetchJson(url) {
  const buffer = await fetchBuffer(url)
  return JSON.parse(buffer.toString('utf8'))
}

function getCardImageUrl(card) {
  const image =
    card && Array.isArray(card.card_images) ? card.card_images[0] : null
  if (!image) return null
  return image.image_url_cropped || image.image_url || null
}

function getWebpPath(cardId) {
  return path.join(OUTPUT_DIR, `${cardId}.webp`)
}

function getExistingRasterPath(cardId) {
  const candidates = ['jpg', 'jpeg', 'png']
  for (const ext of candidates) {
    const filePath = path.join(OUTPUT_DIR, `${cardId}.${ext}`)
    if (fs.existsSync(filePath)) return filePath
  }
  return null
}

async function convertFileToWebp(inputPath, outputPath) {
  await sharp(inputPath).webp({ quality: WEBP_QUALITY }).toFile(outputPath)
}

async function convertBufferToWebp(buffer, outputPath) {
  await sharp(buffer).webp({ quality: WEBP_QUALITY }).toFile(outputPath)
}

async function processCard(card, options, counters) {
  const cardId = String(card.id)
  const outputPath = getWebpPath(cardId)

  if (!options.force && fs.existsSync(outputPath)) {
    counters.skipped += 1
    return
  }

  const existingRaster = getExistingRasterPath(cardId)
  if (existingRaster) {
    await convertFileToWebp(existingRaster, outputPath)
    counters.converted += 1
    return
  }

  const imageUrl = getCardImageUrl(card)
  if (!imageUrl) {
    counters.missing += 1
    return
  }

  const buffer = await fetchBuffer(imageUrl)
  await convertBufferToWebp(buffer, outputPath)
  counters.downloaded += 1
}

async function runPool(items, concurrency, worker) {
  let index = 0

  async function next() {
    const currentIndex = index
    index += 1
    if (currentIndex >= items.length) return
    await worker(items[currentIndex], currentIndex)
    await next()
  }

  const count = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: count }, () => next()))
}

function chunkArray(items, chunkSize) {
  const chunks = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  ensureOutputDir()

  console.log('Buscando lista de cartas no YGOPRODeck...')
  const response = await fetchJson(API_URL)
  const cards = Array.isArray(response.data) ? response.data : []
  const list = options.limit ? cards.slice(0, options.limit) : cards
  const batches = chunkArray(list, options.batchSize)

  console.log(`Total de cartas para verificar: ${list.length}`)
  console.log(`Lotes: ${batches.length} de ate ${options.batchSize} cartas`)
  console.log(`Pasta de saida: ${OUTPUT_DIR}`)

  const counters = {
    skipped: 0,
    converted: 0,
    downloaded: 0,
    missing: 0,
    failed: 0,
  }
  const failedIds = []

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const start = batchIndex * options.batchSize
    const end = start + batch.length

    console.log(
      `Iniciando lote ${batchIndex + 1}/${batches.length} | cartas ${
        start + 1
      }-${end}`
    )

    await runPool(batch, options.concurrency, async (card, batchItemIndex) => {
      const currentIndex = start + batchItemIndex
      try {
        await processCard(card, options, counters)
        if (
          (batchItemIndex + 1) % 100 === 0 ||
          batchItemIndex + 1 === batch.length
        ) {
          console.log(
            `[${currentIndex + 1}/${list.length}] lote ${
              batchIndex + 1
            }/${batches.length} | skipped=${counters.skipped} converted=${counters.converted} downloaded=${counters.downloaded} missing=${counters.missing} failed=${counters.failed}`
          )
        }
      } catch (error) {
        counters.failed += 1
        if (
          error &&
          typeof error.message === 'string' &&
          error.message.includes('HTTP 404')
        ) {
          failedIds.push(String(card.id))
        }
        console.error(
          `[${currentIndex + 1}/${list.length}] falha no card ${card.id}: ${error.message}`
        )
      }
    })
  }

  writeFailedIdsFile(failedIds)
  console.log('Concluido.')
  console.log(JSON.stringify(counters, null, 2))
  console.log(`IDs com 404 salvos em: ${FAILED_IDS_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
