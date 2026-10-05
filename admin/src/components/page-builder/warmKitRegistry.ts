/**
 * 22 个新组件（5 大类）的统一聚合出口
 *
 * 桥接策略：registry / rendererMap / propsPanelMap 三处都只从这里取数据，
 * 避免同一份元数据散落三地后改一处漏两处（本项目已吃过亏）。
 */
import type { ComponentMeta } from './shared/contract'

/* ---------- 1. 星球互动（5） ---------- */
import { planetQaCardMeta } from './planet/planet-qa-card'
import { planetAskBannerMeta } from './planet/planet-ask-banner'
import { planetMembersStripMeta } from './planet/planet-members-strip'
import { planetChallengeCardMeta } from './planet/planet-challenge-card'
import { planetBenefitCardMeta } from './planet/planet-benefit-card'

/* ---------- 2. 增长转化（5） ---------- */
import { opCreatorBannerMeta } from './growth/op-creator-banner'
import { opQuoteCardMeta } from './growth/op-quote-card'
import { opSmartGroupCardMeta } from './growth/op-smart-group-card'
import { opReferralBannerMeta } from './growth/op-referral-banner'
import { opGatedDownloadCardMeta } from './growth/op-gated-download-card'

/* ---------- 3. 平排横滑（5） ---------- */
import { hPeekCarouselMeta } from './horizontal/h-peek-carousel'
import { hComparisonCardMeta } from './horizontal/h-comparison-card'
import { hMetricStripMeta } from './horizontal/h-metric-strip'
import { hFilterChipsMeta } from './horizontal/h-filter-chips'
import { hSplitBannerMeta } from './horizontal/h-split-banner'

/* ---------- 4. 深度内容（3） ---------- */
import { contentFaqAccordionMeta } from './content/content-faq-accordion'
import { contentMiniAudioMeta } from './content/content-mini-audio'
import { contentMilestoneTrackerMeta } from './content/content-milestone-tracker'

/* ---------- 5. 布局容器（4） ---------- */
import { layoutOverlapWrapperMeta } from './layout/layout-overlap-wrapper'
import { layoutPaperSheetMeta } from './layout/layout-paper-sheet'
import { layoutStickyWrapperMeta } from './layout/layout-sticky-wrapper'
import { layoutFlexibleGridMeta } from './layout/layout-flexible-grid'

/** 22 个新组件的 meta 清单，顺序 = 左侧面板展示顺序 */
export const WARM_KIT_METAS: ComponentMeta[] = [
  // 星球互动
  planetQaCardMeta,
  planetAskBannerMeta,
  planetMembersStripMeta,
  planetChallengeCardMeta,
  planetBenefitCardMeta,
  // 增长转化
  opCreatorBannerMeta,
  opQuoteCardMeta,
  opSmartGroupCardMeta,
  opReferralBannerMeta,
  opGatedDownloadCardMeta,
  // 平排横滑
  hPeekCarouselMeta,
  hComparisonCardMeta,
  hMetricStripMeta,
  hFilterChipsMeta,
  hSplitBannerMeta,
  // 深度内容
  contentFaqAccordionMeta,
  contentMiniAudioMeta,
  contentMilestoneTrackerMeta,
  // 布局容器
  layoutOverlapWrapperMeta,
  layoutPaperSheetMeta,
  layoutStickyWrapperMeta,
  layoutFlexibleGridMeta,
]

/** type → meta 快速索引 */
export const WARM_KIT_META_MAP: Map<string, ComponentMeta> = new Map(
  WARM_KIT_METAS.map((m) => [m.type as string, m]),
)

/** 本批组件的 type 集合，供 componentRegistry 判定「小程序端是否已支持渲染」 */
export const WARM_KIT_TYPES: Set<string> = new Set(
  WARM_KIT_METAS.map((m) => m.type as string),
)

/**
 * 画布 renderer 懒加载表
 * 路径必须是静态字面量，Vite 才能正确分包
 */
export const WARM_KIT_RENDERERS: Record<string, () => Promise<unknown>> = {
  planet_qa_card: () => import('./planet/planet-qa-card/editor.vue'),
  planet_ask_banner: () => import('./planet/planet-ask-banner/editor.vue'),
  planet_members_strip: () => import('./planet/planet-members-strip/editor.vue'),
  planet_challenge_card: () => import('./planet/planet-challenge-card/editor.vue'),
  planet_benefit_card: () => import('./planet/planet-benefit-card/editor.vue'),
  op_creator_banner: () => import('./growth/op-creator-banner/editor.vue'),
  op_quote_card: () => import('./growth/op-quote-card/editor.vue'),
  op_smart_group_card: () => import('./growth/op-smart-group-card/editor.vue'),
  op_referral_banner: () => import('./growth/op-referral-banner/editor.vue'),
  op_gated_download_card: () => import('./growth/op-gated-download-card/editor.vue'),
  h_peek_carousel: () => import('./horizontal/h-peek-carousel/editor.vue'),
  h_comparison_card: () => import('./horizontal/h-comparison-card/editor.vue'),
  h_metric_strip: () => import('./horizontal/h-metric-strip/editor.vue'),
  h_filter_chips: () => import('./horizontal/h-filter-chips/editor.vue'),
  h_split_banner: () => import('./horizontal/h-split-banner/editor.vue'),
  content_faq_accordion: () => import('./content/content-faq-accordion/editor.vue'),
  content_mini_audio: () => import('./content/content-mini-audio/editor.vue'),
  content_milestone_tracker: () => import('./content/content-milestone-tracker/editor.vue'),
  layout_overlap_wrapper: () => import('./layout/layout-overlap-wrapper/editor.vue'),
  layout_paper_sheet: () => import('./layout/layout-paper-sheet/editor.vue'),
  layout_sticky_wrapper: () => import('./layout/layout-sticky-wrapper/editor.vue'),
  layout_flexible_grid: () => import('./layout/layout-flexible-grid/editor.vue'),
}
