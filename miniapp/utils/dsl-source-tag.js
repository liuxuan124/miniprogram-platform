/**
 * 文章流「来源标签」解析（2026-10-06 补齐配色与文案对齐）。
 *
 * 🔴 补齐前的问题（后台配了、真机不生效）：
 * 1. 面板配的 `source_labels`（渠道 → 展示文案）端上算了 `sourceTagLabel` 却**从未在 wxml 里用**，
 *    渲染的仍是 `item.source`（文章原始的来源名，如「公众号」）；
 * 2. `source_tag_map[].color`（配色）端上完全不认识；
 * 3. `show_source_tag` 端上只用来做**过滤**，wxml 却是 `wx:if="{{item.source}}"` **无条件渲染** ——
 *    运营在后台关掉「显示来源标签」，真机上来源文字照样显示。
 *
 * 现在统一口径：**文案取配置（缺省回落原始来源名）、配色取预设、显隐由 show_source_tag 决定**，
 * 与后台画布 `ArticleFeedRenderer` 完全同规则。
 */

/** 固定渠道的默认文案（与后台 articleFeedSchema 的 DEFAULTS 保持一致） */
const DEFAULTS = {
  wechat_mp: '公众号',
  xiaohongshu: '小红书',
  qa: '问答',
  original: '原创',
}

/**
 * 预设配色（key → 柔和底 + 深字）。
 * ⚠️ 必须与后台 `SOURCE_COLOR_PRESETS` 的色值**逐字一致** ——
 * 两端不同色会表现为「预览是一种颜色、真机是另一种」，运营会以为配色没生效。
 * 选柔和值而非高饱和：标签是信息不是装饰，刺眼会与正文抢注意力。
 */
const COLOR_PRESETS = {
  gray: { bg: '#f1f5f9', fg: '#475569' },
  green: { bg: '#e7f7ed', fg: '#1a7f4b' },
  orange: { bg: '#fdf0e6', fg: '#b45309' },
  blue: { bg: '#e8f0fe', fg: '#1a56db' },
  pink: { bg: '#fdecef', fg: '#c2264a' },
  purple: { bg: '#f1ecfd', fg: '#5b3fb8' },
}

/**
 * 文章 → 渠道 key。
 * 🔴 必须与后台的归一化口径一致：显式 tag 优先 → 中文兜底 → 空串。
 * 「空串」不是 bug：无法归类的来源（如「线下活动」）本就配不了标签，
 * 此时回落显示原始来源名，而不是硬塞一个默认渠道。
 */
function resolveSourceTagKey(item) {
  if (!item) return ''
  const tag = String(item.sourceTag || item.source_tag || '').toLowerCase()
  if (tag === 'wechat_mp' || tag === 'wechat') return 'wechat_mp'
  if (tag === 'xiaohongshu' || tag === 'xhs') return 'xiaohongshu'
  if (tag === 'qa') return 'qa'
  if (tag === 'original') return 'original'
  const source = String(item.source || '')
  if (source.indexOf('微信') >= 0 || source.indexOf('公众号') >= 0) return 'wechat_mp'
  if (source.indexOf('小红书') >= 0) return 'xiaohongshu'
  if (source.indexOf('问答') >= 0) return 'qa'
  if (source === '原创' || source === '手动录入') return 'original'
  return ''
}

/**
 * 取**指定 key** 的配置行：优先 `source_tag_map`（含配色），回落 `source_labels`（仅文案）。
 * 🔴 必须按 key 匹配，不能取 map 的第一行 —— map 顺序由运营增删决定，
 * 与文章的渠道 key 毫无关系（错配会变成「公众号文章标成小红书配色」）。
 * @param {object} cfg 组件配置
 * @param {string} key 渠道 key
 * @returns {{key:string,label:string,color?:string}|null}
 */
function resolveSourceRow(cfg, key) {
  if (!key) return null
  const map = cfg && Array.isArray(cfg.source_tag_map) ? cfg.source_tag_map : null
  const labels = cfg && cfg.source_labels && typeof cfg.source_labels === 'object' ? cfg.source_labels : {}
  if (map) {
    const hit = map.filter((r) => r && String(r.key || '').trim() === key)[0]
    if (hit) {
      return {
        key,
        label: String(hit.label || labels[key] || DEFAULTS[key] || key).trim(),
        color: hit.color ? String(hit.color) : '',
      }
    }
  }
  if (labels[key]) {
    return { key, label: String(labels[key]), color: '' }
  }
  return null
}

/**
 * 🔴 主入口：把文章解析成 wxml 可直接用的来源标签字段。
 * @returns {{text:string,bg:string,fg:string,key:string,colored:boolean}}
 *   `text` 为空串表示「不该显示来源」——调用方用 `wx:if="{{item.sourceTagText}}"` 判断。
 */
function resolveSourceTag(item, cfg) {
  const fallback = String((item && item.source) || (item && (item.categoryName || item.category_name)) || '').trim()
  // 🔴 显隐只看 show_source_tag：运营关了就不显示，
  // 哪怕文章本身带来源名也不显示（修复前 wxml 无条件渲染，关了也没用）。
  if (!cfg || cfg.show_source_tag !== true) {
    return { text: '', bg: '', fg: '', key: '', colored: false }
  }
  const key = resolveSourceTagKey(item)
  const row = resolveSourceRow(cfg, key)
  const labels = cfg.source_labels && typeof cfg.source_labels === 'object' ? cfg.source_labels : {}
  // 文案优先级：map 命中 → 扁平字典 → 固定默认 → 原始来源名
  const text = String(
    (row && row.label) || (key ? DEFAULTS[key] : '') || fallback || '',
  ).trim()
  if (!text) {
    return { text: '', bg: '', fg: '', key, colored: false }
  }
  const preset = row && row.color && COLOR_PRESETS[row.color] ? COLOR_PRESETS[row.color] : null
  return {
    text,
    bg: preset ? preset.bg : '',
    fg: preset ? preset.fg : '',
    key,
    // 标记是否命中配色：未命中时 wxml 走无底色的纯文字样式，不套空背景
    colored: Boolean(preset),
  }
}

/** 兼容旧调用：只要文案 */
function resolveSourceLabel(item, labels) {
  const key = resolveSourceTagKey(item)
  if (!key) return ''
  const map = labels || {}
  return map[key] || DEFAULTS[key] || ''
}

function filterBySourceKeys(items, filterKeys) {
  if (!filterKeys || !filterKeys.length) return items
  const set = {}
  filterKeys.forEach((k) => { set[k] = true })
  return (items || []).filter((item) => {
    const key = resolveSourceTagKey(item)
    return key && set[key]
  })
}

module.exports = {
  resolveSourceLabel,
  resolveSourceTag,
  resolveSourceTagKey,
  filterBySourceKeys,
  COLOR_PRESETS,
  DEFAULTS,
}