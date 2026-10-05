<template>
  <div
    class="promo-banner"
    :class="{ clickable: previewMode, 'promo-banner--glow': showGlow }"
    :style="bannerStyle"
    @click="onBannerClick"
  >
    <div class="promo-banner__title" :style="{ color: titleColor }">{{ title }}</div>
    <div class="promo-banner__subtitle" :style="{ color: subtitleColor }">{{ subtitle }}</div>
    <button
      type="button"
      class="promo-banner__btn"
      :style="{ background: buttonBg, color: buttonColor }"
      @click.stop="onButtonClick"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { resolvePreviewLinkAction, runPreviewLinkAction } from '@/utils/preview-link'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{ 'preview-action': [payload: Record<string, unknown>] }>()

const p = computed(() => props.component.props || {})
const title = computed(() => String(p.value.title || '年度会员 · 全站资料免费下'))
const subtitle = computed(() => String(p.value.subtitle || ''))
const buttonText = computed(() => String(p.value.button_text || '立即开通 ›'))
const buttonLink = computed(() => String(p.value.button_link || '/pages/member-center/member-center'))
const gradientFrom = computed(() => String(p.value.gradient_from || '#1d1b18'))
const gradientMid = computed(() => String(p.value.gradient_mid || '#3b2f22'))
const gradientTo = computed(() => String(p.value.gradient_to || '#7a4a1d'))
const titleColor = computed(() => String(p.value.title_color || '#f3dcaa'))
const subtitleColor = computed(() => String(p.value.subtitle_color || '#d9ccb8'))
const buttonBg = computed(() => String(p.value.button_bg || '#f3dcaa'))
const buttonColor = computed(() => String(p.value.button_color || '#3a2708'))
const showGlow = computed(() => p.value.show_glow !== false)

/**
 * 背景类型：显式 bg_type 优先；未设置时按「有渐变色」反推，
 * 保证历史页面（只有 gradient_from/to）外观不变。
 */
const bgType = computed<'solid' | 'gradient'>(() => {
  if (p.value.bg_type) return p.value.bg_type === 'solid' ? 'solid' : 'gradient'
  return p.value.gradient_from || p.value.gradient_to ? 'gradient' : 'solid'
})

/** 中间色可选：留空 / 关闭开关时退化为两色渐变 */
const useGradientMid = computed(() =>
  p.value.use_gradient_mid !== undefined ? Boolean(p.value.use_gradient_mid) : Boolean(p.value.gradient_mid),
)

/** 角度可配；未配置时沿用历史默认 135deg */
const gradientAngle = computed(() => {
  const n = Number(p.value.gradient_angle)
  return Number.isFinite(n) ? n : 135
})

const backgroundColor = computed(() => String(p.value.background_color || gradientFrom.value))

const bannerStyle = computed(() => {
  if (bgType.value === 'solid') {
    return { background: backgroundColor.value }
  }
  const stops = useGradientMid.value
    ? `${gradientFrom.value} 0%, ${gradientMid.value} 60%, ${gradientTo.value} 100%`
    : `${gradientFrom.value} 0%, ${gradientTo.value} 100%`
  return {
    background: `linear-gradient(${gradientAngle.value}deg, ${stops})`,
  }
})

function goLink(link: string, label: string) {
  if (!props.previewMode) return
  const action = resolvePreviewLinkAction({ link_type: 'page', link_url: link }, label)
  if (!action) {
    ElMessage.warning('未配置跳转链接')
    return
  }
  const message = runPreviewLinkAction(action, (payload) => emit('preview-action', payload))
  if (message) ElMessage.info(message)
}

function onButtonClick() {
  goLink(buttonLink.value, buttonText.value)
}

function onBannerClick() {
  goLink(buttonLink.value, title.value)
}
</script>

<style scoped lang="scss">
.promo-banner {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 16px;
  margin-top: 10px;
  box-sizing: border-box;
}
.promo-banner--glow::after {
  content: '';
  position: absolute;
  right: -30px;
  top: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(227, 179, 92, 0.18);
  pointer-events: none;
}
.promo-banner__title {
  position: relative;
  z-index: 1;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
}
.promo-banner__subtitle {
  position: relative;
  z-index: 1;
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.45;
}
.promo-banner__btn {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 10px;
  cursor: pointer;
}
.promo-banner.clickable {
  cursor: pointer;
}
</style>
