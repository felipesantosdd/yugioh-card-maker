/**
 * Geração de PDF para Silhouette/Cricut — idêntica ao silhouette-card-maker.
 * Algoritmo e marcas de registro replicados do create_pdf.py + page_manager.py.
 */

const path = require('path')
const fs = require('fs')
const jsPDF = require('jspdf').default || require('jspdf')
const sharp = require('sharp')

const PPI_DEFAULT = 300
const CARD_DISTANCE_MM = 1.25
const REG_PADDING_MM = 1.5
const REGISTRATION_THREE = '3'
const REGISTRATION_FOUR = '4'
const IMAGE_X_COMPENSATION_MM = -0.5

function loadLayoutConfig() {
  const p = path.join(__dirname, '../../static/silhouette-layouts.json')
  const raw = fs.readFileSync(p, 'utf8')
  return JSON.parse(raw)
}

/** size_convert.size_to_pixel: "59mm" ou "11in" -> pixels (round). */
function sizeToPixel(sizeStr, ppi) {
  const num = /^(\d+\.?\d*|\.\d+)/.exec(sizeStr)
  if (!num) return 0
  const v = parseFloat(num[1])
  if (sizeStr.endsWith('mm')) return Math.round((v / 25.4) * ppi)
  if (sizeStr.endsWith('in')) return Math.round(v * ppi)
  return Math.round(v)
}

/** size_convert.size_to_mm. */
function sizeToMm(sizeStr) {
  const num = /^(\d+\.?\d*|\.\d+)/.exec(sizeStr)
  if (!num) return 0
  const v = parseFloat(num[1])
  if (sizeStr.endsWith('mm')) return v
  if (sizeStr.endsWith('in')) return v * 25.4
  return v
}

/** page_manager.normalize_page_size: portrait troca width/height. */
function normalizePageSize(orientation, pageWidthPx, pageHeightPx) {
  if (orientation === 'portrait') return [pageHeightPx, pageWidthPx]
  return [pageWidthPx, pageHeightPx]
}

/** page_manager.compute_grid_fit */
function computeGridFit(usable, card, bleed) {
  if (usable <= 0) return 0
  return Math.max(0, Math.floor((usable + bleed) / (card + bleed)))
}

/** page_manager.select_best_margins — idêntico ao Python. */
function selectBestMargins(
  pageWidth,
  pageHeight,
  cardWidth,
  cardHeight,
  bleed,
  inset,
  cornerLen
) {
  const strategies = [
    [inset, inset],
    [inset + cornerLen, inset],
    [inset, inset + cornerLen],
  ]
  let best = null
  let bestCount = 0

  for (const [marginX, marginY] of strategies) {
    const usableWidth = pageWidth - 2 * marginX
    const usableHeight = pageHeight - 2 * marginY
    const cols = computeGridFit(usableWidth, cardWidth, bleed)
    const rows = computeGridFit(usableHeight, cardHeight, bleed)
    if (cols === 0 || rows === 0) continue

    const gridWidth = cols * cardWidth + (cols + 1) * bleed
    const gridHeight = rows * cardHeight + (rows + 1) * bleed
    const gapX = marginX + (usableWidth - gridWidth) / 2 - inset
    const gapY = marginY + (usableHeight - gridHeight) / 2 - inset
    if (gapX < cornerLen && gapY < cornerLen) continue

    const count = cols * rows
    if (count > bestCount) {
      bestCount = count
      best = [cols, rows, marginX, marginY, usableWidth, usableHeight]
    }
  }

  if (!best)
    throw new Error(
      'No valid layout fits without intruding into corner exclusion zones.'
    )
  return best
}

/** page_manager.compute_card_positions — posições em pixels. */
function computeCardPositions(
  cols,
  rows,
  cardWidth,
  cardHeight,
  bleed,
  marginX,
  marginY,
  usableWidth,
  usableHeight
) {
  const gridWidth = cols * cardWidth + (cols + 1) * bleed
  const gridHeight = rows * cardHeight + (rows + 1) * bleed
  const startX = Math.round(marginX + (usableWidth - gridWidth) / 2 + bleed)
  const startY = Math.round(marginY + (usableHeight - gridHeight) / 2 + bleed)
  const xPos = []
  const yPos = []
  for (let i = 0; i < cols; i++) xPos.push(startX + i * (cardWidth + bleed))
  for (let j = 0; j < rows; j++) yPos.push(startY + j * (cardHeight + bleed))
  return { xPos, yPos }
}

