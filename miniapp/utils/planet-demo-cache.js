/**
 * 星球动态「演示数据」传递缓存
 *
 * 背景：rich_text 被换成 planet_feed 组件后，卡片可点了，但详情页 moment-detail
 * 走 applyDemoFallback 只会渲染固定的 DEMO_PLANET_POST（暖阁那篇「知识付费定价」），
 * 导致点墨太白卡片却看到十一的动态，对不上。
 *
 * 方案：点击卡片时把该条 item 落到 Storage，详情页 demo 分支优先取它；
 * 取不到再回落 DEMO_PLANET_POST。真实数据（id 非 demo）不经过这里。
 */
const { StorageUtil } = require('./storage')

const KEY = 'planet_demo_moment'

function putDemoMoment(item) {
  const it = item || {}
  if (!it.id) return
  try {
    StorageUtil.set(KEY, {
      id: String(it.id),
      author: it.author || '',
      tag: it.tag || '',
      content: it.content || '',
      answer: it.answer || '',
      topics: it.topics || '',
      time: it.time || '',
      likes: it.likes || '0',
      comments: it.comments || '0',
      images: Array.isArray(it.images) ? it.images : [],
      file: it.file || null,
    })
  } catch (e) { /* ignore */ }
}

function takeDemoMoment(id) {
  try {
    const raw = StorageUtil.get(KEY)
    if (!raw || typeof raw !== 'object') return null
    if (id && String(raw.id) !== String(id)) return null
    return raw
  } catch (e) {
    return null
  }
}

module.exports = { putDemoMoment, takeDemoMoment }
