#!/usr/bin/env node
/**
 * 跨端一致性门禁：后台 Schema 的常量/预设色 必须与小程序端镜像逐字一致。
 *
 * 🔴 为什么需要这个（2026-10-06 引入）：
 * 装修器存在「后台配 → 画布预览 → 真机渲染」三端，任何常量在后台改了而端上没改，
 * 表现都是「预览一个样、真机另一个样」，而且**不报任何错** ——
 * 运营只会以为是自己没配对，反复重配几次就放弃了。
 * 手动比对色值容易漏（6 套色看一遍就够分心），固化成脚本才能进 CI。
 *
 * 覆盖范围（当前）：
 *   · SOURCE_COLOR_PRESETS —— 来源标签 6 套预设配色（bg/fg 逐字比对）
 *   · SOURCE_DEFAULTS / DEFAULTS —— 四渠道默认文案
 *
 * 用法：node scripts/qa/check-cross-platform-tokens.js
 * 退出码 0 = 一致；1 = 有漂移（会打印逐项差异）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const ADMIN_SCHEMA = path.join(
  ROOT,
  'admin/src/components/page-builder/articleFeed/articleFeedSchema.ts',
)
const MINI_TAG = path.join(ROOT, 'miniapp/utils/dsl-source-tag.js')

function readOrFail(p, label) {
  if (!fs.existsSync(p)) {
    console.error('XX 找不到文件：' + label + ' → ' + p)
    process.exit(1)
  }
  return fs.readFileSync(p, 'utf8')
}

/** 从后台 Schema 抠出 SOURCE_COLOR_PRESETS */
function parseAdminPresets(src) {
  const re = /\{\s*value:\s*'(\w+)',\s*label:\s*'([^']+)',\s*bg:\s*'(#[0-9a-fA-F]{3,8})',\s*fg:\s*'(#[0-9a-fA-F]{3,8})'\s*\}/g
  const out = {}
  let m
  while ((m = re.exec(src))) out[m[1]] = { label: m[2], bg: m[3], fg: m[4] }
  return out
}

/** 从端上模块直接读（不抠源码 —— 端上就是 JS，可直接 require，避免正则漏） */
function loadMiniTag() {
  const resolved = require.resolve(MINI_TAG)
  delete require.cache[resolved]
  return require(resolved)
}

let fail = 0
function cmp(group, key, a, b) {
  if (a === b) {
    console.log('  ok  ' + group + '.' + key + ' = ' + a)
    return
  }
  fail++
  console.log('  XX  ' + group + '.' + key + '  后台=' + JSON.stringify(a) + '  端上=' + JSON.stringify(b))
}

const adminSrc = readOrFail(ADMIN_SCHEMA, '后台 Schema')
const mini = loadMiniTag()
const adminPresets = parseAdminPresets(adminSrc)

console.log('--- 来源标签预设配色（bg/fg 必须逐字一致）---')
const keys = Array.from(new Set([...Object.keys(adminPresets), ...Object.keys(mini.COLOR_PRESETS)])).sort()
if (!keys.length) {
  console.log('  XX 两端都没解析到预设色 —— 正则或结构变了，需同步维护本脚本')
  fail++
}
for (const k of keys) {
  const a = adminPresets[k]
  const b = mini.COLOR_PRESETS[k]
  cmp('color', k + '.bg', a && a.bg, b && b.bg)
  cmp('color', k + '.fg', a && a.fg, b && b.fg)
}

console.log('--- 四渠道默认文案 ---')
// 后台 Schema 的 DEFAULTS 在 normalizeSourceTagMap 里是内联数组，用抠源码方式取
const adminDefaults = {}
const dm = adminSrc.match(/key:\s*'(\w+)',\s*label:\s*'([^']+)'/g) || []
for (const frag of dm) {
  const mm = frag.match(/key:\s*'(\w+)',\s*label:\s*'([^']+)'/)
  if (mm && !(mm[1] in adminDefaults)) adminDefaults[mm[1]] = mm[2]
}
for (const k of ['wechat_mp', 'xiaohongshu', 'qa', 'original']) {
  cmp('default', k, adminDefaults[k], mini.DEFAULTS[k])
}

console.log('')
if (fail) {
  console.error('❌ 跨端口径漂移 ' + fail + ' 处 —— 会表现为「预览一个样、真机另一个样」且不报错')
  process.exit(1)
}
console.log('✅ 跨端常量一致')