/**
 * Gera layout igual ao page_manager.generate_layout.
 * Retorna posições em pixels; convertemos para mm ao desenhar no PDF.
 */
function generateLayout(config, paperSizeKey, cardSizeKey) {
  const ppi = config.ppi || PPI_DEFAULT
  const cardDef = config.card_sizes[cardSizeKey]
  const paperDef = config.paper_sizes[paperSizeKey]
  const layoutDef =
    config.layouts[paperSizeKey] && config.layouts[paperSizeKey][cardSizeKey]
  if (!cardDef || !paperDef || !layoutDef)
    throw new Error(`Layout não encontrado: ${paperSizeKey} + ${cardSizeKey}`)

  const defaultReg = config.defaults.registration
  const effectiveInset =
    (layoutDef.registration && layoutDef.registration.inset) || defaultReg.inset
  const totalExclusionMm = sizeToMm(defaultReg.length) + REG_PADDING_MM

  const paperWidthPx = sizeToPixel(paperDef.width, ppi)
  const paperHeightPx = sizeToPixel(paperDef.height, ppi)
  const cardWidthPx = sizeToPixel(cardDef.width, ppi)
  const cardHeightPx = sizeToPixel(cardDef.height, ppi)
  const bleedPx = sizeToPixel(`${CARD_DISTANCE_MM}mm`, ppi)
  const insetPx = sizeToPixel(effectiveInset, ppi)
  const cornerLenPx = sizeToPixel(`${totalExclusionMm}mm`, ppi)

  const [pageWidthPx, pageHeightPx] = normalizePageSize(
    layoutDef.orientation,
    paperWidthPx,
    paperHeightPx
  )

  const [cols, rows, marginX, marginY, usableW, usableH] = selectBestMargins(
    pageWidthPx,
    pageHeightPx,
    cardWidthPx,
    cardHeightPx,
    bleedPx,
    insetPx,
    cornerLenPx
  )
  const { xPos, yPos } = computeCardPositions(
    cols,
    rows,
    cardWidthPx,
    cardHeightPx,
    bleedPx,
    marginX,
    marginY,
    usableW,
    usableH
  )

  return {
    orientation: layoutDef.orientation,
    pageWidthPx,
    pageHeightPx,
    pageWidthMm: (pageWidthPx / ppi) * 25.4,
    pageHeightMm: (pageHeightPx / ppi) * 25.4,
    cardWidthMm: sizeToMm(cardDef.width),
    cardHeightMm: sizeToMm(cardDef.height),
    /** Espaço (mm) entre os cards no layout; usado para "cards se tocam". */
    bleedMm: CARD_DISTANCE_MM,
    xPosMm: xPos.map((x) => (x / ppi) * 25.4),
    yPosMm: yPos.map((y) => (y / ppi) * 25.4),
    rows,
    cols,
    regInsetMm: sizeToMm(effectiveInset),
    regThicknessMm: sizeToMm(
      (layoutDef.registration && layoutDef.registration.thickness) ||
        defaultReg.thickness
    ),
    regLengthMm: sizeToMm(
      (layoutDef.registration && layoutDef.registration.length) ||
        defaultReg.length
    ),
    registration:
      layoutDef.registration && layoutDef.registration.mark
        ? layoutDef.registration.mark
        : REGISTRATION_THREE,
  }
}

/**
 * Marcas de registro idênticas ao page_manager.generate_reg_mark (Registration THREE ou FOUR).
 * jsPDF: origem no topo-esquerda, y para baixo.
 */
