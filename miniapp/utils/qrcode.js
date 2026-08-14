// utils/qrcode.js — 签到二维码载荷 + 轻量 canvas 绘码（QR v1–6, ECC M, byte mode）

const PAYLOAD_TYPE = 'activity_checkin'

const EXP = new Array(512)
const LOG = new Array(256)
;(function initGf() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

function gfMul(a, b) {
  if (!a || !b) return 0
  return EXP[LOG[a] + LOG[b]]
}

function rsGenerator(ecLen) {
  let poly = [1]
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i])
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen)
  const msg = data.concat(new Array(ecLen).fill(0))
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (!coef) continue
    for (let j = 0; j < gen.length; j++) {
      msg[i + j] ^= gfMul(gen[j], coef)
    }
  }
  return msg.slice(data.length)
}

// ECC-M: size, data codewords, ecc per block, block count, alignment centers, remainder bits
const VERSIONS = [
  null,
  { size: 21, dataCw: 16, ec: 10, blocks: 1, align: [], rem: 0 },
  { size: 25, dataCw: 28, ec: 16, blocks: 1, align: [6, 18], rem: 7 },
  { size: 29, dataCw: 44, ec: 26, blocks: 1, align: [6, 22], rem: 7 },
  { size: 33, dataCw: 64, ec: 18, blocks: 2, align: [6, 26], rem: 7 },
  { size: 37, dataCw: 86, ec: 24, blocks: 2, align: [6, 30], rem: 7 },
  { size: 41, dataCw: 108, ec: 16, blocks: 4, align: [6, 34], rem: 7 },
]

function buildCheckInQrPayload(checkInCode) {
  return JSON.stringify({ t: PAYLOAD_TYPE, c: String(checkInCode == null ? '' : checkInCode) })
}

function toBytes(text) {
  const bytes = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 128) {
      bytes.push(code)
    } else {
      const encoded = unescape(encodeURIComponent(text.charAt(i)))
      for (let j = 0; j < encoded.length; j++) bytes.push(encoded.charCodeAt(j))
    }
  }
  return bytes
}

function chooseVersion(byteLen) {
  const neededBits = 4 + 8 + byteLen * 8 + 4
  for (let v = 1; v <= 6; v++) {
    if (VERSIONS[v].dataCw * 8 >= neededBits) return v
  }
  throw new Error('QR payload too long')
}

function buildDataBits(text, version) {
  const spec = VERSIONS[version]
  const bytes = toBytes(text)
  const bits = []
  function put(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  put(0x4, 4)
  put(bytes.length, 8)
  for (let i = 0; i < bytes.length; i++) put(bytes[i], 8)
  const capacity = spec.dataCw * 8
  const term = Math.min(4, capacity - bits.length)
  put(0, term)
  while (bits.length % 8) bits.push(0)
  const padBytes = [0xec, 0x11]
  let pad = 0
  while (bits.length < capacity) {
    put(padBytes[pad % 2], 8)
    pad++
  }
  const data = []
  for (let i = 0; i < spec.dataCw; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]
    data.push(b)
  }
  return data
}

function interleave(data, spec) {
  const blockDataLen = spec.dataCw / spec.blocks
  const blocks = []
  for (let i = 0; i < spec.blocks; i++) {
    const slice = data.slice(i * blockDataLen, (i + 1) * blockDataLen)
    blocks.push({ data: slice, ecc: rsEncode(slice, spec.ec) })
  }
  const out = []
  for (let i = 0; i < blockDataLen; i++) {
    for (let b = 0; b < spec.blocks; b++) out.push(blocks[b].data[i])
  }
  for (let i = 0; i < spec.ec; i++) {
    for (let b = 0; b < spec.blocks; b++) out.push(blocks[b].ecc[i])
  }
  const bits = []
  for (let i = 0; i < out.length; i++) {
    for (let j = 7; j >= 0; j--) bits.push((out[i] >>> j) & 1)
  }
  for (let i = 0; i < spec.rem; i++) bits.push(0)
  return bits
}

