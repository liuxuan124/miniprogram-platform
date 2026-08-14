// utils/source-channel.js — 启动场景 → 来源渠道编码

const SCENE_MAP = {
  // 分享
  1007: 'share',
  1008: 'share',
  1036: 'share',
  1044: 'share',
  // 扫码
  1011: 'scan',
  1012: 'scan',
  1013: 'scan',
  1047: 'scan',
  1048: 'scan',
  1049: 'scan',
  // 搜索
  1005: 'search',
  1006: 'search',
  1027: 'search',
  1042: 'search',
  1054: 'search',
  // 广告
  1045: 'ad',
  1046: 'ad',
  1067: 'ad',
  1084: 'ad',
  1095: 'ad',
}

/**
 * @param {WechatMiniprogram.LaunchShowOption|Record<string, any>} [options]
 * @returns {string} share|scan|search|ad|other
 */
function resolveSourceChannel(options = {}) {
  const query = options.query || {}
  const fromQuery = query.sourceChannel || query.source || query.channel
  if (fromQuery) {
    const v = String(fromQuery).trim().toLowerCase()
    if (['share', 'scan', 'search', 'ad', 'other'].includes(v)) return v
  }

  const scene = Number(options.scene)
  if (!Number.isNaN(scene) && SCENE_MAP[scene]) {
    return SCENE_MAP[scene]
  }
  return 'other'
}

module.exports = {
  resolveSourceChannel,
}
