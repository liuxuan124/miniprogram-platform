import crypto from 'node:crypto'
import fs from 'node:fs'
const SECRET =
  '455fa215cfff3e1fb6096f0c085536a0af8ebfd8b501a17a12500b2daae154decd0c9ddc8cf46d5eec73ef01d1c79049'
const b64 = (o) =>
  Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
const n = Math.floor(Date.now() / 1000)
const h = b64({ alg: 'HS256', typ: 'JWT' })
const p = b64({ sub: 'admin', userId: 1, typ: 'access', iat: n, exp: n + 7200 })
const out =
  h + '.' + p + '.' + crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url')
fs.writeFileSync(process.argv[2] || '/tmp/wb_tk.txt', out, 'utf8')
console.log('token →', process.argv[2] || '/tmp/wb_tk.txt')
