/**
 * 组件类型 → 渲染器 的共享映射
 * =================================
 *
 * 抽出来的原因（2026-10-05）：画布 ComponentItem.vue 与区块缩略图
 * BlockNodeRenderer.vue 必须用**同一套** renderer，否则卡片里看到的
 * 效果会和画布/线上不一致——这正是「所见即所得」的前提。
 * 新增组件类型时只改这里一处。
 *
 * 注意：本模块只做「类型→组件」映射，不含任何交互语义。
 */

import { defineAsyncComponent } from 'vue'
import { ComponentType } from '@/types/page'

export const rendererMap: Record<string, any> = {
  [ComponentType.Banner]: defineAsyncComponent(() => import('./BannerRenderer.vue')),
  [ComponentType.Search]: defineAsyncComponent(() => import('./SearchRenderer.vue')),
  [ComponentType.NoticeBar]: defineAsyncComponent(() => import('./NoticeBarRenderer.vue')),
  [ComponentType.Image]: defineAsyncComponent(() => import('./ImageRenderer.vue')),
  [ComponentType.Nav]: defineAsyncComponent(() => import('./NavRenderer.vue')),
  [ComponentType.CategoryNav]: defineAsyncComponent(() => import('./CategoryNavRenderer.vue')),
  [ComponentType.ProductList]: defineAsyncComponent(() => import('./ProductListRenderer.vue')),
  [ComponentType.FlashSale]: defineAsyncComponent(() => import('./FlashSaleRenderer.vue')),
  [ComponentType.ArticleList]: defineAsyncComponent(() => import('./ArticleListRenderer.vue')),
  [ComponentType.ArticleFeed]: defineAsyncComponent(() => import('./ArticleFeedRenderer.vue')),
  [ComponentType.NoteFeed]: defineAsyncComponent(() => import('./NoteFeedRenderer.vue')),
  [ComponentType.MomentsFeed]: defineAsyncComponent(() => import('./MomentsFeedRenderer.vue')),
  [ComponentType.HotNews]: defineAsyncComponent(() => import('./HotNewsRenderer.vue')),
  [ComponentType.ActivityEntry]: defineAsyncComponent(() => import('./ActivityEntryRenderer.vue')),
  [ComponentType.ActivityList]: defineAsyncComponent(() => import('./ActivityListRenderer.vue')),
  [ComponentType.AppointmentService]: defineAsyncComponent(() => import('./AppointmentServiceRenderer.vue')),
  [ComponentType.MemberCard]: defineAsyncComponent(() => import('./MemberCardRenderer.vue')),
  [ComponentType.PromoBanner]: defineAsyncComponent(() => import('./PromoBannerRenderer.vue')),
  [ComponentType.Coupon]: defineAsyncComponent(() => import('./CouponRenderer.vue')),
  [ComponentType.Video]: defineAsyncComponent(() => import('./VideoRenderer.vue')),
  [ComponentType.BrandIntro]: defineAsyncComponent(() => import('./BrandIntroRenderer.vue')),
  [ComponentType.ImageText]: defineAsyncComponent(() => import('./ImageTextRenderer.vue')),
  [ComponentType.ContactInfo]: defineAsyncComponent(() => import('./ContactInfoRenderer.vue')),
  [ComponentType.Certificate]: defineAsyncComponent(() => import('./CertificateRenderer.vue')),
  [ComponentType.Countdown]: defineAsyncComponent(() => import('./CountdownRenderer.vue')),
  [ComponentType.FloatButton]: defineAsyncComponent(() => import('./FloatButtonRenderer.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./RichTextRenderer.vue')),
  [ComponentType.ContentPaywall]: defineAsyncComponent(() => import('./ContentPaywallRenderer.vue')),
  [ComponentType.MaterialList]: defineAsyncComponent(() => import('./MaterialListRenderer.vue')),
  [ComponentType.MemberPlan]: defineAsyncComponent(() => import('./MemberPlanRenderer.vue')),
  [ComponentType.QaList]: defineAsyncComponent(() => import('./QaListRenderer.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./SectionTitleRenderer.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./DividerRenderer.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./SpacerRenderer.vue')),
  [ComponentType.FormEntry]: defineAsyncComponent(() => import('./FormEntryRenderer.vue')),
  [ComponentType.AIEntry]: defineAsyncComponent(() => import('./AIEntryRenderer.vue')),
  [ComponentType.JoinGroup]: defineAsyncComponent(() => import('./JoinGroupRenderer.vue')),
  [ComponentType.BrandHeader]: defineAsyncComponent(() => import('./BrandHeaderRenderer.vue')),
  [ComponentType.Container]: defineAsyncComponent(() => import('./ContainerRenderer.vue')),
  [ComponentType.ImageHotspot]: defineAsyncComponent(() => import('./ImageHotspotRenderer.vue')),
  [ComponentType.SectionBg]: defineAsyncComponent(() => import('./SectionBgRenderer.vue')),
  [ComponentType.FeatureCards]: defineAsyncComponent(() => import('./FeatureCardsRenderer.vue')),
  [ComponentType.ImageCube]: defineAsyncComponent(() => import('./ImageCubeRenderer.vue')),
  [ComponentType.ContentTabs]: defineAsyncComponent(() => import('./ContentTabsRenderer.vue')),
  [ComponentType.PlanetHero]: defineAsyncComponent(() => import('./PlanetHeroRenderer.vue')),
  [ComponentType.PlanetTopics]: defineAsyncComponent(() => import('./PlanetTopicsRenderer.vue')),
  [ComponentType.PlanetFeed]: defineAsyncComponent(() => import('./PlanetFeedRenderer.vue')),
  [ComponentType.WarmGreet]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmAuthors]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmFeature]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmColumns]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmPlanetRec]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmFeed]: defineAsyncComponent(() => import('./warm/DslWarmBlock.vue')),
  [ComponentType.WarmHome]: defineAsyncComponent(() => import('./WarmShellRenderer.vue')),
  [ComponentType.WarmDiscover]: defineAsyncComponent(() => import('./WarmShellRenderer.vue')),
  [ComponentType.WarmPlanet]: defineAsyncComponent(() => import('./WarmShellRenderer.vue')),
  [ComponentType.WarmShop]: defineAsyncComponent(() => import('./WarmShellRenderer.vue')),
  [ComponentType.WarmMine]: defineAsyncComponent(() => import('./WarmShellRenderer.vue')),
}

/** 历史 DSL / 外部组件别名 → 已注册类型 */
export const COMPONENT_TYPE_ALIASES: Record<string, string> = {
  'flow-ai-assistant': ComponentType.AIEntry,
  flow_ai_assistant: ComponentType.AIEntry,
  'flow-ai': ComponentType.AIEntry,
}

const warnedTypes = new Set<string>()

/** 解析渲染器；未注册类型回落到占位并 warn 一次（避免刷屏） */
export function resolveRenderer(type: string) {
  const key = COMPONENT_TYPE_ALIASES[type] || type
  if (rendererMap[key]) return rendererMap[key]
  if (!warnedTypes.has(type)) {
    warnedTypes.add(type)
    console.warn(`[page-builder] 未知组件 type "${type}"，画布以占位展示，小程序端将跳过渲染`)
  }
  return defineAsyncComponent(() => import('./UnknownComponentRenderer.vue'))
}
