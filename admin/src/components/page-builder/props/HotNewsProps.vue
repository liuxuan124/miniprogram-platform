<template>
  <div class="hot-news-props">
    <!--
      🔴 内容 / 样式**物理分离**（2026-10-05 重构）。
      原来 21 个字段平铺在一个长表单里，内容（文案/数据源）与样式（颜色/圆角）混排，
      找「改文案还是改颜色」要上下扫一遍。
      现在：内容 Tab 只留业务与逻辑，样式 Tab 收敛所有视觉字段。
      showMore / dateMode 的条件联动在**两个 Tab 各自生效**（关掉「查看更多」时，
      内容 Tab 收起文案+链接，样式 Tab 收起按钮三色）。
    -->
    <el-tabs v-model="tab" class="hn-tabs" stretch>
      <!-- ==================== 内容 ==================== -->
      <el-tab-pane label="内容" name="content">
        <div class="hn-pane">
          <!-- ==================== 标题与头部 ==================== -->
          <StyleFoldGroup v-model:open="headOpen" title="标题与头部" :summary="headSummary">
            <CompactTextRow
              label="标题文案"
              :model-value="data.title || ''"
              placeholder="今日跨境头条"
              :maxlength="20"
              @update:model-value="(v: string) => emit('update', { title: v })"
            />

            <div class="hn-row">
              <span class="hn-row__lab">
                日期模式
                <FieldHint text="「今天」= 显示访问当天的日期与星期；「指定日期」= 固定某一天；「不显示」= 整块隐藏。" placement="top" :show-after="200" />
              </span>
              <BuilderSegmented
                :model-value="dateMode"
                :options="DATE_OPTIONS"
                block
                aria-label="日期模式"
                @update:model-value="(v) => emit('update', { date_mode: v })"
              />
            </div>

            <!-- 条件联动：仅「指定日期」展开选择器 -->
            <div v-if="dateMode === 'fixed'" class="hn-row hn-row--stack">
              <span class="hn-row__lab">指定日期</span>
              <el-date-picker
                :model-value="data.header_date || ''"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                size="small"
                style="width: 100%"
                @change="(v: string | null) => emit('update', { header_date: v || '' })"
              />
            </div>

            <div class="hn-row">
              <span class="hn-row__lab">
                纯文字标题
                <FieldHint text="开启后去掉标题的背景色块，以纯文字排版展示（日期与星期仍保留）。关闭则用下方「标题配色」的胶囊样式。" placement="top" :show-after="200" />
              </span>
              <el-switch
                :model-value="!!data.header_plain"
                @change="(v: boolean) => emit('update', { header_plain: v })"
              />
            </div>

            <!-- 条件联动：纯文字时配色失效 -->
            <template v-if="!data.header_plain">
              <div class="hn-row">
                <span class="hn-row__lab">
                  标题配色
                  <FieldHint text="「跟随主色」用页面品牌色（线上现状）；「自定义」可单独指定背景与文字色。" placement="top" :show-after="200" />
                </span>
                <BuilderSegmented
                  :model-value="hn.badgeColorMode"
                  :options="BADGE_COLOR_OPTIONS"
                  block
                  aria-label="标题配色"
                  @update:model-value="(v: string | number) => emit('update', { badge_color_mode: String(v) })"
                />
              </div>
              <div v-if="hn.badgeColorMode === 'custom'" class="hn-row hn-row--stack">
                <span class="hn-row__lab">背景 / 文字</span>
                <div class="hn-color-pair">
                  <ColorFieldRow
                    field="badge_bg"
                    :value="hn.badgeBg"
                    :fallback="DEFAULT_BADGE_BG"
                    @update="(v) => emit('update', { field: v.field, value: v.value ?? DEFAULT_BADGE_BG })"
                  />
                  <ColorFieldRow
                    field="badge_text"
                    :value="hn.badgeText"
                    :fallback="DEFAULT_BADGE_TEXT"
                    @update="(v) => emit('update', { field: v.field, value: v.value ?? DEFAULT_BADGE_TEXT })"
                  />
                </div>
              </div>
            </template>
            <p v-else class="hn-note-line">「纯文字标题」已开启，标题配色暂不生效</p>
          </StyleFoldGroup>

          <!-- ==================== 数据筛选 ==================== -->
          <StyleFoldGroup v-model:open="filterOpen" title="数据筛选" :summary="filterSummary">
            <!-- 🔴 本轮补上的关键入口：limit 渲染器早已支持，只是面板从没给过输入框 -->
            <CompactSliderRow
              label="展示条数"
              hint="首屏展示的文章篇数。3 条最紧凑，10 条以上建议搭配「垂直滚动」形态。"
              :model-value="hn.limit"
              :min="HOT_NEWS_LIMIT_MIN"
              :max="HOT_NEWS_LIMIT_MAX"
              :step="1"
              unit="篇"
              @update:model-value="(v: number) => emit('update', { limit: v })"
            />

            <div class="hn-row hn-row--stack">
              <span class="hn-row__lab">内容分类</span>
              <el-select
                :model-value="queryParams.category_id ?? queryParams.categoryId ?? ''"
                clearable
                filterable
                placeholder="全部分类"
                size="small"
                style="width: 100%"
                @change="(v: string | number) => patchQuery({ category_id: v || undefined, categoryId: v || undefined })"
              >
                <el-option label="全部分类" value="" />
                <el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </div>

            <div class="hn-row hn-row--stack">
              <span class="hn-row__lab">发布日期</span>
              <el-date-picker
                :model-value="queryParams.publish_date || ''"
                type="date"
                value-format="YYYY-MM-DD"
                clearable
                placeholder="不限日期"
                size="small"
                style="width: 100%"
                @change="(v: string | null) => patchQuery({ publish_date: v || undefined })"
              />
            </div>

            <div class="hn-row hn-row--stack">
              <span class="hn-row__lab">
                排序方式
                <FieldHint text="未指定时按全站实时热度（浏览量）排序。" placement="top" :show-after="200" />
              </span>
              <el-select
                :model-value="sortBy"
                size="small"
                style="width: 100%"
                @change="onSortByChange"
              >
                <el-option label="最热（浏览量）" value="popular" />
                <el-option label="最新发布" value="newest" />
                <el-option label="推荐优先" value="recommended" />
              </el-select>
            </div>

            <div class="hn-row">
              <span class="hn-row__lab">
                查看更多
                <FieldHint text="关闭后画布上的「查看更多」入口消失，相关的文案、链接与按钮配色一并失效。" placement="top" :show-after="200" />
              </span>
              <el-switch
                :model-value="showMore"
                @change="(v: boolean) => emit('update', { show_more: v })"
              />
            </div>

            <!-- 条件联动：showMore=true 时才配链接 -->
            <template v-if="showMore">
              <div class="hn-row hn-row--stack">
                <span class="hn-row__lab">更多文案</span>
                <el-input
                  :model-value="data.more_text || '查看更多 >'"
                  maxlength="10"
                  size="small"
                  placeholder="全部 ›"
                  @input="(v: string) => emit('update', { more_text: v })"
                />
              </div>
              <div class="hn-row hn-row--stack">
                <span class="hn-row__lab">
                  跳转目标
                  <FieldHint text="可跳到已发布页面、内容分类，或手填小程序路径 / 外链。" placement="top" :show-after="200" />
                </span>
                <LinkPickerField
                  :link-type="data.more_link_type || 'page'"
                  :link-url="data.more_link || DEFAULT_MORE_LINK"
                  @update:link-type="(v: string) => emit('update', { more_link_type: v })"
                  @update:link-url="(v: string) => emit('update', { more_link: v })"
                />
              </div>
            </template>
          </StyleFoldGroup>

          <!-- ==================== 列表形态 ==================== -->
          <StyleFoldGroup v-model:open="displayOpen" title="列表形态" :summary="displaySummary">
            <div class="hn-row">
              <span class="hn-row__lab">
                展示形态
                <FieldHint text="「紧凑单列」静态平铺（线上现状）；「垂直滚动」单行无缝轮播，适合大促期强调。" placement="top" :show-after="200" />
              </span>
              <BuilderSegmented
                :model-value="hn.layout"
                :options="LAYOUT_OPTIONS"
                block
                aria-label="展示形态"
                @update:model-value="(v: string | number) => emit('update', { scroll_layout: String(v) })"
              />
            </div>

            <CompactSliderRow
              v-if="hn.layout === 'ticker'"
              label="滚动间隔"
              hint="每条停留时长。太快看不清、太慢会像卡住。"
              :model-value="hn.tickerInterval"
              :min="TICKER_INTERVAL_MIN"
              :max="TICKER_INTERVAL_MAX"
              :step="500"
              unit="ms"
              @update:model-value="(v: number) => emit('update', { ticker_interval: v })"
            />

            <div class="hn-row">
              <span class="hn-row__lab">
                前缀图标
                <FieldHint text="每条文章前面的标记。线上现状是五角星。" placement="top" :show-after="200" />
              </span>
              <BuilderSegmented
                :model-value="hn.prefixIcon"
                :options="PREFIX_OPTIONS"
                block
                aria-label="前缀图标"
                @update:model-value="(v: string | number) => emit('update', { prefix_icon: String(v) })"
              />
            </div>
          </StyleFoldGroup>

          <!-- ==================== 展示哪些内容（运营干预） ==================== -->
          <StyleFoldGroup v-model:open="previewOpen" title="展示哪些内容" :summary="previewSummary">
            <div class="hn-preview__head">
              <span class="hn-preview__count">
                {{ liveLoading ? '读取中…' : `将展示 ${effectiveItems.length} / ${liveItems.length} 篇` }}
              </span>
              <button
                type="button"
                class="hn-preview__refresh"
                :disabled="liveLoading"
                title="重新读取最新内容"
                @click="refresh"
              >
                <el-icon :size="12"><Refresh /></el-icon>
              </button>
            </div>

            <p class="hn-preview__tip">
              点行内图标可<strong>置顶</strong>或<strong>隐藏</strong>某篇；被隐藏的会由下一篇自动补位
            </p>

            <div v-if="effectiveItems.length" class="hn-cards">
              <div
                v-for="(item, i) in effectiveItems"
                :key="item.id || item.title"
                class="hn-card"
                :class="{ 'is-pinned': isPinned(item), 'is-excluded': isExcluded(item) }"
              >
                <span class="hn-card__idx">{{ i + 1 }}</span>
                <span class="hn-card__title">{{ item.title }}</span>
                <span v-if="item.views != null" class="hn-card__meta">{{ formatViews(item.views) }} 阅读</span>
                <span class="hn-card__acts">
                  <button
                    type="button"
                    class="hn-card__act"
                    :class="{ 'is-on': isPinned(item) }"
                    :title="isPinned(item) ? '取消置顶' : '置顶到第一位'"
                    :aria-label="isPinned(item) ? '取消置顶' : '置顶'"
                    @click="togglePin(item)"
                  >
                    <el-icon :size="12"><Top /></el-icon>
                  </button>
                  <button
                    type="button"
                    class="hn-card__act"
                    :class="{ 'is-on': isExcluded(item) }"
                    :title="isExcluded(item) ? '取消隐藏' : '隐藏这一篇'"
                    :aria-label="isExcluded(item) ? '取消隐藏' : '隐藏'"
                    @click="toggleExclude(item)"
                  >
                    <el-icon :size="12"><Hide /></el-icon>
                  </button>
                </span>
              </div>
            </div>

            <div v-else-if="!liveLoading" class="hn-preview__empty">
              当前筛选下没有已发布内容，试试放宽分类或日期
            </div>

            <p v-if="effectiveItems.length < hn.limit" class="hn-preview__more">
              可展示内容不足 {{ hn.limit }} 篇，剩余位置留空
            </p>
          </StyleFoldGroup>
        </div>
      </el-tab-pane>

      <!-- ==================== 样式 ==================== -->
      <el-tab-pane label="样式" name="style">
        <el-form label-width="80px" size="small">
          <el-divider content-position="left">卡片容器</el-divider>

          <el-form-item label="内容圆角">
            <NumSliderRow
              :model-value="num(data.content_radius, 14)"
              :min="0"
              :max="32"
              :step="1"
              :fallback="14"
              @update:model-value="(v) => emit('update', { content_radius: v })"
            />
          </el-form-item>
          <el-form-item label="内容底色">
            <ColorFieldRow
              field="bg_color"
              :value="data.bg_color"
              fallback="#ffffff"
              @update="(v) => emit('update', { field: v.field, value: v.value ?? '#ffffff' })"
            />
          </el-form-item>

          <el-divider content-position="left">列表排版</el-divider>

          <el-form-item label="排列方式">
            <BuilderSegmented
              :model-value="layoutValue"
              :options="LAYOUT_OPTIONS"
              block
              aria-label="排列方式"
              @update:model-value="(v) => onLayoutChange(String(v))"
            />
          </el-form-item>
          <el-form-item v-if="layoutValue === 'card'" label="显示封面">
            <el-switch
              :model-value="data.show_cover !== false"
              @change="(v: boolean) => emit('update', { show_cover: v })"
            />
          </el-form-item>
          <el-form-item label="显示数量">
            <NumSliderRow
              :model-value="num(data.limit, 3)"
              :min="1"
              :max="20"
              :step="1"
              :fallback="3"
              @update:model-value="(v) => emit('update', { limit: v })"
            />
          </el-form-item>
          <el-form-item label="条目间距">
            <NumSliderRow
              :model-value="num(data.item_gap, 10)"
              :min="0"
              :max="48"
              :step="2"
              :fallback="10"
              @update:model-value="(v) => emit('update', { item_gap: v })"
            />
          </el-form-item>

          <template v-if="!data.header_plain">
            <el-divider content-position="left">标题样式</el-divider>
            <el-form-item label="标题渐变起">
              <ColorFieldRow
                field="header_from"
                :value="data.header_from"
                fallback="#4F7CFF"
                @update="(v) => emit('update', { field: v.field, value: v.value ?? '#4F7CFF' })"
              />
            </el-form-item>
            <el-form-item label="标题渐变止">
              <ColorFieldRow
                field="header_to"
                :value="data.header_to"
                fallback="#7BA3FF"
                @update="(v) => emit('update', { field: v.field, value: v.value ?? '#7BA3FF' })"
              />
            </el-form-item>
            <el-form-item label="标题宽度">
              <NumSliderRow
                :model-value="num(data.title_width, 72)"
                :min="40"
                :max="100"
                :step="1"
                :fallback="72"
                @update:model-value="(v) => emit('update', { title_width: v })"
              />
            </el-form-item>
            <el-form-item label="标题圆角">
              <NumSliderRow
                :model-value="num(data.title_radius, 12)"
                :min="0"
                :max="32"
                :step="1"
                :fallback="12"
                @update:model-value="(v) => emit('update', { title_radius: v })"
              />
            </el-form-item>
            <el-form-item label="标题透明度">
              <NumSliderRow
                :model-value="num(data.header_opacity, 96)"
                :min="40"
                :max="100"
                :step="1"
                :fallback="96"
                @update:model-value="(v) => emit('update', { header_opacity: v })"
              />
            </el-form-item>
          </template>

          <!-- 条件联动：showMore=false 时收起按钮三色（与内容 Tab 的开关同源） -->
          <template v-if="showMore">
            <el-divider content-position="left">查看更多按钮</el-divider>
            <el-form-item label="更多底色">
              <ColorFieldRow
                field="more_bg"
                :value="data.more_bg"
                fallback="#EEF1FF"
                :predefine="MORE_BG_PRESET"
                @update="(v) => emit('update', { field: v.field, value: v.value ?? '#EEF1FF' })"
              />
            </el-form-item>
            <el-form-item label="更多文字色">
              <ColorFieldRow
                field="more_color"
                :value="data.more_color"
                fallback="#5B6CFF"
                @update="(v) => emit('update', { field: v.field, value: v.value ?? '#5B6CFF' })"
              />
            </el-form-item>
            <el-form-item label="更多圆角">
              <NumSliderRow
                :model-value="num(data.more_radius, 20)"
                :min="0"
                :max="32"
                :step="1"
                :fallback="20"
                @update:model-value="(v) => emit('update', { more_radius: v })"
              />
            </el-form-item>
          </template>
          <el-form-item v-else>
            <div class="hn-locked">「查看更多」已关闭，按钮配色暂不生效</div>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Refresh, Top, Hide } from '@element-plus/icons-vue'
