#!/usr/bin/env node
/**
 * ============================================================================
 * admin-static 生产部署守门（deploy-checklist）
 * ============================================================================
 *
 * 为什么需要它（2026-10-06 一天内出三次事故）：
 *
 *   事故 1｜07:14 有人部署了含 A 优化的版本 → 07:16 我用旧产物部署，**把它盖掉了**。
 *   事故 2｜产物目录存在但缺 index.html → 预览全404，
 *          表现为「0/18 全部失败」，极易误判成产品崩了。
 *   事故 3｜并行会话正在开发"卡片阴影"（Schema/面板写完、渲染器没写），
 *          差点把半成品一起上线。
 *
 * 根因是同一个：**多Agent 并行改同一仓库并各自部署，没有任何共享的"发车前检查"**。
 * 本脚本把这个检查固化成一条命令。
 *
 * ── 用法 ────────────────────────────────────────────────────────────────
 *   node scripts/deploy-checklist.mjs                # 全部检查（只读，安全）
 *   node scripts/deploy-checklist.mjs --stage=build # 记录基线，准备构建
 *   node scripts/deploy-checklist.mjs --stage=post  # 部署后验证
 *   node scripts/deploy-checklist.mjs --out=dist-x  # 指定产物目录
 *
 * 🔴 本脚本**默认只读**。真正写生产的动作仍需人工执行部署命令 ——
 *    自动化可以帮你查，但"要不要现在动生产"必须由人决定。
 *
 * ── 各项检查为什么这么设计 ──────────────────────────────────────────────
 *   1. 并行改动检测：靠 **mtime**，不靠 git（并行会话会提交，改 git 状态不可信）
 *   2. 半成品检测：靠 **三端完成度**（schema/panel/renderer 命中数）
 *   3. 产物完整性：**必须实际 ls index.html**，目录存在 ≠ 内容完整
 *   4. 覆盖检测：比对「本次产物 vs 线上」的文件集合，找出**会被覆盖的线上文件**
 *      —— 这是事故 1 的直接防线
 *   5. 字节验证：全量 md5，取代不可靠的抽样 grep
 */

import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const HOST = process.env.DEPLOY_HOST || 'zfculture'
const REMOTE = '/opt/miniprogram-platform/admin-static'
const BASELINE = '/tmp/_wb_deploy_baseline.json'

const args = process.argv.slice(2)
const stage = (args.find((a) => a.startsWith('--stage=')) || '').split('=')[1] || 'all'
const outDir =
  (args.find((a) => a.startsWith('--out=')) || '').split('=')[1] || 'dist'

/* ── 输出helpers ─────────────────────────────────────────────────────── */
const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', d: '\x1b[2m', n: '\x1b[0m' }
let problems = 0
let warnings = 0

const line = (s = '') => console.log(s)
const ok = (s) => line(`  ${C.g}✅${C.n} ${s}`)
const bad = (s) => { problems += 1; line(`  ${C.r}❌${C.n} ${s}`) }
const warn = (s) => { warnings += 1; line(`  ${C.y}⚠️${C.n}  ${s}`) }
const info = (s) => line(`  ${C.c}·${C.n} ${s}`)
const head = (t) => line(`\n${C.c}${'═'.repeat(70)}\n ${t}\n${'═'.repeat(70)}${C.n}`)

const sh = (cmd, opts = {}) =>
  execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })

/* ══════════════════════════════════════════════════════════════════════
 * 1. 并行改动检测
 * ══════════════════════════════════════════════════════════════════════ */
