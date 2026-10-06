#!/usr/bin/env node
/**
 * 🔴 部署守卫（deploy-guard）—— 解决多会话并行部署互相顶掉 + 半成品上线。
 *
 * 背景（2026-10-06 实测）：当天部署 6 次，其中 2 次被并发会话顶掉；
 * 线上 `assets/` 堆了 **954 个 `index-*.js`**（正常 1-2 个）——
 * 这就是「解压式部署 + 无共享状态」的直接后果。
 *
 * ⚠️ 本脚本**不阻止部署**，只回答两个问题并给出结论：
 *   ① 线上现在跑的是不是我的产物？（避免顶掉别人 / 被别人顶掉）
 *   ② 工作区是不是干净的？（拦「别人正在改的半成品」）
 *
 * 退出码：
 *   0 = 可以部署
 *   1 = 有冲突，必须先处理（不要硬推）
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '../..')
const STATE_DIR = path.join(REPO, '.deploy-state')
const STATE_FILE = path.join(STATE_DIR, 'last-deploy.json')
const HOST = process.env.DEPLOY_HOST || 'zfculture'
const REMOTE_DIR = '/opt/miniprogram-platform/admin-static'

const c = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m', b: '\x1b[1m' }
const log = (s = '') => process.stdout.write(s + '\n')
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }

/** 线上 index.html 当前引用的入口 chunk（内容指纹） */
function remoteEntry() {
  const out = sh(`ssh ${HOST} "grep -oE 'assets/index-[A-Za-z0-9_-]+\\\\.js' ${REMOTE_DIR}/index.html 2>/dev/null | head -1"`)
  return out
}

/** 线上部署时间 */
function remoteTime() {
  const out = sh(`ssh ${HOST} "stat -c %Y ${REMOTE_DIR}/index.html 2>/dev/null"`)
  return Number(out) || 0
}

log(`${c.b}══ 部署守卫 ══${c.x}`)
log('')

// ══════════════ ① 线上 vs 上次记录 ══════════════
const remoteEntryNow = remoteEntry()
const remoteTs = remoteTime()
let last = null
if (existsSync(STATE_FILE)) {
  try { last = JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { /* 坏文件当没有 */ }
}

log(`${c.b}① 线上状态${c.x}`)
log(`   当前入口: ${remoteEntryNow || '(读不到)'}`)
if (last) {
  const sameEntry = remoteEntryNow === last.remoteEntry
  const newer = remoteTs > (last.remoteTs || 0)
  if (sameEntry) {
    log(`   ${c.g}✓ 线上仍是我上次部署的那份${c.x} (${last.at})`)
  } else if (newer) {
    log(`   ${c.y}⚠ 线上已被【其他会话】替换${c.x}`)
    log(`     我上次: ${last.remoteEntry} @ ${last.at}`)
    log(`     现在:   ${remoteEntryNow} @ ${new Date(remoteTs * 1000).toLocaleString('zh-CN')}`)
  } else {
    log(`   ${c.y}⚠ 线上与我上次记录不一致（但时间更早，可能被回滚）${c.x}`)
  }
} else {
  log(`   ${c.d}(无上次部署记录，本次将写入)${c.x}`)
}
log('')

// ══════════════ ② 工作区洁净度 ══════════════
log(`${c.b}② 工作区洁净度${c.x}`)
const dirty = sh('cd ' + REPO + ' && git status --short --untracked-files=all | wc -l')
const dirtyN = Number(dirty) || 0
log(`   改动文件: ${dirtyN} 个`)

// 找「最近 5 分钟内被改的源文件」—— 另一个会话正在写的信号
const RECENT = sh(`cd ${REPO} && find admin/src backend/src -newermt '-5 minutes' -type f 2>/dev/null | head -6`)
const recentList = RECENT ? RECENT.split('\n').filter(Boolean) : []
if (recentList.length) {
  log(`   ${c.y}⚠ 5 分钟内有文件被改动（可能有并发会话正在写）:${c.x}`)
  for (const f of recentList) log(`     ${c.d}${f.replace(REPO + '/', '')}${c.x}`)
} else {
  log(`   ${c.d}(近 5 分钟无源文件改动)${c.x}`)
}
log('')

// ══════════════ ③ TS 编译门禁 ══════════════
log(`${c.b}③ 编译门禁${c.x}`)
const KNOWN_LEGACY = ['layout-overlap-wrapper', 'layout-sticky-wrapper', 'planet-qa-card']
const tsOut = sh(`cd ${REPO}/admin && npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "^src/" | grep -vE "${KNOWN_LEGACY.join('|')}" | head -8`)
const tsErrors = tsOut ? tsOut.split('\n').filter(Boolean) : []
if (tsErrors.length) {
  log(`   ${c.r}✗ 有 ${tsErrors.length} 个 TS 错误（可能是并发会话的半成品）:${c.x}`)
  for (const e of tsErrors) log(`     ${c.d}${e.replace(REPO + '/', '')}${c.x}`)
} else {
  log(`   ${c.g}✓ 无新增 TS 错误（已排除 ${KNOWN_LEGACY.length} 个历史遗留文件）${c.x}`)
}
log('')

// ══════════════ 结论 ══════════════
const blocked = tsErrors.length > 0
log(`${c.b}══ 结论 ══${c.x}`)
if (blocked) {
  log(`${c.r}⛔ 建议不要部署${c.x} —— 有编译错误，带上去会进线上。`)
  log(`${c.d}   若这些错误属于另一个会话正在开发的功能，等其完成后再部署。${c.x}`)
  log(`${c.d}   若你确认要带着它上线，回复「强制部署」并自行承担风险。${c.x}`)
  log('')
  log(`${c.d}（本次不写 last-deploy 记录）${c.x}`)
  process.exit(1)
}

log(`${c.g}✅ 可以部署${c.x}`)
if (recentList.length) {
  log(`${c.y}   注意：5 分钟内有并发改动，构建产物可能与对方有交叉 → 部署后告知对方。${c.x}`)
}
log('')
log(`${c.d}部署成功后请调用：node deploy/scripts/deploy-guard.mjs --record ${c.x}`)

/** --record <entry> <ts>：部署成功后记录，供下次比对 */
if (process.argv.includes('--record')) {
  const i = process.argv.indexOf('--record')
  const entry = process.argv[i + 1] || remoteEntryNow
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify({
    at: new Date().toLocaleString('zh-CN'),
    remoteEntry: entry,
    remoteTs,
  }, null, 2))
  log(`${c.g}   已记录：${entry}${c.x}`)
}

process.exit(0)
