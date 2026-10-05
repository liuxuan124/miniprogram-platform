const { post } = require('./request')

/**
 * 举报。
 *
 * 2026-10-05 补：此前两处「举报」入口（pkg-content/share/share.js 的 onReport、
 * components/dsl-planet-feed/dsl-planet-feed.js 的 onMoreTap）都只是
 * `wx.showToast('已收到举报')` 的假实现 —— 不发请求、不落库，
 * 所以 mp_copyright_complaint 至今 0 行，审核中心无数据可审。
 *
 * 统一走这里，两个入口共用一套「填理由 → 提交」交互。
 */

/** 举报对象类型（与后端 ModerationService.TARGET_TYPES 一致） */
const TARGET = {
  CONTENT: 'content',
  MOMENT: 'moment',
  COMMENT: 'comment',
  PLANET_POST: 'planet_post',
  PRODUCT: 'product',
  AUTHOR: 'author',
}

const REASON_PRESETS = [
  '涉黄涉暴',
  '垃圾广告',
  '欺诈或盗版',
  '不实信息',
  '侵犯他人权益',
  '其他违规',
]

/**
 * 弹出举报理由选择 + 提交。
 *
 * @param {Object} opts
 * @param {string} opts.targetType  上面的 TARGET.*
 * @param {number|string} opts.targetId 被举报对象 id
 * @param {string} [opts.presetTitle] 弹窗标题里的对象描述，如「这条动态」
 * @returns {Promise<boolean>} 是否提交成功
 */
function reportWithReason(opts) {
  const targetType = opts && opts.targetType
  const targetId = opts && opts.targetId
  if (!targetType || targetId === undefined || targetId === null || targetId === '') {
    wx.showToast({ title: '举报对象不完整', icon: 'none' })
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList: REASON_PRESETS,
      success: (res) => {
        const reason = REASON_PRESETS[res.tapIndex]
        submit(targetType, targetId, reason, opts && opts.presetTitle)
          .then(() => resolve(true))
          .catch(() => resolve(false))
      },
      fail: () => resolve(false),
    })
  })
}

/**
 * 直接提交举报。
 *
 * @param {string} targetType
 * @param {number|string} targetId
 * @param {string} reason
 * @param {string} [presetTitle]
 * @param {string} [contact]
 * @param {string[]} [evidenceUrls]
 * @returns {Promise<boolean>}
 */
function submit(targetType, targetId, reason, presetTitle, contact, evidenceUrls) {
  return post(
    '/api/v1/mp/report',
    {
      targetType,
      targetId: Number(targetId) || targetId,
      reason,
      contact: contact || '',
      evidenceUrls: evidenceUrls || [],
    },
    { auth: true },
  )
    .then((res) => {
      const msg = (res && res.data && res.data.message) || '已收到，我们会尽快处理'
      wx.showToast({ title: msg, icon: 'none', duration: 2200 })
      return true
    })
    .catch((err) => {
      // 未登录时后端会 401，提示用户去登录；其余给出可读原因
      const status = err && (err.statusCode || err.status)
      if (status === 401) {
        wx.showToast({ title: '请先登录后再举报', icon: 'none' })
      } else {
        const msg = (err && (err.data?.message || err.message)) || '举报提交失败，请稍后重试'
        wx.showToast({ title: msg, icon: 'none' })
      }
      return false
    })
}

module.exports = { TARGET, REASON_PRESETS, reportWithReason, submit }
