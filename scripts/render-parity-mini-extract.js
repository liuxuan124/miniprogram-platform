/**
 * 小程序 automator 页面 → 与后台 H5 同语义的要素指纹
 */
const { sleep } = require('./render-parity-automator-connect')

async function readIndexPageData(mp, page) {
  if (mp && typeof mp.evaluate === 'function') {
    try {
      const snap = await mp.evaluate(() => {
        const pages = getCurrentPages()
        const p = pages[pages.length - 1]
        if (!p || !p.data) return null
        const d = p.data
        return {
          loading: !!d.loading,
          error: d.error || '',
          parityBatch: d.parityBatch != null ? String(d.parityBatch) : '',
          flowComponents: Array.isArray(d.flowComponents) ? d.flowComponents : [],
          floatComponents: Array.isArray(d.floatComponents) ? d.floatComponents : [],
        }
      })
      if (snap) return snap
    } catch (e) { /* fall through */ }
  }
  return page.data().catch(() => ({}))
}

function withAutomatorTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label || 'automator'} timeout ${ms}ms`)), ms)
    }),
  ])
}

async function mergeTextFromAutomatorDom(page, blocks) {
  if (!page || !blocks.length) return blocks
  const timeoutMs = Number(process.env.PARITY_EL_TIMEOUT_MS || 8000)
  let flowEls = []
  try {
    flowEls = await withAutomatorTimeout(page.$$('.dsl-flow'), timeoutMs, 'page.$$')
  } catch (e) {
    return blocks
  }
  const out = blocks.slice()
  for (let i = 0; i < Math.min(flowEls.length, out.length); i += 1) {
    if (out[i].type === 'float_button') continue
    try {
      const raw = await withAutomatorTimeout(flowEls[i].text(), timeoutMs, 'el.text')
      const text = String(raw || '').replace(/\s+/g, ' ').trim()
      if (text.length) {
        out[i].textLen = text.length
        out[i].sample = text.slice(0, 48)
      }
    } catch (e) { /* keep selector metrics */ }
  }
  return out
}

async function extractMiniBlocksFromPage(page, mp) {
  if (mp && typeof mp.evaluate === 'function') {
    try {
      const blocks = await mp.evaluate(() => {
        const cur = getCurrentPages().pop()
        if (cur && typeof cur.getParityRenderBlocks === 'function') {
          return cur.getParityRenderBlocks()
        }
        return []
      })
      if (Array.isArray(blocks) && blocks.length) {
        return mergeTextFromAutomatorDom(page, blocks)
      }
    } catch (e) { /* fall through */ }
  }

  const d = await readIndexPageData(mp, page)
  const blocks = []
  const flowComps = Array.isArray(d.flowComponents) ? d.flowComponents : []
  for (let i = 0; i < flowComps.length; i += 1) {
    const comp = flowComps[i] || {}
    blocks.push({
      type: comp.type || '',
      id: comp.id || '',
      textLen: 0,
      imgs: 0,
      buttons: 0,
      visible: false,
      sample: '',
    })
  }
  const floatComps = Array.isArray(d.floatComponents) ? d.floatComponents : []
  for (let i = 0; i < floatComps.length; i += 1) {
    const comp = floatComps[i]
    blocks.push({
      type: 'float_button',
      id: comp.id || '',
      textLen: 0,
      imgs: 0,
      buttons: 0,
      visible: false,
      sample: '',
    })
  }
  return blocks
}

/** 等待首页 parityBatch / custom 页灌库完成且 flow+float 数量稳定 */
async function waitForCustomPageReady(page, opts) {
  const minBlocks = opts.minBlocks || 1
  const timeoutMs = opts.timeoutMs || 45000
  const mp = opts.mp || null
  const onRegress = typeof opts.onRegress === 'function' ? opts.onRegress : null
  const start = Date.now()
  let sawReady = false

  while (Date.now() - start < timeoutMs) {
    const d = await readIndexPageData(mp, page)
    if (d.error) throw new Error(String(d.error))
    const flow = Array.isArray(d.flowComponents) ? d.flowComponents.length : 0
    const floats = Array.isArray(d.floatComponents) ? d.floatComponents.length : 0
    const total = flow + floats
    if (total >= minBlocks && !d.loading) {
      sawReady = true
      await sleep(700)
      const d2 = await readIndexPageData(mp, page)
      const total2 = (d2.flowComponents || []).length + (d2.floatComponents || []).length
      if (total2 >= minBlocks) {
        return {
          flow: (d2.flowComponents || []).length,
          floats: (d2.floatComponents || []).length,
          total: total2,
        }
      }
    }
    if (sawReady && total < minBlocks && onRegress) {
      await onRegress()
      sawReady = false
    }
    await sleep(280)
  }
  const d = await readIndexPageData(mp, page)
  throw new Error(
    `waitForCustomPageReady timeout (minBlocks=${minBlocks}, flow=${(d.flowComponents || []).length}, error=${d.error || ''})`,
  )
}

module.exports = {
  readIndexPageData,
  extractMiniBlocksFromPage,
  waitForCustomPageReady,
}
