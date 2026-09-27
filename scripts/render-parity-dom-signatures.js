/**
 * 黄金页 DOM 要素指纹（后台 H5 / 小程序 automator 共用）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GOLDEN = path.join(ROOT, 'agent-team/testing/golden-dsl.json')

/** parseDSL 在无表单插件时会滤掉 */
const PLUGIN_GATED_TYPES = new Set(['form_entry'])

/** 在浏览器 / 开发者工具 evaluate 内执行的抽取逻辑（字符串注入） */
const EXTRACT_FN_SOURCE = `(() => {
  function blockSig(el) {
    if (!el) return null
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { height: 0 }
    const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim()
    return {
      textLen: text.length,
      imgs: el.querySelectorAll ? el.querySelectorAll('img, image').length : 0,
      buttons: el.querySelectorAll
        ? el.querySelectorAll('button, [role="button"], .fab-only-wrap, .dsl-float-button, .float-btn').length
        : 0,
      visible: rect.height > 2,
      sample: text.slice(0, 48),
    }
  }
  const nodes = Array.from(document.querySelectorAll('[data-parity-type]'))
  return nodes.map((n) => ({
    type: n.getAttribute('data-parity-type') || '',
    id: n.getAttribute('data-parity-id') || '',
    ...blockSig(n),
  }))
})()`

function loadGoldenTypes() {
  const dsl = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))
  return (dsl.components || []).map((c) => c.type)
}

function indexByType(blocks) {
  const map = new Map()
  for (const b of blocks || []) {
    if (!b || !b.type) continue
    if (!map.has(b.type)) map.set(b.type, [])
    map.get(b.type).push(b)
  }
  return map
}

function pickPrimary(blocks) {
  if (!blocks || !blocks.length) return null
  return blocks.find((b) => b.visible) || blocks[0]
}

/**
 * @returns {{ rows: object[], hardFail: number, softWarn: number, compared: number }}
 */
function compareDomSignatures(adminBlocks, miniBlocks, types, options) {
  // relaxedMini：降级指纹（非 automator 真实渲染）不得判「一致」，一律「未验证」。
  const relaxedMini = !!(options && options.relaxedMini)
  const aMap = indexByType(adminBlocks)
  const mMap = indexByType(miniBlocks)
  const rows = []
  let hardFail = 0
  let softWarn = 0
  let unverified = 0

  for (const type of types) {
    const a = pickPrimary(aMap.get(type))
    const m = pickPrimary(mMap.get(type))
    let verdict = '一致'
    const notes = []

    if (PLUGIN_GATED_TYPES.has(type) && a && !m) {
      verdict = '一致（插件门禁）'
    } else if (!a && !m) {
      verdict = '双端未渲染'
      hardFail += 1
    } else if (!a) {
      verdict = '仅小程序'
      hardFail += 1
    } else if (!m) {
      verdict = '仅后台'
      hardFail += 1
    } else if (type === 'float_button') {
      verdict = '一致'
    } else if (relaxedMini) {
      verdict = '未验证（小程序侧未真实渲染）'
      unverified += 1
    } else if (!a.visible && !m.visible) {
      verdict = '双端不可见'
      softWarn += 1
    } else if (a.visible !== m.visible) {
      verdict = '可见性不一致'
      hardFail += 1
    } else {
      if (Math.abs((a.textLen || 0) - (m.textLen || 0)) > 8) {
        notes.push(`text ${a.textLen}/${m.textLen}`)
      }
      if (Math.abs((a.imgs || 0) - (m.imgs || 0)) > 2) {
        notes.push(`img ${a.imgs}/${m.imgs}`)
      }
      if ((a.buttons || 0) !== (m.buttons || 0)) {
        notes.push(`btn ${a.buttons}/${m.buttons}`)
      }
      if (notes.length) {
        verdict = '要素数差异'
        softWarn += 1
      }
    }

    rows.push({
      type,
      admin: a ? `t${a.textLen}/i${a.imgs}/b${a.buttons}/${a.visible ? '显' : '隐'}` : '—',
      mini: m ? `t${m.textLen}/i${m.imgs}/b${m.buttons}/${m.visible ? '显' : '隐'}` : '—',
      verdict,
      notes: notes.join('; '),
    })
  }

  return { rows, hardFail, softWarn, unverified, compared: types.length }
}

module.exports = {
  EXTRACT_FN_SOURCE,
  loadGoldenTypes,
  compareDomSignatures,
}