import { getCategoryList } from '@/api/content'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'
import ColorFieldRow from './ColorFieldRow.vue'
import NumSliderRow from './NumSliderRow.vue'
import CompactSliderRow from '../CompactSliderRow.vue'
import CompactTextRow from '../CompactTextRow.vue'
import StyleFoldGroup from '../StyleFoldGroup.vue'
import {
  HOT_NEWS_LIMIT_MAX,
  HOT_NEWS_LIMIT_MIN,
  HOT_NEWS_BADGE_COLORS,
  HOT_NEWS_LAYOUTS,
  HOT_NEWS_PREFIX_ICONS,
  DEFAULT_BADGE_BG,
  DEFAULT_BADGE_TEXT,
  TICKER_INTERVAL_MAX,
  TICKER_INTERVAL_MIN,
  applyEditorialOverrides,
  normalizeHotNews,
} from '../hotNews/hotNewsSchema'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

interface SegOption {
  value: string | number
  label: string
}

const DEFAULT_MORE_LINK = '/pkg-content/content-list/content-list'
const MORE_BG_PRESET = ['#EEF1FF', '#000000', '#FFF7E6', '#F0FDF4', 'rgba(0,0,0,0)']

const DATE_OPTIONS: SegOption[] = [
  { value: 'today', label: '今天' },
  { value: 'fixed', label: '指定日期' },
  { value: 'none', label: '不显示' },
]