function makeGrid(n, fill) {
  const g = new Array(n)
  for (let r = 0; r < n; r++) {
    g[r] = new Array(n)
    for (let c = 0; c < n; c++) g[r][c] = fill
  }
  return g
}

function placeFinder(matrix, func, r0, c0) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = r0 + r
      const cc = c0 + c
      if (rr < 0 || cc < 0 || rr >= matrix.length || cc >= matrix.length) continue
      const inPat = r >= 0 && r <= 6 && c >= 0 && c <= 6
      const dark = inPat && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
      matrix[rr][cc] = dark ? 1 : 0
      func[rr][cc] = 1
    }
  }
}

function placeAlignment(matrix, func, cr, cc) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)
      matrix[cr + r][cc + c] = dark ? 1 : 0
      func[cr + r][cc + c] = 1
    }
  }
}

function overlapsFinder(cr, cc, size) {
  const finders = [[3, 3], [3, size - 4], [size - 4, 3]]
  for (let i = 0; i < finders.length; i++) {
    if (Math.abs(cr - finders[i][0]) < 8 && Math.abs(cc - finders[i][1]) < 8) return true
  }
  return false
}

function reserveFormat(func) {
  const n = func.length
  for (let i = 0; i <= 8; i++) {
    func[8][i] = 1
    func[i][8] = 1
  }
  for (let i = 0; i < 8; i++) {
    func[n - 1 - i][8] = 1
    func[8][n - 1 - i] = 1
  }
}

function placeFunction(matrix, func, spec) {
  const n = spec.size
  placeFinder(matrix, func, 0, 0)
  placeFinder(matrix, func, 0, n - 7)
  placeFinder(matrix, func, n - 7, 0)
  for (let i = 0; i < spec.align.length; i++) {
    for (let j = 0; j < spec.align.length; j++) {
      const r = spec.align[i]
      const c = spec.align[j]
      if (overlapsFinder(r, c, n)) continue
      placeAlignment(matrix, func, r, c)
    }
  }
  for (let i = 8; i < n - 8; i++) {
    const dark = i % 2 === 0 ? 1 : 0
    matrix[6][i] = dark
    matrix[i][6] = dark
    func[6][i] = 1
    func[i][6] = 1
  }
  matrix[n - 8][8] = 1
  func[n - 8][8] = 1
  reserveFormat(func)
}

function placeData(matrix, func, bits) {
  const n = matrix.length
  let idx = 0
  let up = true
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let i = 0; i < n; i++) {
      const row = up ? n - 1 - i : i
      for (let k = 0; k < 2; k++) {
        const c = col - k
        if (func[row][c]) continue
        matrix[row][c] = idx < bits.length ? bits[idx] : 0
        idx++
      }
    }
    up = !up
  }
}

function maskBit(mask, r, c) {
  switch (mask) {
    case 0: return ((r + c) % 2) === 0
    case 1: return (r % 2) === 0
    case 2: return (c % 3) === 0
    case 3: return ((r + c) % 3) === 0
    case 4: return ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0
    case 5: return (((r * c) % 2) + ((r * c) % 3)) === 0
    case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0
    case 7: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0
    default: return false
  }
}

function applyMask(matrix, func, mask) {
  const n = matrix.length
  const out = makeGrid(n, 0)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const bit = matrix[r][c] ? 1 : 0
      out[r][c] = (!func[r][c] && maskBit(mask, r, c)) ? (bit ^ 1) : bit
    }
  }
  return out
}

function formatBits(mask) {
  const data = mask & 7
  let rem = data
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  }
  return ((data << 10) | rem) ^ 0x5412
}