function drawRegistrationMarks(doc, pageWidthMm, pageHeightMm, opts) {
  const inset = opts.insetMm
  const thickness = opts.thicknessMm
  let length = opts.lengthMm
  const reg = opts.registration || REGISTRATION_THREE

  length = Math.max(5, Math.min(20, length))
  const thicknessClamped = Math.max(0.5, Math.min(1, thickness))
  const end = length - thicknessClamped / 2

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(thicknessClamped)

  const drawL = (x0, y0, dx, dy) => {
    doc.line(x0, y0, x0 + end * dx, y0)
    doc.line(x0, y0, x0, y0 + end * dy)
  }

  if (reg === REGISTRATION_THREE) {
    doc.setFillColor(0, 0, 0)
    doc.rect(inset, inset, 5, 5, 'F')
  } else {
    drawL(inset, inset, 1, 1)
  }

  drawL(inset, pageHeightMm - inset, 1, -1)
  drawL(pageWidthMm - inset, inset, -1, 1)
  drawL(pageWidthMm - inset, pageHeightMm - inset, -1, -1)
}

async function renderCardImageForPdf(
  inputBuffer,
  cardWidthMm,
  cardHeightMm,
  ppi,
  bleedMm = 0
) {
  const innerWidthPx = Math.max(1, Math.round((cardWidthMm / 25.4) * ppi))
  const innerHeightPx = Math.max(1, Math.round((cardHeightMm / 25.4) * ppi))
  const finalWidthPx = Math.max(
    innerWidthPx,
    Math.round(((cardWidthMm + bleedMm) / 25.4) * ppi)
  )
  const finalHeightPx = Math.max(
    innerHeightPx,
    Math.round(((cardHeightMm + bleedMm) / 25.4) * ppi)
  )

  const resized = sharp(inputBuffer)
    .resize(innerWidthPx, innerHeightPx, { fit: 'fill' })
    .png()

  if (
    bleedMm <= 0 ||
    finalWidthPx === innerWidthPx ||
    finalHeightPx === innerHeightPx
  ) {
    return resized.toBuffer()
  }

  const innerBuffer = await resized.toBuffer()
  const leftBleedPx = Math.floor((finalWidthPx - innerWidthPx) / 2)
  const rightBleedPx = finalWidthPx - innerWidthPx - leftBleedPx
  const topBleedPx = Math.floor((finalHeightPx - innerHeightPx) / 2)
  const bottomBleedPx = finalHeightPx - innerHeightPx - topBleedPx

  const composites = [
    { input: innerBuffer, left: leftBleedPx, top: topBleedPx },
  ]

  const baseSharp = sharp(innerBuffer)

  if (leftBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({ left: 0, top: 0, width: 1, height: innerHeightPx })
        .resize(leftBleedPx, innerHeightPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: 0,
      top: topBleedPx,
    })
  }

  if (rightBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({
          left: Math.max(0, innerWidthPx - 1),
          top: 0,
          width: 1,
          height: innerHeightPx,
        })
        .resize(rightBleedPx, innerHeightPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: leftBleedPx + innerWidthPx,
      top: topBleedPx,
    })
  }

  if (topBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({ left: 0, top: 0, width: innerWidthPx, height: 1 })
        .resize(innerWidthPx, topBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: leftBleedPx,
      top: 0,
    })
  }

  if (bottomBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({
          left: 0,
          top: Math.max(0, innerHeightPx - 1),
          width: innerWidthPx,
          height: 1,
        })
        .resize(innerWidthPx, bottomBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: leftBleedPx,
      top: topBleedPx + innerHeightPx,
    })
  }

  if (leftBleedPx > 0 && topBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .resize(leftBleedPx, topBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    })
  }

  if (rightBleedPx > 0 && topBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({
          left: Math.max(0, innerWidthPx - 1),
          top: 0,
          width: 1,
          height: 1,
        })
        .resize(rightBleedPx, topBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: leftBleedPx + innerWidthPx,
      top: 0,
    })
  }

  if (leftBleedPx > 0 && bottomBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({
          left: 0,
          top: Math.max(0, innerHeightPx - 1),
          width: 1,
          height: 1,
        })
        .resize(leftBleedPx, bottomBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: 0,
      top: topBleedPx + innerHeightPx,
    })
  }

  if (rightBleedPx > 0 && bottomBleedPx > 0) {
    composites.push({
      input: await baseSharp
        .clone()
        .extract({
          left: Math.max(0, innerWidthPx - 1),
          top: Math.max(0, innerHeightPx - 1),
          width: 1,
          height: 1,
        })
        .resize(rightBleedPx, bottomBleedPx, { fit: 'fill' })
        .png()
        .toBuffer(),
      left: leftBleedPx + innerWidthPx,
      top: topBleedPx + innerHeightPx,
    })
  }

  return sharp({
    create: {
      width: finalWidthPx,
      height: finalHeightPx,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

/** Nome do arquivo template para Silhouette Studio (corte). */
function getTemplateFileName(paperSizeKey, cardSizeKey, version) {
  return `${paperSizeKey}-${cardSizeKey}-v${version}.studio3`
}

/** Carrega imagem de verso da pasta layout MH (ex: time-01-back.png). Retorna base64 ou null. */
function loadMhBackImageBase64(backImageType) {
  if (!backImageType || typeof backImageType !== 'string') return null
  const safe = backImageType.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) return null
  const p = path.join(
    __dirname,
    '../../static/images/pic/mh/layout',
    `${safe}-back.png`
  )
  try {
    return fs.readFileSync(p).toString('base64')
  } catch (_) {
    return null
  }
}

/**
 * Gera PDF e retorna { pdfBase64, templateFileName }.
 * templateFileName é o arquivo .studio3 que deve ser aberto na máquina para o corte.
 * @param {Object} [options]
 *  - options.cardsTouch: se true, desenha os cards invadindo o gap (1,25 mm) para se tocarem e reduzir falha de impressão.
 *  - options.includeImages: se false, não desenha as imagens dos cards, apenas os retângulos de corte (útil para imprimir apenas o gabarito).
 */
async function generateSilhouettePdf(
  images,
  cardSizeKey,
  paperSizeKey,
  options = {}
) {
  const config = loadLayoutConfig()
  const layout = generateLayout(config, paperSizeKey, cardSizeKey)
  const cardsTouch = options.cardsTouch === true
  const includeImages = options.includeImages !== false
  const bleedMm = cardsTouch ? layout.bleedMm || CARD_DISTANCE_MM : 0
  const drawWidthMm = layout.cardWidthMm + bleedMm
  const drawHeightMm = layout.cardHeightMm + bleedMm
  const offsetMm = cardsTouch ? bleedMm / 2 : 0
  const xCompensationMm =
    typeof options.xCompensationMm === 'number'
      ? options.xCompensationMm
      : IMAGE_X_COMPENSATION_MM

  const layoutDef = config.layouts[paperSizeKey][cardSizeKey]
  const templateFileName = getTemplateFileName(
    paperSizeKey,
    cardSizeKey,
    layoutDef.version || 1
  )

  const format = [layout.pageWidthMm, layout.pageHeightMm]
  const orientation = layout.orientation === 'landscape' ? 'l' : 'p'
  const ppi = config.ppi || PPI_DEFAULT

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    hotfixes: ['px_scaling'],
  })

  const cardsPerPage = layout.rows * layout.cols
  let imageIndex = 0
  let pageNumber = 0

  while (imageIndex < images.length) {
    if (pageNumber > 0) doc.addPage(format, orientation)
    drawRegistrationMarks(doc, layout.pageWidthMm, layout.pageHeightMm, {
      insetMm: layout.regInsetMm,
      thicknessMm: layout.regThicknessMm,
      lengthMm: layout.regLengthMm,
      registration: REGISTRATION_THREE,
    })

    const backsForPage = []
    for (let r = 0; r < layout.rows && imageIndex < images.length; r++) {
      for (let c = 0; c < layout.cols && imageIndex < images.length; c++) {
        const item = images[imageIndex]
        const x = layout.xPosMm[c] - offsetMm + xCompensationMm
        const y = layout.yPosMm[r] - offsetMm
        if (includeImages) {
          const base64 = item.base64 || item
          const buffer = Buffer.from(base64, 'base64')
          const resized = await renderCardImageForPdf(
            buffer,
            layout.cardWidthMm,
            layout.cardHeightMm,
            ppi,
            bleedMm
          )
          const dataUrl = `data:image/png;base64,${resized.toString('base64')}`
          doc.addImage(dataUrl, 'PNG', x, y, drawWidthMm, drawHeightMm)
        } else {
          // Apenas retângulo no lugar do card (gabarito sem imagem)
          doc.rect(x, y, drawWidthMm, drawHeightMm)
        }
        let backBase64 = item.backBase64 || null
        if (!backBase64 && item.backImageType)
          backBase64 = loadMhBackImageBase64(item.backImageType)
        backsForPage.push(backBase64)
        imageIndex++
      }
    }

    if (backsForPage.some(Boolean)) {
      doc.addPage(format, orientation)
      drawRegistrationMarks(doc, layout.pageWidthMm, layout.pageHeightMm, {
        insetMm: layout.regInsetMm,
        thicknessMm: layout.regThicknessMm,
        lengthMm: layout.regLengthMm,
        registration: REGISTRATION_THREE,
      })
      // Espelhamento verso: ao virar a folha para imprimir frente e verso (flip na borda longa),
      // o topo do verso era o fundo da frente. Por isso desenhamos as costas com linhas invertidas:
      // posição (r,c) no verso = costas do card que estava em (rows-1-r, c) na frente.
      const rows = layout.rows
      const cols = layout.cols
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Flip duplex na borda longa:
          // - linha espelhada verticalmente (rows-1-r): ao virar a folha pelo topo,
          //   o que era linha 0 da frente vira linha (rows-1) do verso.
          // - coluna espelhada horizontalmente (cols-1-c): ao virar a folha,
          //   esquerda vira direita.
          const slot = (rows - 1 - r) * cols + (cols - 1 - c)
          const backBase64 = backsForPage[slot]

          // Posição física na página (sem rotação de imagem)
          const x = layout.xPosMm[c] - offsetMm + xCompensationMm
          const y = layout.yPosMm[r] - offsetMm

          if (includeImages && backBase64) {
            const buffer = Buffer.from(backBase64, 'base64')
            const resized = await renderCardImageForPdf(
              buffer,
              layout.cardWidthMm,
              layout.cardHeightMm,
              ppi,
              bleedMm
            )
            const dataUrl = `data:image/png;base64,${resized.toString(
              'base64'
            )}`
            doc.addImage(dataUrl, 'PNG', x, y, drawWidthMm, drawHeightMm) // sem rotação!
          } else if (!includeImages) {
            doc.rect(x, y, drawWidthMm, drawHeightMm)
          }
        }
      }
    }
    pageNumber++
  }

  const out = doc.output('arraybuffer')
  const pdfBase64 = Buffer.from(out).toString('base64')
  let templateBase64 = null
  try {
    templateBase64 = getTemplateBuffer(templateFileName).toString('base64')
  } catch (_) {
    // template pode não existir se pasta não tiver sido copiada
  }
  return { pdfBase64, templateFileName, templateBase64 }
}

/** Retorna o buffer do arquivo .studio3 para o template (para incluir no ZIP). */
function getTemplateBuffer(templateFileName) {
  const p = path.join(
    __dirname,
    '../../static/silhouette-templates',
    templateFileName
  )
  return fs.readFileSync(p)
}

/** Lista de tamanhos de card para o dropdown da UI: { key, label, widthMm, heightMm }. */
function getCardSizeOptions() {
  const config = loadLayoutConfig()
  const list = []
  for (const [key, def] of Object.entries(config.card_sizes || {})) {
    const wMm = sizeToMm(def.width)
    const hMm = sizeToMm(def.height)
    const label =
      def.label || `${key} (${Math.round(wMm)}×${Math.round(hMm)} mm)`
    list.push({ key, label, widthMm: wMm, heightMm: hMm })
  }
  return list
}

module.exports = {
  generateSilhouettePdf,
  getTemplateBuffer,
  loadLayoutConfig,
  getCardSizeOptions,
}
