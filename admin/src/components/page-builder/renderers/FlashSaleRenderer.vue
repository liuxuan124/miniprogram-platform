<template>
  <div class="render-flash-sale" :style="rootStyle">
    <!-- auto_hide_when_done 且无可展示商品：整块不渲染 -->
    <div v-if="hideAll" class="fsx-empty">
      {{ hideReason }}
    </div>

    <template v-else>
      <!-- 标题栏 -->
      <div class="fsx-header">
        <span class="fsx-title" :style="titleStyle">
          <span class="fsx-title__icon" :class="{ 'fsx-title__icon--default': !cfg.title_icon }">
            <img v-if="isImageIcon(cfg.title_icon)" :src="cfg.title_icon" alt="" />
            <template v-else>{{ cfg.title_icon || '⏱' }}</template>
          </span>
          {{ cfg.title || '限时秒杀' }}
        </span>

        <!-- 倒计时：方块翻牌器 / 极简纯文本 -->
        <span
          v-if="cfg.countdown"
          class="fsx-countdown"
          :class="[`is-${cfg.countdown_style}`, { 'is-expired': parts.expired }]"
        >
          <template v-if="cfg.countdown_style === 'flip'">
            <em class="fsx-countdown__label">{{ prefix }}</em>
            <em v-if="parts.showDays" class="fsx-countdown__cell">{{ parts.days }}天</em>
            <em class="fsx-countdown__cell">{{ pad(parts.hours) }}</em>
            <em class="fsx-countdown__cell">{{ pad(parts.minutes) }}</em>
            <em class="fsx-countdown__cell">{{ pad(parts.secondsOfMinute) }}</em>
          </template>
          <template v-else>
            {{ prefix }} {{ parts.text }}
          </template>
        </span>

        <button
          v-if="cfg.show_more"
          type="button"
          class="fsx-more"
          :style="{ color: cfg.theme_color }"
          @click.stop="onMoreTap"
        >{{ cfg.more_text }} ›</button>
      </div>

      <!-- 商品区 -->
      <div class="fsx-items" :class="[`is-${cfg.layout}`, `surface-${cfg.card_surface}`]">
        <div
          v-for="(item, i) in displayItems"
          :key="String(item.id ?? i)"
          class="fsx-item"
          :class="{ 'is-dim': dimPhase }"
          :style="itemStyle"
          @click.stop="onItemTap(item, i)"
        >
          <span v-if="badgeOf(item)" class="fsx-item__badge" :style="{ background: cfg.theme_color }">
            {{ badgeOf(item) }}
          </span>

          <!-- 单列大图：图在上、信息在下 -->
          <template v-if="cfg.layout === 'feature'">
            <span class="fsx-item__cover">🔥</span>
            <span class="fsx-item__info">
              <span class="fsx-item__name" :style="nameStyle">{{ item.name || '爆款商品' }}</span>
              <span class="fsx-item__price-row">
                <span class="fsx-item__price" :style="priceStyle">
                  <em>¥</em>{{ item.price || '--' }}
                </span>
                <span
                  v-if="cfg.show_original_price && item.original_price"
                  class="fsx-item__origin"
                  :style="originStyle"
                >¥{{ item.original_price }}</span>
              </span>
              <span v-if="cfg.show_progress && percentOf(item) > 0" class="fsx-item__progress">
                <span class="fsx-item__progress-text" :style="metaStyle">
                  已抢 {{ percentOf(item) }}%
                </span>
                <span class="fsx-item__progress-track">
                  <span
                    class="fsx-item__progress-fill"
                    :style="{ width: `${percentOf(item)}%`, background: cfg.theme_color }"
                  ></span>
                </span>
              </span>
            </span>
            <span v-if="cfg.show_buy_button" class="fsx-item__btn" :style="btnStyle">{{ buyText }}</span>
          </template>

          <!-- 横滑 / 双列：图 + 信息 + 按钮 -->
          <template v-else>
            <span class="fsx-item__cover">🔥</span>
            <span class="fsx-item__info">
              <span class="fsx-item__name" :style="nameStyle">{{ item.name || '爆款商品' }}</span>
              <span class="fsx-item__price-row">
                <span class="fsx-item__price" :style="priceStyle">
                  <em>¥</em>{{ item.price || '--' }}
                </span>
                <span
                  v-if="cfg.show_original_price && item.original_price"
                  class="fsx-item__origin"
                  :style="originStyle"
                >¥{{ item.original_price }}</span>
              </span>
              <span v-if="cfg.show_progress && percentOf(item) > 0" class="fsx-item__progress">
                <span class="fsx-item__progress-track">
                  <span
                    class="fsx-item__progress-fill"
                    :style="{ width: `${percentOf(item)}%`, background: cfg.theme_color }"
                  ></span>
                </span>
                <span class="fsx-item__progress-text" :style="metaStyle">
                  已抢 {{ percentOf(item) }}%
                </span>
              </span>
            </span>
            <span v-if="cfg.show_buy_button" class="fsx-item__btn" :style="btnStyle">{{ buyText }}</span>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  buildCountdownParts,
  isDimPhase,
  normalizeFlashSaleProps,
  parseFlashSaleTime,
  resolveBadgeText,
  resolveBuyText,
  resolveProgressPercent,
  resolveSalePhase,
  type FlashSaleItem,
  type FlashSaleProps as FlashConfig,
} from '../flashSale/flashSaleSchema'
import { isImageIcon } from '../categoryNav/categoryNavSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 归一化配置：与属性面板读同一份 Schema，避免两边漂移 */
const cfg = computed<FlashConfig>(() => normalizeFlashSaleProps(props.component.props))