/**
 * 旧的「列表形态」选项（星标 / 卡片 / 序号）—— 属样式 Tab 的内容渲染方式，
 * 与新的「展示形态（单列 / 垂直滚动）」是两个维度，**不是同一个东西**。
 * 🔴 命名必须区分：两处都叫 layout 极易在后续维护里被当成同一个字段改错。
 */
const ITEM_LAYOUT_OPTIONS: SegOption[] = [
  { value: 'star', label: '★ 星标' },
  { value: 'card', label: '▤ 卡片' },
  { value: 'number', label: '① 序号' },
]

const tab = ref('content')

/* ---------------- 内容 Tab 的折叠态与新能力 ---------------- */

const headOpen = ref(true)
const filterOpen = ref(false)
const displayOpen = ref(false)
const previewOpen = ref(false)

/** 归一化后的新字段（默认值保证老页面零变化，见 hotNewsSchema.ts 顶部说明） */
const hn = computed(() => normalizeHotNews(data))

const PREFIX_OPTIONS = HOT_NEWS_PREFIX_ICONS.map((x) => ({ value: x.value, label: x.label, title: x.desc }))
const LAYOUT_OPTIONS = HOT_NEWS_LAYOUTS.map((x) => ({ value: x.value, label: x.label, title: x.desc }))
const BADGE_COLOR_OPTIONS = HOT_NEWS_BADGE_COLORS.map((x) => ({ value: x.value, label: x.label, title: x.desc }))

