<template>
  <div
    v-if="isHero"
    class="brand-hero"
  >
    <div class="brand-hero__orb brand-hero__orb--one" />
    <div class="brand-hero__orb brand-hero__orb--two" />
    <div v-if="eyebrow" class="brand-hero__eyebrow">{{ eyebrow }}</div>
    <div class="brand-hero__who">
      <div class="brand-hero__av">
        <img v-if="logoUrl" :src="logoUrl" alt="" />
        <span v-else>{{ avatarText }}</span>
      </div>
      <div class="brand-hero__meta">
        <div class="brand-hero__title">
          {{ component.props.title || '品牌介绍' }}
          <span v-if="verified" class="brand-hero__vf">已认证</span>
        </div>
        <div v-if="heroDesc" class="brand-hero__bio">{{ heroDesc }}</div>
      </div>
    </div>
    <div v-if="kpiItems.length" class="brand-hero__kpi">
      <div v-for="item in kpiItems" :key="item.value + item.label">
        <b>{{ item.value }}</b>{{ item.label }}
      </div>
    </div>
  </div>
  <div
    v-else
    class="render-brand-intro split-text-typography"
    :class="[`logo-${logoPosition}`, `align-${contentAlign}`]"
  >
    <div v-if="logoUrl" class="logo-wrap" :style="logoBoxStyle">
      <img :src="logoUrl" alt="logo" class="logo" :style="logoImgStyle" />
    </div>
    <div class="text-wrap" :style="textBoxStyle">
      <div class="title" :style="titleStyle">{{ component.props.title || '品牌介绍' }}</div>
      <div v-if="component.props.subtitle" class="subtitle" :style="subtitleStyle">{{ component.props.subtitle }}</div>
      <div class="desc" :style="descStyle">{{ component.props.desc || '请输入品牌介绍内容' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const p = computed(() => props.component.props || {})
const logoUrl = computed(() => normalizeUploadUrl(String(p.value.logo || '')))
const eyebrow = computed(() => String(p.value.eyebrow || '').trim())
const avatarText = computed(() => String(p.value.avatar_text || '海').slice(0, 2))
const verified = computed(() => {
  const raw = p.value.verified
  if (raw === true || raw === 'true' || raw === 1) return true
  return /已认证/.test(String(p.value.subtitle || ''))
})
const heroDesc = computed(() => String(p.value.desc || p.value.description || '').trim())
const kpiItems = computed(() => {
  const raw = String(p.value.kpi || '').trim()
  if (!raw) return []
  return raw.split(/[·|]/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const matched = part.match(/^(\S+)\s*(.*)$/)
    return { value: matched?.[1] || part, label: matched?.[2] || '' }
  })
})
const isHero = computed(() => !!(eyebrow.value || kpiItems.value.length || p.value.avatar_text || p.value.variant === 'hero'))

const logoPosition = computed(() => {
  const raw = String(p.value.logo_position || 'top')
  return raw === 'left' || raw === 'right' ? raw : 'top'
})
const contentAlign = computed(() => {
  const raw = String(p.value.content_align || 'left')
  return raw === 'center' || raw === 'right' ? raw : 'left'
})

const logoBoxStyle = computed(() => {
  const x = Number(p.value.logo_offset_x || 0)
  const y = Number(p.value.logo_offset_y || 0)
  return { transform: `translate(${x}px, ${y}px)` }
})
const logoImgStyle = computed(() => {
  const size = Number(p.value.logo_size ?? 48)
  return { width: `${size}px`, height: `${size}px` }
})
const textBoxStyle = computed(() => {
  const x = Number(p.value.text_offset_x || 0)
  const y = Number(p.value.text_offset_y || 0)
  return { transform: `translate(${x}px, ${y}px)` }
})
const titleStyle = computed(() => titleFontStyle(p.value.title_font_size, 15))
const subtitleStyle = computed(() => titleFontStyle(p.value.subtitle_font_size, 11))
const descStyle = computed(() => titleFontStyle(p.value.desc_font_size, 12))

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.brand-hero {
  position: relative;
  overflow: hidden;
  margin: 10px 12px 0;
  padding: 16px;
  color: #fff;
  background: linear-gradient(138deg, #152443 0%, #2547af 60%, #315efb 100%);
  border-radius: 16px;
  box-shadow: 0 11px 24px rgba(30, 55, 125, 0.22);
}

.brand-hero__orb {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
}

.brand-hero__orb--one {
  top: -65px;
  right: -45px;
  width: 165px;
  height: 165px;
}

.brand-hero__orb--two {
  right: 45px;
  bottom: -90px;
  width: 150px;
  height: 150px;
  background: rgba(111, 147, 255, 0.15);
}

.brand-hero__eyebrow {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-hero__who {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-hero__av {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  overflow: hidden;
  color: #173068;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(145deg, #ffffff, #dfe7ff);
  border: 2px solid rgba(255, 255, 255, 0.36);
  border-radius: 14px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.brand-hero__title {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.brand-hero__vf {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  color: #315efb;
  font-size: 10px;
  font-weight: 700;
  background: #fff;
  border-radius: 999px;
  vertical-align: middle;
}

.brand-hero__bio {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  line-height: 1.45;
}

.brand-hero__kpi {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 16px;
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;

  b {
    margin-right: 2px;
    color: #fff;
    font-size: 14px;
  }
}

.render-brand-intro {
  display: flex;
  gap: 12px;
  padding: 12px;
  color: #fff;
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  border-radius: var(--card-radius, 10px);

  &.logo-top { flex-direction: column; }
  &.logo-left { flex-direction: row; align-items: flex-start; }
  &.logo-right { flex-direction: row-reverse; align-items: flex-start; }
  &.align-left { text-align: left; .logo-wrap { align-self: flex-start; } }
  &.align-center {
    text-align: center;
    &.logo-top .logo-wrap { align-self: center; }
  }
  &.align-right {
    text-align: right;
    &.logo-top .logo-wrap { align-self: flex-end; }
  }

  .logo-wrap { flex-shrink: 0; }
  .logo {
    object-fit: contain;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    display: block;
  }
  .text-wrap { flex: 1; min-width: 0; }
  .title { font-size: 15px; font-weight: 800; }
  .subtitle { margin-top: 4px; font-size: 11px; opacity: 0.85; }
  .desc { margin-top: 8px; font-size: 12px; line-height: 1.6; opacity: 0.92; }
}
</style>