function checkParallelChanges() {
  head('1. 并行改动检测（部署被覆盖的第一道防线）')

  const now = Date.now()
  const recent = sh(
    `find "${ROOT}/admin/src" -type f -newermt "-180 minutes" 2>/dev/null || true`,
  )
    .split('\n')
    .filter(Boolean)
    .map((f) => {
      const mtime = fs.statSync(f).mtimeMs
      return { file: path.relative(ROOT, f), mins: Math.round((now - mtime) / 60000) }
    })
    .sort((a, b) => a.mins - b.mins)

  if (!recent.length) {
    ok('近 3 小时内 admin/src 无改动')
    return recent
  }

  info(`近 3 小时被修改 ${recent.length} 个文件（最新 5 个）：`)
  for (const r of recent.slice(0, 5)) info(`${r.file}  (${r.mins} 分钟前)`)

  // 5 分钟内还在改 → 高度可能正在写，先警告
  const hot = recent.filter((r) => r.mins <= 5)
  if (hot.length) {
    warn(`${hot.length} 个文件在 5 分钟内仍在变动 —— 可能有人正在写`)
    warn('建议：等他完成后再部署，否则极可能再次互相覆盖')
  }

  // 记录最晚改动时间，供 stage=post 比对
  const newest = recent[0]
  line(`${C.d}  └ 最晚改动：${newest.file}（${newest.mins} 分钟前）${C.n}`)
  return recent
}

/* ══════════════════════════════════════════════════════════════════════
 * 2. 半成品检测（三端完成度）
 * ══════════════════════════════════════════════════════════════════════ */
