const assert = require('assert')
const qr = require('./qrcode.js')

const payload = qr.buildCheckInQrPayload('abc123def')
assert.strictEqual(payload, '{"t":"activity_checkin","c":"abc123def"}')

const longCode = '0123456789abcdef0123456789abcdef'
const longPayload = qr.buildCheckInQrPayload(longCode)
assert.strictEqual(
  longPayload,
  JSON.stringify({ t: 'activity_checkin', c: longCode })
)

const matrix = qr.encodeMatrix(longPayload)
assert.ok(matrix && matrix.length >= 21, 'QR matrix should exist')
assert.strictEqual(matrix.length, matrix[0].length, 'QR should be square')

function finderAt(m, r0, c0) {
  const pat = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ]
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      assert.strictEqual(
        m[r0 + r][c0 + c] ? 1 : 0,
        pat[r][c],
        `finder (${r0},${c0}) at ${r},${c}`
      )
    }
  }
}

const n = matrix.length
finderAt(matrix, 0, 0)
finderAt(matrix, 0, n - 7)
finderAt(matrix, n - 7, 0)

const ops = []
const ctx = {
  setFillStyle(c) { ops.push(['style', c]) },
  fillRect(x, y, w, h) { ops.push(['rect', x, y, w, h]) },
  draw() { ops.push(['draw']) },
}
qr.drawQrcode(ctx, longPayload, { size: 200 })
assert.ok(ops.some((o) => o[0] === 'rect'), 'should paint modules')
assert.ok(ops.some((o) => o[0] === 'draw'), 'should flush canvas')

console.log('qrcode.test.js ok')
