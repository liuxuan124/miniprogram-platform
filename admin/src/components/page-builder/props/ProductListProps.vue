<template>
  <div class="plp-props">
    <el-collapse v-model="openGroups" class="plp-collapse">
      <!-- ==================== 标题行 ==================== -->
      <el-collapse-item name="header">
        <template #title>
          <span class="plp-grp-title">
            组件标题
            <span class="plp-grp-badge">{{ cfg.show_title ? (cfg.title || '未命名') : '已隐藏' }}</span>
          </span>
        </template>

        <div class="plp-field">
          <div class="plp-switch-row">
            <span class="plp-switch-row__label">
              显示组件标题
              <FieldHint text="关闭后画布与真机都不渲染标题行，只展示商品卡。" />
            </span>
            <el-switch
              :model-value="cfg.show_title"
              @update:model-value="(v: boolean) => patch({ show_title: v })"
            />
          </div>
        </div>

        <template v-if="cfg.show_title">
          <div class="plp-two">
            <div class="plp-two__cell">
              <span class="plp-two__label">主标题</span>
              <el-input
                :model-value="cfg.title"
                size="small"
                clearable
                maxlength="12"
                placeholder="热门推荐"
                @update:model-value="(v: string) => patch({ title: v })"
              />
            </div>
            <div class="plp-two__cell">
              <span class="plp-two__label">副标题</span>
              <el-input
                :model-value="cfg.subtitle"
                size="small"
                clearable
                maxlength="16"
                placeholder="选填，如 本周精选"
                @update:model-value="(v: string) => patch({ subtitle: v })"
              />
            </div>
          </div>

          <div class="plp-field">
            <div class="plp-switch-row">
              <span class="plp-switch-row__label">
                显示「查看更多」
                <FieldHint text="标题右侧的出口。固定数量模式下强烈建议开启 —— 否则用户看完这一屏就走了。" />
              </span>
              <el-switch
                :model-value="cfg.show_more"
                @update:model-value="(v: boolean) => patch({ show_more: v })"
              />
            </div>
          </div>

          <template v-if="cfg.show_more">
            <div class="plp-two">
              <div class="plp-two__cell">
                <span class="plp-two__label">入口文案</span>
                <el-input
                  :model-value="cfg.more_text"
                  size="small"
                  clearable
                  maxlength="8"
                  placeholder="查看更多"
                  @update:model-value="(v: string) => patch({ more_text: v })"
                />
              </div>
              <div class="plp-two__cell" />
            </div>

            <div class="plp-field">
              <label class="plp-label plp-label--sub">
                跳转链接
                <FieldHint text="点按钮从页面 / 商品 / 内容里选。留空时点「查看更多」跳默认商品列表页。" />
              </label>
              <button type="button" class="plp-link" @click="linkPickerRef?.open()">
                <span class="plp-link__tag">{{ moreLinkTag }}</span>
                <span class="plp-link__text">{{ cfg.more_link || '默认跳商品列表页' }}</span>
                <span class="plp-link__act">{{ cfg.more_link ? '重新选择' : '选择' }}</span>
              </button>
            </div>
          </template>
        </template>
      </el-collapse-item>

      <!-- ==================== 展示要素 ==================== -->
      <el-collapse-item name="display">
        <template #title>
          <span class="plp-grp-title">
            展示要素
            <span class="plp-grp-badge">{{ displaySummary }}</span>
          </span>
        </template>

        <div class="plp-field">
          <label class="plp-label">
            卡片显示哪些信息
            <FieldHint text="按需勾选。价格与卡片圆角等视觉项在「样式」页签。" />
          </label>
          <el-checkbox-group
            class="plp-elem-group"
            :model-value="elements"
            @update:model-value="(v: any) => onElementsChange(v as DisplayElement[])"
          >
            <el-checkbox-tag
              v-for="opt in DISPLAY_ELEMENTS"
              :key="opt.value"
              :value="opt.value"
              class="plp-tag"
            >
              {{ opt.label }}
            </el-checkbox-tag>
          </el-checkbox-group>
          <div class="plp-hint">{{ elementHint }}</div>
        </div>

        <div v-if="elements.includes('freeBadge')" class="plp-field">
          <label class="plp-label plp-label--sub">0 元商品价格位显示</label>
          <BuilderSegmented
            :model-value="cfg.zero_price_display"
            block
            :options="ZERO_PRICE_OPTIONS"
            @update:model-value="(v) => patch({ zero_price_display: v as 'amount' | 'free' })"
          />
        </div>

        <div v-if="elements.includes('badge')" class="plp-field">
          <label class="plp-label plp-label--sub">
            角标内容
            <FieldHint text="自动折扣率按「售价 / 原价」算，任一价格缺失时不显示角标（不会显示 0 折）。" />
          </label>
          <div class="plp-modes">
            <button
              v-for="opt in BADGE_OPTIONS"
              :key="opt.value"
              type="button"
              class="plp-mode"
              :class="{ 'is-on': cfg.badge_mode === opt.value }"
              :title="opt.desc"
              @click="patch({ badge_mode: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
          <div v-if="cfg.badge_mode === 'custom'" class="plp-field plp-field--tight">
            <el-input
              :model-value="cfg.badge_text"
              size="small"
              clearable
              maxlength="4"
              placeholder="如 新品 / 精选"
              @update:model-value="(v: string) => patch({ badge_text: v })"
            />
            <span class="plp-count">{{ (cfg.badge_text || '').length }}/4</span>
          </div>
        </div>

        <div class="plp-field">
          <label class="plp-label plp-label--sub">
            卡片行动点（CTA）
            <FieldHint text="在每张商品卡上放一个转化按钮。咨询类商品配「立即咨询」比「去购买」更贴合。" />
          </label>
          <BuilderSegmented
            :model-value="cfg.cta"
            block
            :options="CTA_OPTIONS"
            @update:model-value="(v) => patch({ cta: v as ProductCta })"
          />
          <div v-if="cfg.cta === 'custom'" class="plp-field plp-field--tight">
            <el-input
              :model-value="cfg.cta_text"
              size="small"
              clearable
              maxlength="6"
              placeholder="按钮文案"
              @update:model-value="(v: string) => patch({ cta_text: v })"
            />
          </div>
        </div>
      </el-collapse-item>

      <!-- ==================== 数据来源 ==================== -->
      <el-collapse-item name="source">
        <template #title>
          <span class="plp-grp-title">
            数据来源
            <span class="plp-grp-badge">
              {{ cfg.pick_mode === 'rule' ? liveBadge : `手动 · ${rows.length} 件` }}
            </span>
          </span>
        </template>

        <div class="plp-field">
          <label class="plp-label">
            选取方式
            <FieldHint text="按规则 = 系统按条件自动取；手动添加 = 自己挑商品并排顺序。" />
          </label>
          <div class="plp-mode-cards">
            <button
              v-for="opt in PICK_OPTIONS"
              :key="opt.value"
              type="button"
              class="plp-mode-card"
              :class="{ 'is-on': cfg.pick_mode === opt.value }"
              @click="onPickModeChange(opt.value)"
            >
              <span class="plp-mode-card__label">{{ opt.label }}</span>
              <span class="plp-mode-card__desc">{{ opt.desc }}</span>
            </button>
          </div>
        </div>

        <!-- ---------- 按规则筛选 ---------- -->
        <template v-if="cfg.pick_mode === 'rule'">
          <!-- 已匹配数量胶囊：替代原来那张 * type product / * query 调试卡 -->
          <div class="plp-match" :class="matchTone">
            <span class="plp-match__dot"></span>
            <span class="plp-match__text">
              {{ liveLoading ? '正在匹配商品…' : `已过滤并匹配 ${liveItems.length} 件商品` }}
            </span>
            <span v-if="liveItems.length" class="plp-match__sub">画布预览展示前 {{ previewCap }} 件</span>
            <span v-else-if="!liveLoading" class="plp-match__sub">当前条件下无商品，画布显示空态</span>
          </div>

          <div class="plp-field">
            <label class="plp-label plp-label--sub">商品分类</label>
            <el-select
              :model-value="queryParams.category_id ?? ''"
              clearable
              filterable
              placeholder="全部分类"
              style="width: 100%"
              @change="(v: string | number) => patchQuery({ category_id: v || undefined })"
            >
              <el-option label="全部分类" value="" />
              <el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </div>

          <div class="plp-field">
            <label class="plp-label plp-label--sub">商品类型</label>
            <el-select
              :model-value="queryParams.product_type || ''"
              clearable
              placeholder="全部类型"
              style="width: 100%"
              @change="(v: string) => patchQuery({ product_type: v || undefined })"
            >
              <el-option label="全部类型" value="" />
              <el-option label="实物商品" value="physical" />
              <el-option label="虚拟商品" value="digital" />
              <el-option label="服务商品" value="service" />
            </el-select>
          </div>

          <div class="plp-field">
            <label class="plp-label plp-label--sub">排序方式</label>
            <el-select :model-value="sortBy" style="width: 100%" @change="onSortByChange">
              <el-option label="按销量排序" value="sales" />
              <el-option label="最新上架" value="newest" />
              <el-option label="价格从低到高" value="price_asc" />
              <el-option label="价格从高到低" value="price_desc" />
            </el-select>
          </div>

          <div class="plp-field">
            <label class="plp-label plp-label--sub">价格区间</label>
            <el-select :model-value="priceFilter" style="width: 100%" @change="onPriceFilterChange">
              <el-option
                v-for="opt in PRICE_FILTER_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <div class="plp-hint">{{ priceFilterHint }}</div>
          </div>

          <template v-if="priceFilter === 'custom'">
            <div class="plp-two">
              <div class="plp-two__cell">
                <span class="plp-two__label">最低价</span>
                <el-input-number
                  :model-value="customPriceMin"
                  :min="0"
                  :precision="2"
                  :step="1"
                  controls-position="right"
                  placeholder="不限"
                  style="width: 100%"
                  @change="(v: number | undefined) => patchQuery({ price_min: v ?? undefined })"
                />
              </div>
              <div class="plp-two__cell">
                <span class="plp-two__label">最高价</span>
                <el-input-number
                  :model-value="customPriceMax"
                  :min="0"
                  :precision="2"
                  :step="1"
                  controls-position="right"
                  placeholder="不限"
                  style="width: 100%"
                  @change="(v: number | undefined) => patchQuery({ price_max: v ?? undefined })"
                />
              </div>
            </div>
          </template>
        </template>

        <!-- ---------- 手动添加 ---------- -->
        <template v-else>
          <div class="plp-field">
            <label class="plp-label plp-label--sub">
              已选商品
              <FieldHint text="点按钮挑选，挑选时可拖拽排序 —— 展示顺序即勾选顺序。" />
            </label>

            <div v-if="!rows.length" class="plp-blank">
              <p class="plp-blank__title">还没选商品</p>
              <p class="plp-blank__hint">手动模式必须至少选 1 件，否则画布显示空态</p>
              <el-button type="primary" size="small" @click="openPicker">+ 添加商品</el-button>
            </div>

            <div v-else class="plp-picked">
              <div
                v-for="(row, index) in rows"
                :key="row.id"
                class="plp-picked__row"
              >
                <span class="plp-picked__idx">{{ index + 1 }}</span>
                <span class="plp-picked__thumb">
                  <img v-if="row.image" :src="row.image" alt="" />
                  <span v-else>🛍️</span>
                </span>
                <span class="plp-picked__main">
                  <span class="plp-picked__name">{{ row.name }}</span>
                  <span class="plp-picked__price" :class="{ 'is-free': row.isFree }">
                    {{ row.isFree ? '免费领取' : `¥${row.price}` }}
                  </span>
                </span>
                <button
                  type="button"
                  class="plp-picked__ico"
                  :disabled="index === 0"
                  title="上移"
                  @click="moveRow(index, -1)"
                >
                  <el-icon><Top /></el-icon>
                </button>
                <button
                  type="button"
                  class="plp-picked__ico"
                  :disabled="index === rows.length - 1"
                  title="下移"
                  @click="moveRow(index, 1)"
                >
                  <el-icon><Bottom /></el-icon>
                </button>
                <button
                  type="button"
                  class="plp-picked__ico plp-picked__ico--danger"
                  title="移除"
                  @click="removeRow(index)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </div>

            <div v-if="rows.length" class="plp-picked__ops">
              <el-button type="primary" size="small" @click="openPicker">+ 继续添加</el-button>
              <el-button size="small" @click="openPicker">重新挑选</el-button>
            </div>
          </div>
        </template>

        <!-- ---------- 分页策略 ---------- -->
        <div class="plp-field">
          <label class="plp-label plp-label--sub">
            分页策略
            <FieldHint text="固定数量适合首页精选；触底加载适合「逛逛」型长列表。" />
          </label>
          <BuilderSegmented
            :model-value="cfg.page_strategy"
            block
            :options="PAGE_STRATEGY_OPTIONS"
            @update:model-value="(v) => onStrategyChange(v as ProductPageStrategy)"
          />
        </div>

        <div v-if="cfg.page_strategy === 'fixed'" class="plp-field">
          <label class="plp-label plp-label--sub">
            展示数量
            <FieldHint text="配合标题栏的「查看更多」形成「精选 N 件 + 全量页」的组合。" />
          </label>
          <NumSliderRow
            :model-value="cfg.limit"
            :min="LIMIT.min"
            :max="LIMIT.max"
            :step="LIMIT.step"
            :fallback="LIMIT.fallback"
            @update:model-value="(v: number) => patch({ limit: v })"
          />
        </div>

        <div v-else class="plp-field">
          <label class="plp-label plp-label--sub">每批加载</label>
          <NumSliderRow
            :model-value="cfg.page_size"
            :min="PAGE_SIZE_RANGE.min"
            :max="PAGE_SIZE_RANGE.max"
            :step="PAGE_SIZE_RANGE.step"
            :fallback="PAGE_SIZE_RANGE.fallback"
            @update:model-value="(v: number) => patch({ page_size: v })"
          />
        </div>
      </el-collapse-item>
    </el-collapse>

    <ProductSelectDialog ref="pickerRef" :model-value="cfg.manual_ids" @update:model-value="onIdsPicked" />
    <CategoryLinkPicker
      ref="linkPickerRef"
      :model-value="cfg.more_link"
      @update:model-value="(v: string) => patch({ more_link: v })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bottom, Delete, Top } from '@element-plus/icons-vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
