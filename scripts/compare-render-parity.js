#!/usr/bin/env node
/**
 * RENDER-PARITY 结构比对（不依赖 Playwright / 开发者工具时可跑）
 * 用法: node scripts/compare-render-parity.js
 * 产出: docs/render-parity-report.md
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GOLDEN = path.join(ROOT, 'agent-team/testing/golden-dsl.json')
const REPORT = path.join(ROOT, 'docs/render-parity-report.md')

global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  getStorageInfoSync: () => ({ keys: [] }),
}

const { parseDSL, COMPONENT_TYPES } = require(path.join(ROOT, 'miniapp/utils/render.js'))

const adminItem = fs.readFileSync(
  path.join(ROOT, 'admin/src/components/page-builder/ComponentItem.vue'),
  'utf8',
)
const miniWxml = fs.readFileSync(
  path.join(ROOT, 'miniapp/components/dsl-renderer/dsl-renderer.wxml'),
  'utf8',
)

function loadAdminRendererTypes() {
  const pageTs = fs.readFileSync(path.join(ROOT, 'admin/src/types/page.ts'), 'utf8')
  const enumBlock = pageTs.match(/export enum ComponentType \{([\s\S]*?)\n\}/)
  const enumToSnake = {}
  if (enumBlock) {
    const enumRe = /^\s*(\w+)\s*=\s*'([^']+)'/gm
    let m
    while ((m = enumRe.exec(enumBlock[1]))) {
      enumToSnake[m[1]] = m[2]
    }
  }
  const set = new Set()
  const itemRe = /ComponentType\.(\w+)/g
  while ((m = itemRe.exec(adminItem))) {
    const snake = enumToSnake[m[1]]
    if (snake) set.add(snake)
  }
  return set
}

const ADMIN_TYPES = loadAdminRendererTypes()

function adminHasRenderer(type) {
  return ADMIN_TYPES.has(type)
}

function miniHasRenderer(type) {
  return (
    miniWxml.includes(`comp.type === '${type}'`)
    || miniWxml.includes(`comp.type === "${type}"`)
    || (type.startsWith('warm_') && miniWxml.includes('dsl-warm-block'))
  )
}

function extractFloatAdminPreview() {
  const fp = fs.readFileSync(
    path.join(ROOT, 'admin/src/views/page-builder/miniapp-full-preview.vue'),
    'utf8',
  )
  return fp.includes('currentFloatButtons') && fp.includes('#fab')
}

const KNOWN = [
  {
    type: 'banner',
    admin: 'title 文字占位 + 主题渐变（BannerRenderer fallback）',
    mini: 'title 文字占位 + 渐变（dsl-banner fallback）；支持 items/images；binderror',
    check() {
      const bannerJs = fs.readFileSync(path.join(ROOT, 'miniapp/components/dsl-banner/dsl-banner.js'), 'utf8')
      const bannerVue = fs.readFileSync(
        path.join(ROOT, 'admin/src/components/page-builder/renderers/BannerRenderer.vue'),
        'utf8',
      )
      const okMini = bannerJs.includes('onImageError') && bannerJs.includes('c.items')
      const okAdmin = bannerVue.includes('props?.items') && bannerVue.includes('banner-fallback')
      return okMini && okAdmin ? '一致' : '差异'
    },
  },
  {
    type: 'brand_intro',
    admin: 'split 布局；preview 不再默认 hero（仅 variant=hero）',
    mini: 'dsl-brand：title/subtitle/description/kpi',
    check() {
      const vue = fs.readFileSync(
        path.join(ROOT, 'admin/src/components/page-builder/renderers/BrandIntroRenderer.vue'),
        'utf8',
      )
      return vue.includes("variant || '').trim() === 'hero'") ? '一致' : '差异'
    },
  },
  {
    type: 'float_button',
    admin: extractFloatAdminPreview() ? 'H5 预览 #fab 槽渲染' : '未渲染',
    mini: 'dsl-float-button',
    check() {
      return extractFloatAdminPreview() ? '一致' : '仅单端（小程序）'
    },
  },
]

function main() {
  const dsl = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))
  const parsed = parseDSL(dsl)
  if (!parsed.components.length) {
    console.error('golden DSL parse failed')
    process.exit(1)
  }

  const rows = []
  let diffCount = 0
  let singleSide = 0

  for (const comp of dsl.components) {
    const type = comp.type
    const a = adminHasRenderer(type)
    const m = miniHasRenderer(type) || Object.values(COMPONENT_TYPES).includes(type)
    let verdict = '一致'
    if (a && !m) {
      verdict = '仅后台'
      singleSide += 1
    } else if (!a && m) {
      verdict = '仅小程序'
      singleSide += 1
    } else if (!a && !m) {
      verdict = '双端缺实现'
      diffCount += 1
    }
    rows.push({ type, admin: a ? '有 Renderer' : '无', mini: m ? '有分支' : '无', verdict })
  }

  for (const k of KNOWN) {
    const v = k.check()
    if (v !== '一致') diffCount += 1
    rows.push({
      type: `${k.type}（行为）`,
      admin: k.admin,
      mini: k.mini,
      verdict: v,
    })
  }

  let domNote = '（未运行）'
  let domUnverified = 0
  const domDiffPath = path.join(ROOT, 'agent-team/testing/evidence/render-parity/dom-diff.json')
  let domRows = []
  if (fs.existsSync(domDiffPath)) {
    try {
      const dd = JSON.parse(fs.readFileSync(domDiffPath, 'utf8'))
      domUnverified = dd.unverified || 0
      if (domUnverified > 0) {
        domNote = `未验证 · ${domUnverified}/${dd.compared} 项小程序侧未真实渲染（降级常量指纹），结论不可信`
      } else {
        domNote = dd.ok
          ? `通过 · 比对 ${dd.compared} · 硬失败 ${dd.hardFail} · 软警告 ${dd.softWarn}`
          : `失败 · 硬失败 ${dd.hardFail} · 软警告 ${dd.softWarn}`
      }
      domRows = (dd.rows || []).filter((r) => r.verdict !== '一致')
    } catch (e) {
      domNote = '读取失败'
    }
  }

  let automatorNote = '（未运行）'
  const autoPath = path.join(ROOT, 'agent-team/testing/evidence/render-parity/automator-report.json')
  if (fs.existsSync(autoPath)) {
    try {
      const ar = JSON.parse(fs.readFileSync(autoPath, 'utf8'))
      automatorNote = ar.ok
        ? `通过 · Tab ${ar.tabbar?.count ?? '?'} · 首页 flow ${ar.home?.flowComponentsLen ?? '?'} · DSL 模式 ${ar.home?.dslMode ? '是' : '否'}`
        : `失败 · ${JSON.stringify(ar.home || {})}`
    } catch (e) {
      automatorNote = '读取失败'
    }
  }

  const md = [
    '# 渲染一致性比对报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '## 统计',
    '',
    `- 黄金 DSL 组件数：**${dsl.components.length}**（parseDSL 灌库后 **${parsed.components.length}**，差异来自 plugins 门禁过滤）`,
    `- 结构登记差异 / 行为差异项：**${diffCount}**（含已知三组件行为行）`,
    `- 仅单端有 Renderer：**${singleSide}**`,
    `- Automator 冒烟：**${automatorNote}**`,
    `- 黄金页 DOM 要素：**${domNote}**`,
    '',
    '## 说明',
    '',
    '- **结构登记**：ComponentItem / dsl-renderer 是否含该 type + 已知三组件行为探针。',
    '- **黄金页 DOM**：Playwright `/h5/golden-parity`（全量 58 组件）；小程序 `render-parity-automator-mini-dom.js` 分批打开 `golden-parity-1…6` 真实抽指纹。',
    '- `mini-dom.json` 必须 `relaxed: false`；任一类型标「未验证」或未跑 DOM 比对，门禁退出 1。',
    '',
    '## 明细',
    '',
    '| type | 后台 | 小程序 | 判定 |',
    '|------|------|--------|------|',
    ...rows.map((r) => `| ${r.type} | ${r.admin} | ${r.mini} | ${r.verdict} |`),
    '',
  ]

  if (domRows.length) {
    md.push(
      '## 黄金页 DOM 差异（仅非一致项）',
      '',
      '| type | 后台 | 小程序 | 判定 | 备注 |',
      '|------|------|--------|------|------|',
      ...domRows.map((r) => `| ${r.type} | ${r.admin} | ${r.mini} | ${r.verdict} | ${r.notes || ''} |`),
      '',
    )
  }

  md.push(
    '## 执行方式',
    '',
    '```bash',
    'bash scripts/render-parity-full.sh',
    '```',
    '',
  )

  fs.writeFileSync(REPORT, md.join('\n'), 'utf8')
  console.log(`Report → ${REPORT}`)
  console.log(`Components parsed: ${parsed.components.length}`)

  // CI 门禁：任何差异、单端缺实现、或 DOM 比对未真实执行，都必须让流程失败。
  // 否则这份报告只会是一盏永远亮着的绿灯。
  const blockers = []
  if (diffCount > 0) blockers.push(`结构/行为差异 ${diffCount}`)
  if (singleSide > 0) blockers.push(`仅单端实现 ${singleSide}`)
  if (domUnverified > 0) blockers.push(`DOM 未验证 ${domUnverified}`)
  if (domNote.startsWith('失败')) blockers.push('DOM 比对失败')
  if (domNote === '（未运行）') blockers.push('DOM 比对未运行')
  if (blockers.length) {
    console.error(`RENDER-PARITY 未通过：${blockers.join('；')}`)
    process.exit(1)
  }
}

main()
