<template>
  <div class="render-search-wrap">
    <!-- ==================== 编辑画布：静态展示（可点选组件） ==================== -->
    <!--
      🔴 这里**不能加 @click.stop**（2026-10-06 修）：
      组件选中是靠 BaseRenderer 的 `@click.stop="$emit('select')"` **冒泡**实现的。
      而 `.srch-box` 是本渲染器唯一的子元素、且铺满全宽，一旦 stop 就等于
      **整个搜索框区域都点不中**（表现：点搜索框右侧属性面板不弹出、也选不上）。
      其他渲染器的 stop 都加在「子项」上（点了子项不该顺带选中组件），
      唯独这里 stop 的是唯一的根级区域 —— 属于误用。
      代价：编辑态点搜索框不再弹「将跳转到 X」的落地提示。
      判据：编辑态的职责是**选中组件**，落地提示属于交互预览的职责（下方 previewMode 分支已覆盖）。
    -->
    <div
      v-if="!previewMode"
      class="srch-box"
      :class="{ 'srch-box--sticky': cfg.sticky }"
      :style="boxStyle"
      :title="editHint"
    >
      <span class="srch-box__icon" :style="{ color: cfg.text_color }">🔍</span>
      <span class="srch-box__text" :style="{ color: cfg.text_color }">{{ activePlaceholder }}</span>
      <span v-if="cfg.right_action !== 'none'" class="srch-box__action" :style="actionStyle">
        {{ actionLabel }}
      </span>
      <span v-if="cfg.sticky" class="srch-box__pin" title="已开启吸顶">📌</span>
    </div>

    <!-- ==================== 交互预览：可输入、可搜索 ==================== -->
    <template v-else>
      <div
        class="srch-box srch-box--active"
        :class="{ 'srch-box--sticky': cfg.sticky }"
        :style="boxStyle"
        @click.stop="onCanvasTap"
      >
        <span class="srch-box__icon" :style="{ color: cfg.text_color }">🔍</span>
        <input
          v-model="keyword"
          class="srch-box__input"
          :style="{ color: cfg.text_color }"
          :placeholder="activePlaceholder"
          @keyup.enter="doSearch"
          @click.stop
        />
        <span
          v-if="cfg.right_action === 'button'"
          class="srch-box__btn"
          :style="actionStyle"
          @click.stop="doSearch"
        >
          {{ searching ? '搜索中' : (cfg.right_action_text || '搜索') }}
        </span>
        <span
          v-else-if="cfg.right_action === 'scan'"
          class="srch-box__icon-btn"
          :style="{ color: cfg.text_color }"
          title="扫一扫"
          @click.stop="emit('preview-action', previewPayload('扫一扫'))"
        >⌗</span>
        <span
          v-else-if="cfg.right_action === 'category'"
          class="srch-box__icon-btn"
          :style="{ color: cfg.text_color }"
          title="分类"
          @click.stop="emit('preview-action', previewPayload('分类入口'))"
        >☰</span>
      </div>

      <!-- 弹窗搜索（tap_target = popup） -->
      <div v-if="popupOpen" class="srch-popup" @click.stop="popupOpen = false">
        <div class="srch-popup__mask"></div>
        <div class="srch-popup__panel" @click.stop>
          <div class="srch-popup__head">
            <span class="srch-popup__title">搜索</span>
            <button type="button" class="srch-popup__close" @click="popupOpen = false">✕</button>
          </div>
          <input v-model="keyword" class="srch-popup__input" placeholder="输入关键词" @keyup.enter="doSearch" />
          <div class="srch-popup__scope">范围：{{ scopeText }}</div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searched && !popupOpen" class="search-results">
        <div v-if="results.length === 0" class="search-empty">未找到「{{ lastKeyword }}」相关结果</div>
        <div
          v-for="item in results"
          :key="item.type + item.id"
          class="search-result-item"
          @click.stop="openResult(item)"
        >
          <span class="result-tag" :class="`result-tag--${item.type}`">{{ typeLabels[item.type] }}</span>
          <span class="result-title">{{ item.title }}</span>
          <span class="result-extra">{{ item.extra }}</span>
        </div>
        <button class="search-close" @click.stop="clearResults">收起结果</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { get } from '@/api/request'
import type { ComponentInstance } from '@/types/page'
import {
  isActivityOnly,
  normalizeSearchProps,
  resolveSearchBg,
  resolveSearchRadius,
  scopeSummary,
  type SearchProps as SearchConfig,
} from '../search/searchSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 归一化配置：与属性面板读同一份 Schema，避免两边漂移 */
const cfg = computed<SearchConfig>(() => normalizeSearchProps(props.component.props))

const scopeText = computed(() => scopeSummary(cfg.value.scopes))

/* ---------------- 样式 ---------------- */