// ⚠️ NumSliderRow 在 props/ 目录；写 ./NumSliderRow.vue 只在 vite build 报
//    Could not resolve，vue-tsc 查不出来。
import NumSliderRow from './NumSliderRow.vue'
import CategoryLinkPicker from '../categoryNav/CategoryLinkPicker.vue'
import ProductSelectDialog from '../productList/ProductSelectDialog.vue'
import {
  PRODUCT_BADGE_MODE_OPTIONS,
  PRODUCT_CTA_OPTIONS,
  PRODUCT_DISPLAY_ELEMENTS,
  PRODUCT_LIST_LIMIT,
  PRODUCT_LIST_MANUAL_MAX,
  PRODUCT_LIST_PAGE_SIZE,
  PRODUCT_PAGE_STRATEGY_OPTIONS,
  PRODUCT_PICK_MODE_OPTIONS,
  normalizeProductListProps,
  type DisplayElement,
  type PickMode,
  type ProductCta,
  type ProductListProps as ProductConfig,
  type ProductPageStrategy,
} from '../productList/productListSchema'
import { PRICE_FILTER_OPTIONS as PRICE_OPTS, type PriceFilterMode } from '@/utils/product-price-filter'
import { getCategoryList } from '@/api/product'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { pickProductCoverUrl } from '@/utils/product-cover'
import { ComponentType, type ComponentInstance } from '@/types/page'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const DISPLAY_ELEMENTS = PRODUCT_DISPLAY_ELEMENTS
const CTA_OPTIONS = PRODUCT_CTA_OPTIONS
const BADGE_OPTIONS = PRODUCT_BADGE_MODE_OPTIONS
const PICK_OPTIONS = PRODUCT_PICK_MODE_OPTIONS
const PAGE_STRATEGY_OPTIONS = PRODUCT_PAGE_STRATEGY_OPTIONS
const LIMIT = PRODUCT_LIST_LIMIT
const PAGE_SIZE_RANGE = PRODUCT_LIST_PAGE_SIZE
const PRICE_FILTER_OPTIONS = PRICE_OPTS
const ZERO_PRICE_OPTIONS = [
  { value: 'free', label: '免费领取' },
  { value: 'amount', label: '显示 ¥0' },
]

