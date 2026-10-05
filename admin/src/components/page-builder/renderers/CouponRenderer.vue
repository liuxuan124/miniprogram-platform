<template>
  <div class="render-coupon" :style="rootStyle">
    <!-- auto_hide_when_empty=true 且无券：整块不渲染（不留空壳） -->
    <template v-if="!displayCoupons.length && cfg.auto_hide_when_empty && !loadingRemote && !loadFailed">
      <div class="cp-preview-empty cp-preview-empty--hidden">
        暂无优惠券且已开启「自动隐藏」，真机不渲染这块
      </div>
    </template>

    <template v-else>
      <!-- 标题栏 -->
      <div v-if="cfg.title" class="cp-title-row" :style="{ fontSize: `${cfg.title_size}px` }">
        <span class="cp-title">{{ cfg.title }}</span>
        <button
          v-if="cfg.show_more"
          type="button"
          class="cp-more"
          @click.stop="onMoreTap"
        >
          {{ cfg.more_text }} ›
        </button>
      </div>

      <!-- 加载 / 失败 / 空 -->
      <div v-if="loadFailed" class="cp-preview-empty">优惠券数据请求失败，请稍后重试</div>
      <div v-else-if="loadingRemote" class="cp-preview-empty">正在读取优惠券…</div>
      <div v-else-if="!displayCoupons.length" class="cp-preview-empty">暂无可用优惠券</div>

      <!-- 券列表 -->
      <div v-else class="cp-list" :class="[`is-${cfg.layout}`, `theme-${cfg.theme}`]" :style="listStyle">
        <div
          v-for="(item, i) in displayCoupons"
          :key="item.id"
          class="cp-card"
          :class="{ 'is-dim': item.state !== 'claim' }"
          :style="cardStyle"
          @click.stop="onClaim(item)"
        >
          <span class="cp-card__amount" :style="{ fontSize: `${cfg.amount_size}px`, color: amountColor(item) }">
            {{ item.displayValue }}
          </span>
          <span class="cp-card__body">
            <span class="cp-card__name" :style="{ fontSize: `${cfg.desc_size + 1}px` }">{{ item.name }}</span>
            <span class="cp-card__cond" :style="{ fontSize: `${cfg.desc_size}px` }">{{ item.condition }}</span>
          </span>
          <span
            class="cp-card__btn"
            :style="btnStyle(item)"
          >{{ item.buttonText }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getCouponList } from '@/api/coupon'
import type { ComponentInstance } from '@/types/page'
import { formatPercentDiscount } from '@/utils/couponDisplay'
import {
  normalizeCouponProps,
  resolveButtonText,
  resolveCouponState,
  type CouponDisplayState,
  type CouponFilterType,
  type CouponProps as CouponConfig,
} from '../coupon/couponSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 归一化配置：与属性面板读同一份 Schema，避免两边漂移 */
const cfg = computed<CouponConfig>(() => normalizeCouponProps(props.component.props))

type DisplayCoupon = {
  id: string | number
  name: string
  displayValue: string
  condition: string
  state: CouponDisplayState
  buttonText: string
}

const remoteCoupons = ref<DisplayCoupon[]>([])
const loadingRemote = ref(false)
const loadFailed = ref(false)

/* ---------------- 样式 ---------------- */

const rootStyle = computed(() => ({
  padding: `${cfg.value.block_padding}px`,
}))

const listStyle = computed(() => ({
  gap: `${cfg.value.card_gap}px`,
}))

const cardStyle = computed(() => ({
  background: cfg.value.bg_color,
}))

