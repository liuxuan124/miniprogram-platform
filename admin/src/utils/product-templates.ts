/**
 * 商品详情模板注册表（admin 选择器 + 预览共用；小程序端 detail-template-render.js 也按此枚举分流）
 *
 * 命名约定：{style}_{variant}
 *   style ∈ column | ebook | digital | physical
 *   variant ∈ classic | (compact|reader|checklist|video|minimal|showcase|story)
 *
 * 空值（detail_template = '' 或 null）= 按 productType 自动分流到对应 *_classic：
 *   column/ebook → ebook_classic；resource_pack/digital → digital_classic；其余 → physical_classic
 *
 * 新增模板只需在此数组追加一项，admin 选择器与预览自动出现；小程序端需补对应 WXML 分支。
 */
export interface ProductDetailTemplate {
  id: string
  /** 所属样式分组（用于下拉分组） */
  group: 'column' | 'ebook' | 'digital' | 'physical'
  /** 分组中文名 */
  groupLabel: string
  /** 模板中文名 */
  label: string
  /** 一句话设计意图，给运营看 */
  intent: string
}

export const PRODUCT_DETAIL_TEMPLATES: ProductDetailTemplate[] = [
  // 专栏 column
  { id: 'column_classic', group: 'column', groupLabel: '专栏 · 课程/连载', label: '经典课程', intent: '大封面+早鸟倒计时+讲师卡+章节目录（目录/评价/FAQ 三段切换）' },
  { id: 'column_compact', group: 'column', groupLabel: '专栏 · 课程/连载', label: '紧凑列表', intent: '小封面+价格置顶+章节列表为主，适合章节多的专栏' },
  { id: 'column_story', group: 'column', groupLabel: '专栏 · 课程/连载', label: '故事化', intent: '全屏封面+滚动作序+章节卡片沉浸式，弱化营销元素' },

  // 电子书 ebook
  { id: 'ebook_classic', group: 'ebook', groupLabel: '电子书', label: '经典书架', intent: '书本封面+首发倒计时+试读进度+目录+读者评价' },
  { id: 'ebook_reader', group: 'ebook', groupLabel: '电子书', label: '阅读器风', intent: '极简白底+大字标题+目录为主，弱化营销元素' },
  { id: 'ebook_showcase', group: 'ebook', groupLabel: '电子书', label: '展示卡', intent: '封面居中+卖点卡片堆叠+评价墙，适合强推单品' },

  // 虚拟资料包 digital
  { id: 'digital_classic', group: 'digital', groupLabel: '虚拟资料包', label: '经典资料包', intent: '封面/视频+价格+你将获得+关于本包+虚拟说明' },
  { id: 'digital_checklist', group: 'digital', groupLabel: '虚拟资料包', label: '清单风', intent: '封面+「你将获得」清单为主+规格紧凑，强获得感' },
  { id: 'digital_video', group: 'digital', groupLabel: '虚拟资料包', label: '视频主打', intent: '宣传视频置顶+卖点字幕+底部价格，适合视频带货' },

  // 实物 physical
  { id: 'physical_classic', group: 'physical', groupLabel: '实物商品', label: '经典电商', intent: 'swiper+价格+规格+优惠券+服务+rich-text+评价' },
  { id: 'physical_minimal', group: 'physical', groupLabel: '实物商品', label: '极简卡片', intent: '单图+大价格+规格入口+短描述，无 rich-text 长图' },
  { id: 'physical_story', group: 'physical', groupLabel: '实物商品', label: '故事化长图', intent: '全屏封面+滚动作序+rich-text 长图文+底部 CTA' },
]

/** 分组列表（去重，保序） */
export const PRODUCT_DETAIL_TEMPLATE_GROUPS: { group: ProductDetailTemplate['group']; label: string }[] = (() => {
  const seen = new Set<string>()
  const out: { group: ProductDetailTemplate['group']; label: string }[] = []
  for (const t of PRODUCT_DETAIL_TEMPLATES) {
    if (seen.has(t.group)) continue
    seen.add(t.group)
    out.push({ group: t.group, label: t.groupLabel })
  }
  return out
})()

/** 按 id 查模板；找不到返回 null（调用方应回退到自动判断） */
export function findTemplate(id: string | null | undefined): ProductDetailTemplate | null {
  if (!id) return null
  return PRODUCT_DETAIL_TEMPLATES.find((t) => t.id === id) || null
}

/**
 * 按 productType 推断默认模板（detail_template 为空时用）。
 * 与小程序端 product-detail.js 的自动分流保持同源。
 */
export function autoTemplateByProductType(productType: string | null | undefined): string {
  const pt = String(productType || 'physical').toLowerCase()
  if (/column|专栏/.test(pt)) return 'column_classic'
  if (/ebook|电子书/.test(pt)) return 'ebook_classic'
  if (/digital|resource_pack|虚拟|资料/.test(pt)) return 'digital_classic'
  return 'physical_classic'
}

/** 解析最终生效模板：显式配置优先，否则按 productType 自动 */
export function resolveTemplate(detailTemplate: string | null | undefined, productType: string | null | undefined): string {
  return detailTemplate || autoTemplateByProductType(productType)
}
