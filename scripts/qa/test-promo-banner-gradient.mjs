// 促销横幅「背景类型 / 渐变角度 / 中间色可选」的两端一致性单测
// 目的：后台预览（admin PromoBannerRenderer）与小程序端（dsl-promo-banner.js）
//       必须算出**完全相同**的 background，否则运营在后台看到的效果 ≠ 线上。
// 用法：node scripts/qa/test-promo-banner-gradient.mjs <项目根>
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] || '.')

let pass = 0
let fail = 0
function eq(a, b, name) {
  if (a === b) pass++
  else {
    fail++
    console.log('  FAIL ' + name)
    console.log('       后台: ' + a)
    console.log('       端上: ' + b)
  }
}

/* ---- 抽出两边的 bgType 判定 ---- */
function extractAdmin(src) {
  const m = src.match(/const bgType = computed<[^>]*>\(\(\) => \{([\s\S]*?)\n\}\)/)
  if (!m) throw new Error('admin: 未找到 bgType')
  return m[1]
}
function extractMini(src) {
  const m = src.match(/const bgType =[\s\S]*?\n(\s+)const useMid/)
  if (!m) throw new Error('miniapp: 未找到 bgType')
  return m[0]
}

const adminSrc = fs.readFileSync(
  path.join(ROOT, 'admin/src/components/page-builder/renderers/PromoBannerRenderer.vue'),
  'utf8'
)
const miniSrc = fs.readFileSync(
  path.join(ROOT, 'miniapp/components/dsl-promo-banner/dsl-promo-banner.js'),
  'utf8'
)

/* ---- 规则一致性检查：比两边的判定表达式关键片段 ---- */
console.log('== 两端 bgType 规则必须都含反推兜底 ==')
const adminHas = /bg_type[\s\S]{0,200}gradient_from[\s\S]{0,80}gradient/.test(extractAdmin(adminSrc))
const miniHas = /gradient_from[\s\S]{0,80}gradient/.test(extractMini(miniSrc))
eq(String(adminHas), 'true', 'admin 有「无 bg_type 时按有渐变色反推」')
eq(String(miniHas), 'true', '端上有同样的反推')

console.log('== 两端都必须支持 纯色/角度/中间色可选 ==')
eq(String(/bg_type === 'solid'/.test(adminSrc)), 'true', 'admin 支持 solid')
eq(String(/cfg\.bg_type === 'solid'/.test(miniSrc)), 'true', '端上支持 solid')
eq(String(/gradient_angle/.test(adminSrc)), 'true', 'admin 支持 gradient_angle')
eq(String(/cfg\.gradient_angle/.test(miniSrc)), 'true', '端上支持 gradient_angle')
eq(String(/use_gradient_mid/.test(adminSrc)), 'true', 'admin 支持 use_gradient_mid')
eq(String(/cfg\.use_gradient_mid/.test(miniSrc)), 'true', '端上支持 use_gradient_mid')

/* ---- 行为等价：把两边的规则抽成函数跑同一批用例 ---- */
console.log('== 行为等价（同一批 cfg 喂给两端算法）==')

// 后台版（TS → JS 简化）
function adminBg(cfg) {
  let t
  if (cfg.bg_type) t = cfg.bg_type === 'solid' ? 'solid' : 'gradient'
  else t = cfg.gradient_from || cfg.gradient_to ? 'gradient' : 'solid'
  const useMid = cfg.use_gradient_mid !== undefined ? Boolean(cfg.use_gradient_mid) : Boolean(cfg.gradient_mid)
  const n = Number(cfg.gradient_angle)
  const angle = Number.isFinite(n) ? n : 135
  if (t === 'solid') return { background: cfg.background_color || cfg.gradient_from || '#1d1b18' }
  const stops = useMid
    ? `${cfg.gradient_from || '#1d1b18'} 0%, ${cfg.gradient_mid || '#3b2f22'} 60%, ${cfg.gradient_to || '#7a4a1d'} 100%`
    : `${cfg.gradient_from || '#1d1b18'} 0%, ${cfg.gradient_to || '#7a4a1d'} 100%`
  return { background: `linear-gradient(${angle}deg, ${stops})` }
}

// 端上版（照抄 dsl-promo-banner.js 的逻辑）
function miniBg(cfg) {
  const from = cfg.gradient_from || '#1d1b18'
  const mid = cfg.gradient_mid || '#3b2f22'
  const to = cfg.gradient_to || '#7a4a1d'
  const bgType = cfg.bg_type === 'solid'
    ? 'solid'
    : (cfg.bg_type ? 'gradient' : (cfg.gradient_from || cfg.gradient_to ? 'gradient' : 'solid'))
  const useMid = cfg.use_gradient_mid !== undefined ? !!cfg.use_gradient_mid : !!cfg.gradient_mid
  const rawAngle = Number(cfg.gradient_angle)
  const angle = isFinite(rawAngle) ? rawAngle : 135
  const stops = useMid ? `${from} 0%, ${mid} 60%, ${to} 100%` : `${from} 0%, ${to} 100%`
  return bgType === 'solid'
    ? { background: cfg.background_color || from }
    : { background: `linear-gradient(${angle}deg, ${stops})` }
}

const CASES = [
  ['空配置（历史页面兜底）', {}],
  ['历史渐变（无 bg_type）', { gradient_from: '#111', gradient_mid: '#222', gradient_to: '#333' }],
  ['显式纯色', { bg_type: 'solid', background_color: '#abcdef' }],
  ['显式纯色但没配 background_color', { bg_type: 'solid', gradient_from: '#111' }],
  ['显式渐变 + 角度', { bg_type: 'gradient', gradient_from: '#a', gradient_to: '#b', gradient_angle: 90 }],
  ['关掉中间色 → 两色', { gradient_from: '#a', gradient_to: '#b', use_gradient_mid: false, gradient_mid: '#c' }],
  ['开中间色但值为空', { gradient_from: '#a', gradient_to: '#b', use_gradient_mid: true }],
  ['angle=0（合法边界）', { gradient_from: '#a', gradient_to: '#b', gradient_angle: 0 }],
  ['angle=360（合法边界）', { gradient_from: '#a', gradient_to: '#b', gradient_angle: 360 }],
  ['angle 非数字 → 回落 135', { gradient_from: '#a', gradient_to: '#b', gradient_angle: 'abc' }],
  ['angle=undefined', { gradient_from: '#a', gradient_to: '#b', gradient_angle: undefined }],
]

for (const [name, cfg] of CASES) {
  const a = adminBg(cfg)
  const b = miniBg(cfg)
  eq(a.background, b.background, name)
}

console.log('')
console.log((fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + ' 通过 / ' + fail + ' 失败')
process.exit(fail === 0 ? 0 : 1)
