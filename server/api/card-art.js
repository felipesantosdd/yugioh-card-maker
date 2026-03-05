/**
 * Em dev: serve arte do card da pasta static/ygo/pics (WebP).
 * Se o arquivo não existir, baixa da URL da API, converte para WebP e salva.
 * GET /api/card-art/:id?url=<image_url>
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
let sharp
try {
  sharp = require('sharp')
} catch (_) {
  sharp = null
}

const PICS_DIR = path.resolve(__dirname, '../../static/ygo/pics')
const WEBP_QUALITY = 88

function ensurePicsDir() {
  if (!fs.existsSync(PICS_DIR)) {
    fs.mkdirSync(PICS_DIR, { recursive: true })
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, (res) => {
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

module.exports = function (req, res, next) {
  const match = req.url.match(/\/api\/card-art\/(\d+)/) || req.url.match(/^\/(\d+)/)
  if (!match) return next()
  const id = match[1]
  let imageUrl = null
  try {
    const q = req.url.indexOf('?')
    if (q >= 0) {
      const params = new URLSearchParams(req.url.slice(q))
      imageUrl = params.get('url')
    }
  } catch (_) {}
  const filePath = path.join(PICS_DIR, `${id}.webp`)

  ensurePicsDir()

  const serveFile = () => {
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404
      res.end()
      return
    }
    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    fs.createReadStream(filePath).pipe(res)
  }

  if (fs.existsSync(filePath)) {
    serveFile()
    return
  }

  if (!imageUrl) {
    res.statusCode = 400
    res.end('Missing url query parameter')
    return
  }

  fetchUrl(imageUrl)
    .then((buf) => {
      if (sharp) {
        return sharp(buf)
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
          .then((webpBuf) => {
            fs.writeFileSync(filePath, webpBuf)
            res.setHeader('Content-Type', 'image/webp')
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.end(webpBuf)
          })
      }
      fs.writeFileSync(filePath, buf)
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(buf)
    })
    .catch((err) => {
      console.error('[card-art]', err.message)
      res.statusCode = 502
      res.end('Failed to fetch image')
    })
}