/** 应用运营干预（排除 → 置顶）后的实际展示序列 —— 与渲染器共用同一纯函数 */
const effectiveItems = computed(() =>
  applyEditorialOverrides(liveItems.value as any[], hn.value.pinnedIds, hn.value.excludedIds),
)

function isPinned(item: any): boolean {
  return hn.value.pinnedIds.includes(String(item?.id ?? ''))
}

function isExcluded(item: any): boolean {
  return hn.value.excludedIds.includes(String(item?.id ?? ''))
}

function togglePin(item: any) {
  const id = String(item?.id ?? '')
  if (!id) return
  const cur = hn.value.pinnedIds
  // 置顶时按「点选先后」排序；再次点击取消。取消后不重排，保持其余相对顺序
  emit('update', { pinned_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
}

function toggleExclude(item: any) {
  const id = String(item?.id ?? '')
  if (!id) return
  const cur = hn.value.excludedIds
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  // 隐藏的同时从置顶里摘掉，避免「置顶了一个看不见的东西」
  emit('update', {
    excluded_ids: next,
    pinned_ids: next.includes(id) ? hn.value.pinnedIds.filter((x) => x !== id) : hn.value.pinnedIds,
  })
}

/** 阅读量紧凑显示：12345 → 1.2万 */
function formatViews(n: unknown): string {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return '0'
  if (v < 10000) return String(Math.round(v))
  return `${(v / 10000).toFixed(1)}万`
}

const headSummary = computed(() => {
  const t = String(data.title || '').trim() || '未命名'
  return data.header_plain ? `${t} · 纯文字` : t
})

const filterSummary = computed(() => {
  const parts = [`${hn.value.limit} 篇`]
  if (sortBy.value !== 'popular') {
    parts.push(sortBy.value === 'newest' ? '最新' : '推荐')
  }
  if (queryParams.value.category_id) parts.push('已选分类')
  if (!showMore.value) parts.push('无「更多」')
  return parts.join(' · ')
})

const displaySummary = computed(() => {
  const parts = [hn.value.layout === 'ticker' ? '垂直滚动' : '紧凑单列']
  const p = HOT_NEWS_PREFIX_ICONS.find((x) => x.value === hn.value.prefixIcon)
  if (p && p.value !== 'none') parts.push(p.label)
  return parts.join(' · ')
})

const previewSummary = computed(() => {
  if (!hn.value.pinnedIds.length && !hn.value.excludedIds.length) return '未干预'
  const parts: string[] = []
  if (hn.value.pinnedIds.length) parts.push(`置顶 ${hn.value.pinnedIds.length}`)
  if (hn.value.excludedIds.length) parts.push(`隐藏 ${hn.value.excludedIds.length}`)
  return parts.join(' · ')
})
const categoryOptions = ref<{ id: number | string; name: string }[]>([])

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-hot-news',
  type: ComponentType.HotNews,
  props: data,
}))