const cfg = computed<ProductConfig>(() => normalizeProductListProps(props.props))
const openGroups = ref<string[]>(['header', 'display', 'source'])
const pickerRef = ref<InstanceType<typeof ProductSelectDialog> | null>(null)
const linkPickerRef = ref<InstanceType<typeof CategoryLinkPicker> | null>(null)
const categoryOptions = ref<{ id: number | string; name: string }[]>([])

/* ---------------- 展示要素 ---------------- */
const elements = computed<DisplayElement[]>(() => {
  const out: DisplayElement[] = []
  if (cfg.value.show_title_in_card) out.push('title')
  if (cfg.value.show_original_price) out.push('originalPrice')
  if (cfg.value.show_sales) out.push('sales')
  if (cfg.value.zero_price_display === 'free') out.push('freeBadge')
  if (cfg.value.badge_mode !== 'none') out.push('badge')
  return out
})

/**
 * 展示要素 → 旧开关字段的写回映射。
 * 🔴 必须写回旧字段（而不只是 display_elements）：
 *   端上 `dsl-product-list` 与旧版本画布读的是 `show_price` / `show_sales`；
 *   只写新字段会让「面板勾了、真机没变」。
 *
 * ⚠️ 局部变量不能叫 `patch` —— 会遮蔽同名的 patch() 函数，
 *   然后 `patch({ ...patch })` 报 TS2349「表达式不可调用」。
 */