function checkWipFeatures() {
  head('2. 半成品检测（三端完成度）')

  // 已知的"三端"约定：schema → panel → renderer
  const TRIPLES = [
    {
      name: '笔记流卡片阴影',
      schema: 'admin/src/components/page-builder/noteFeed/noteFeedSchema.ts',
      panel: 'admin/src/components/page-builder/props/NoteFeedStyleProps.vue',
      renderer: 'admin/src/components/page-builder/renderers/NoteFeedRenderer.vue',
      field: 'card_shadow',
    },
  ]

  const readIf = (f) => {
    const abs = path.join(ROOT, f)
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : ''
  }

  /**
   * 🔴 必须用**词边界**匹配，不能用 `match(/field/g)` 计数。
   *   2026-10-06 实测踩过：把代码里的 `card_shadow` 批量改名成
   *   `card_shadow_DISABLED_FOR_TEST` 来模拟"半成品"，
   *   结果子串计数仍返回 3 → 检测失灵、报告"三端齐备"。
   *   教训跟"测试里复制实现"同源：**检测手段本身要先被验证过一次**。
   */
  const countExact = (text, field) => {
    // (?![A-Za-z0-9_]) 保证后面不接标识符字符；(?![\w-]) 排除 -xxx 后缀
    const re = new RegExp(`${field}(?![A-Za-z0-9_])`, 'g')
    return (text.match(re) || []).length
  }

  for (const t of TRIPLES) {
    const s = countExact(readIf(t.schema), t.field)
    const p = countExact(readIf(t.panel), t.field)
    const r = countExact(readIf(t.renderer), t.field)

    if (s <= 0) {
      info(`${t.name}：未在开发（schema 无 ${t.field}），跳过`)
      continue
    }

    line(`  ${t.name}：schema=${s} panel=${p} renderer=${r}`)


    if (r === 0) {
      // 🔴 关键判断：schema 里**有**这个字段（s > 0）但 renderer 一处都不用 —— 这是**矛盾**，
      //   不是"未开发"。
      //   区别很重要：
      //     · 半成品       = schema 声明了但没人用 → 面板配了不生效，用户会以为功能坏了
      //     · 等价回落场景 = schema 从未被面板暴露、渲染器也从未读过 → 本来就是安全的
      //   2026-10-06 实测：靠"schema 注释里写了缺省回落"来放行是不可靠的 ——
      //   注释可能是上一轮留下的，而这一轮已经改了 schema 暴露给面板。
      if (p > 0) {
        bad(`面板已暴露 ${t.field}（${p} 处）但 renderer 完全不用（${r} 处）→ 配置不生效，禁止上线`)
        info('这是最典型的"半成品"：用户能配、但看不到效果')
        info('处理方式：补齐 renderer，或临时从面板移除该字段')
      } else if (s > 0) {
        warn(`schema 声明了 ${t.field} 但 renderer 未使用 —— 确认它不是要暴露给用户的配置项`)
      } else {
        info(`${t.field} 未在开发中（schema/panel 均无），跳过`)
      }
    } else if (r < 2) {
      // 只有 1 处引用，多半只做了读取、没做映射/应用
      warn(`renderer 只有 ${r} 处引用 ${t.field} —— 确认不是"只读不应用"`)
      info('（完整实现通常需要：预设映射 + 样式输出，至少 2 处）')
    } else {
      ok(`三端齐备（schema=${s} panel=${p} renderer=${r}）`)
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * 3. 产物完整性
 * ══════════════════════════════════════════════════════════════════════ */
function checkArtifact(dir) {
  head(`3. 产物完整性（${dir}）`)

  const abs = path.join(ROOT, 'admin', dir)
  if (!fs.existsSync(abs)) {
    bad(`目录不存在：${abs}`)
    info('先跑构建：cd admin && npx vite build --outDir <dir> --emptyOutDir')
    return false
  }

  // 🔴 目录存在 ≠ 内容完整。必须实际检查 index.html。
  const idx = path.join(abs, 'index.html')
  if (!fs.existsSync(idx)) {
    bad('index.html 缺失 —— 构建被中断过（这是 2026-10-06 事故 2）')
    info('必须重新构建，看到 "✓ built in" 且 index.html 存在才算完成')
    return false
  }

  const jsCount = fs.readdirSync(path.join(abs, 'assets')).filter((f) => f.endsWith('.js')).length
  ok(`index.html 存在，${jsCount} 个 js chunk`)

  if (jsCount < 100) {
    warn(`js chunk 只有 ${jsCount} 个，明显偏少 —— 确认构建没中断`)
  }
  return true
}

/* ══════════════════════════════════════════════════════════════════════
 * 4. 覆盖检测（本次部署会不会盖掉线上的东西）
 * ══════════════════════════════════════════════════════════════════════ */
function checkOverwrite(dir) {
  head('4. 覆盖检测（会不会盖掉线上已有内容）')

  let remote
  try {
    sh(`ssh ${HOST} 'cd ${REMOTE} && find . -type f -exec md5sum {} +' > /tmp/_wb_remote_md5.txt`)
    remote = fs.readFileSync('/tmp/_wb_remote_md5.txt', 'utf-8')
  } catch (e) {
    bad(`拉取线上 md5 失败：${String(e.message).slice(0, 80)}`)
    return
  }
  fs.rmSync('/tmp/_wb_remote_md5.txt', { force: true })

  const remoteMap = new Map()
  for (const l of remote.split('\n')) {
    const m = l.match(/^([0-9a-f]{32})\s+\.\/(.+)$/)
    if (m) remoteMap.set(m[2], m[1])
  }
  ok(`线上文件数 ${remoteMap.size}`)

  // 本地产物
  const localAbs = path.join(ROOT, 'admin', dir)
  const localMap = new Map()
  ;(function walk(d, base = '') {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name)
      const rel = base ? `${base}/${name}` : name
      if (fs.statSync(p).isDirectory()) walk(p, rel)
      else
        localMap.set(
          rel,
          crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'),
        )
    }
  })(localAbs)

  let same = 0
  const differ = []
  const missing = []
  for (const [rel, md5] of localMap) {
    if (!remoteMap.has(rel)) missing.push(rel)
    else if (remoteMap.get(rel) !== md5) differ.push(rel)
    else same += 1
  }

  ok(`字节一致 ${same} / 本地产物 ${localMap.size}`)
  if (missing.length) {
    warn(`线上缺失 ${missing.length} 个（将新增）`)
    missing.slice(0, 3).forEach((f) => info(`+ ${f}`))
  }
  if (differ.length) {
    warn(`内容将被覆盖 ${differ.length} 个`)
    differ.slice(0, 5).forEach((f) => info(`↻ ${f}`))
  } else {
    ok('没有覆盖冲突 —— 线上是本地产物的子集（安全升级）')
  }

  // 线上比本地多出来的（历史堆积，仅提示）
  const extra = [...remoteMap.keys()].filter((k) => !localMap.has(k)).length
  if (extra > 0) info(`线上另有 ${extra} 个历史文件（解压式部署遗留，不影响功能）`)

  return { same, differ: differ.length, missing: missing.length, total: localMap.size }
}

/* ══════════════════════════════════════════════════════════════════════
 * 5. 部署后验证
 * ══════════════════════════════════════════════════════════════════════ */
function verifyDeployed(dir) {
  head('5. 部署后验证（全量 md5）')

  const localAbs = path.join(ROOT, 'admin', dir)
  const localMap = new Map()
  ;(function walk(d, base = '') {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name)
      const rel = base ? `${base}/${name}` : name
      if (fs.statSync(p).isDirectory()) walk(p, rel)
      else
        localMap.set(
          rel,
          crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'),
        )
    }
  })(localAbs)

  sh(`ssh ${HOST} 'cd ${REMOTE} && find . -type f -exec md5sum {} +' > /tmp/_wb_remote_md5.txt`)
  const raw = fs.readFileSync('/tmp/_wb_remote_md5.txt', 'utf-8')
  fs.rmSync('/tmp/_wb_remote_md5.txt', { force: true })

  const remoteMap = new Map()
  for (const l of raw.split('\n')) {
    const m = l.match(/^([0-9a-f]{32})\s+\.\/(.+)$/)
    if (m) remoteMap.set(m[2], m[1])
  }

  let same = 0
  const differ = []
  for (const [rel, md5] of localMap) {
    if (remoteMap.get(rel) === md5) same += 1
    else differ.push(rel)
  }

  const pct = ((same / localMap.size) * 100).toFixed(1)
  if (differ.length === 0) {
    ok(`${same}/${localMap.size} 完全一致（${pct}%）`)
  } else {
    bad(`${differ.length} 个不一致：`)
    differ.slice(0, 5).forEach((f) => info(`✗ ${f}`))
  }

  // 站点可用性
  try {
    const code = sh(`curl -s -o /dev/null -w "%{http_code}" https://admin.zfculture.site/ || echo 000`)
    if (code.trim() === '200') ok('站点返回 200')
    else bad(`站点返回 ${code.trim()}`)
  } catch {
    warn('站点探测失败（可能是网络问题，不一定是部署问题）')
  }

  try {
    const df = sh(`ssh ${HOST} 'df -h / | tail -1'`)
    const used = Number(df.trim().split(/\s+/)[4]?.replace('%', ''))
    if (used >= 90) bad(`磁盘 ${used}%，需要清理`)
    else if (used >= 75) warn(`磁盘 ${used}%，建议跑 prune-deploy-backups.sh`)
    else ok(`磁盘 ${used}%`)
  } catch {
    /* 忽略 */
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * 主流程
 * ══════════════════════════════════════════════════════════════════════ */
line(`${C.c}${C.n}部署守门检查  ${C.d}${new Date().toLocaleString('zh-CN')}${C.n}`)
line(`${C.d}产物目录：${outDir} · 目标：${HOST}:${REMOTE}${C.n}`)

if (stage === 'build') {
  checkParallelChanges()
  checkWipFeatures()
  fs.writeFileSync(BASELINE, JSON.stringify({ at: new Date().toISOString(), out: outDir }))
  line(`\n${C.g}已记录基线${C.n} → 可以开始构建。构建后跑：--stage=post --out=${outDir}`)
} else if (stage === 'post') {
  const artOk = checkArtifact(outDir)
  if (artOk) verifyDeployed(outDir)
} else {
  checkParallelChanges()
  checkWipFeatures()
  checkArtifact(outDir)
  checkOverwrite(outDir)
}

line('')
line(`${'═'.repeat(70)}`)
if (problems === 0 && warnings === 0) {
  line(`${C.g}全部通过${C.n}，可以部署`)
} else {
  line(
    `${problems ? C.r : C.y}${problems} 个阻断 / ${warnings} 个提醒${C.n}` +
      (problems ? ' —— 有阻断项时不要部署' : ' —— 可部署，但请先确认提醒项'),
  )
}
process.exit(problems > 0 ? 1 : 0)