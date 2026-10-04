/**
 * 装修器画布设备预设。
 *
 * 背景：小程序用 rpx（750rpx = 屏幕宽），但后台装修器是用 px 写死一套「手机壳」在渲染。
 * 只看一种尺寸，遇到 iPhone SE 小屏或 Pro Max 大屏就发现不了「按钮换行 / 图文挤压 / 留白过多」。
 * 这里把画布尺寸抽成可切换的设备档位，切换时只改外框宽高 + 刘海形态，
 * 内部组件仍按 100% 宽度自适应，从而真实反映不同机型下的换行与对齐表现。
 *
 * ## 尺寸口径（重要，别再标错）
 *
 * 这里所有 width/height 一律是**逻辑像素（CSS px / iOS 点 / Android dp）**，
 * 不是物理像素。依据：
 * - iOS：Apple 官方 HIG《布局》表格直接给出「点」尺寸，@3x 物理像素 = 点 ×3。
 * - Android：逻辑宽 = 物理宽 ÷ DPR。主流国产旗舰 DPR 均为 3（DPR 2.75/3.5 的机型
 *   分布很碎，逐一标注反而不准，故按主流 3x 换算并与同宽档位合并）。
 *
 * 验算示例：
 * - iPhone 15 物理 1179×2556 @3x → 393×852 ✅
 * - 小米 14 物理 1200×2670 @3x → 400×890
 * - 华为 Mate 60 Pro 物理 1260×2720 @3x → 420×907
 * - OPPO Find X7 物理 1264×2780 @3x → 421×927（与荣耀 Magic6 同宽，归为一档）
 * - 红米 K70 物理 1440×3200 @3x → 480×1067（2K 宽屏，国产最宽一档）
 *
 * 标物理像素才是常见错误来源：小米 14 写「1200×2670」会让人误以为要渲染 1200px 宽，
 * 而真机 WebView / 小程序逻辑视口只有 400 CSS px。rpx 会按逻辑宽换算，跟物理像素无关。
 *
 * ## 为什么不逐款机型全列
 *
 * 逻辑宽度 360/390/393/400/412/420/430/440/480 这几档才真正影响 rpx 换算与换行，
 * 同一档内机型（如 iPhone 15 与 16）布局表现完全一致。
 * 所以每档标注 1~2 个代表机型 + 物理像素，既能对上真机又不至于让列表长到没法用。
 * 需要精确到某款真机时看 hint / aliases 里的机型名。
 */

export type PreviewNotch = 'none' | 'island' | 'punch'

/** 分组：下拉菜单按此排序，iOS → Android → 平板 */
export type PreviewGroup = 'ios' | 'android' | 'tablet'

export interface PreviewDevice {
  key: string
  /** 设备名，控件与标题展示用 */
  label: string
  /** 同宽代表机型，便于对真机核对 */
  aliases?: string
  /** 逻辑宽（CSS px / dp） */
  width: number
  /** 逻辑高（CSS px / dp），不含刘海 */
  height: number
  /** 物理像素，仅作核对参考，不参与渲染 */
  physical?: string
  /** 刘海形态：none=无刘海直屏、island=灵动岛、punch=居中挖孔 */
  notch: PreviewNotch
  /** 刘海区高度（px），notch=none 时为 0 */
  notchHeight: number
  /** 机身圆角（px）；0 = 不画圆角黑边（iPhone SE3 这类无 Home 键的老机型） */
  radius: number
  group: PreviewGroup
  /** 一句话说明，出现在下拉项副标题 */
  hint: string
}

export const PREVIEW_GROUPS: { key: PreviewGroup; label: string }[] = [
  { key: 'ios', label: 'iPhone' },
  { key: 'android', label: 'Android' },
  { key: 'tablet', label: '平板' },
]

