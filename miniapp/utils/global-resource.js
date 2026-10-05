/**
 * utils/global-resource.js —— 全局资源位（弹窗 / 顶部横条 / 悬浮球 / 公告）端上运行时
 *
 * ## 为什么是「运行时」而不是装修器组件
 * 装修器组件是**逐页**放置的（每个页面的 DSL 里各写一份），运营想上新一个全站公告得
 * 进十几个页面各改一遍。本模块把资源位放在**全局配置**里：
 *   后台「运营中心 › 全局资源位」配一次 → SystemService 缓存 → 任意页面挂一个
 *   `<global-resource />` 即可生效。
 *
 * ## 与既有链路的关系（不重复造轮子）
 * - 配置来源：`mp_system_config.global_resource_slots`（JSON 数组）
 * - 白名单：已在 `SystemConfigServiceImpl` 的 PUBLIC / JSON / RUNTIME_PUBLIC 三处登记
 * - 读取：复用 `services/system.js` 的 `getCachedConfig()`（app.js 启动时已拉过并缓存）
 *   → 本模块**不发任何网络请求**，直接读缓存，冷启动零额外开销
 *
 * ## 冲突控制（纯端上，无后端参与）
 * - 同 type 取 `priority` 最大的一条（后端已排序，这里再兜一次底）
 * - `enabled=false` / 未到生效窗口 / 已过期的跳过
 * - 展示频次：`dailyLimit` 按「每用户每天最多自动弹 N 次」记在 Storage，
 *   用户手动点过关闭的当天不再弹（关 = 明确意愿，第二天可再弹）
 *
 * ## 使用方式（逐页注册，不要挂 app.json 全局）
 * ① 页面 json 加`"global-resource": "/components/global-resource/global-resource"`
 * ② 页面 wxml 顶层加 `<global-resource />`
 *
 * ⚠️ **不要挂 `app.json` 的全局 `usingComponents`** —— 那会让它进主包并对所有分包生效，
 *    体积与影响面都不可控。项目里 `login-sheet` 是这么做的（13.8KB），是已知取舍，
 *    新组件不要再扩大这个口子。
 */
const SystemService = require('../services/system')
const StorageUtil = require('./storage')
const { navigatePage } = require('./render')

/** 展示记录 key（按天+类型 分桶） */
const SHOWN_KEY = 'globalResourceShown'
/** 手动关闭记录 key */
const CLOSED_KEY = 'globalResourceClosed'
/** 配置里的类型 → 端上渲染形态 */
const TYPES = ['popup', 'bar', 'float', 'bulletin']

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function readMap(key) {
  try {
    return StorageUtil.get(key) || {}
  } catch (e) {
    return {}
  }
}

function writeMap(key, map) {
  try {
    StorageUtil.set(key, map)
  } catch (e) {
    /* ignore */
  }
}

/** 把「2026-01-02 10:00:00」/「2026-01-02T10:00:00」/ ISO 都归一成时间戳 */
function parseTime(v) {
  if (!v) return 0
  const s = String(v).trim()
  if (!s) return 0
  // Safari/部分 iOS 不认带空格的 ISO，用斜杠替���
  const t = new Date(s.replace(/-/g, '/').replace('T', ' ').replace(/\.\d+Z?$/, '')).getTime()
  return isNaN(t) ? 0 : t
}

/**
 * 从配置里挑出「当前该展示的」资源位，按类型分组。
 * @returns {{popup: Object|null, bar: Object|null, float: Object|null, bulletin: Object|null}}
 */
function pickSlots(config) {
  const out = { popup: null, bar: null, float: null, bulletin: null }
  const list = config && Array.isArray(config.global_resource_slots) ? config.global_resource_slots : []
  if (!list.length) return out

  const now = Date.now()
  const day = today()
  const shownMap = readMap(SHOWN_KEY)
  const closedMap = readMap(CLOSED_KEY)

  // 同 type 只取 priority 最大的（后端已排序，这里兜底防止配置被手改乱序）
  const best = {}
  list.forEach((raw) => {
    if (!raw || raw.enabled === false) return
    const type = String(raw.type || '')
    if (TYPES.indexOf(type) < 0) return

    // 生效窗口
    const start = parseTime(raw.startAt)
    const end = parseTime(raw.endAt)
    if (start && now < start) return
    if (end && now > end) return

    // 频次：bar/bulletin 常驻不计入；popup/float 自动展示才计数
    const needCount = type === 'popup' || type === 'float'
    if (needCount) {
      const limit = Number(raw.dailyLimit == null ? 1 : raw.dailyLimit)
      if (limit > 0) {
        const bucket = shownMap[type]
        const cnt = bucket && bucket.day === day ? Number(bucket.count || 0) : 0
        if (cnt >= limit) return
      }
      // 今天已被用户手动关掉同一条 → 今天不再自动弹
      const closed = closedMap[type]
      if (closed && closed.day === day && String(closed.id) === String(raw.id || raw.title)) return
    }

    if (!best[type] || Number(raw.priority || 0) > Number(best[type].priority || 0)) {
      out[type] = raw
    }
  })

  return out
}

function markShown(type, slot) {
  const map = readMap(SHOWN_KEY)
  const day = today()
  const prev = map[type] && map[type].day === day ? Number(map[type].count || 0) : 0
  map[type] = { day: day, count: prev + 1, id: String((slot && slot.id) || (slot && slot.title) || '') }
  writeMap(SHOWN_KEY, map)
}

function markClosed(type, slot) {
  const map = readMap(CLOSED_KEY)
  map[type] = { day: today(), id: String((slot && slot.id) || (slot && slot.title) || '') }
  writeMap(CLOSED_KEY, map)
}

/** 组件内部用：拉配置 → 选片→ 渲染 */
function sync(instance) {
  const config = SystemService.getCachedConfig()
  const slots = pickSlots(config)
  const changed =
    JSON.stringify(instance.data.slots) !== JSON.stringify(slots)
  if (changed) {
    instance.setData({ slots: slots })
  }
  // popup 首次出现才计数（避免组件反复 attach 刷爆配额）
  if (slots.popup && !instance._counted) {
    instance._counted = true
    markShown('popup', slots.popup)
  }
  if (slots.float && !instance._countedFloat) {
    instance._countedFloat = true
    markShown('float', slots.float)
  }
  instance._resourceSlots = slots
}

function onClose(type) {
  markClosed(type, this._resourceSlots && this._resourceSlots[type])
  this.setData({ ['slots.' + type]: null })
}

function onOpen() {
  const s = this.data.slots && this.data.slots.float
  this.setData({ floatOpen: !this.data.floatOpen, floatSlot: s })
}

function onGo(e) {
  const type = (e.currentTarget && e.currentTarget.dataset.type) || ''
  const slot = this.data.slots && this.data.slots[type]
  if (!slot) return
  if (type === 'float') {
    this.setData({ floatOpen: false })
  } else {
    this.onClose(type)
  }
  const link = String(slot.link || '').trim()
  if (!link) return
  // 走 navigatePage 而不是裸 wx.navigateTo：它内部会做未注册页面重写（rewriteUnregisterkedPage）
  try {
    navigatePage(link)
  } catch (err) {
    // 兜底：跳转失败不该让页面崩
  }
}

module.exports = {
  TYPES,
  pickSlots,
  markShown,
  markClosed,
  sync,
  onClose,
  onOpen,
  onGo,
}