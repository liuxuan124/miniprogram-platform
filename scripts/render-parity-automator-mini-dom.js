#!/usr/bin/env node
/**
 * 小程序黄金页真实渲染指纹（首页 Tab + setData 灌入批次 DSL + automator 抽 DOM）
 */
const fs = require('fs')
const path = require('path')
const { connectAutomator, ROOT, sleep } = require('./render-parity-automator-connect')
const { extractMiniBlocksFromPage, waitForCustomPageReady } = require('./render-parity-mini-extract')

const OUT_DIR = path.join(ROOT, 'agent-team/testing/evidence/render-parity')
const OUT = path.join(OUT_DIR, 'mini-dom.json')
const BATCHES = path.join(ROOT, 'agent-team/testing/golden-dsl-batches.json')

global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  getStorageInfoSync: () => ({ keys: [] }),
}
const { parseDSL } = require(path.join(ROOT, 'miniapp/utils/render.js'))

function payloadFromBatchDsl(batchDsl, batchIndex) {
  const parsed = parseDSL(batchDsl)
  const flowComponents = []
  const floatComponents = []
  ;(parsed.components || []).forEach((item) => {
    if (item && item.type === 'float_button') floatComponents.push(item)
    else flowComponents.push(item)
  })
  return {
    dslMode: true,
    dslPending: false,
    loading: false,
    error: '',
    flowComponents,
    floatComponents,
    parityBatch: String(batchIndex),
  }
}

async function waitForIndexPage(mp) {
  await sleep(Number(process.env.PARITY_INDEX_SETTLE_MS || 2000))
  const page = await mp.currentPage()
  if (!page) throw new Error('currentPage empty after reLaunch')
  return page
}

async function injectBatchOnIndex(mp, page, payload) {
  let lastErr = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      if (typeof mp.evaluate === 'function') {
        await mp.evaluate((p) => {
          const cur = getCurrentPages().pop()
          if (cur && typeof cur.setParityPayload === 'function') return cur.setParityPayload(p)
          return new Promise((resolve) => {
            cur.setData({
              dslMode: true,
              dslPending: false,
              loading: false,
              error: '',
              flowComponents: p.flowComponents || [],
              floatComponents: p.floatComponents || [],
              parityBatch: p.parityBatch || '',
            }, resolve)
          })
        }, payload)
      } else {
        await page.callMethod('setParityPayload', payload)
      }
      return
    } catch (e) {
      lastErr = e
      await sleep(600 + attempt * 400)
    }
  }
  throw lastErr || new Error('injectBatchOnIndex failed')
}

async function main() {
  if (!fs.existsSync(BATCHES)) {
    throw new Error(`缺少 ${BATCHES}，请先 node scripts/generate-golden-dsl.js`)
  }
  const manifest = JSON.parse(fs.readFileSync(BATCHES, 'utf8'))
  const batches = manifest.batches || []
  if (!batches.length) throw new Error('golden-dsl-batches.json 无 batches')

  const { mp, port } = await connectAutomator()
  const allBlocks = []
  const steps = []

  try {
    await mp.evaluate(() => {
      const app = getApp()
      if (app && app.globalData) app.globalData.__renderParityAutomator = true
    })
    for (const batch of batches) {
      const entry = { index: batch.index, path: batch.path, ok: false }
      try {
        await mp.reLaunch('/pages/index/index')
        let page = await waitForIndexPage(mp)
        const payload = payloadFromBatchDsl(batch.dsl, batch.index)
        await injectBatchOnIndex(mp, page, payload)
        const reInject = async () => {
          page = await mp.currentPage()
          await injectBatchOnIndex(mp, page, payload)
        }
        await waitForCustomPageReady(page, {
          mp,
          minBlocks: batch.minDomBlocks || batch.componentCount,
          timeoutMs: Number(process.env.PARITY_BATCH_TIMEOUT_MS || 60000),
          onRegress: reInject,
        })
        page = await mp.currentPage()
        let blocks = await extractMiniBlocksFromPage(page, mp)
        if (blocks.length < (batch.minDomBlocks || 1)) {
          await injectBatchOnIndex(mp, page, payload)
          await sleep(900)
          blocks = await extractMiniBlocksFromPage(page, mp)
        }
        if (blocks.length < (batch.minDomBlocks || 1)) {
          throw new Error(`DOM 块数 ${blocks.length} < 预期 ${batch.minDomBlocks}`)
        }
        allBlocks.push(...blocks)
        entry.ok = true
        entry.blockCount = blocks.length
        entry.types = blocks.map((b) => b.type)
      } catch (e) {
        entry.error = String(e.message || e)
        steps.push(entry)
        throw new Error(`批次 ${batch.index}: ${entry.error}`)
      }
      steps.push(entry)
      await sleep(800)
    }
  } finally {
    try {
      await mp.evaluate(() => {
        const app = getApp()
        if (app && app.globalData) app.globalData.__renderParityAutomator = false
      })
    } catch (e) { /* ignore */ }
    try { await mp.disconnect() } catch (e) { /* ignore */ }
  }

  const byType = new Map()
  for (const b of allBlocks) {
    if (!b.type) continue
    if (!byType.has(b.type)) byType.set(b.type, b)
  }
  const merged = [...byType.values()]

  const textLens = new Set(merged.map((b) => b.textLen))
  const imgLens = new Set(merged.map((b) => b.imgs))

  const report = {
    ok: merged.length >= 56,
    at: new Date().toISOString(),
    port,
    relaxed: false,
    source: 'automator-real-dom',
    batchCount: batches.length,
    steps,
    count: merged.length,
    blocks: merged,
    diversity: { uniqueTextLen: textLens.size, uniqueImgs: imgLens.size },
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    ok: report.ok,
    count: report.count,
    uniqueTextLen: textLens.size,
    uniqueImgs: imgLens.size,
    out: OUT,
  }, null, 2))

  if (textLens.size < 10) {
    console.error('指纹多样性不足：textLen 互异数量 < 10')
    process.exit(1)
  }
  if (!report.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