const ELEMENT_FIELD_MAP: Record<DisplayElement, { key: string; value: any }> = {
  title: { key: 'show_card_title', value: true },
  originalPrice: { key: 'show_original_price', value: true },
  sales: { key: 'show_sales', value: true },
  freeBadge: { key: 'zero_price_display', value: 'free' },
  badge: { key: 'badge_mode', value: 'autoDiscount' },
}

function onElementsChange(next: DisplayElement[]) {
  const nextProps: Record<string, any> = { display_elements: next }
  for (const [key, el] of Object.entries(ELEMENT_FIELD_MAP) as Array<[DisplayElement, any]>) {
    const on = next.includes(key as DisplayElement)
    if (key === 'freeBadge') {
      nextProps.zero_price_display = on ? 'free' : 'amount'
    } else if (key === 'badge') {
      if (on && !props.props.badge_mode) nextProps.badge_mode = 'autoDiscount'
      if (!on) nextProps.badge_mode = 'none'
    } else {
      nextProps[el.key] = on ? el.value : false
    }
  }
  patch({ ...nextProps })
}

const displaySummary = computed(() => {
  if (!elements.value.length) return '全隐藏'
  return elements.value.map((e) => DISPLAY_ELEMENTS.find((o) => o.value === e)?.label || e).join(' / ')
})