/** 已领取 / 已抢光：金额与文字置灰（灰度由系统算，避免再配一套灰） */
function toGray(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((color || '').trim())
  if (!m) return '#b8bfc9'
  const n = parseInt(m[1], 16)
  // 与白底按 55% 混合
  const mix = (c: number) => Math.round(c * 0.45 + 255 * 0.55)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function amountColor(item: DisplayCoupon): string {
  return item.state === 'claim' ? cfg.value.amount_color : toGray(cfg.value.amount_color)
}

function btnStyle(item: DisplayCoupon) {
  if (item.state === 'claim') {
    return { background: cfg.value.btn_color, color: '#fff', borderColor: cfg.value.btn_color }
  }
  const g = toGray(cfg.value.btn_color)
  return { background: g, color: '#fff', borderColor: g }
}

/* ---------------- 数据加载 ---------------- */

function formatCoupon(raw: any): DisplayCoupon {
  const type = String(raw?.type || 'fixed')
  const value = Number(raw?.value ?? raw?.amount ?? raw?.discount ?? 0)
  const min = Number(raw?.minOrderAmount ?? raw?.min_amount ?? raw?.minAmount ?? 0)
  const state = resolveCouponState(
    { totalCount: raw?.totalCount, usedCount: raw?.usedCount, claimed: raw?.claimed },
    cfg.value,
  )
  return {
    id: raw?.id ?? `coupon-${raw?.name ?? Math.random()}`,
    name: raw?.name || raw?.title || '优惠券',
    displayValue: type === 'percent' ? formatPercentDiscount(value) : `¥${value}`,
    condition: min > 0 ? `满${min}可用` : '无门槛',
    state,
    buttonText: resolveButtonText(state, cfg.value),
  }
}

/** 折扣券的「折后让利」估算：9 折 ≈ 让利 10%，用于面额排序时跨类型可比 */
function amountWeight(c: any): number {
  const type = String(c?.type || 'fixed')
  const value = Number(c?.value ?? 0)
  if (type === 'percent') {
    const zhe = value > 0 && value <= 1 ? value * 10 : value
    // 折扣率越低让利越大 → 用 (10 - 折数) 折算成「等效让利额」
    return Math.max(0, 10 - zhe)
  }
  return value
}

function matchFilter(c: any, types: CouponFilterType[]): boolean {
  if (!types.length) return true
  const type = String(c?.type || '')
  const scope = String(c?.scope || '')
  const audience = String(c?.claimAudience ?? c?.claim_audience ?? '')
  return types.some((t) => {
    if (t === 'fixed') return type === 'fixed'
    if (t === 'percent') return type === 'percent'
    if (t === 'all') return scope === 'all' || scope === ''
    if (t === 'newcomer') {
      // 「新人券」= 限定新用户/会员等级领取；接口无该字段时按命名兜底
      return /newcomer|new_user|新人/i.test(audience) || /新人|新客/.test(String(c?.name || ''))
    }
    return false
  })
}

function sortCoupons(list: any[], sort: CouponConfig['sort']): any[] {
  const arr = [...list]
  if (sort === 'amountDesc') {
    arr.sort((a, b) => amountWeight(b) - amountWeight(a))
  } else if (sort === 'expiringSoon') {
    arr.sort((a, b) => String(a?.endTime || a?.end_time || '9999').localeCompare(String(b?.endTime || b?.end_time || '9999')))
  } else {
    // latest：创建时间倒序；缺 createdAt 时保持接口返回顺序（通常已是倒序）
    arr.sort((a, b) => String(b?.createdAt || b?.created_at || '').localeCompare(String(a?.createdAt || a?.created_at || '')))
  }
  return arr
}

async function loadCoupons() {
  loadingRemote.value = true
  loadFailed.value = false
  try {
    if (cfg.value.data_mode === 'manual') {
      // 手动模式：直接用面板勾选的券，**不发请求**
      remoteCoupons.value = cfg.value.manual_items.map((it) => {
        const state = resolveCouponState(undefined, cfg.value)
        return {
          id: it.id,
          name: it.name || `券 #${it.id}`,
          displayValue: it.display_value || '—',
          condition: it.condition || '',
          state,
          buttonText: resolveButtonText(state, cfg.value),
        }
      })
      return
    }

    const res = await getCouponList({ page: 1, page_size: 50, status: 'published' } as any)
    const payload = (res as any)?.data || {}
    const records = payload.records || payload.list || []
    const list = Array.isArray(records) ? records : []
    const filtered = list.filter((c: any) => matchFilter(c, cfg.value.filter_types))
    remoteCoupons.value = sortCoupons(filtered, cfg.value.sort).map(formatCoupon)
  } catch {
    remoteCoupons.value = []
    loadFailed.value = true
  } finally {
    loadingRemote.value = false
  }
}

const displayCoupons = computed(() => remoteCoupons.value.slice(0, cfg.value.display_limit))

/* ---------------- 交互 ---------------- */

function onClaim(item: DisplayCoupon) {
  if (!props.previewMode) return
  const stateText = item.state === 'claim' ? '可领取' : item.state === 'used' ? '已领取' : '已抢光'
  emit('preview-action', {
    tab: 'home',
    message: item.state === 'claim' ? `领取优惠券：${item.name}` : `${item.name}（${stateText}）`,
    detailType: 'coupon',
    detailTitle: item.name,
    detailDesc: `${item.displayValue} · ${item.condition}`,
  })
}

function onMoreTap() {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'home',
    message: cfg.value.more_link
      ? `「${cfg.value.more_text}」→ ${cfg.value.more_link.split('?')[0].split('/').filter(Boolean).pop() || cfg.value.more_link}`
      : '「查看更多」还没设跳转，真机点了不会有反应',
  })
}

