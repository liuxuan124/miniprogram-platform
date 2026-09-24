import { ComponentType, type ComponentInstance } from '@/types/page'
import { getDefaultProps, getDefaultStyle } from './componentRegistry'

/** 墨太白 · 星球加入落地页区块组合（ComponentPanel / 模板中心复用） */
export function buildPlanetJoinLandingComponents(): ComponentInstance[] {
  const mk = (type: ComponentType, propsPatch: Record<string, unknown> = {}): ComponentInstance => ({
    id: `blk_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    props: { ...getDefaultProps(type), ...propsPatch },
    style: {
      ...getDefaultStyle(type),
      ...(type === ComponentType.PlanetHero
        ? { background_color: '#1a1a2e', text_color: '#f5e6c8' }
        : {}),
    },
  })

  return [
    mk(ComponentType.PlanetHero, {
      title: '跨境墨太白 · 知识星球',
      subtitle: '深度问答、资料与同路人',
      show_stats: true,
      accent_gold: true,
    }),
    mk(ComponentType.FeatureCards, {
      title: '加入权益',
      items: [
        { title: '精选资料包', desc: '跨境合规、物流、税务合集' },
        { title: '星主答疑', desc: '48h 内付费问答优先响应' },
        { title: '同行圈', desc: '少广告、多实操的交流氛围' },
      ],
    }),
    mk(ComponentType.BrandIntro, {
      title: '星主介绍',
      desc: '跨境墨太白团队 · 专注出海资讯与实操陪跑',
      avatar_text: '墨',
    }),
    mk(ComponentType.PlanetFeed, {
      title: '星球预览',
      limit: 3,
      preview_mode: true,
    }),
    mk(ComponentType.RichText, {
      html: '<p><strong>常见问题</strong></p><p>Q：未加入能否试看？<br/>A：可浏览预览动态，全文与资料需加入。</p><p>Q：是否支持退款？<br/>A：7 天内未深度使用可申请（以星球页说明为准）。</p>',
    }),
    mk(ComponentType.JoinGroup, {
      title: '立即加入星球',
      button_text: '加入星球',
      hint: '底部栏展示价格与咨询入口，已加入用户可配置跳转星球首页',
      link_url: '/pages/planet/planet',
    }),
  ]
}

export const PLANET_JOIN_LANDING_BLOCK = {
  key: 'planet-join-landing',
  label: '星球加入落地页',
  desc: '墨太白：顶栏+权益+星主+预览+FAQ+底栏购买',
  category: 'planet' as const,
  types: [
    ComponentType.PlanetHero,
    ComponentType.FeatureCards,
    ComponentType.BrandIntro,
    ComponentType.PlanetFeed,
    ComponentType.RichText,
    ComponentType.JoinGroup,
  ],
}