const elementHint = computed(() => {
  if (!elements.value.length) return '一个都不勾的话卡片只剩图，几乎没有转化信息。'
  if (!elements.value.includes('title')) return '已隐藏商品标题 —— 建议至少保留标题，否则用户看不出这是什么东西。'
  return ''
})

/* ---------------- 匹配数量胶囊 ---------------- */
const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-product-list',
  type: ComponentType.ProductList,
  props: props.props,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const previewCap = computed(() =>
  cfg.value.page_strategy === 'stream' ? cfg.value.page_size : cfg.value.limit,
)

const liveBadge = computed(() => liveLoading.value ? '读取中…' : `已匹配 ${liveItems.value.length} 件`)

const matchTone = computed(() => {
  if (liveLoading.value) return 'is-loading'
  return liveItems.value.length ? 'is-ok' : 'is-empty'
})

/* ---------------- 数据源：按规则 ---------------- */
const queryParams = computed(() => {
  const ds = props.props.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

const sortBy = computed(() => queryParams.value.sort_by || 'sales')

const priceFilter = computed(() => {
  const raw = String(queryParams.value.price_filter || 'all').trim() as PriceFilterMode
  return PRICE_FILTER_OPTIONS.some((o) => o.value === raw) ? raw : 'all'
})

const priceFilterHint = computed(() =>
  PRICE_FILTER_OPTIONS.find((o) => o.value === priceFilter.value)?.hint || '',
)

const customPriceMin = computed(() => {
  const v = queryParams.value.price_min
  return v === '' || v == null ? undefined : Number(v)
})

const customPriceMax = computed(() => {
  const v = queryParams.value.price_max
  return v === '' || v == null ? undefined : Number(v)
})

function patchQuery(p: Record<string, any>) {
  const params = { ...queryParams.value, status: 'on_sale', ...p }
  delete params.ids
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  emit('update', {
    pick_mode: 'rule',
    source_mode: 'auto',
    manual_ids: [],
    product_ids: [],
    data_source: { type: 'product', params, query: params },
  })
}

function onSortByChange(val: string) {
  patchQuery({ sort_by: val, sort_order: val === 'price_asc' ? 'asc' : 'desc' })
}

function onPriceFilterChange(val: PriceFilterMode) {
  if (val === 'custom') {
    patchQuery({ price_filter: val })
    return
  }
  patchQuery({ price_filter: val, price_min: undefined, price_max: undefined })
}

function onPickModeChange(val: PickMode) {
  if (val === 'manual') {
    patch({ pick_mode: 'manual', source_mode: 'manual' })
    return
  }
  patchQuery({})
}

function onStrategyChange(val: ProductPageStrategy) {
  // 同时写新旧字段：端上读 display_mode
  patch({ page_strategy: val, display_mode: val === 'stream' ? 'stream' : 'fixed' })
}

/* ---------------- 数据源：手动 ---------------- */
interface PickedRow {
  id: string
  name: string
  price: string
  image: string
  isFree: boolean
}

/** 本地行缓冲：id 顺序是唯一真相，name/price 只为展示（可能随商品改价而变真） */
const rows = ref<PickedRow[]>([])

function nameOf(id: string): string {
  const fromSaved = (Array.isArray(props.props.items) ? props.props.items : [])
    .find((it: any) => String(it?.id) === id)
  if (fromSaved) return String(fromSaved.name || fromSaved.title || `商品 ${id}`)
  return `商品 ${id}`
}

function priceOf(id: string): string {
  const fromSaved = (Array.isArray(props.props.items) ? props.props.items : [])
    .find((it: any) => String(it?.id) === id)
  return fromSaved ? String(fromSaved.price ?? '') : ''
}

function imageOf(id: string): string {
  const fromSaved = (Array.isArray(props.props.items) ? props.props.items : [])
    .find((it: any) => String(it?.id) === id)
  return fromSaved ? pickProductCoverUrl(fromSaved) : ''
}

function buildRows(ids: string[]): PickedRow[] {
  return ids.slice(0, PRODUCT_LIST_MANUAL_MAX).map((id) => {
    const price = priceOf(id)
    return {
      id,
      name: nameOf(id),
      price,
      image: imageOf(id),
      isFree: Number(price) === 0,
    }
  })
}

watch(
  () => JSON.stringify(cfg.value.manual_ids),
  (incoming) => {
    const list = JSON.parse(incoming) as string[]
    rows.value = buildRows(list)
  },
  { immediate: true },
)

function onIdsPicked(ids: string[]) {
  patch({ manual_ids: ids, product_ids: ids, pick_mode: 'manual', source_mode: 'manual' })
  // 新勾的商品在 items 里没有快照 → 触发一次按 id 重建（复用渲染器的 orderProductsByIds 兜底）
  void refreshManualItems(ids)
}

async function refreshManualItems(ids: string[]) {
  if (!ids.length) return
  const items = ids.map((id) => {
    const row = rows.value.find((r) => r.id === id)
    return {
      id,
      name: row?.name || nameOf(id),
      title: row?.name || nameOf(id),
      price: row?.price ?? priceOf(id),
      sales: 0,
      image: row?.image ?? imageOf(id),
      mainImage: row?.image ?? imageOf(id),
    }
  })
  emit('update', { items })
}

function removeRow(index: number) {
  const next = rows.value.map((r) => r.id).filter((_, i) => i !== index)
  onIdsPicked(next)
}

function moveRow(index: number, delta: number) {
  const ids = rows.value.map((r) => r.id)
  const target = index + delta
  if (target < 0 || target >= ids.length) return
  const [moved] = ids.splice(index, 1)
  ids.splice(target, 0, moved)
  onIdsPicked(ids)
}

function openPicker() {
  pickerRef.value?.open()
}

/* ---------------- 通用 ---------------- */
function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

const moreLinkTag = computed(() => {
  const raw = cfg.value.more_link
  if (!raw) return '默认'
  if (raw.startsWith('http')) return '网页'
  if (raw.includes('product-detail')) return '商品'
  if (raw.includes('product-list')) return '商品列表'
  return '页面'
})

function flattenCategories(nodes: any[], prefix = ''): { id: number | string; name: string }[] {
  const out: { id: number | string; name: string }[] = []
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const id = node?.id
    if (id == null) continue
    const name = String(node.name || '')
    const label = prefix ? `${prefix} / ${name}` : name
    out.push({ id, name: label })
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenCategories(node.children, label))
    }
  }
  return out
}