const boxStyle = computed(() => {
  const width = cfg.value.border_width > 0 ? cfg.value.border_width : 0
  const style: Record<string, string> = {
    borderRadius: `${resolveSearchRadius(cfg.value.shape)}px`,
    background: resolveSearchBg(cfg.value),
    border: width > 0 ? `${width}px solid ${cfg.value.border_color}` : 'none',
    justifyContent: cfg.value.align === 'center' ? 'center' : 'flex-start',
    textAlign: cfg.value.align,
  }
  // 画布内 position:sticky 无滚动容器，会「粘住不动」反而误导运营，
  // 所以这里只用一个视觉标记（📌）表达已开启，不真吸顶；真机由小程序端 CSS 生效。
  return style
})

const actionStyle = computed(() => ({ color: cfg.value.text_color }))

const actionLabel = computed(() => {
  switch (cfg.value.right_action) {
    case 'button': return cfg.value.right_action_text || '搜索'
    case 'scan': return '扫码'
    case 'category': return '分类'
    default: return ''
  }
})

/* ---------------- 占位词轮播 ---------------- */

const keyword = ref('')
const phIndex = ref(0)
let phTimer: ReturnType<typeof setInterval> | null = null

const activePlaceholder = computed(() => cfg.value.placeholders[phIndex.value] || '')

function stopTimer() {
  if (phTimer) {
    clearInterval(phTimer)
    phTimer = null
  }
}

function startTimer() {
  stopTimer()
  const total = cfg.value.placeholders.length
  // 单条不轮播；间隔夹紧到 ≥1s，避免出现 0 导致的疯狂切换
  const seconds = Math.max(1, cfg.value.placeholder_interval || 3)
  if (total <= 1) return
  phTimer = setInterval(() => {
    phIndex.value = (phIndex.value + 1) % total
  }, seconds * 1000)
}

watch(
  () => [cfg.value.placeholders.length, cfg.value.placeholder_interval] as const,
  () => {
    // 列表变短时先把下标夹回合法范围，避免轮播到 undefined
    if (phIndex.value >= cfg.value.placeholders.length) phIndex.value = 0
    startTimer()
  },
  { immediate: true },
)

onBeforeUnmount(stopTimer)

/* ---------------- 预览动作 ---------------- */

function previewPayload(action: string) {
  return {
    tab: 'shop',
    message: `${action}（范围：${scopeText.value}）`,
    detailDesc: `落地：${cfg.value.tap_target === 'link' ? (cfg.value.link_url || '未设置页面，回落默认搜索页') : cfg.value.tap_target}`,
  }
}

/* ---------------- 搜索执行 ---------------- */

const popupOpen = ref(false)
const lastKeyword = ref('')
const searching = ref(false)
const searched = ref(false)
const results = ref<SearchResult[]>([])

type ResultType = 'product' | 'content' | 'activity'
type SearchResult = { type: ResultType; id: string | number; title: string; extra: string; desc: string }

const typeLabels: Record<ResultType, string> = { product: '商品', content: '内容', activity: '活动' }

function extractRecords(res: any): any[] {
  const data = res?.data
  return data?.records || data?.list || (Array.isArray(data) ? data : [])
}

/** 勾选范围 → 本次要查的数据源。空数组 = 全部 */
function activeSources(): ResultType[] {
  const scopes = cfg.value.scopes
  if (!scopes.length) return ['product', 'content', 'activity']
  const map: Record<string, ResultType> = {
    product: 'product',
    column: 'content',
    activity: 'activity',
    file: 'content',
  }
  // 去重（column 与 file 都落到 content）
  return Array.from(new Set(scopes.map((s) => map[s]).filter(Boolean) as ResultType[]))
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  searching.value = true
  lastKeyword.value = kw
  const sources = activeSources()
  const found: SearchResult[] = []
  const match = (text: string) => (text || '').toLowerCase().includes(kw.toLowerCase())

  try {
    const tasks: Promise<void>[] = []
    if (sources.includes('product')) {
      tasks.push(
        getProductList({ current: 1, size: 50 } as any).then((res) => {
          extractRecords(res).forEach((item: any) => {
            const name = item.name || item.title || ''
            if (match(name)) {
              found.push({ type: 'product', id: item.id, title: name, extra: `¥${item.price ?? '--'}`, desc: `售价 ¥${item.price ?? '--'}` })
            }
          })
        }).catch(() => {}),
      )
    }
    if (sources.includes('content')) {
      tasks.push(
        getContentList({ page: 1, page_size: 50 } as any).then((res) => {
          extractRecords(res).forEach((item: any) => {
            const title = item.title || item.name || ''
            if (match(title)) {
              found.push({ type: 'content', id: item.id, title, extra: '', desc: item.summary || item.desc || '图文内容详情' })
            }
          })
        }).catch(() => {}),
      )
    }
    if (sources.includes('activity')) {
      tasks.push(
        get('/api/v1/admin/activities', { current: 1, size: 50 }).then((res: any) => {
          extractRecords(res).forEach((item: any) => {
            const name = item.name || ''
            if (match(name)) {
              found.push({ type: 'activity', id: item.id, title: name, extra: item.dateText || '', desc: item.venue || '活动详情' })
            }
          })
        }).catch(() => {}),
      )
    }
    await Promise.all(tasks)
    results.value = found.slice(0, 10)
    searched.value = true
    popupOpen.value = false
  } finally {
    searching.value = false
  }
}

