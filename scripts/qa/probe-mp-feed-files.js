#!/usr/bin/env node
/**
 * 验证：星球信息流里「一条动态挂多份资料」的附件卡片是否都渲染出来
 *
 * 背景：2026-10-04 入库 5 份 PDF（mp_file_item id 14-18）并发布动态
 *      （mp_content id=301，content_type='moment'，attachments 挂 5 个 fileId）。
 *      原实现 mapFeedItem 只取 attachments[0]、wxml 只渲染 item.file（单卡），
 *      5 份资料只能露出 1 张卡 → 改为 files 数组 + wx:for 多卡渲染。
 *
 * ⚠️ 读法说明：feed 列表在 dsl-planet-feed 自定义组件内部，
 *      page.$$ / page.data() 穿不透（见 MEMORY 排查铁律），
 *      所以本探针只做「接口层确认数据」+「组件 props 映射层确认 files 数组」，
 *      像素级渲染需人工在 IDE 里看。
 *
 * 用法：node scripts/qa/probe-mp-feed-files.js
 */
const automator = require('miniprogram-automator')
const path = require('path')

;(async () => {
  // 1. Node 侧直接验证 mapFeedItem 的映射结果（最直接，不受组件边界影响）
  const modPath = path.join(__dirname, '../../miniapp/components/dsl-planet-feed/dsl-planet-feed.js')
  console.log('=== 1. 检查 mapFeedItem 映射逻辑是否含 files ===')
  const src = require('fs').readFileSync(modPath, 'utf8')
  console.log('  files 数组映射:', /const files = attachments\.map/.test(src) ? '✅ 有' : '❌ 无')
  console.log('  返回对象带 files:', /files:\s*files\.length\s*\?\s*files/.test(src) ? '✅ 有' : '❌ 无')
  console.log('  wxml 多卡循环:', /wx:for="\{\{item\.files\}\}"/.test(require('fs').readFileSync(modPath.replace(/\.js$/, '.wxml'), 'utf8')) ? '✅ 有' : '❌ 无')

  // 2. 线上接口确认数据到位
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const r = await mp.evaluate(() => new Promise((res) => {
    wx.request({
      url: 'https://api.zfculture.site/api/v1/mp/planet/feed?current=1&size=20',
      success: (x) => res({ sc: x.statusCode, d: x.data }),
      fail: (e) => res({ fail: String(e && e.errMsg) }),
    })
  }))
  if (r.fail) { console.log('接口 FAIL:', r.fail); await mp.disconnect(); return }
  const d = r.d.data || {}
  const recs = d.records || d.list || d.items || []
  console.log('\n=== 2. 线上星球信息流（total=%s）===', d.total)
  let found = 0
  let maxAtt = 0
  recs.forEach((c) => {
    const att = Array.isArray(c.attachments) ? c.attachments : []
    if (!att.length) return
    found++
    if (att.length > maxAtt) maxAtt = att.length
    console.log('  id=%s | %s | 附件 %s 个', c.id, String(c.content || c.title || '').replace(/<[^>]+>/g, '').slice(0, 26), att.length)
    att.forEach((a) => console.log('     -', a.name, '| fileId=', a.fileId, '| canPreview=', a.canPreview))
  })
  if (!found) console.log('  ⚠️ 未发现带附件的动态')
  await mp.disconnect()
  console.log('\n渲染层需在 IDE 里目视：带附件最多的那条应显示 %s 张卡片纵向排列', maxAtt || 0)
})().catch((e) => { console.log('ERR:', e.message.split('\n')[0]); process.exit(1) })
