/**
 * 共享时间格式化。
 *
 * ===================== 为什么必须是共享的一份 =====================
 * 2026-10-06 一天内被同一类 bug 抓到两次：
 *   · pages-hub：`toLocaleString('zh-CN').slice(5, 16)` → 「10/6 07:15:」
 *   · releases-hub：`toLocaleString('zh-CN').slice(0, 16)` → 「2026/10/3 18:56:」
 *
 * 根因都是**假设了 toLocaleString 的输出宽度**：
 *   `toLocaleString('zh-CN')` 产出 `2026/10/3 18:56:00` —— 月/日**不补零**，
 *   整个字符串只有 **15** 字符（不是 16）。slice 到 16 就把秒的冒号露出来。
 * 🔴 而且它是**长度随日期跳变**的：10/3 少一位、12/25 正常。
 *    极难靠肉眼发现规律，必须用测试钉死。
 *
 * 所以：自己拼 + 补零，**完全不依赖任何 locale 输出的宽度**。
 */

/** 完整 `YYYY-MM-DD HH:mm`（跨年也带年份，用于版本/快照这类需要精确识别的场景） */
export function formatDateTimeFull(v?: string | number | null): string {
  const d = toDate(v)
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 短 `MM-DD HH:mm`（列表里用；今年不显示年，重复年份只会挤掉真正的信息） */
export function formatDateTimeShort(v?: string | number | null): string {
  const d = toDate(v)
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 只取日期 `MM-DD` */
export function formatDateOnly(v?: string | number | null): string {
  const d = toDate(v)
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 解析时间。
 *
 * ⚠️ 为什么要 `replace(/-/g, '/')`：
 *   `new Date('2026-10-06 07:15:00')` 在 iOS / 部分 WebView 里是 **Invalid Date**
 *   （项目铁律：iOS 不支持带横杠的空格分隔格式）。
 */
function toDate(v?: string | number | null): Date | null {
  if (v == null || v === '') return null
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(/-/g, '/'))
  return Number.isNaN(d.getTime()) ? null : d
}