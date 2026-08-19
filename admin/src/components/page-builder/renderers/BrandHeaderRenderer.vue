<template>
  <div
    class="render-brand-header"
    :class="{ 'is-gradient': isGradient }"
    :style="rootStyle"
  >
    <div class="render-brand-header__safe" aria-hidden="true" />
    <div class="render-brand-header__bar" :style="barPaddingStyle">
      <div v-if="showBrandSlot" class="render-brand-header__brand">
        <img v-if="logoUrl" :src="logoUrl" alt="" class="render-brand-header__logo" :style="logoStyle" />
        <span v-else-if="logoText" class="render-brand-header__logo-text" :style="logoTextStyle">{{ logoText }}</span>
      </div>
      <div v-if="showDivider && showBrandSlot" class="render-brand-header__divider" :style="dividerStyle" />
      <div class="render-brand-header__text">
        <div class="render-brand-header__title" :style="titleStyle">{{ titleText }}</div>
        <div v-if="subtitleText" class="render-brand-header__subtitle" :style="subtitleStyle">{{ subtitleText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { normalizeUploadUrl } from '@/api/system'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const p = computed(() => props.component.props || {})

function resolveLogoText(raw: unknown) {
  if (raw === undefined || raw === null) return ''
  return String(raw).trim()
}

const isGradient = computed(() => p.value.style_type === 'gradient')
const showDivider = computed(() => p.value.show_divider !== false)

const logoUrl = computed(() => {
  const raw = String(p.value.logo || '').trim()
  return raw ? (normalizeUploadUrl(raw) || raw) : ''
})
const logoText = computed(() => resolveLogoText(p.value.logo_text))
const showBrandSlot = computed(() => !!logoUrl.value || !!logoText.value)
const titleText = computed(() => String(p.value.title || '墨太白 · 跨境工具与知识平台').trim())
const subtitleText = computed(() => String(p.value.subtitle || '').trim())

const logoHeight = computed(() => Math.max(Number(p.value.logo_height ?? 28), 20))
const padLeft = computed(() => Math.max(Number(p.value.bar_padding_left ?? 12), 0))
const padRight = computed(() => Math.max(Number(p.value.bar_padding_right ?? 12), 0))

const titleColor = computed(() => {
  if (isGradient.value) return p.value.title_color_light || '#ffffff'
  return p.value.title_color || '#172033'
})

const rootStyle = computed(() => {
  if (isGradient.value) {
    const from = p.value.gradient_from || '#002FA7'
    const to = p.value.gradient_to || '#1A4BBF'
    return { background: `linear-gradient(90deg, ${from} 0%, ${to} 100%)` }
  }
  return { background: p.value.background_color || '#ffffff' }
})

const barPaddingStyle = computed(() => ({
  paddingLeft: `${padLeft.value}px`,
  paddingRight: `${Math.max(padRight.value, 96)}px`,
}))

const logoStyle = computed(() => ({
  height: `${logoHeight.value}px`,
  maxWidth: `${Math.max(Number(p.value.logo_max_width ?? 88), 48)}px`,
}))

const logoTextStyle = computed(() => ({
  color: p.value.logo_text_color || (isGradient.value ? '#ffffff' : '#002FA7'),
  fontSize: `${Number(p.value.logo_text_font_size ?? 15)}px`,
}))

const titleStyle = computed(() => ({
  color: titleColor.value,
  fontSize: `${Number(p.value.title_font_size ?? 15)}px`,
  fontWeight: 700,
}))

const subtitleStyle = computed(() => ({
  color: isGradient.value
    ? (p.value.subtitle_color_light || 'rgba(255,255,255,0.82)')
    : (p.value.subtitle_color || '#7b8798'),
  fontSize: `${Number(p.value.subtitle_font_size ?? 11)}px`,
}))

const dividerStyle = computed(() => ({
  background: p.value.divider_color || (isGradient.value ? 'rgba(255,255,255,0.35)' : '#d0d8e8'),
}))
</script>

<style scoped lang="scss">
.render-brand-header {
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #eef1f6;

  &.is-gradient {
    border-bottom-color: rgba(255, 255, 255, 0.12);
  }
}

.render-brand-header__safe {
  height: 22px;
}

.render-brand-header__bar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding-top: 8px;
  padding-bottom: 10px;
  box-sizing: border-box;
}

.render-brand-header__brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.render-brand-header__logo {
  width: auto;
  object-fit: contain;
  display: block;
}

.render-brand-header__logo-text {
  font-weight: 800;
  white-space: nowrap;
}

.render-brand-header__divider {
  flex-shrink: 0;
  width: 1px;
  height: 18px;
  margin: 0 10px;
}

.render-brand-header__text {
  flex: 1;
  min-width: 0;
}

.render-brand-header__title {
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-brand-header__subtitle {
  margin-top: 2px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
