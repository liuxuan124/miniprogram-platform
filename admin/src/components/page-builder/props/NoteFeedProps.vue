<template>
  <div class="note-feed-props">
    <el-tabs v-model="activeTab" class="nfp-tabs">
      <!-- ============ 内容配置 ============ -->
      <el-tab-pane label="内容" name="content">
        <!-- ① 数据来源与全局过滤 -->
        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">① 数据来源与过滤</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="列表样式">
              <GridSegmented
                :model-value="cfg.layout"
                :options="GLOBAL_LAYOUT_OPTS"
                aria-label="全局列表样式"
                @update:model-value="(v) => patch({ layout: v })"
              />
              <FieldHint text="作用于整个组件；单个页签可在下方「本页样式」单独覆盖" />
            </el-form-item>
            <el-form-item label="每页条数">
              <NumSliderRow
                :model-value="cfg.page_size"
                :min="PAGE_SIZE.min"
                :max="PAGE_SIZE.max"
                :step="PAGE_SIZE.step"
                @update:model-value="(v: number) => patch({ page_size: v })"
              />
            </el-form-item>
          </el-form>

          <ContentTagFilterFields :props="data" @update="(v) => patch(v)" />
        </div>

        <!-- ② 内容类型页签体系 -->
        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">② 内容类型页签</span></div>
          <p class="nfp-sec__hint">
            每个页签是一组独立内容流，可分别设置内容形式、筛选、排序与版式。≥2 个时组件顶部显示大 Tab；拖动手柄可调整顺序。
          </p>

          <div class="type-tabs">
            <draggable
              :model-value="cfg.type_tabs"
              item-key="__idx"
              handle=".type-tabs__grip"
              :animation="150"
              @update:model-value="onTabsReorder"
            >
              <template #item="{ element: t, index: i }">
                <div class="type-tabs__item" :class="{ 'is-open': openIndex === i }">
                  <div class="type-tabs__head">
                    <span class="type-tabs__grip" title="拖动调整顺序">
                      <MiniIcon name="drag" :size="13" />
                    </span>
                    <button
                      type="button"
                      class="type-tabs__toggle"
                      :aria-expanded="openIndex === i"
                      @click="toggleTab(i)"
                    >
                      <span class="type-tabs__name">{{ tabTitle(t, i) }}</span>
                      <span class="type-tabs__summary">{{ tabSummary(t) }}</span>
                    </button>
                    <el-icon class="type-tabs__caret" :class="{ 'is-open': openIndex === i }">
                      <ArrowDown />
                    </el-icon>
                    <button class="type-tabs__del" type="button" title="删除页签" @click.stop="removeTypeTab(i)">
                      <el-icon><Delete /></el-icon>
                    </button>
                  </div>

                  <el-collapse-transition>
                    <div v-show="openIndex === i" class="type-tabs__body">
                      <div class="type-tabs__row">
                        <span class="type-tabs__key">页签名</span>
                        <div class="type-tabs__ctrl">
                          <el-input
                            :model-value="t.label"
                            size="small"
                            placeholder="如：笔记 / 攻略 / 好物"
                            @update:model-value="(v: string) => updateTypeTab(i, 'label', v)"
                          />
                        </div>
                      </div>

                      <div class="type-tabs__row">
                        <span class="type-tabs__key">筛选方式</span>
                        <div class="type-tabs__ctrl">
                          <GridSegmented
                            :model-value="t.filter_type"
                            :options="FILTER_OPTS"
                            aria-label="筛选方式"
                            @update:model-value="(v) => updateTypeTab(i, 'filter_type', v)"
                          />
                        </div>
                      </div>

                      <div v-if="t.filter_type === 'category'" class="type-tabs__row">
                        <span class="type-tabs__key">分类</span>
                        <div class="type-tabs__ctrl">
                          <el-select
                            :model-value="t.category_ids"
                            size="small"
                            multiple
                            filterable
                            collapse-tags
                            placeholder="选择一个或多个内容分类"
                            @update:model-value="(v: string[]) => updateTypeTab(i, 'category_ids', v)"
                          >
                            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
                          </el-select>
                        </div>
                      </div>

                      <div v-else-if="t.filter_type === 'tag'" class="type-tabs__row">
                        <span class="type-tabs__key">标签</span>
                        <div class="type-tabs__ctrl">
                          <FeedTagPillSelect
                            :model-value="t.tag ? [t.tag] : []"
                            kind="topic"
                            placeholder="搜索并选择标签"
                            @update:model-value="(v: string[]) => updateTypeTab(i, 'tag', v[0] || '')"
                          />
                        </div>
                      </div>

                      <div v-else-if="t.filter_type === 'ids'" class="type-tabs__row">
                        <span class="type-tabs__key">指定内容</span>
                        <div class="type-tabs__ctrl">
                          <el-select
                            :model-value="t.content_ids"
                            size="small"
                            multiple
                            filterable
                            remote
                            :remote-method="searchContentOptions"
                            :loading="contentOptionsLoading"
                            collapse-tags
                            :placeholder="`搜索并选择内容（已选 ${t.content_ids.length}）`"
                            @update:model-value="(v: number[]) => updateTypeTab(i, 'content_ids', v)"
                          >
                            <el-option v-for="c in contentOptions" :key="c.id" :label="c.label" :value="c.id" />
                          </el-select>
                        </div>
                      </div>

                      <div class="type-tabs__row">
                        <span class="type-tabs__key">内容形式</span>
                        <div class="type-tabs__ctrl">
                          <div class="chip-group">
                            <button
                              v-for="opt in CONTENT_TYPE_OPTS"
                              :key="opt.value"
                              type="button"
                              class="chip"
                              :class="{ 'chip--on': t.content_types.includes(opt.value) }"
                              @click="toggleContentType(i, opt.value)"
                            >
                              {{ opt.label }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="type-tabs__row">
                        <span class="type-tabs__key">排序</span>
                        <div class="type-tabs__ctrl">
                          <GridSegmented
                            :model-value="t.sort"
                            :options="SORT_OPTS"
                            :cols="3"
                            aria-label="排序"
                            @update:model-value="(v) => updateTypeTab(i, 'sort', v)"
                          />
                        </div>
                      </div>

                      <!-- 🔴 原来这里是 4 选项 BuilderSegmented，在 ~300px 内文字互相叠压 -->
                      <div class="type-tabs__row">
                        <span class="type-tabs__key">
                          本页样式
                          <FieldHint text="只作用于这一页；「跟随全局」表示用组件顶部「列表样式」的设置" />
                        </span>
                        <div class="type-tabs__ctrl">
                          <GridSegmented
                            :model-value="t.layout"
                            :options="PAGE_LAYOUT_OPTS"
                            aria-label="本页样式"
                            @update:model-value="(v) => updateTypeTab(i, 'layout', v)"
                          />
                        </div>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>
              </template>
            </draggable>
            <el-button class="type-tabs__add" text type="primary" size="small" @click="addTypeTab">
              <el-icon><Plus /></el-icon> 添加页签
            </el-button>
          </div>
        </div>

        <!-- 顶部辅助功能 -->
        <div v-if="cfg.type_tabs.length > 1" class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">顶部辅助</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="搜索入口">
              <el-switch
                :model-value="cfg.show_search"
                @change="(v: boolean) => patch({ show_search: v })"
              />
              <FieldHint text="大 Tab 右侧展示搜索圆钮，点击进全局搜索" />
            </el-form-item>
            <el-form-item label="二级分类">
              <el-switch
                :model-value="cfg.show_sub_tabs"
                @change="(v: boolean) => patch({ show_sub_tabs: v })"
              />
              <FieldHint text="第二行平台分类标签（全部/亚马逊/TikTok…）的显隐" />
            </el-form-item>
          </el-form>
        </div>

        <!-- ③ 卡片内容要素 -->
        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">③ 卡片内容要素</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="无图文字卡">
              <el-switch
                :model-value="cfg.text_card"
                @change="(v: boolean) => patch({ text_card: v })"
              />
              <FieldHint text="无封面内容渲染为标题+摘要金句卡；关闭则显示占位图" />
            </el-form-item>
            <el-form-item label="多图角标">
              <GridSegmented
                :model-value="cfg.gallery_badge"
                :options="GALLERY_BADGE_OPTS"
                aria-label="多图角标"
                @update:model-value="(v) => patch({ gallery_badge: v })"
              />
            </el-form-item>
            <el-form-item label="作者栏">
              <el-switch
                :model-value="cfg.show_author"
                @change="(v: boolean) => patch({ show_author: v })"
              />
              <FieldHint text="显示头像与昵称" />
            </el-form-item>
            <el-form-item label="互动数据">
              <el-select
                :model-value="cfg.card_metric"
                style="width: 100%"
                @update:model-value="(v: string) => patch({ card_metric: v })"
              >
                <el-option v-for="o in CARD_METRIC_OPTS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="点赞图标">
              <el-switch
                :model-value="cfg.like_heart"
                @change="(v: boolean) => patch({ like_heart: v })"
              />
              <FieldHint text="开启为实心 ♥，关闭为线框 ♡" />
            </el-form-item>
            <el-form-item label="来源渠道标">
              <el-switch
                :model-value="cfg.show_source_badge"
                @change="(v: boolean) => patch({ show_source_badge: v })"
              />
              <FieldHint text="展示内容来源平台小 Badge" />
            </el-form-item>
          </el-form>
        </div>

        <div class="nfp-card">
          <div class="nfp-card__head">
            <span>数据来源</span>
            <span class="nfp-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇笔记` }}</span>
          </div>
          <div v-if="liveItems.length" class="nfp-chips">
            <span v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="nfp-chip">
              {{ item.title }}
            </span>
          </div>
          <div v-else-if="!liveLoading" class="nfp-empty">暂无已发布笔记</div>
        </div>
      </el-tab-pane>

      <!-- ============ 样式配置 ============ -->
      <el-tab-pane label="样式" name="style">
        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">Tab 导航栏样式</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="Tab 字号">
              <NumSliderRow
                :model-value="cfg.tab_font_size"
                :min="TAB_FONT_SIZE.min"
                :max="TAB_FONT_SIZE.max"
                :step="TAB_FONT_SIZE.step"
                @update:model-value="(v: number) => patch({ tab_font_size: v })"
              />
            </el-form-item>
            <el-form-item label="选中高亮">
              <GridSegmented
                :model-value="cfg.tab_active_style"
                :options="TAB_ACTIVE_OPTS"
                :cols="3"
                aria-label="选中高亮形态"
                @update:model-value="(v) => patch({ tab_active_style: v })"
              />
            </el-form-item>
            <el-form-item label="激活主色">
              <ColorPickerField
                :model-value="cfg.tab_active_color"
                label=""
                :predefine="BRAND_PALETTE"
                hint="留空则跟随站点主题色"
                @update:model-value="(v: string) => patch({ tab_active_color: v })"
              />
              <el-button size="small" text @click="patch({ tab_active_color: '' })">跟随主题色</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">卡片间距与容器</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="卡片间距">
              <NumSliderRow
                :model-value="cfg.item_gap"
                :min="ITEM_GAP.min"
                :max="ITEM_GAP.max"
                :step="ITEM_GAP.step"
                @update:model-value="(v: number) => patch({ item_gap: v })"
              />
              <FieldHint text="两列之间的缝隙，小红书标准 8~10px" />
            </el-form-item>
            <el-form-item label="卡片圆角">
              <NumSliderRow
                :model-value="cfg.item_border_radius"
                :min="ITEM_RADIUS.min"
                :max="ITEM_RADIUS.max"
                :step="ITEM_RADIUS.step"
                @update:model-value="(v: number) => patch({ item_border_radius: v })"
              />
            </el-form-item>
            <el-form-item label="左右边距">
              <NumSliderRow
                :model-value="cfg.page_gutter"
                :min="PAGE_GUTTER.min"
                :max="PAGE_GUTTER.max"
                :step="PAGE_GUTTER.step"
                @update:model-value="(v: number) => patch({ page_gutter: v })"
              />
              <FieldHint text="0 = 贴边，16 = 最大留白" />
            </el-form-item>
            <el-form-item label="卡片底色">
              <ColorPickerField
                :model-value="cfg.card_bg"
                label=""
                default-value="#ffffff"
                :predefine="BRAND_PALETTE"
                @update:model-value="(v: string) => patch({ card_bg: v })"
              />
            </el-form-item>
            <el-form-item label="列表底色">
              <ColorPickerField
                :model-value="cfg.background_color"
                label=""
                default-value="#f7f7f7"
                :predefine="['#f7f7f7', '#ffffff', '#fff5eb', '#f0f5ff', '#fdf6ec', '#1f1f1f']"
                @update:model-value="(v: string) => patch({ background_color: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="nfp-sec">
          <div class="nfp-sec__head"><span class="nfp-sec__title">卡片文本排版</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="标题字号">
              <NumSliderRow
                :model-value="cfg.title_size"
                :min="TITLE_SIZE.min"
                :max="TITLE_SIZE.max"
                :step="TITLE_SIZE.step"
                @update:model-value="(v: number) => patch({ title_size: v })"
              />
              <FieldHint :text="`${TITLE_SIZE.min}~${TITLE_SIZE.max}px，与真机所见一致（此前填 32 实际只有约 16px）`" />
            </el-form-item>
            <el-form-item label="标题行数">
              <GridSegmented
                :model-value="cfg.title_lines"
                :options="TITLE_LINES_OPTS"
                :cols="3"
                aria-label="标题行数限制"
                @update:model-value="(v) => patch({ title_lines: Number(v) })"
              />
            </el-form-item>
            <el-form-item label="正文字色">
              <ColorPickerField
                :model-value="cfg.text_color"
                label=""
                default-value="#333333"
                :predefine="BRAND_PALETTE"
                @update:model-value="(v: string) => patch({ text_color: v })"
              />
            </el-form-item>
            <el-form-item label="辅助字色">
              <ColorPickerField
                :model-value="cfg.meta_color"
                label=""
                default-value="#7b8798"
                :predefine="BRAND_PALETTE"
                @update:model-value="(v: string) => patch({ meta_color: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <SourceTagFields :props="data" @update="(v) => patch(v)" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDown, Delete, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { fetchTopContentCategoryTabs, type ContentCategoryTab } from '@/utils/content-category-tabs'
import { get } from '@/api/request'
import BuilderSegmented from '../BuilderSegmented.vue'
import GridSegmented from '../GridSegmented.vue'
import FieldHint from '../FieldHint.vue'
import ColorPickerField from '../ColorPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import SourceTagFields from './SourceTagFields.vue'
import ContentTagFilterFields from './ContentTagFilterFields.vue'
import FeedTagPillSelect from '../articleFeed/FeedTagPillSelect.vue'
import { BRAND_PALETTE } from '../brandHeader/brandHeaderSchema'
import {
  CARD_METRIC_OPTS,
  CONTENT_TYPE_OPTS,
  FILTER_OPTS,
  GALLERY_BADGE_OPTS,
  GLOBAL_LAYOUT_OPTS,
  ITEM_GAP,
  ITEM_RADIUS,
  PAGE_GUTTER,
  PAGE_LAYOUT_OPTS,
  PAGE_SIZE,
  SORT_OPTS,
  TAB_ACTIVE_OPTS,
  TAB_FONT_SIZE,
  TITLE_LINES_OPTS,
  TITLE_SIZE,
  deriveLegacyFields,
  normalizeNoteFeedProps,
  tabSummary,
  type NoteContentType,
  type NoteTypeTab,
} from '../noteFeed/noteFeedSchema'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const activeTab = ref<'content' | 'style'>('content')

/** 与画布读同一份归一化配置 */
const cfg = computed(() => normalizeNoteFeedProps(data))

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/* ---------------- 数据来源预览 ---------------- */
const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-note-feed',
  type: ComponentType.NoteFeed,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

/* ---------------- 页签管理 ---------------- */
const typeTabs = computed<NoteTypeTab[]>(() => cfg.value.type_tabs)
const openIndex = ref<number>(0)

function tabTitle(t: NoteTypeTab, index: number): string {
  return t.label?.trim() || `页签 ${index + 1}`
}

function toggleTab(index: number) {
  openIndex.value = openIndex.value === index ? -1 : index
}

watch(
  () => typeTabs.value.length,
  (len) => {
    if (len === 0) { openIndex.value = -1; return }
    if (openIndex.value >= len) openIndex.value = len - 1
    if (openIndex.value < 0) openIndex.value = 0
  },
)

function addTypeTab() {
  setTabs([
    ...typeTabs.value,
    { label: '', content_types: ['note'], filter_type: 'all', category_ids: [], tag: '', content_ids: [], sort: 'new', layout: '' },
  ])
  openIndex.value = typeTabs.value.length
}

/** 拖拽排序：整体回写新数组（不逐项 diff，避免拖到一半丢配置） */
function onTabsReorder(next: NoteTypeTab[]) {
  setTabs(next)
}

function setTabs(tabs: NoteTypeTab[]) {
  // ⚠️ 同步补齐旧字段，未升级的小程序端才能降级渲染
  emit('update', { type_tabs: tabs.map(deriveLegacyFields) })
}

function updateTypeTab(index: number, key: keyof NoteTypeTab, value: unknown) {
  const next = typeTabs.value.map((t, i) => (i === index ? { ...t, [key]: value } : t))
  setTabs(next)
}

function toggleContentType(index: number, value: NoteContentType) {
  const cur = typeTabs.value[index]?.content_types || []
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
  updateTypeTab(index, 'content_types', next)
}

function removeTypeTab(index: number) {
  setTabs(typeTabs.value.filter((_, i) => i !== index))
}

/* ---- 页签筛选项数据 ---- */
const categoryOptions = ref<ContentCategoryTab[]>([])
const contentOptions = ref<{ id: number; label: string }[]>([])
const contentOptionsLoading = ref(false)

async function fetchContentList(params: Record<string, unknown>): Promise<any[]> {
  try {
    const res = await get<any>('/api/v1/mp/contents', { status: 'published', current: 1, size: 50, ...params }, { showError: false })
    const payload = (res as any)?.data ?? res
    if (Array.isArray(payload?.records)) return payload.records
    if (Array.isArray(payload?.list)) return payload.list
    if (Array.isArray(payload)) return payload
  } catch {
    /* 预览选项加载失败静默 */
  }
  return []
}

function mergeContentOptions(rows: any[]) {
  const existing = new Map(contentOptions.value.map((o) => [o.id, o]))
  for (const r of rows || []) {
    const id = Number(r?.id)
    if (!Number.isFinite(id) || existing.has(id)) continue
    const title = String(r?.title || r?.name || '').trim()
    existing.set(id, { id, label: title ? `${title} (#${id})` : `内容 #${id}` })
  }
  contentOptions.value = [...existing.values()]
}

async function searchContentOptions(keyword: string) {
  contentOptionsLoading.value = true
  try {
    const kw = String(keyword || '').trim()
    mergeContentOptions(await fetchContentList(kw ? { keyword: kw } : {}))
  } finally {
    contentOptionsLoading.value = false
  }
}

async function loadSelectedContentTitles() {
  const selected = [...new Set(typeTabs.value.flatMap((t) => t.content_ids || []))]
  if (!selected.length) return
  const known = new Set(contentOptions.value.map((o) => o.id))
  const missing = selected.filter((id) => !known.has(id))
  if (!missing.length) return
  mergeContentOptions(await fetchContentList({ ids: missing.join(','), size: String(Math.max(missing.length, 1)) }))
}

onMounted(async () => {
  try {
    categoryOptions.value = await fetchTopContentCategoryTabs()
  } catch {
    categoryOptions.value = []
  }
  await searchContentOptions('')
  await loadSelectedContentTitles()
})
</script>

<style scoped lang="scss">
.nfp-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.nfp-sec {
  margin-bottom: 16px;
}

.nfp-sec__head {
  margin-bottom: 6px;
}

.nfp-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

.nfp-sec__hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: #a89c8d;
  line-height: 1.5;
}