export const PREVIEW_DEVICES: PreviewDevice[] = [
  // ── iOS ──────────────────────────────────────────────
  {
    key: 'se3',
    label: 'iPhone SE (3)',
    aliases: '8 / 7 / SE2',
    width: 375,
    height: 667,
    physical: '750×1334 @2x',
    notch: 'none',
    notchHeight: 0,
    radius: 0,
    group: 'ios',
    hint: 'iPhone 最窄一档，带 Home 键，换行与溢出最先暴露',
  },
  {
    key: 'mini',
    label: 'iPhone 13 mini',
    aliases: '12 mini',
    width: 360,
    height: 780,
    physical: '1080×2340 @3x',
    notch: 'island',
    notchHeight: 26,
    radius: 38,
    group: 'ios',
    hint: '全系最窄全面屏，比 iPhone 14 还窄 30px',
  },
  {
    key: 'ip14',
    label: 'iPhone 14',
    aliases: '13 / 13 Pro / 12',
    width: 390,
    height: 844,
    physical: '1170×2532 @3x',
    notch: 'island',
    notchHeight: 28,
    radius: 42,
    group: 'ios',
    hint: '国内用户最多的 iPhone 档位',
  },
  {
    key: 'ip15',
    label: 'iPhone 15 / 16',
    aliases: '15 Pro / 14 Pro',
    width: 393,
    height: 852,
    physical: '1179×2556 @3x',
    notch: 'island',
    notchHeight: 28,
    radius: 44,
    group: 'ios',
    hint: 'iPhone 标准档，仅比 14 宽 3px',
  },
  {
    key: 'plus',
    label: 'iPhone 15 Plus',
    aliases: '14 Plus / 13 Pro Max',
    width: 430,
    height: 932,
    physical: '1290×2796 @3x',
    notch: 'island',
    notchHeight: 30,
    radius: 46,
    group: 'ios',
    hint: 'iPhone 大杯，暴露留白过多',
  },
  {
    key: 'ipmax',
    label: 'iPhone 15 Pro Max',
    aliases: '16 Pro Max',
    width: 440,
    height: 956,
    physical: '1320×2868 @3x',
    notch: 'island',
    notchHeight: 30,
    radius: 48,
    group: 'ios',
    hint: 'iPhone 全系最宽，最容易看出布局偏窄',
  },

  // ── Android（按逻辑宽 360/400/412/420/480 归并）────────────
  {
    key: 'and360',
    label: 'Android 窄屏',
    aliases: '华为 Mate 40 / 小米 12 / 三星 S24',
    width: 360,
    height: 780,
    physical: '1080×2340 @3x',
    notch: 'punch',
    notchHeight: 24,
    radius: 32,
    group: 'android',
    hint: '安卓最主流窄屏，1080×2340 那一批',
  },
  {
    key: 'and400',
    label: '小米 14',
    aliases: '小米 13 / 15',
    width: 400,
    height: 890,
    physical: '1200×2670 @3x',
    notch: 'punch',
    notchHeight: 24,
    radius: 36,
    group: 'android',
    hint: '国产旗舰主力档，1200 物理宽',
  },
  {
    key: 'pixel',
    label: 'Google Pixel 8',
    aliases: 'Pixel 8 Pro（海外）',
    width: 412,
    height: 892,
    physical: '1080×2400 @2.625x',
    notch: 'punch',
    notchHeight: 24,
    radius: 34,
    group: 'android',
    hint: '唯一 DPR 2.625 的主流档，海外版小程序适用',
  },
  {
    key: 'and420',
    label: '华为 Mate 60 Pro',
    aliases: 'OPPO Find X7 / 荣耀 Magic6',
    width: 420,
    height: 907,
    physical: '1260×2720 @3x',
    notch: 'punch',
    notchHeight: 26,
    radius: 38,
    group: 'android',
    hint: '国产大杯主流，1260 物理宽那一批',
  },
  {
    key: 'and480',
    label: '红米 K70',
    aliases: '2K 宽屏国产机',
    width: 480,
    height: 1067,
    physical: '1440×3200 @3x',
    notch: 'punch',
    notchHeight: 26,
    radius: 40,
    group: 'android',
    hint: '国产最宽一档，1440 物理宽，双列会显得很挤',
  },

  // ── 平板 ─────────────────────────────────────────────
  {
    key: 'pad',
    label: 'iPad mini',
    width: 744,
    height: 1133,
    physical: '1488×2266 @2x',
    notch: 'none',
    notchHeight: 0,
    radius: 24,
    group: 'tablet',
    hint: '平板宽屏，多列布局体检',
  },
  {
    key: 'ipad',
    label: 'iPad Pro 11″',
    width: 834,
    height: 1194,
    physical: '1668×2388 @2x',
    notch: 'none',
    notchHeight: 0,
    radius: 22,
    group: 'tablet',
    hint: '最宽一档，超宽屏排版上限',
  },
]

export const DEFAULT_PREVIEW_DEVICE_KEY = 'ip15'

/** 分组内按逻辑宽度升序，供下拉菜单渲染 */
export function getPreviewGroupDevices(group: PreviewGroup): PreviewDevice[] {
  return PREVIEW_DEVICES.filter((d) => d.group === group).sort((a, b) => a.width - b.width)
}

export function resolvePreviewDevice(key: string | null | undefined): PreviewDevice {
  return (
    PREVIEW_DEVICES.find((d) => d.key === key) ??
    PREVIEW_DEVICES.find((d) => d.key === DEFAULT_PREVIEW_DEVICE_KEY) ??
    PREVIEW_DEVICES[0]
  )
}
