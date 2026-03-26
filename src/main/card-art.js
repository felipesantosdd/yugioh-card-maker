const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const { app } = require('electron')
const { pathToFileURL } = require('url')

let sharp
try {
  sharp = require('sharp')
} catch (_) {
  sharp = null
}

const WEBP_QUALITY = 88

function getPicsDir() {
  return path.join(app.getPath('userData'), 'ygo', 'pics')
}

function ensurePicsDir() {
  const dir = getPicsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'))
      return
    }
    const lib = url.startsWith('https') ? https : http
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, redirectCount + 1).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function getCardArt(id, imageUrl) {
  const dir = ensurePicsDir()
  const filePath = path.join(dir, `${id}.webp`)

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath)
  }

  if (!imageUrl) return null
  if (!/^https?:\/\//i.test(String(imageUrl))) return null

  const buf = await fetchUrl(imageUrl)

  if (sharp) {
    const webpBuf = await sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer()
    fs.writeFileSync(filePath, webpBuf)
    return webpBuf
  }

  fs.writeFileSync(filePath, buf)
  return buf
}

async function ensureCardArtPath(id, imageUrl) {
  const dir = ensurePicsDir()
  const filePath = path.join(dir, `${id}.webp`)

  if (!fs.existsSync(filePath)) {
    await getCardArt(id, imageUrl)
  }

  return fs.existsSync(filePath) ? filePath : null
}

async function getCardArtUrl(id, imageUrl) {
  const filePath = await ensureCardArtPath(id, imageUrl)
  return filePath ? pathToFileURL(filePath).href : null
}

function cardArtExists(id) {
  const dir = ensurePicsDir()
  return fs.existsSync(path.join(dir, `${id}.webp`))
}

module.exports = {
  getCardArt,
  getCardArtUrl,
  ensureCardArtPath,
  cardArtExists,
  ensurePicsDir,
}