const { items: liveItems, loading: liveLoading, refresh } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

/** 数值兜底：非法/缺失一律回落到默认值，避免 NaN 落库 */
function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const showMore = computed(() => data.show_more !== false)
const dateMode = computed(() => {
  const v = data.date_mode
  return v === 'fixed' || v === 'none' ? v : 'today'
})

const layoutValue = computed(() => {
  const raw = data.layout || 'star'
  return raw === 'card' || raw === 'number' ? raw : 'star'
})

/** 面板预览条数 = 画布展示条数（limit），两者必须一致 */
const previewLimit = computed(() => Math.min(20, Math.max(1, num(data.limit, 3))))

const queryParams = computed(() => {
  const ds = data.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

/**
 * 排序默认值。
 * 🔴 原来文案说「默认按最热」而代码兜底也是 'popular'，但**历史 DSL 里存的是
 * 'newest'**（需求截图组件实测）→ 面板显示「最新发布」、文案却说「最热」，互相矛盾。
 * 现在读不写：只在真正没配时才回落 popular，与文案一致；已配的（哪怕是 newest）
 * 尊重用户既有选择，不偷偷改。
 */
const sortBy = computed(() => {
  const v = queryParams.value.sort_by
  return v === 'newest' || v === 'recommended' || v === 'popular' ? v : 'popular'
})

function flattenCategories(nodes: any[], prefix = ''): { id: number | string; name: string }[] {
  const out: { id: number | string; name: string }[] = []
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const id = node.id
    const name = String(node.name || '')
    if (id == null) continue
    const label = prefix ? `${prefix} / ${name}` : name
    out.push({ id, name: label })
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenCategories(node.children, label))
    }
  }
  return out
}