.nfp-card {
  padding: 10px;
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.nfp-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.nfp-card__count {
  font-weight: 500;
  color: var(--color-primary);
}

.nfp-chips {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nfp-chip {
  min-width: 0;
  padding: 4px 8px;
  overflow: hidden;
  font-size: 11px;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.nfp-empty {
  font-size: 11px;
  color: #7b8798;
}

/* ---------- 页签卡片 ---------- */
.type-tabs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.type-tabs__item {
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 9px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.type-tabs__item.is-open {
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 42%, #fff);
  box-shadow: 0 1px 6px rgb(42 31 23 / 6%);
}

.type-tabs__head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px 5px 4px;
}

.type-tabs__grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 24px;
  color: #c3b8a8;
  border-radius: 5px;
  cursor: grab;
  user-select: none;
}

.type-tabs__grip:active { cursor: grabbing; }

.type-tabs__toggle {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
  padding: 3px 0;
  text-align: left;
  font-family: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.type-tabs__name {
  flex: none;
  max-width: 45%;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tabs__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  color: var(--wb-faint, #7a6a5c);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tabs__caret {
  flex-shrink: 0;
  font-size: 12px;
  color: #b3a596;
  transition: transform 0.2s ease;
}

.type-tabs__caret.is-open {
  color: var(--el-color-primary, #c08e6e);
  transform: rotate(180deg);
}

.type-tabs__del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #c2c9d6;
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.type-tabs__del:hover {
  color: #ec2f55;
  background: #fdeef2;
}

.type-tabs__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 2px 12px;
  margin: 0 8px;
  border-top: 1px dashed var(--wb-line, #e8dfd3);
}

.type-tabs__row {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.type-tabs__key {
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--wb-mute, #6b5b4e);
  white-space: nowrap;
}

.type-tabs__ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1;
  color: #5a6478;
  cursor: pointer;
  background: #f6f8fb;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.chip:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #f3f0ea);
}

.chip--on,
.chip--on:hover {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary) 40%, #fff);
}

.type-tabs__add {
  align-self: flex-start;
}
</style>