function openResult(item: SearchResult) {
  const tabMap: Record<ResultType, string> = { product: 'shop', content: 'content', activity: 'activity' }
  emit('preview-action', {
    tab: tabMap[item.type],
    message: `已打开「${item.title}」`,
    detailType: item.type,
    detailTitle: item.title,
    detailDesc: item.desc,
  })
}

function clearResults() {
  searched.value = false
  results.value = []
}

/** 编辑态点击：按 tap_target 演示不同落地行为，让运营直观看到配置差异 */
/**
 * 编辑态 hover 提示：告知「点选组件」+ 当前配置会跳到哪，
 * 替代原先被移除的「点击弹落地提示」——信息没丢，只是不再抢点击。
 */
const editHint = computed(() => {
  const target = landingText.value
  const scope = scopeText.value
  return scope ? `点击选中组件 · 落地：${target}（范围：${scope}）` : `点击选中组件 · 落地：${target}`
})

/** 交互预览态的落地目标文案 */
const landingText = computed(() => {
  if (cfg.value.tap_target === 'popup') return '弹窗搜索'
  if (cfg.value.tap_target === 'link') return cfg.value.link_url || '默认搜索页'
  if (isActivityOnly(cfg.value.scopes)) return '活动列表页'
  return '默认搜索页'
})

/**
 * 交互预览态点击的处理逻辑（原先挂在编辑态，现只在 previewMode 分支调用）。
 * 与 landingText / editHint 共用同一套落地判定，避免两处口径漂移。
 */
function onCanvasTap() {
  if (cfg.value.tap_target === 'popup') {
    popupOpen.value = true
    return
  }
  if (cfg.value.tap_target === 'link') {
    emit('preview-action', {
      tab: 'shop',
      message: cfg.value.link_url ? `将跳转到 ${cfg.value.link_url}` : '未设置落地页面，回落默认搜索页',
    })
    return
  }
  if (isActivityOnly(cfg.value.scopes)) {
    emit('preview-action', { tab: 'activity', message: '只勾了活动 → 直接进活动列表页' })
    return
  }
  emit('preview-action', { tab: 'shop', message: `进入默认搜索页（范围：${scopeText.value}）` })
}
</script>

<style lang="scss" scoped>
.srch-box {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  overflow: hidden;
  font-size: 12px;
}

.srch-box--sticky {
  box-shadow: 0 1px 0 rgba(42, 31, 23, 0.04);
}

.srch-box__icon {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1;
}

.srch-box__text {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.srch-box__input {
  flex: 1;
  min-width: 0;
  padding: 0;
  font-size: 12px;
  background: transparent;
  border: 0;
  outline: none;

  &::placeholder {
    color: #8a94a6;
  }
}

.srch-box__btn {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  cursor: pointer;
  background: var(--theme-primary, var(--color-primary, #c08e6e));
  border-radius: 999px;
}

.srch-box__icon-btn {
  flex-shrink: 0;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.srch-box__action {
  flex-shrink: 0;
  padding-left: 8px;
  font-size: 11px;
  border-left: 1px solid rgba(138, 148, 166, 0.35);
}

.srch-box__pin {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 9px;
  line-height: 1;
  opacity: 0.55;
}

/* ---------- 弹窗搜索 ---------- */
.srch-popup {
  position: absolute;
  inset: 0;
  z-index: 20;
}

.srch-popup__mask {
  position: absolute;
  inset: 0;
  background: rgba(23, 32, 51, 0.42);
}

.srch-popup__panel {
  position: relative;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}

.srch-popup__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.srch-popup__title {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.srch-popup__close {
  padding: 0 4px;
  font-size: 12px;
  color: #8a94a6;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.srch-popup__input {
  width: 100%;
  padding: 7px 9px;
  font-size: 12px;
  background: #f4f7fb;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  outline: none;
}

.srch-popup__scope {
  margin-top: 6px;
  font-size: 11px;
  color: #8a94a6;
}

/* ---------- 搜索结果 ---------- */
.search-results {
  margin-top: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);

  .search-empty {
    padding: 12px;
    font-size: 12px;
    color: #8a94a6;
    text-align: center;
  }

  .search-result-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 10px;
    cursor: pointer;
    border-radius: 8px;

    &:hover {
      background: #f4f7fb;
    }

    .result-tag {
      flex-shrink: 0;
      padding: 1px 6px;
      font-size: 10px;
      border-radius: 4px;

      &.result-tag--product {
        color: #b45309;
        background: #fef3c7;
      }

      &.result-tag--content {
        color: #1d4ed8;
        background: #dbeafe;
      }

      &.result-tag--activity {
        color: #047857;
        background: #d1fae5;
      }
    }

    .result-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      font-size: 12px;
      color: #1f2937;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-extra {
      flex-shrink: 0;
      font-size: 11px;
      color: #ef4444;
    }
  }

  .search-close {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 6px;
    font-size: 11px;
    color: #8a94a6;
    cursor: pointer;
    background: transparent;
    border: 0;

    &:hover {
      color: #475569;
    }
  }
}
</style>