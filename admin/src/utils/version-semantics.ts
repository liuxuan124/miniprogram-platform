/**
 * 版本语义（单一真相源）
 *
 * ============================ 为什么需要这个文件 ============================
 * 2026-10-06 线上问题：同一个配置版本在四个地方显示成四个数 ——
 *   工作台「第 33 版」 / 发布页「版本 1200」 / 预览页「第 — 次发布」 / 版本列表「第 28 次」
 *
 * 根因是这个系统里同时存在 4 种「版本」，各页面各取各的：
 *   1. 配置发布序号  live_release_no         发布一次 +1（单调递增，无空洞语义）
 *   2. 历史记录主键  mp_miniapp_release.id  自增，可能已到 1200，与「第几次发布」无关
 *   3. 内容版本号    mp_miniapp_release.semver  形如 1.12.0，其 patch 段才等于发布序号
 *   4. 页面版本      mp_page_version.version  单个页面自己的第几版
 *   5. 代码包版本    wx_last_pushed_version  微信侧版本字符串
 *
 * 本文件把这几个概念显式分开，并提供「取哪个、用什么文案」的统一口径。
 * 页面不要再自己从接口字段里猜哪个是「版本」。
 */

/** 5 种版本，各自有明确来源与展示名 */
export type VersionKind =
  | 'config'    // 配置发布序号
  | 'record'    // 历史记录主键
  | 'semver'    // 内容版本号
  | 'page'      // 页面版本
  | 'code'      // 微信代码包

export const VERSION_KIND_LABELS: Record<VersionKind, string> = {
  config: '配置发布序号',
  record: '历史记录 ID',
  semver: '内容版本号',
  page: '页面版本',
  code: '微信代码包',
}

export const VERSION_KIND_HINTS: Record<VersionKind, string> = {
  config: '每次「发布配置」递增一次，小程序据此判断是否需要刷新配置缓存',
  record: '发布记录表的自增主键，仅用于定位记录，数字大不代表发布次数多',
  semver: '发布记录上的语义化版本号，形如 1.12.0，其 patch 段等于配置发布序号',
  page: '单个页面自己的第几版，每个页面独立计数',
  code: '上传到微信后台的代码包版本，由开发者在微信开发者工具操作',
}

/**
 * 从 semver 里取配置发布序号。
 *
 * 🔴 2026-10-06 修正（这是「预览检查显示第 — 次发布」的真正根因）：
 * 内容发布记录写的 semver **不是标准 semver**，而是
 *   `MiniSiteServiceImpl.java:378` →  String semver = "c.0." + next;
 * 形如 `c.0.33`（重复时还会追加时间戳后缀 `c.0.33.12345`）。
 * 用标准 semver 正则 `^v?(\d+)\.(\d+)\.(\d+)` 去匹配 `c.0.33` 会**直接失败返回 null**
 * —— 于是线上预览页显示「第 — 次发布」。
 *
 * 同时保留对标准 semver（如 1.12.0）的兼容，因为整店模板那条链路用的仍是标准格式。
 * 两者的「第 N 次」都取 patch 段。
 */
export function releaseNoFromSemver(semver?: string | null): number | null {
  const s = String(semver || '').trim()
  if (!s) return null
  // 去掉可能存在的时间戳后缀（c.0.33.98765）
  const parts = s.split('.')
  if (parts.length < 3) return null
  // patch 段 = 最后一段之前的那个数字段（兼容 c.0.33 与 1.33.0）
  const patchRaw = parts[parts.length >= 4 ? parts.length - 2 : parts.length - 1]
  if (!/^\d+$/.test(patchRaw)) return null
  return Number(patchRaw)
}

export type VersionDisplay = {
  /** 主数值，格式化后的字符串；拿不到时为 '—'（明确表示未知，不伪装成 0） */
  text: string
  /** 完整版本串（若有），如 1.12.0 */
  semver?: string
  /** 数值型序号，页面里做算术时用 */
  no?: number
  available: boolean
}

export function formatVersion(kind: VersionKind, input: {
  releaseNo?: number | string | null
  semver?: string | null
  recordId?: number | string | null
  codeVersion?: string | null
  pageVersion?: number | string | null
}): VersionDisplay {
  switch (kind) {
    case 'config': {
      const no = toInt(input.releaseNo)
      return no == null
        ? { text: '—', available: false }
        : { text: `第 ${no} 次发布`, no, available: true }
    }
    case 'record': {
      const id = toInt(input.recordId)
      return id == null
        ? { text: '—', available: false }
        : { text: `#${id}`, no: id, available: true }
    }
    case 'semver': {
      const s = String(input.semver || '').trim()
      return s
        ? { text: s, semver: s, no: releaseNoFromSemver(s) ?? undefined, available: true }
        : { text: '—', available: false }
    }
    case 'page': {
      const v = toInt(input.pageVersion)
      return v == null
        ? { text: '—', available: false }
        : { text: `v${v}`, no: v, available: true }
    }
    case 'code': {
      const s = String(input.codeVersion || '').trim()
      return s ? { text: s, available: true } : { text: '未记录', available: false }
    }
    default:
      return { text: '—', available: false }
  }
}

function toInt(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 从 miniappReleases 记录里取出配置发布序号。
 * 2026-10-06：版本列表显示「第 28 次」而顶部显示 33，两者不是一回事 ——
 * 列表给的是 releaseNo 字段，而 semver 的 patch 才是权威序号。
 * 两个都给出，冲突时以 semver 为准并说明原因。
 */
export type ReleaseNoReading = {
  no: number | null
  /** 两个来源不一致时的说明；一致或只有一个来源时为 '' */
  note: string
}

export function readReleaseNo(record: {
  releaseNo?: number | null
  semver?: string | null
  id?: number | null
}): ReleaseNoReading {
  const fromSemver = releaseNoFromSemver(record?.semver)
  const fromField = toInt(record?.releaseNo)
  if (fromSemver != null && fromField != null) {
    if (fromSemver === fromField) return { no: fromSemver, note: '' }
    return {
      no: fromSemver,
      note: `记录序号字段为 ${fromField}，与版本号 ${record?.semver} 不一致，已按版本号取 ${fromSemver}`,
    }
  }
  if (fromSemver != null) return { no: fromSemver, note: '' }
  if (fromField != null) {
    return { no: fromField, note: '该记录没有版本号，暂用记录序号字段' }
  }
  return { no: null, note: '该记录既无版本号也无序号字段' }
}
