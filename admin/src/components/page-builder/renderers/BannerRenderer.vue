<template>
  <div
    ref="rootEl"
    class="bnr"
    :class="[
      `bnr--${cfg.layout_mode}`,
      { 'bnr--editing': editLock, 'bnr--peek': isPeek, 'bnr--empty': slides.length === 0 },
    ]"
    :style="rootStyle"
    @wheel.capture="onWheelCapture"
  >
    <!-- 空态：必须撑出高度，否则画布上组件塌成 0 高、既点不中也看不出是轮播 -->
    <div v-if="slides.length === 0" class="bnr-empty" :style="stageStyle">
      <div class="bnr-empty__art" aria-hidden="true">
        <span class="bnr-empty__frame bnr-empty__frame--a"></span>
        <span class="bnr-empty__frame bnr-empty__frame--b"></span>
        <span class="bnr-empty__frame bnr-empty__frame--c"></span>
      </div>
      <p class="bnr-empty__title">点击右侧「添加图片」开始配置轮播</p>
      <p class="bnr-empty__hint">建议 3–5 张；首页主视觉、活动主推位用它</p>
    </div>

    <template v-else>
      <div class="bnr-stage" :style="stageStyle">
        <swiper
          :key="instanceKey"
          class="bnr-swiper"
          :slides-per-view="1"
          :space-between="0"
          :centered="isPeek"
          :loop="loopEnabled"
          :autoplay="autoplayEnabled"
          :delay="cfg.interval"
          :speed="420"
          :allow-touch-move="allowTouch"
          :grab-cursor="false"
          :watch-overflow-slides="true"
          :threshold="6"
          :modules="swiperModules"
          :pagination="false"
          :navigation="false"
          :keyboard="false"
          @swiper="onSwiperReady"
          @slide-change="onSlideChange"
        >
          <swiper-slide v-for="(item, idx) in slides" :key="item.key" class="bnr-slide">
            <div
              class="bnr-slide__inner"
              :class="{ 'is-clickable': canClick }"
              :style="slideInnerStyle"
              @click="onSlideClick(idx)"
            >
              <img
                v-if="item.src"
                class="bnr-slide__img"
                :src="item.src"
                :alt="item.title || ''"
                :style="imgFitStyle"
                loading="lazy"
                decoding="async"
                @load="markLoaded(item.key)"
                @error="markBroken(item.key)"
              />
              <!-- 裂图 / 无图兜底：留在同一张 slide 内，绝不撑破或塌陷容器高度 -->
              <div v-else class="bnr-slide__fallback">
                <span class="bnr-slide__orb" aria-hidden="true"></span>
                <span class="bnr-slide__fb-title">{{ item.title || '轮播占位' }}</span>
                <span class="bnr-slide__fb-sub">{{ item.subtitle || '点击了解' }}</span>
              </div>

              <!-- 文字蒙层 + 标题层级 -->
              <div v-if="hasText(item)" class="bnr-slide__mask" :style="maskStyle">
                <div class="bnr-slide__text" :style="textAlignStyle">
                  <p v-if="item.title" class="bnr-slide__title" :style="titleStyle">{{ item.title }}</p>
                  <p v-if="item.subtitle" class="bnr-slide__desc" :style="descStyle">{{ item.subtitle }}</p>
                </div>
                <span v-if="ctaText(item)" class="bnr-slide__cta" :style="ctaStyle">{{ ctaText(item) }}</span>
              </div>
            </div>
          </swiper-slide>
        </swiper>
      </div>

      <!-- 指示器：形态 / 位置 / 配色全部走配置 -->
      <div v-if="showIndicator" class="bnr-indicator" :class="`bnr-indicator--${cfg.indicator_pos}`">
        <template v-if="cfg.indicator_type === 'number'">
          <span class="bnr-indicator__num" :style="{ color: cfg.indicator_active_color }">
            {{ activeIndex + 1 }}<i>/</i>{{ slides.length }}
          </span>
        </template>
        <template v-else-if="cfg.indicator_type === 'pill' || cfg.indicator_type === 'line'">
          <span
            v-for="(item, idx) in slides"
            :key="`bar-${item.key}`"
            class="bnr-indicator__bar"
            :class="{ 'is-on': idx === activeIndex }"
            :style="barStyle(idx)"
          ></span>
        </template>
        <template v-else>
          <span
            v-for="(item, idx) in slides"
            :key="`dot-${item.key}`"
            class="bnr-indicator__dot"
            :class="{ 'is-on': idx === activeIndex }"
            :style="dotStyle"
          ></span>
        </template>
      </div>
    </template>

    <!-- 编辑态微交互：编辑锁定 ↔ 交互预览（画布滑动与选中/拖拽冲突的解法） -->
    <button
      v-if="showToolbar"
      type="button"
      class="bnr-mode"
      :class="{ 'is-preview': !editLock }"
      :title="editLock ? '编辑态：已锁定滑动，点此进入交互预览' : '交互预览：可手动滑动，点此回到编辑态'"
      @click.stop.prevent="toggleEditLock"
    >
      <span class="bnr-mode__dot" aria-hidden="true"></span>
      {{ editLock ? '编辑态' : '交互预览' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { A11y, Autoplay } from 'swiper/modules'
import 'swiper/css'
import type { Swiper as SwiperClass } from 'swiper'
import type { ComponentInstance } from '@/types/page'
import {
  BANNER_ASPECT_RATIO,
  clampNumber,
  looksLikeImageUrl,
  normalizeBannerProps,
  resolveBannerRadius,
  visibleBannerImages,
  type BannerImageItem,
  type BannerProps,
} from '../banner/bannerSchema'

const props = defineProps<{
  component: ComponentInstance
  /** true = 预览态（允许滑动与跳转）；false = 编辑态（锁定滑动，只负责被选中） */
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/* ---------------- Swiper 实例 ---------------- */
const swiperModules = [A11y, Autoplay]
const rootEl = ref<HTMLElement | null>(null)
/** shallowRef：Swiper 实例内部字段极多，深响应式代理会拖慢渲染并可能破坏其内部状态 */
const swiper = shallowRef<SwiperClass | null>(null)
const activeIndex = ref(0)
const loadedKeys = ref<Record<string, boolean>>({})
const brokenKeys = ref<Record<string, boolean>>({})

/* ---------------- 编辑态锁定 ---------------- */
/**
 * 🔴 关键修复（画布滑动 vs「点击选中 / 拖拽移动」冲突）：
 *   预览态（previewMode=true）→ 允许滑动；编辑态（false）→ 锁定滑动，
 *   组件只负责「被选中」，滑动测试由工具条上的「交互预览」临时开启。
 *   编辑态还拦掉 wheel，避免滚轮被轮播吃掉导致画布划不动。
 */
const editLockOverride = ref<boolean | null>(null)
const editLock = computed(() => (props.previewMode ? false : editLockOverride.value !== false))
const showToolbar = computed(() => !props.previewMode)
const allowTouch = computed(() => !editLock.value && cfg.value.allow_touch)

function toggleEditLock() {
  editLockOverride.value = editLockOverride.value === false ? null : false
}

function onWheelCapture(e: WheelEvent) {
  if (!editLock.value) return
  e.stopPropagation()
}

/* ---------------- 配置归一化（与属性面板同一真相源） ---------------- */
const cfg = computed<BannerProps>(() => normalizeBannerProps(props.component.props))

interface BannerSlide extends BannerImageItem {
  key: string
  /** 已损坏或空地址时为空串，走 fallback 视觉 */
  src: string
}

const slides = computed<BannerSlide[]>(() =>
  visibleBannerImages(cfg.value.images).map((item, i) => {
    const key = item.id || `bnr_slide_${i}`
    const url = String(item.image || '')
    return { ...item, key, src: looksLikeImageUrl(url) && !brokenKeys.value[key] ? url : '' }
  }),
)

/* ---------------- 高度 / 圆角 / 阴影 ---------------- */
const isPeek = computed(() => cfg.value.layout_mode === 'peek')

/** 图片填充：cover 等比铺满（默认，与端上一致）/ contain 完整显示留白 */
const imgFitStyle = computed<Record<string, string>>(() => ({
  objectFit: cfg.value.object_fit === 'contain' ? 'contain' : 'cover',
}))

/** 自定义高度用固定 px；预设比例用 aspect-ratio 随宽度自适应 */
const stageStyle = computed<Record<string, string>>(() => {
  const p = cfg.value
  const style: Record<string, string> = {}
  if (p.aspect === 'custom') {
    style.height = `${clampNumber(p.custom_height, 80, 420, 1, 180)}px`
  } else {
    style.aspectRatio = `${BANNER_ASPECT_RATIO[p.aspect] ?? 2.35}`
  }
  return style
})

const rootStyle = computed<Record<string, string>>(() => {
  const p = cfg.value
  const style: Record<string, string> = {}
  if (p.layout_mode === 'card') {
    style.paddingLeft = `${p.page_padding}px`
    style.paddingRight = `${p.page_padding}px`
  }
  if (p.shadow === 'soft') style.boxShadow = '0 2px 10px rgba(15, 23, 42, 0.10)'
  else if (p.shadow === 'float') style.boxShadow = '0 10px 28px rgba(15, 23, 42, 0.18)'
  return style
})

const slideInnerStyle = computed<Record<string, string>>(() => ({
  borderRadius: `${resolveBannerRadius(cfg.value)}px`,
}))

/* ---------------- 蒙层与文字 ---------------- */
function hasText(item: BannerImageItem) {
  return !!(item.title || item.subtitle || ctaText(item))
}

function ctaText(item: BannerImageItem) {
  // 单张自定义气泡优先于全局气泡；两者都空则不显示
  const own = String(item.action_label || '').trim()
  if (own) return own
  return String(cfg.value.action_label || '').trim()
}

const maskStyle = computed<Record<string, string>>(() => {
  const p = cfg.value
  if (!p.overlay) return { background: 'none' }
  return {
    background: `linear-gradient(to top, rgba(0,0,0,${p.overlay_opacity}) 0%, rgba(0,0,0,${p.overlay_opacity * 0.6}) 42%, rgba(0,0,0,0) 100%)`,
  }
})

const textAlignStyle = computed<Record<string, string>>(() => ({
  textAlign: cfg.value.title_align,
  justifyContent: cfg.value.title_align === 'center' ? 'center' : 'flex-start',
}))

const titleStyle = computed<Record<string, string>>(() => ({
  fontSize: `${cfg.value.title_size}px`,
  color: cfg.value.title_color,
}))

const descStyle = computed<Record<string, string>>(() => ({
  fontSize: `${cfg.value.desc_size}px`,
  color: cfg.value.desc_color,
}))

const ctaStyle = computed<Record<string, string>>(() => ({
  fontSize: `${Math.max(11, cfg.value.desc_size - 1)}px`,
  color: cfg.value.title_color,
}))

/* ---------------- 指示器 ---------------- */
const showIndicator = computed(() => cfg.value.indicator_type !== 'none' && slides.value.length > 1)

const dotStyle = computed<Record<string, string | number>>(() => ({
  background: cfg.value.indicator_inactive_color,
  opacity: cfg.value.indicator_inactive_opacity,
}))

function barStyle(idx: number): Record<string, string | number> {
  const on = idx === activeIndex.value
  const isLine = cfg.value.indicator_type === 'line'
  return isLine
    ? {
        background: on ? cfg.value.indicator_active_color : cfg.value.indicator_inactive_color,
        opacity: on ? 1 : cfg.value.indicator_inactive_opacity,
      }
    : on
      ? { background: cfg.value.indicator_active_color, width: '18px' }
      : {
          background: cfg.value.indicator_inactive_color,
          opacity: cfg.value.indicator_inactive_opacity,
          width: '6px',
        }
}

/* ---------------- 播放逻辑 ---------------- */
const autoplayEnabled = computed(() => {
  if (!cfg.value.autoplay) return false
  // 编辑态不自动轮播：运营看配置时图片一直动会点不准
  if (editLock.value) return false
  return slides.value.length > 1
})

const loopEnabled = computed(() => cfg.value.loop && slides.value.length > 1)

/* ---------------- 点击跳转 ---------------- */
const canClick = computed(() => props.previewMode === true)

function onSlideClick(index: number) {
  if (!canClick.value || editLock.value) return
  const item = slides.value[index]
  if (!item) return
  const link = String(item.link_url || '').trim()
  if (!link) {
    ElMessage.info('预览环境：该轮播图未配置跳转')
    return
  }
  if (item.link_type === 'url' || /^https?:\/\//i.test(link)) {
    window.open(/^https?:\/\//i.test(link) ? link : `https://${link}`, '_blank', 'noopener')
    return
  }
  ElMessage.info(`预览环境：小程序内将跳转「${link}」`)
}

/* ---------------- 图片加载态 ---------------- */
function markLoaded(key: string) {
  if (loadedKeys.value[key]) return
  loadedKeys.value = { ...loadedKeys.value, [key]: true }
}

function markBroken(key: string) {
  // 失败即切 fallback 视觉；容器高度由 stageStyle 决定，不受影响
  brokenKeys.value = { ...brokenKeys.value, [key]: true }
}

/* ------------------------------------------------------------------ */
/* 🔴 生命周期：配置变更后必须让实例真正重建/更新                        */
/* ------------------------------------------------------------------ */
/**
 * 旧实现的三个真实故障：
 *   ① 改 interval 后计时器没重开 → 轮播「停住」；
 *   ② 增删图片后 activeIndex 没夹紧 → 指示器指向越界项；
 *   ③ 图片列表变化后实例仍按旧 slides/loop 计算 → 索引错乱。
 *
 * 处置分两层（这是关键，单靠任一层都不够）：
 *   · **结构变化**（图片增删/换图、布局、比例、编辑态）→ 用 :key 强制 Vue 销毁并
 *     重建整个 <swiper> 节点，Swiper 会在新节点上重新 init。
 *     （只调 destroy() 是不够的：DOM 已被拆掉，实例不会自己回来。）
 *   · **参数变化**（interval/autoplay）→ 不动 DOM，直接调用
 *     autoplay.stop() → 改 delay → autoplay.start()。
 */
const instanceKey = computed(() => {
  const p = cfg.value
  return [
    slides.value.map((s) => `${s.key}:${s.src ? 1 : 0}`).join(','),
    p.layout_mode,
    p.aspect,
    p.custom_height,
    p.loop ? 1 : 0,
    editLock.value ? 1 : 0,
  ].join('|')
})

function destroySwiper() {
  const inst = swiper.value
  if (!inst) return
  try {
    // true, true：同时清掉附加样式与全部事件绑定，防内存泄漏
    inst.destroy(true, true)
  } catch {
    /* 实例可能已随父节点卸载，忽略 */
  }
  swiper.value = null
}

function onSwiperReady(instance: SwiperClass) {
  swiper.value = instance
  // loop 下真实下标与 slides 索引有偏移，统一读 realIndex
  activeIndex.value = instance.realIndex ?? 0
}

function onSlideChange(instance: SwiperClass) {
  activeIndex.value = instance.realIndex ?? instance.activeIndex ?? 0
}

/** 结构变化 → 索引先夹紧（避免旧实例越界），再交给 key 重建 */
watch(
  () => [slides.value.length, cfg.value.layout_mode, cfg.value.aspect, editLock.value],
  () => {
    if (activeIndex.value >= slides.value.length) activeIndex.value = 0
    loadedKeys.value = {}
    swiper.value = null
  },
  { flush: 'post' },
)

/** 播放参数变化 → 原地重启 autoplay，不重建 DOM（避免拖滑块时整块闪） */
watch(
  () => [cfg.value.interval, cfg.value.autoplay],
  () => {
    const inst = swiper.value
    if (!inst) return
    try {
      if (inst.autoplay) {
        inst.autoplay.stop()
        if (inst.params.autoplay) {
          (inst.params.autoplay as Record<string, unknown>).delay = cfg.value.interval
        }
        if (autoplayEnabled.value) inst.autoplay.start()
      }
      inst.update()
    } catch {
      /* autoplay 模块未启用时忽略 */
    }
  },
  { flush: 'post' },
)

/** 容器尺寸变化（切设备/缩放）→ 重算居中与分页偏移 */
let resizeObserver: ResizeObserver | null = null
function observeRoot() {
  if (typeof ResizeObserver === 'undefined' || !rootEl.value) return
  resizeObserver = new ResizeObserver(() => swiper.value?.update())
  resizeObserver.observe(rootEl.value)
}

onBeforeUnmount(() => {
  destroySwiper()
  resizeObserver?.disconnect()
  resizeObserver = null
})

queueMicrotask(() => observeRoot())
</script>

<style lang="scss" scoped>
.bnr {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* 编辑态：锁滑动，但不影响父级选中组件 */
.bnr--editing .bnr-swiper {
  pointer-events: none;
}

.bnr--editing.bnr--empty {
  pointer-events: auto;
}

.bnr-stage {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.bnr-swiper {
  width: 100%;
  height: 100%;
}

.bnr-slide {
  height: 100%;
}

.bnr-slide__inner {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #eef2f7;

  &.is-clickable {
    cursor: pointer;
  }
}

.bnr-slide__img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.bnr-slide__fallback {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
  text-align: center;
  background: linear-gradient(135deg, var(--theme-primary, #1d73ff) 0%, var(--theme-secondary, #25b9f6) 100%);
}

.bnr-slide__orb {
  position: absolute;
  top: -35px;
  right: -30px;
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.bnr-slide__fb-title {
  position: relative;
  z-index: 1;
  font-size: 15px;
  font-weight: 800;
}

.bnr-slide__fb-sub {
  position: relative;
  z-index: 1;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.88;
}

.bnr-slide__mask {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 26px 12px 12px;
}

.bnr-slide__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

/* 标题最多两行，超出省略 */
.bnr-slide__title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-weight: 700;
  line-height: 1.35;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bnr-slide__desc {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  line-height: 1.4;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.bnr-slide__cta {
  flex: none;
  padding: 3px 10px;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 999px;
}

/* ---------- 露边画廊模式（Peek） ---------- */
.bnr--peek {
  .bnr-stage,
  .bnr-swiper {
    overflow: visible;
  }

  /* 两侧卡片：降透明 + 缩放，制造景深 */
  :deep(.bnr-slide) {
    transition: opacity 0.28s ease, transform 0.28s ease;
  }

  :deep(.bnr-slide:not(.swiper-slide-active)) {
    opacity: 0.6;
    transform: scale(0.92);
  }

  :deep(.bnr-slide .bnr-slide__inner) {
    border-radius: 12px;
  }
}

/* ---------- 指示器 ---------- */
.bnr-indicator {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  z-index: 3;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 12px;
  pointer-events: none;
}

.bnr-indicator--center { justify-content: center; }
.bnr-indicator--right { justify-content: flex-end; }

/* 外置浮动：脱离图片区域，压在容器下边缘之外 */
.bnr-indicator--outside {
  position: relative;
  bottom: auto;
  left: auto;
  justify-content: flex-end;
  padding: 8px 12px 0;
}

.bnr-indicator--outside .bnr-indicator__bar { background: #d8d2c8; }
.bnr-indicator--outside .bnr-indicator__bar.is-on { background: var(--el-color-primary, #c08e6e); }

.bnr-indicator__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  transition: width 0.2s ease, background 0.2s ease;
}

.bnr-indicator__dot.is-on {
  width: 14px;
  background: #fff;
}

.bnr-indicator__bar {
  height: 3px;
  border-radius: 999px;
  transition: width 0.22s cubic-bezier(0.32, 0.72, 0, 1), background 0.2s ease, opacity 0.2s ease;
}

.bnr-indicator__num {
  font-size: 11px;
  font-weight: 700;

  i {
    padding: 0 2px;
    font-style: normal;
    opacity: 0.6;
  }
}

/* ---------- 空态 ---------- */
.bnr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 120px;
  overflow: hidden;
  background: linear-gradient(135deg, #f6f4f1 0%, #eef1f6 100%);
  border: 1px dashed #d8d2c8;
  border-radius: 10px;
}

.bnr-empty__art {
  position: relative;
  width: 74px;
  height: 46px;
  margin-bottom: 8px;
}

.bnr-empty__frame {
  position: absolute;
  width: 40px;
  height: 30px;
  background: #fff;
  border: 1px solid #e2ddd3;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.bnr-empty__frame--a { top: 0; left: 0; transform: rotate(-6deg); }
.bnr-empty__frame--b { top: 6px; left: 16px; z-index: 1; }
.bnr-empty__frame--c { top: 12px; left: 32px; transform: rotate(6deg); }

.bnr-empty__title {
  margin: 0;
  font-size: 12px;
  color: #6b5b4e;
}

.bnr-empty__hint {
  margin: 3px 0 0;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 编辑态切换按钮 ---------- */
.bnr-mode {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 6;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  color: #6b5b4e;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e3ddd3;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.bnr-mode.is-preview {
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-color: transparent;
}

.bnr-mode__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.8;
}
</style>