onMounted(async () => {
  try {
    const res = await getCategoryList()
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    categoryOptions.value = flattenCategories(list)
  } catch {
    categoryOptions.value = []
  }
})
</script>

<style lang="scss" scoped>
.plp-collapse {
  border: 0;

  :deep(.el-collapse-item__header),
  :deep(.el-collapse-item__wrap) {
    border-bottom-color: #efe9e0;
  }

  /* 🔴 line-height 必须归零：header 默认 line-height 会被内部 <span> badge 继承 */
  :deep(.el-collapse-item__header) {
    height: 38px;
    padding: 0 2px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: #3f3a35;
  }

  :deep(.el-collapse-item__content) {
    padding: 4px 2px 14px;
  }
}

.plp-grp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.plp-grp-badge {
  display: inline-flex;
  align-items: center;
  flex: none;
  max-width: 168px;
  /* 🔴 必须显式给 height + line-height：badge 是 <span>，
     会继承 el-collapse-item__header 的 line-height（实测 48px）被撑成竖长条 */
  height: 17px;
  padding: 0 6px;
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 17px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f7f3ec;
  border-radius: 5px;
}

.plp-field {
  margin-top: 12px;
}

.plp-field:first-child {
  margin-top: 2px;
}

.plp-field--tight {
  margin-top: 7px;
}

