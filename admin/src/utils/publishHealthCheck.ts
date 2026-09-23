import type { ComponentInstance } from '@/types/page'
import { getComponentDef } from '@/components/page-builder/componentRegistry'

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i

function isLikelyBrokenImage(url: unknown): boolean {
  const s = String(url || '').trim()
  if (!s) return true
  if (s.startsWith('data:')) return false
  if (s.includes('placeholder') || s.includes('example.com')) return true
  return false
}

function collectImagesFromProps(type: string, props: Record<string, unknown>): string[] {
  const urls: string[] = []
  if (type === 'banner' && Array.isArray(props.images)) {
    props.images.forEach((img: any) => {
      if (img?.image) urls.push(String(img.image))
    })
  }
  if (type === 'image' && props.url) urls.push(String(props.url))
  if (type === 'nav' && Array.isArray(props.items)) {
    props.items.forEach((it: any) => {
      if (it?.icon && IMAGE_EXT.test(String(it.icon))) urls.push(String(it.icon))
    })
  }
  return urls
}

/** 发布前体检：重复组件、空数据、破图、首屏过长等 */
export function runPublishHealthCheck(components: ComponentInstance[]): {
  score: number
  warnings: string[]
  blocking: string[]
} {
  const warnings: string[] = []
  const blocking: string[] = []

  if (!components.length) {
    blocking.push('页面没有任何组件，发布后将展示空页面')
    return { score: 0, warnings, blocking }
  }

  const typeCounts = new Map<string, number>()
  components.forEach((c) => {
    typeCounts.set(c.type, (typeCounts.get(c.type) || 0) + 1)
  })
  typeCounts.forEach((count, type) => {
    if (count >= 3 && !['divider', 'spacer', 'section_title'].includes(type)) {
      const label = getComponentDef(type as any)?.label || type
      warnings.push(`「${label}」重复 ${count} 次，首屏可能显得拥挤`)
    }
  })

  if (components.length > 14) {
    warnings.push(`页面组件较多（${components.length} 个），首屏加载可能偏慢`)
  }

  components.forEach((comp, index) => {
    const label = getComponentDef(comp.type as any)?.label || comp.type
    const prefix = `${label}（第 ${index + 1} 块）`
    const props = comp.props || {}

    if (comp.type === 'product_list' && !comp.data_source && !props.data_source) {
      warnings.push(`${prefix}未配置商品数据源，发布后可能为空`)
    }
    if (comp.type === 'article_list' && !comp.data_source && !props.data_source) {
      warnings.push(`${prefix}未配置文章数据源，发布后可能为空`)
    }

    const imgs = collectImagesFromProps(String(comp.type), props)
    imgs.forEach((url) => {
      if (isLikelyBrokenImage(url)) {
        warnings.push(`${prefix}存在疑似无效或占位图片地址`)
      }
    })
  })

  const uniqWarnings = [...new Set(warnings)]
  const uniqBlocking = [...new Set(blocking)]
  const penalty = uniqWarnings.length * 4 + uniqBlocking.length * 25
  const score = Math.max(0, Math.min(100, 100 - penalty))

  return { score, warnings: uniqWarnings, blocking: uniqBlocking }
}