onMounted(loadCoupons)

// 筛选/排序/数量/模式变化都要重新取，避免「改了没反应」
watch(
  () => [
    cfg.value.data_mode,
    cfg.value.filter_types.join(','),
    cfg.value.sort,
    JSON.stringify(cfg.value.manual_items),
  ].join('|'),
  () => { void loadCoupons() },
)
</script>

<style lang="scss" scoped>
.render-coupon {
  background: transparent;
}

.cp-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cp-title {
  color: #172033;
  font-weight: 700;
}

.cp-more {
  padding: 0;
  font-size: 11px;
  color: #8a94a6;
  cursor: pointer;
  background: transparent;
  border: 0;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
  }
}

.cp-preview-empty {
  padding: 14px 10px;
  font-size: 11.5px;
  color: #909399;
  text-align: center;
  background: #f8faff;
  border-radius: 8px;
}

.cp-preview-empty--hidden {
  color: #a3aebd;
  background: #fafbfc;
  border: 1px dashed #e3e8f0;
}

.cp-list {
  display: flex;
}

/* ---------- 布局 ---------- */
.cp-list.is-scroll {
  flex-direction: row;
  overflow-x: auto;

  .cp-card {
    flex: 0 0 208px;
  }
}

.cp-list.is-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cp-list.is-stack {
  flex-direction: column;
}

/* ---------- 券卡 ---------- */
.cp-card {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.cp-list.is-stack .cp-card {
  min-height: 52px;
}

.cp-card.is-dim {
  opacity: 0.72;
}

.cp-card__amount {
  flex: none;
  min-width: 54px;
  font-weight: 700;
  text-align: center;
}

.cp-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.cp-card__name {
  overflow: hidden;
  color: #172033;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-card__cond {
  overflow: hidden;
  color: #909399;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-card__btn {
  flex: none;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 999px;
}

/* ---------- 风格：经典锯齿撕边 ---------- */
.cp-list.theme-tear .cp-card {
  border-radius: 8px;

  /* 右侧锯齿：用 mask 打出一排半圆缺口，比 clip-path 兼容性好 */
  -webkit-mask-image: linear-gradient(#000 0 0), repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 12px);
  mask-image: linear-gradient(#000 0 0), repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 12px);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
  -webkit-mask-position: 0 0, 100% 0;
  -webkit-mask-size: 100% 100%, 6px 100%;
  mask-size: 100% 100%, 6px 100%;
  mask-repeat: no-repeat, repeat-y;
}

/* ---------- 风格：内凹打孔卡片 ---------- */
.cp-list.theme-punch .cp-card {
  border-radius: 8px;
}

.cp-list.theme-punch .cp-card::before,
.cp-list.theme-punch .cp-card::after {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 20px;
  content: '';
  background: #fff;
  border-radius: 50%;
  transform: translateY(-50%);
}

.cp-list.theme-punch .cp-card::before { left: -5px; }
.cp-list.theme-punch .cp-card::after { right: -5px; }

/* ---------- 风格：极简圆角卡片 ---------- */
.cp-list.theme-rounded .cp-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(42, 31, 23, 0.06);
}
</style>
