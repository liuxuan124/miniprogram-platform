#!/usr/bin/env node
/**
 * 验证：资料预览页的「位图预览」链路
 *
 * 背景：2026-10-04 用户反馈「资料呈现不能直接展示原本的页面吗？一定要转文字版吗？」
 *      此前 preview-text 走结构化文本（h1/h2/p），图表/表格/配色全丢。
 *      本轮新增 FilePreviewImageService + GET /mp/files/{id}/preview-images，
 *      PDF 原页 1:1 渲染成 JPEG，swiper 左右翻页。
 *
 * 用法：node scripts/qa/probe-mp-file-preview-img.js [fileId]
 */
const automator = require('miniprogram-automator')

const FILE_ID = process.argv[2] || '15' // 15 = 8 月月报（free，27 页）
const PAGE = 'pkg-content/file-preview/file-preview'

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const exceptions = []
  mp.on('exception', (e) => exceptions.push(String((e && e.message) || e)))

  console.log('=== 1. 进预览页 id=%s ===', FILE_ID)
  const jumped = await mp.evaluate((id) => new Promise((res) => {
    wx.navigateTo({
      url: `/pkg-content/file-preview/file-preview?id=${id}`,
      success: () => res('ok'),
      fail: (e) => res('fail: ' + JSON.stringify(e)),
    })
  }), FILE_ID)
  console.log('navigateTo:', jumped)
  await new Promise((r) => setTimeout(r, 9000))

  const d = await mp.evaluate(() => {
    const ps = getCurrentPages()
    const p = ps[ps.length - 1]
    return { route: p.route, data: p.data }
  })
  console.log('route:', d.route)
  const x = d.data || {}
  console.log('\n=== 2. 页面状态 ===')
  console.log('locked=', x.locked, '| canPreview=', x.canPreview, '| canRead=', x.canRead, '| canDownload=', x.canDownload)
  console.log('imgLoading=', x.imgLoading, '| imgPages=', (x.imgPages || []).length, '| imgIndex=', x.imgIndex, '| imgTotal=', x.imgTotal)
  console.log('pageLabel=', x.pageLabel, '| pageCount=', x.pageCount, '| previewPages=', x.previewPages)
  console.log('文字版 previewPagesData=', (x.previewPagesData || []).length, '（位图成功后应为 0）')
  console.log('statusText=', x.statusText, '| primaryCta=', x.primaryCta)

  const pages = x.imgPages || []
  if (pages.length) {
    console.log('\n=== 3. 位图页明细 ===')
    pages.slice(0, 5).forEach((p) => console.log('  ', p.no, p.label, p.w + 'x' + p.h, p.url))
    if (pages.length > 5) console.log('   ... 共', pages.length, '页')
    console.log('\n=== 4. 图片可解码性（getImageInfo 验渲染，不靠 DOM 查询）===')
    const probe = await mp.evaluate((url) => new Promise((res) => {
      wx.getImageInfo({ src: url, success: (i) => res({ ok: true, w: i.width, h: i.height }), fail: (e) => res({ ok: false, e: String(e.errMsg) }) })
    }), pages[0].url)
    console.log('  首页图片:', JSON.stringify(probe))

    console.log('\n=== 5. swiper 翻页（第 1 页 → 第 2 页）===')
    const before = await mp.evaluate(() => { const ps = getCurrentPages(); return ps[ps.length - 1].data.pageLabel })
    await mp.evaluate(() => { const ps = getCurrentPages(); return ps[ps.length - 1].onImgSwiper({ detail: { current: 1 } }) })
    await new Promise((r) => setTimeout(r, 1200))
    const after = await mp.evaluate(() => { const ps = getCurrentPages(); const p = ps[ps.length - 1]; return { label: p.data.pageLabel, idx: p.data.imgIndex } })
    console.log('  翻页前:', before, '→ 翻页后:', after.label, '| imgIndex=', after.idx)
  } else {
    console.log('\n⚠️ 未拿到位图页（回退文字版或接口失败）')
  }
  if (exceptions.length) console.log('\n页面异常:', exceptions.join(' | '))
  await mp.disconnect()
})().catch((e) => { console.log('ERR:', e.message.split('\n')[0]); process.exit(1) })