function writeFormat(matrix, bits) {
  const n = matrix.length
  function bit(i) {
    return (bits >>> i) & 1
  }
  for (let i = 0; i <= 5; i++) matrix[8][i] = bit(i)
  matrix[8][7] = bit(6)
  matrix[8][8] = bit(7)
  matrix[7][8] = bit(8)
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = bit(i)
  for (let i = 0; i < 8; i++) matrix[n - 1 - i][8] = bit(i)
  for (let i = 8; i < 15; i++) matrix[8][n - 15 + i] = bit(i)
}

function runPenalty(row) {
  let score = 0
  let run = 1
  for (let i = 1; i <= row.length; i++) {
    if (i < row.length && row[i] === row[i - 1]) {
      run++
    } else {
      if (run >= 5) score += 3 + (run - 5)
      run = 1
    }
  }
  return score
}

function penalty(matrix) {
  const n = matrix.length
  let score = 0
  for (let r = 0; r < n; r++) score += runPenalty(matrix[r])
  for (let c = 0; c < n; c++) {
    const col = new Array(n)
    for (let r = 0; r < n; r++) col[r] = matrix[r][c]
    score += runPenalty(col)
  }
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = matrix[r][c]
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3
    }
  }
  const finder = [1, 0, 1, 1, 1, 0, 1]
  function hasFinder(line, i) {
    for (let k = 0; k < 7; k++) if (line[i + k] !== finder[k]) return false
    return true
  }
  function finderScore(line) {
    let s = 0
    for (let i = 0; i <= line.length - 7; i++) {
      if (!hasFinder(line, i)) continue
      const left = i >= 4 && line[i - 4] === 0 && line[i - 3] === 0 && line[i - 2] === 0 && line[i - 1] === 0
      const right = i + 11 <= line.length && line[i + 7] === 0 && line[i + 8] === 0 && line[i + 9] === 0 && line[i + 10] === 0
      if (left || right) s += 40
    }
    return s
  }
  for (let r = 0; r < n; r++) score += finderScore(matrix[r])
  for (let c = 0; c < n; c++) {
    const col = new Array(n)
    for (let r = 0; r < n; r++) col[r] = matrix[r][c]
    score += finderScore(col)
  }
  let dark = 0
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (matrix[r][c]) dark++
  }
  const pct = (dark * 100) / (n * n)
  score += Math.abs(pct - 50) / 5 * 10
  return score
}

function cloneGrid(grid) {
  const n = grid.length
  const out = makeGrid(n, 0)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) out[r][c] = grid[r][c]
  }
  return out
}

function encodeMatrix(text) {
  const version = chooseVersion(toBytes(text).length)
  const spec = VERSIONS[version]
  const data = buildDataBits(text, version)
  const bits = interleave(data, spec)
  const matrix = makeGrid(spec.size, 0)
  const func = makeGrid(spec.size, 0)
  placeFunction(matrix, func, spec)
  placeData(matrix, func, bits)
  let best = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(matrix, func, mask)
    writeFormat(masked, formatBits(mask))
    const score = penalty(masked)
    if (score < bestScore) {
      bestScore = score
      best = masked
    }
  }
  return best
}

function setFill(ctx, color) {
  if (typeof ctx.setFillStyle === 'function') ctx.setFillStyle(color)
  else ctx.fillStyle = color
}

function drawQrcode(ctx, text, options) {
  const size = (options && options.size) || 200
  const matrix = encodeMatrix(text)
  const n = matrix.length
  const quiet = 4
  const total = n + quiet * 2
  setFill(ctx, '#ffffff')
  ctx.fillRect(0, 0, size, size)
  setFill(ctx, '#000000')
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix[r][c]) continue
      const x0 = Math.round(((c + quiet) * size) / total)
      const y0 = Math.round(((r + quiet) * size) / total)
      const x1 = Math.round(((c + quiet + 1) * size) / total)
      const y1 = Math.round(((r + quiet + 1) * size) / total)
      ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0))
    }
  }
  if (typeof ctx.draw === 'function') ctx.draw()
}

module.exports = {
  buildCheckInQrPayload,
  encodeMatrix,
  drawQrcode,
}
