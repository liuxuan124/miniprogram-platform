/**
 * 全量字节比对：本地产物 vs 线上 admin-static。
 *
 * 🔴 为什么要全量比而不是抽查几个 chunk：
 *   · 抽查命中了只能证明「那部分在」，**不能证明「没有更新的版本被引用」**；
 *   · 解压式部署下线上堆积上千个 chunk，靠文件名猜"哪个是当前用的"极易错判；
 *   · 唯一可靠的办法：**把本地产物每个文件的 md5 算出来，
 *     逐个到线上找同名文件比 md5**，再单独确认 index.html 引用的是哪一套。
 *
 * 输出三件事：
 *   1. 本地有多少文件、线上是否存在同名同内容
 *   2. 哪些本地文件线上缺失 / 内容不同
 *   3. 线上比本地多出哪些文件（历史堆积，不影响功能，但要说明）
 */
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const SSH = 'zfculture'
const REMOTE = '/opt/miniprogram-platform/admin-static'
const LOCAL = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/dist-patch-1'

const sh = (cmd) => execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })

/* ── 本地：递归算 md5 ────────────────────────────────────────────── */
const localMap = new Map() // relPath -> md5
function walk(dir, base = '') {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const rel = base ? `${base}/${name}` : name
    const st = fs.statSync(abs)
    if (st.isDirectory()) walk(abs, rel)
    else {
      const h = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex')
      localMap.set(rel, h)
    }
  }
}
walk(LOCAL)

/* ── 线上：一次性拿到全部 md5，避免逐个 ssh（慢且易超时）────────── */
console.log('本地产物文件数:', localMap.size)
console.log('拉取线上 md5 清单…')
// 🔴 线上有 2 万+ 文件，execSync 的默认 maxBuffer 会撑爆（报错 1MB+）。
//    写到本地临时文件再读，并只取需要的字段。
sh(`ssh ${SSH} 'cd ${REMOTE} && find . -type f -exec md5sum {} +' > /tmp/_wb_remote_md5.txt`)
const raw = fs.readFileSync('/tmp/_wb_remote_md5.txt', 'utf-8')
const remoteMap = new Map()
for (const line of raw.split('\n')) {
  const m = line.match(/^([0-9a-f]{32})\s+\.\/(.+)$/)
  if (m) remoteMap.set(m[2], m[1])
}
console.log('线上文件数  :', remoteMap.size)

/* ── 比对 ────────────────────────────────────────────────────────── */
const missing = []
const differ = []
const same = []
for (const [rel, md5] of localMap) {
  if (!remoteMap.has(rel)) missing.push(rel)
  else if (remoteMap.get(rel) !== md5) differ.push(rel)
  else same.push(rel)
}

const extra = [...remoteMap.keys()].filter((k) => !localMap.has(k))

console.log('')
console.log('='.repeat(66))
console.log('比对结果')
console.log('='.repeat(66))
console.log(`✅ 完全一致 : ${same.length}`)
console.log(`❌ 内容不同 : ${differ.length}`)
console.log(`❌ 线上缺失 : ${missing.length}`)
console.log(`➕ 线上多出 : ${extra.length}（历史堆积，解压式部署遗留）`)

if (differ.length) {
  console.log('')
  console.log('内容不同的文件（说明线上有更新的版本）：')
  differ.slice(0, 20).forEach((f) => console.log('  ⚠️ ', f))
}
if (missing.length) {
  console.log('')
  console.log('线上缺失的文件：')
  missing.slice(0, 20).forEach((f) => console.log('  ❌', f))
}

const ratio = ((same.length / localMap.size) * 100).toFixed(1)
console.log('')
console.log(`结论：本地产物 ${ratio}% 已在线上`)