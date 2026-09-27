#!/usr/bin/env node
/**
 * 生成 agent-team/testing/golden-dsl.json（58 组件各一条，无外链图）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const caps = JSON.parse(fs.readFileSync(path.join(ROOT, 'miniapp/capabilities.json'), 'utf8'))
const types = (caps.supported_component_types || []).map((t) => (t === 'a_i_entry' ? 'ai_entry' : t))

const LOCAL_IMG = '/images/tab/home.png'

function propsFor(type) {
  const base = { title: `Golden ${type}` }
  switch (type) {
    case 'banner':
      return {
        items: [{ title: 'Golden banner title', image: '/images/404-banner-test.png', link_type: 'none' }],
        height: 140,
        border_radius: 8,
        autoplay: false,
      }
    case 'brand_intro':
      return {
        title: 'Golden brand',
        subtitle: 'Golden subtitle',
        description: 'Golden description',
        kpi: '1 项 · 2 项',
      }
    case 'float_button':
      return { text: '客服', icon: '💬', position: 'right-bottom' }
    case 'search':
      return { placeholder: 'Golden search', scope: 'all' }
    case 'nav':
      return {
        columns: 4,
        items: [
          { icon: '📚', title: 'A', link_type: 'none', link_url: '' },
          { icon: '📘', title: 'B', link_type: 'none', link_url: '' },
        ],
      }
    case 'content_tabs':
      return {
        panes: [
          { title: 'Tab A', items: [{ title: 'Static row A', desc: 'No network', link_type: 'none', link_url: '' }] },
          { title: 'Tab B', items: [{ title: 'Static row B', desc: 'No network', link_type: 'none', link_url: '' }] },
        ],
      }
    case 'feature_cards':
      return {
        columns: 2,
        items: [
          { icon: '✨', title: 'Feature A', desc: 'Static card' },
          { icon: '🛡️', title: 'Feature B', desc: 'No network' },
        ],
      }
    case 'image_cube':
      return {
        layout: '2x2',
        gap: 6,
        radius: 8,
        items: Array.from({ length: 4 }, () => ({ image: '', link_type: 'none', link_url: '' })),
      }
    case 'planet_topics':
      return {
        source_mode: 'manual',
        title: 'Golden topics',
        badge: 'Static',
        note: 'No network',
        items: [
          { name: 'Topic A', width: 72, pct: '↑ 12%' },
          { name: 'Topic B', width: 48, pct: '↓ 3%', down: true },
        ],
      }
    case 'article_list':
    case 'product_list':
    case 'note_feed':
    case 'moments_feed':
    case 'article_feed':
      return { title: base.title, limit: 2, items: [{ title: 'Static row', summary: 'No network' }] }
    case 'warm_home':
    case 'warm_discover':
    case 'warm_planet':
    case 'warm_shop':
    case 'warm_mine':
      return { title: base.title }
    case 'image':
      return { image: LOCAL_IMG, link_type: 'none' }
    case 'video':
      return { title: 'Golden video', poster: LOCAL_IMG, src: '' }
    case 'rich_text':
      return { content: '<p>Golden rich text</p>' }
    case 'section_title':
      return { title: 'Golden section', subtitle: 'subtitle' }
    case 'divider':
      return { style: 'solid', color: '#94a3b8', thickness: 8, margin: 8 }
    case 'spacer':
      return { height: 12 }
    default:
      return base
  }
}

const components = types.map((type) => ({
  id: `golden-${type.replace(/_/g, '-')}`,
  type,
  props: propsFor(type),
  style: { margin_left: 12, margin_right: 12, margin_bottom: 8 },
}))

const dsl = {
  schema_version: '1.0',
  page: {
    id: 'golden-render-parity',
    name: '渲染比对黄金页',
    type: 'custom',
    path: 'pages/custom/golden-render-parity',
    background_color: '#f5f6f9',
  },
  global_config: { pull_refresh: false, reach_bottom_load: false },
  components,
}

const out = path.join(ROOT, 'agent-team/testing/golden-dsl.json')
const pub = path.join(ROOT, 'admin/public/golden-dsl.json')
const mpData = path.join(ROOT, 'miniapp/data/golden-parity-dsl.json')
const batchesOut = path.join(ROOT, 'agent-team/testing/golden-dsl-batches.json')
const json = `${JSON.stringify(dsl, null, 2)}\n`
fs.writeFileSync(out, json, 'utf8')
fs.mkdirSync(path.dirname(pub), { recursive: true })
fs.writeFileSync(pub, json, 'utf8')
fs.mkdirSync(path.dirname(mpData), { recursive: true })
fs.writeFileSync(mpData, json, 'utf8')

const BATCH_SIZE = 10
global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  getStorageInfoSync: () => ({ keys: [] }),
}
const { parseDSL } = require(path.join(ROOT, 'miniapp/utils/render.js'))

const batches = []
for (let i = 0; i < components.length; i += BATCH_SIZE) {
  const slice = components.slice(i, i + BATCH_SIZE)
  const index = batches.length + 1
  const pagePath = `pages/custom/golden-parity-${index}`
  const batchDsl = {
    schema_version: '1.0',
    page: {
      id: `golden-parity-${index}`,
      name: `渲染比对黄金页 ${index}`,
      type: 'custom',
      path: pagePath,
      background_color: '#f5f6f9',
    },
    global_config: { pull_refresh: false, reach_bottom_load: false },
    components: slice,
  }
  const parsed = parseDSL(batchDsl)
  const flowN = (parsed.components || []).filter((c) => c.type !== 'float_button').length
  const floatN = (parsed.components || []).filter((c) => c.type === 'float_button').length
  batches.push({
    index,
    path: pagePath,
    componentCount: slice.length,
    minDomBlocks: flowN + floatN,
    types: slice.map((c) => c.type),
    dsl: batchDsl,
  })
}

fs.writeFileSync(batchesOut, `${JSON.stringify({
  schema_version: '1.0',
  fullPath: dsl.page.path,
  batchSize: BATCH_SIZE,
  totalComponents: components.length,
  batches,
}, null, 2)}\n`, 'utf8')

const batchMap = {}
const batchDir = path.join(ROOT, 'miniapp/data/golden-batches')
fs.mkdirSync(batchDir, { recursive: true })
for (const b of batches) {
  batchMap[String(b.index)] = b.dsl
  fs.writeFileSync(
    path.join(batchDir, `batch-${b.index}.json`),
    `${JSON.stringify(b.dsl, null, 2)}\n`,
    'utf8',
  )
}
const batchMapOut = path.join(ROOT, 'miniapp/data/golden-batches-all.json')
fs.writeFileSync(batchMapOut, `${JSON.stringify(batchMap, null, 2)}\n`, 'utf8')

console.log(`Wrote ${components.length} components → ${out}`)
console.log(`Copied → ${pub}`)
console.log(`Copied → ${mpData}`)
console.log(`Wrote ${batches.length} batches → ${batchesOut}`)