function patchQuery(patch: Record<string, any>) {
  const params = { ...queryParams.value, status: 'published', sort_by: sortBy.value, ...patch }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  if (!params.sort_by) params.sort_by = 'popular'
  emit('update', { data_source: { type: 'content', params, query: params } })
}

function onLayoutChange(val: string) {
  emit('update', { layout: val })
}

function onSortByChange(val: string) {
  patchQuery({
    sort_by: val,
    is_recommended: val === 'recommended' ? true : undefined,
  })
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

<style scoped lang="scss">
.hn-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 10px;
  }

  :deep(.el-tabs__item) {
    height: 32px;
    font-size: 12.5px;
  }
}

.hn-note {
  font-size: 12px;
  color: #7b8798;
}

.hn-hint {
  font-size: 12px;
  color: #94a3b8;
}

.hn-locked {
  padding: 9px 11px;
  font-size: 12px;
  line-height: 1.6;
  color: #7c6a55;
  background: #faf6f0;
  border: 1px dashed #e3d8c8;
  border-radius: 8px;
}

/* 内容预览：条数与画布一致 */
.hn-preview {
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.hn-preview__head {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.hn-preview__count {
  margin-left: auto;
  font-weight: 500;
  color: var(--color-primary);
}

.hn-preview__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #94a3b8;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 5px;
  transition: 0.12s;

  &:hover:not(:disabled) {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.hn-preview__list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hn-chip {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px 8px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 7px;
}

.hn-chip__idx {
  flex-shrink: 0;
  width: 14px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
}

.hn-chip__title {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: #172033;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hn-preview__empty {
  padding: 8px 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #94a3b8;
}

.hn-preview__more {
  padding-top: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px dashed #e3e8f0;
}

/* ---------------- 内容 Tab 排版（2026-10-06 重构） ---------------- */

.hn-pane { display: flex; flex-direction: column; }

/* 单行：标签 80px + 控件自适应，与 CompactSliderRow 同一节奏 */
.hn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 32px;
}

/* 纵向堆叠：控件较宽的（日期/下拉/链接）用「标签一行 + 控件一行」 */
.hn-row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.hn-row__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  width: 80px;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.hn-row--stack .hn-row__lab { width: auto; }

/* 「X 暂不生效」类提示：只保留这一种独占行用法 */
.hn-note-line {
  margin: 0 0 0 80px;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.4;
}

.hn-color-pair {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ---------------- 展示哪些内容：微卡片 ---------------- */

.hn-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
}
.hn-preview__count { color: #64748b; font-size: 12px; }
.hn-preview__refresh {
  display: grid; place-items: center;
  width: 20px; height: 20px; padding: 0;
  color: #94a3b8; background: transparent;
  border: 1px solid transparent; border-radius: 5px; cursor: pointer;
}
.hn-preview__refresh:hover:not(:disabled) { color: #64748b; background: #f1f5f9; border-color: #e2e8f0; }
.hn-preview__refresh:disabled { opacity: 0.5; cursor: wait; }

.hn-preview__tip {
  margin: 2px 0 4px;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.4;
}
.hn-preview__tip strong { color: #64748b; font-weight: 500; }

.hn-cards {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hn-card {
  display: flex;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
  min-width: 0;
  height: 26px;
  padding: 0 4px 0 5px;
  background: #fbf9f6;
  border: 1px solid #ece5db;
  border-radius: 5px;
  transition: border-color 0.15s, background 0.15s;
}
.hn-card:hover { border-color: #d8cbb8; background: #fff; }

/* 置顶：金黄左边条 + 淡黄底；隐藏：整体置灰 + 删除线 */
.hn-card.is-pinned { border-color: #e8c877; background: #fffbef; }
.hn-card.is-excluded { opacity: 0.5; }
.hn-card.is-excluded .hn-card__title { text-decoration: line-through; }

.hn-card__idx {
  flex: none;
  display: grid; place-items: center;
  width: 14px; height: 14px;
  color: #94a3b8; font-size: 10px;
  background: #f1f5f9; border-radius: 3px;
}
.hn-card.is-pinned .hn-card__idx { color: #b45309; background: #fde68a; }

.hn-card__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: #475569;
  font-size: 11.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hn-card__meta {
  flex: none;
  color: #a8b3c4;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

/* 操作按钮：常态隐藏，hover 行才浮现 —— 减少静态视觉噪音 */
.hn-card__acts { display: flex; align-items: center; gap: 1px; flex: none; }
.hn-card__act {
  display: grid; place-items: center;
  width: 20px; height: 20px; padding: 0;
  color: #c2c9d4; background: transparent;
  border: 0; border-radius: 4px; cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.hn-card:hover .hn-card__act { color: #94a3b8; }
.hn-card__act:hover { color: #64748b; background: #f1f5f9; }
.hn-card__act.is-on { color: #b45309; background: #fef3c7; }

</style>