.plp-label {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b5b4e;
}

.plp-label--sub {
  color: #8a7d6f;
}

.plp-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

.plp-count {
  flex: none;
  font-size: 10.5px;
  color: #c4b9ac;
}

/* ---------- 开关行 ---------- */
.plp-switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0;
}

.plp-switch-row__label {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 两列 ---------- */
.plp-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.plp-two__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.plp-two__label {
  font-size: 11px;
  color: #8a7d6f;
}

/* ---------- 展示要素 Tag ---------- */
.plp-elem-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plp-tag {
  font-size: 12px;
  border-radius: 7px;
}

/* ---------- 模式 ---------- */
.plp-mode-cards {
  display: flex;
  gap: 6px;
}

.plp-mode-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.plp-mode-card__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.plp-mode-card__desc {
  font-size: 11px;
  line-height: 1.4;
  color: #a89c8d;
}

.plp-mode-card.is-on .plp-mode-card__label {
  color: var(--el-color-primary, #c08e6e);
}

.plp-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plp-mode {
  flex: 1 1 auto;
  min-width: 74px;
  padding: 6px 4px;
  font-family: inherit;
  font-size: 12px;
  color: #6b5b4e;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    font-weight: 600;
    color: var(--el-color-primary, #c08e6e);
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

/* ---------- 匹配数量胶囊（替代 * type / * query 调试卡） ---------- */
.plp-match {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 10px;
  padding: 8px 10px;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 8px;
}

.plp-match__dot {
  flex: none;
  width: 7px;
  height: 7px;
  background: #1fa97a;
  border-radius: 50%;
}

.plp-match__text {
  flex: none;
  font-size: 12px;
  color: #3f3a35;
}

.plp-match__sub {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  color: #a89c8d;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plp-match.is-loading .plp-match__dot {
  background: #d4a017;
}

.plp-match.is-empty {
  background: #fffbeb;
  border-color: #fde68a;
}

.plp-match.is-empty .plp-match__dot {
  background: #d97706;
}

/* ---------- 手动已选 ---------- */
.plp-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 9px;
}

.plp-blank__title {
  margin: 0;
  font-size: 12.5px;
  color: #5c5249;
}

.plp-blank__hint {
  margin: 3px 0 10px;
  font-size: 11px;
  color: #a89c8d;
}

.plp-picked {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 260px;
  overflow-y: auto;
}

.plp-picked__row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px 7px;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 7px;
}

.plp-picked__idx {
  flex: none;
  width: 15px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: #b3a596;
  text-align: right;
}

.plp-picked__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  overflow: hidden;
  font-size: 13px;
  background: #f1ede6;
  border-radius: 5px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.plp-picked__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.plp-picked__name {
  overflow: hidden;
  font-size: 12px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 🔴 0 元商品用绿色区分，不能和付费商品一样显示 ¥0 */
.plp-picked__price {
  font-size: 10.5px;
  color: #e11d48;
}

.plp-picked__price.is-free {
  color: #1fa97a;
}

.plp-picked__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 21px;
  height: 21px;
  padding: 0;
  color: #8a7d6f;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;

  &:hover:not(:disabled) {
    color: var(--el-color-primary, #c08e6e);
    background: #f6f2ec;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.plp-picked__ico--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeeec;
}

.plp-picked__ops {
  display: flex;
  gap: 8px;
  margin-top: 7px;
}

/* ---------- 链接 ---------- */
.plp-link {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.plp-link__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  background: #fff;
  border-radius: 6px;
}

.plp-link__text {
  flex: 1;
  overflow: hidden;
  font-size: 11.5px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plp-link__act {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}
</style>
