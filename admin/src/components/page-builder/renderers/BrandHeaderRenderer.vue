<template>
  <div
    ref="rootEl"
    class="bh"
    :class="[
      `bh--${cfg.bg_mode}`,
      { 'bh--sticky': cfg.sticky, 'bh--blur': cfg.sticky && cfg.backdrop_blur, 'bh--empty': isBlank },
    ]"
    :style="rootStyle"
  >
    <!-- 状态栏安全区（仅画布模拟，端上用真实 statusBarHeight） -->
    <div class="bh__safe" aria-hidden="true"></div>

    <div
      class="bh__bar"
      :style="barStyle"
      @click="onBarClick"
    >
      <!-- Logo 区 -->
      <div v-if="cfg.logo_mode !== 'none' && (showsImage || showsText)" class="bh__brand">
        <img v-if="showsImage && logoUrl && !logoBroken" class="bh__logo" :src="logoUrl" :style="logoStyle" alt="" @error="logoBroken = true" />
        <span v-if="showsText && cfg.logo_text" class="bh__logo-text" :style="logoTextStyle">{{ cfg.logo_text }}</span>
        <span v-if="!hasLogoContent" class="bh__logo-ph">{{ showsImage ? 'LOGO' : '品牌' }}</span>
      </div>

      <!-- Logo 与标题之间的竖线 -->
      <span v-if="cfg.show_divider && cfg.logo_mode !== 'none' && hasLogoContent" class="bh__divider" :style="dividerStyle"></span>

      <!-- 文案区 -->
      <div class="bh__text">
        <template v-if="!isBlank">
          <div class="bh__title" :style="titleStyle">{{ cfg.title }}</div>
          <div v-if="cfg.subtitle" class="bh__subtitle" :style="subtitleStyle">{{ cfg.subtitle }}</div>
        </template>
        <!-- 空态：虚线占位，防高度坍缩为 0 -->
        <div v-else class="bh__blank">点击右侧配置品牌信息</div>
      </div>

      <!-- 右侧功能区 -->
      <button
        v-if="cfg.show_action"
        type="button"
        class="bh__action"
        :style="actionStyle"
        :title="cfg.action_label || actionIconLabel"
        :aria-label="cfg.action_label || actionIconLabel"
        @click.stop="onActionClick"
      >
        <span class="bh__action-icon" aria-hidden="true">{{ actionIconGlyph }}</span>
      </button>

      <!-- 安全区警示边界：标题过长会撞胶囊时标红 -->
      <span v-if="titleOverflow" class="bh__safe-warn" aria-hidden="true"></span>

      <!-- 微信胶囊浮层（设计态模拟，说明右内边距为何要预留） -->
      <div v-if="showCapsule" class="bh__capsule" aria-hidden="true">
        <span class="bh__capsule-dots">···</span>
        <span class="bh__capsule-divider"></span>
        <span class="bh__capsule-ring"></span>
      </div>

      <!-- 编辑态：默认只用于选中组件，点击跳转需显式切到交互预览 -->
      <button
        v-if="!previewMode"
        type="button"
        class="bh__mode"
        :class="{ 'is-preview': interactive }"
        :title="interactive ? '交互预览：点击可跳转，点此回到编辑态' : '编辑态：点击仅选中组件，点此进入交互预览'"
        @click.stop.prevent="interactive = !interactive"
      >
        <span class="bh__mode-dot" aria-hidden="true"></span>
        {{ interactive ? '交互预览' : '编辑态' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { normalizeUploadUrl } from '@/api/system'
import {
  CAPSULE_SAFE_WIDTH,
  brandBgStyle,
  estimateTextWidth,
  isDarkBrandBg,
  normalizeBrandHeaderProps,
  resolveDividerColor,
  resolveSubtitleColor,
  resolveTitleColor,
  safeTextWidth,
  showsLogoImage,
  showsLogoText,
  type ActionIcon,
  type BrandHeaderProps,
} from '../brandHeader/brandHeaderSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 编辑态是否允许真实点击跳转 */
const interactive = ref(false)

const rootEl = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const logoBroken = ref(false)

const cfg = computed<BrandHeaderProps>(() => normalizeBrandHeaderProps(props.component.props))
const isDark = computed(() => isDarkBrandBg(cfg.value.bg_mode))
const showsImage = computed(() => showsLogoImage(cfg.value.logo_mode))
const showsText = computed(() => showsLogoText(cfg.value.logo_mode))

const logoUrl = computed(() => {
  const raw = String(cfg.value.logo || '').trim()
  return raw ? (normalizeUploadUrl(raw) || raw) : ''
})

/** Logo 与标题都空 → 空态占位，绝不塌成 0 高 */
const isBlank = computed(() => {
  const hasLogo = (showsImage.value && !!logoUrl.value && !logoBroken.value) || (showsText.value && !!cfg.value.logo_text)
  return !hasLogo && !String(cfg.value.title || '').trim()
})

const hasLogoContent = computed(() => {
  return (showsImage.value && !!logoUrl.value && !logoBroken.value) || (showsText.value && !!cfg.value.logo_text)
})

/* ---------------- 样式 ---------------- */
const rootStyle = computed(() => {
  const style: Record<string, string> = brandBgStyle(cfg.value)
  if (cfg.value.bottom_border) {
    style.borderBottom = `1px solid ${isDark.value ? 'rgba(255,255,255,0.14)' : cfg.value.bottom_border_color}`
  } else {
    style.borderBottom = '1px solid transparent'
  }
  if (cfg.value.sticky && cfg.value.backdrop_blur) {
    style.backdropFilter = 'blur(8px)'
    style.webkitBackdropFilter = 'blur(8px)'
  }
  if (cfg.value.scroll_shadow) {
    style.boxShadow = '0 2px 10px rgba(15,23,42,0.08)'
  }
  return style
})

const barStyle = computed(() => ({
  paddingLeft: `${cfg.value.bar_padding_left}px`,
  // 右侧必须给胶囊留位，否则真机标题会被微信胶囊压住
  paddingRight: `${Math.max(cfg.value.bar_padding_right, CAPSULE_SAFE_WIDTH)}px`,
  gap: `${cfg.value.item_gap}px`,
}))

/**
 * 🔴 Logo 拉伸变形的根治点：
 *   旧实现只给 `height` + `maxWidth`，没给 object-fit，宽高比不对时会被压扁。
 *   现在：keep_ratio 开启 → 只锁高、宽度自适应（width:auto + object-fit:contain）；
 *   关闭 → 才应用 logo_fit（cover/fill 会变形，是运营自己的选择）。
 */
const logoStyle = computed(() => {
  const style: Record<string, string> = {
    height: `${cfg.value.logo_height}px`,
    maxWidth: `${cfg.value.logo_max_width}px`,
  }
  if (cfg.value.logo_keep_ratio) {
    style.width = 'auto'
    style.objectFit = 'contain'
  } else {
    style.objectFit = cfg.value.logo_fit
    if (cfg.value.logo_fit === 'fill') style.width = `${cfg.value.logo_max_width}px`
  }
  return style
})

const logoTextStyle = computed(() => ({
  color: cfg.value.logo_text_color,
  fontWeight: cfg.value.logo_text_bold ? 800 : 500,
}))

const titleStyle = computed(() => ({
  color: resolveTitleColor(cfg.value),
  fontSize: `${cfg.value.title_font_size}px`,
}))

const subtitleStyle = computed(() => ({
  color: resolveSubtitleColor(cfg.value),
  fontSize: `${cfg.value.subtitle_font_size}px`,
}))

const dividerStyle = computed(() => ({
  background: resolveDividerColor(cfg.value),
}))

const actionStyle = computed(() => ({
  color: resolveTitleColor(cfg.value),
}))

/* ---------------- 安全区胶囊模拟与碰撞预警 ---------------- */
const showCapsule = computed(() => !props.previewMode)

const ACTION_GLYPH: Record<ActionIcon, string> = {
  search: '🔍',
  service: '💬',
  qrcode: '▦',
  share: '↗',
}
const ACTION_LABEL: Record<ActionIcon, string> = {
  search: '搜索',
  service: '客服',
  qrcode: '加群活码',
  share: '分享',
}
const actionIconGlyph = computed(() => ACTION_GLYPH[cfg.value.action_icon] || '🔍')
const actionIconLabel = computed(() => ACTION_LABEL[cfg.value.action_icon] || '功能')

/**
 * 标题是否会撞到胶囊：可用宽 = 容器 - 左内边距 - 胶囊预留 - 右内边距 - 元素间隙。
 * 用估算文本宽对比，溢出则画红色警示边界（编辑态才提示，预览态不打扰）。
 */
const titleOverflow = computed(() => {
  if (props.previewMode || isBlank.value) return false
  const width = containerWidth.value || 340
  const avail = safeTextWidth(width, cfg.value)
  return estimateTextWidth(String(cfg.value.title || ''), cfg.value.title_font_size) > avail
})

/* ---------------- 交互 ---------------- */
const canNavigate = computed(() => props.previewMode === true || interactive.value)

function onBarClick() {
  if (!canNavigate.value) return
  const action = cfg.value.tap_action
  if (action === 'none') return
  if (action === 'home') {
    emit('preview-action', { tab: 'nav', message: '返回首页' })
    return
  }
  if (action === 'intro') {
    emit('preview-action', { tab: 'content', message: '弹出品牌介绍', detailType: 'brand-intro' })
    return
  }
  const url = String(cfg.value.tap_link_url || '').trim()
  if (!url) {
    ElMessage.info('预览环境：请先配置自定义跳转目标')
    return
  }
  ElMessage.info(`预览环境：小程序内将跳转「${url}」`)
}

function onActionClick() {
  if (!canNavigate.value) return
  const act = cfg.value.action_tap_action
  if (act === 'intro') {
    emit('preview-action', { tab: 'content', message: '弹出品牌介绍', detailType: 'brand-intro' })
    return
  }
  if (act === 'custom') {
    const url = String(cfg.value.action_link_url || '').trim()
    if (!url) {
      ElMessage.info('预览环境：请先配置跳转目标')
      return
    }
    ElMessage.info(`预览环境：${actionIconLabel.value}将跳转「${url}」`)
    return
  }
  ElMessage.info(`预览环境：${actionIconLabel.value}按钮（未配置动作）`)
}

/* ---------------- 容器宽度测量（碰撞预警用） ---------------- */
let observer: ResizeObserver | null = null
function observe() {
  if (typeof ResizeObserver === 'undefined' || !rootEl.value) return
  containerWidth.value = rootEl.value.clientWidth
  observer = new ResizeObserver(() => {
    if (rootEl.value) containerWidth.value = rootEl.value.clientWidth
  })
  observer.observe(rootEl.value)
}

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

if (typeof queueMicrotask === 'function') queueMicrotask(() => observe())
</script>

<style lang="scss" scoped>
.bh {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* 沉浸模式：底色半透明，交由下层页面透出 */
.bh--immersive {
  backdrop-filter: saturate(1.1);
}

.bh--blur {
  background: rgba(255, 255, 255, 0.72);
}

.bh__safe {
  height: 22px;
}

.bh__bar {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding-top: 8px;
  padding-bottom: 10px;
  box-sizing: border-box;
}

/* ---------------- Logo ---------------- */
.bh__brand {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 0;
}

.bh__logo {
  display: block;
  /* keep_ratio 时 width:auto + object-fit:contain 已在 inline 里指定 */
  max-width: 100%;
}

.bh__logo-text {
  white-space: nowrap;
}

.bh__logo-ph {
  display: inline-grid;
  place-items: center;
  height: 28px;
  padding: 0 8px;
  font-size: 10px;
  color: #c3b8aa;
  background: rgba(0, 0, 0, 0.04);
  border: 1px dashed #d8d2c8;
  border-radius: 6px;
}

.bh__divider {
  flex: none;
  width: 1px;
  height: 18px;
}

/* ---------------- 文案 ---------------- */
.bh__text {
  flex: 1;
  min-width: 0;
}

.bh__title {
  line-height: 1.25;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bh__subtitle {
  margin-top: 2px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 空态占位：给固定高度，避免整条顶栏塌成 0 */
.bh__blank {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: #b3a596;
  border: 1px dashed #d8d2c8;
  border-radius: 6px;
}

/* ---------------- 右侧功能区 ---------------- */
.bh__action {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin-left: 8px;
  font-size: 13px;
  cursor: pointer;
  background: rgba(127, 127, 127, 0.08);
  border: 0;
  border-radius: 999px;
}

/* ---------------- 安全区警示 ---------------- */
.bh__safe-warn {
  position: absolute;
  top: 4px;
  right: 4px;
  bottom: 4px;
  z-index: 3;
  pointer-events: none;
  border: 1px dashed #e5484d;
  border-radius: 4px;
}

.bh--empty .bh__bar {
  background: rgba(0, 0, 0, 0.015);
}

/* ---------------- 微信胶囊浮层（仅设计态） ---------------- */
.bh__capsule {
  position: absolute;
  top: 30px;
  right: 7px;
  z-index: 4;
  display: flex;
  gap: 8px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1;
  color: #b6bcc6;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 999px;
}

.bh__capsule-dots {
  font-weight: 700;
  letter-spacing: 1px;
}

.bh__capsule-divider {
  width: 1px;
  height: 16px;
  background: rgba(0, 0, 0, 0.12);
}

.bh__capsule-ring {
  width: 13px;
  height: 13px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
}

/* ---------- 编辑态 / 交互预览切换 ---------- */
.bh__mode {
  position: absolute;
  bottom: 6px;
  left: 8px;
  z-index: 5;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  font-size: 10px;
  color: #6b5b4e;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e3ddd3;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.bh__mode.is-preview {
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-color: transparent;
}

.bh__mode-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.8;
}
</style>