/* ---------------- 倒计时 ---------------- */
const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(timer))

const parts = computed(() =>
  buildCountdownParts(
    parseFlashSaleTime(cfg.value.end_time),
    parseFlashSaleTime(cfg.value.start_time),
    now.value,
  ),
)

const prefix = computed(() => {
  if (parts.value.expired) return '已结束'
  return parts.value.pending ? cfg.value.pending_text : cfg.value.running_text
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/* ---------------- 商品 ---------------- */
const displayItems = computed<FlashSaleItem[]>(() => cfg.value.manual_items.slice(0, cfg.value.limit))

const phase = computed(() => resolveSalePhase(displayItems.value, parts.value))
const dimPhase = computed(() => isDimPhase(phase.value))
const buyText = computed(() => resolveBuyText(phase.value, cfg.value))

/** 活动结束/售罄且开了自动隐藏 → 整块不渲染 */
const hideAll = computed(() => {
  if (!cfg.value.auto_hide_when_done) return false
  if (parts.value.expired) return true
  if (phase.value === 'soldOut') return true
  return displayItems.value.length === 0
})

const hideReason = computed(() => {
  if (parts.value.expired) return '活动已结束，已开启「自动隐藏」，真机不渲染这块'
  if (phase.value === 'soldOut') return '商品已全部售罄，已开启「自动隐藏」，真机不渲染这块'
  return '暂无秒杀商品'
})

/* ---------------- 样式 ---------------- */
const rootStyle = computed(() => ({
  margin: `${cfg.value.block_margin}px`,
  borderRadius: `${cfg.value.block_radius}px`,
  background: cardBg.value,
  border: cardBorder.value,
}))

const cardBg = computed(() => {
  if (cfg.value.card_surface === 'white') return '#fff'
  if (cfg.value.card_surface === 'transparent') return 'transparent'
  // 浅色渐变：主题色淡化，色值带透明后缀
  return `linear-gradient(160deg, ${cfg.value.theme_color}1f, ${cfg.value.theme_color}08)`
})

const cardBorder = computed(() => {
  if (cfg.value.card_surface === 'transparent') return '1px dashed #e6ded4'
  if (cfg.value.card_surface === 'white') return '1px solid #f0e6e2'
  return '1px solid transparent'
})

const itemStyle = computed(() => {
  const s: Record<string, string> = {}
  if (cfg.value.layout !== 'feature' && dimPhase.value) {
    s.opacity = '0.62'
  }
  return s
})

const titleStyle = computed(() => ({
  fontSize: `${cfg.value.title_font_size}px`,
  color: cfg.value.theme_color,
}))

const nameStyle = computed(() => ({ fontSize: `${Math.max(10, cfg.value.subtitle_font_size)}px` }))
const metaStyle = computed(() => ({ fontSize: `${Math.max(9, cfg.value.subtitle_font_size - 1)}px` }))
const originStyle = computed(() => ({ fontSize: `${Math.max(9, cfg.value.subtitle_font_size - 1)}px` }))

const priceStyle = computed(() => ({
  color: dimPhase.value ? '#a3aebd' : cfg.value.theme_color,
}))

const btnStyle = computed(() => {
  if (dimPhase.value || phase.value === 'pending') {
    return { background: '#e3e8f0', color: '#8a94a6' }
  }
  return { background: cfg.value.theme_color, color: '#fff' }
})

/* ---------------- 角标 / 进度 ---------------- */
function badgeOf(item: FlashSaleItem): string {
  return resolveBadgeText(item, cfg.value.badge_mode, cfg.value.badge_text)
}

function percentOf(item: FlashSaleItem): number {
  return resolveProgressPercent(item)
}

/* ---------------- 交互 ---------------- */
function onItemTap(item: FlashSaleItem, index: number) {
  emit('preview-action', {
    tab: 'shop',
    message: `点击商品「${item.name || `第 ${index + 1} 件`}」`,
    detailType: 'product',
    detailTitle: item.name,
    detailDesc: `秒杀价 ¥${item.price || '--'}${item.original_price ? ` / 原价 ¥${item.original_price}` : ''}`,
  })
}

function onMoreTap() {
  emit('preview-action', {
    tab: 'shop',
    message: cfg.value.more_link
      ? `「${cfg.value.more_text}」→ ${cfg.value.more_link.split('?')[0].split('/').filter(Boolean).pop() || cfg.value.more_link}`
      : '「查看全部」还没设跳转，真机点了不会有反应',
  })
}

// 结束时间/风格变化要立即重算
watch(() => cfg.value.end_time, () => { now.value = Date.now() })
</script>

<style lang="scss" scoped>
.render-flash-sale {
  overflow: hidden;
  transition: background 0.16s ease;
}

.fsx-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.fsx-title {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-weight: 800;
}

.fsx-title__icon {
  display: inline-grid;
  place-items: center;
  font-size: 1.1em;
  line-height: 1;
}

.fsx-title__icon--default {
  opacity: 0.9;
}

.fsx-title__icon img {
  width: 1.2em;
  height: 1.2em;
  object-fit: contain;
}

/* ---------- 倒计时 ---------- */
.fsx-countdown {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  margin-left: auto;
}

.fsx-countdown__label {
  font-size: 10.5px;
  font-style: normal;
  color: #a89c8d;
}

/* 方块翻牌器：主题色高对比 */
.fsx-countdown.is-flip .fsx-countdown__cell {
  min-width: 21px;
  padding: 1px 3px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-align: center;
  background: v-bind('cfg.theme_color');
  border-radius: 3px;
}

.fsx-countdown.is-expired .fsx-countdown__cell {
  background: #e3e8f0;
}

/* 极简纯文本 */
.fsx-countdown.is-plain {
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: #8a94a6;
}

.fsx-more {
  flex: none;
  padding: 0;
  font-size: 10.5px;
  cursor: pointer;
  background: transparent;
  border: 0;
}

/* ---------- 商品 ---------- */
.fsx-items {
  display: flex;
  gap: 8px;
}

.fsx-items.is-scroll {
  flex-direction: row;
  overflow-x: auto;

  .fsx-item {
    flex: 0 0 132px;
  }
}

.fsx-items.is-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fsx-items.is-feature {
  flex-direction: column;
}

.fsx-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
}

.fsx-items.surface-transparent .fsx-item {
  background: transparent;
  border-color: #efe9e0;
}

/* 单列大图：封面在上、信息在下、按钮在底部 */
.fsx-items.is-feature .fsx-item {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

.fsx-item__badge {
  position: absolute;
  top: -5px;
  left: -3px;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  color: #fff;
  border-radius: 3px;
}

.fsx-item__cover {
  display: grid;
  place-items: center;
  flex: none;
  height: 46px;
  font-size: 20px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
}

.fsx-items.is-feature .fsx-item__cover {
  width: 66px;
  height: 66px;
  font-size: 26px;
}

.fsx-item__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fsx-item__name {
  overflow: hidden;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fsx-item__price-row {
  display: flex;
  gap: 5px;
  align-items: baseline;
  min-width: 0;
}

.fsx-item__price {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;

  em {
    font-size: 0.72em;
    font-style: normal;
  }
}

.fsx-items.is-feature .fsx-item__price {
  font-size: 20px;
}

.fsx-item__origin {
  color: #b3a596;
  text-decoration: line-through;
  white-space: nowrap;
}

/* ---------- 进度条 ---------- */
.fsx-item__progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.fsx-item__progress-track {
  display: block;
  width: 100%;
  height: 3px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.fsx-item__progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.fsx-item__progress-text {
  color: #a89c8d;
}

/* ---------- 按钮 ---------- */
.fsx-item__btn {
  flex: none;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  border-radius: 999px;
}

.fsx-items.is-feature .fsx-item__btn {
  align-self: center;
  padding: 6px 14px;
}

/* 横滑/双列：按钮在信息下方一行 */
.fsx-items:not(.is-feature) .fsx-item__btn {
  align-self: flex-start;
  margin-top: 2px;
}

.fsx-empty {
  padding: 14px 10px;
  font-size: 11.5px;
  color: #a3aebd;
  text-align: center;
  background: #fafbfc;
  border: 1px dashed #e3e8f0;
  border-radius: 8px;
}
</style>
