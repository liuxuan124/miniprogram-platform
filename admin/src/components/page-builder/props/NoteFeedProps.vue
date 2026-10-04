<template>
  <div class="note-feed-props">
    <el-form label-width="72px" size="small">
      <div class="ds-hint ds-hint--block">
        小红书式内容瀑布流：可配置多个内容页签，每页独立设置内容形式（长文/笔记/动态可混排）、筛选条件、排序与展示样式。
      </div>

      <el-divider content-position="left">笔记展示</el-divider>
      <el-form-item label="列表样式">
        <el-radio-group
          :model-value="data.layout || 'masonry'"
          @change="(v: string) => emit('update', { layout: v })"
        >
          <el-radio-button value="masonry">小红书双列</el-radio-button>
          <el-radio-button value="wechat">公众号贴图横滑</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-divider content-position="left">内容类型大 Tab</el-divider>
      <el-form-item label="类型页签">
        <div class="type-tabs">
          <draggable
            :model-value="typeTabs"
            :item-key="(t: TypeTab) => typeTabs.indexOf(t)"
            handle=".type-tabs__grip"
            animation="150"
            @update:model-value="setTypeTabs"
          >
            <template #item="{ element: t, index: i }">
              <div class="type-tabs__item">
                <div class="type-tabs__head">
                  <span class="type-tabs__grip" title="拖动调整顺序">{{ i + 1 }}</span>
                  <el-input
                    :model-value="t.label"
                    size="small"
                    placeholder="页签名（如 笔记）"
                    class="type-tabs__label"
                    @input="(v: string) => updateTypeTab(i, 'label', v)"
                  />
                  <el-select
                    :model-value="t.filter_type || 'all'"
                    size="small"
                    class="type-tabs__mode"
                    @change="(v: string) => updateTypeTab(i, 'filter_type', v)"
                  >
                    <el-option label="全部内容" value="all" />
                    <el-option label="按类别" value="category" />
                    <el-option label="按标签" value="tag" />
                    <el-option label="指定内容" value="ids" />
                  </el-select>
                  <button class="type-tabs__del" type="button" title="删除页签" @click="removeTypeTab(i)">
                    <el-icon><Delete /></el-icon>
                  </button>
                </div>
                <div class="type-tabs__body">
                  <div class="type-tabs__row">
                    <span class="type-tabs__name">内容形式</span>
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
                      <div v-if="t.content_types.includes('product') && t.content_types.length > 1" class="type-tabs__tip">
                        「好物」可与内容同页混排，按时间穿插展示；多类别时商品取首个类别
                      </div>
                    </div>
                  </div>
                  <div v-if="t.filter_type === 'category'" class="type-tabs__row">
                    <span class="type-tabs__name">类别</span>
                    <div class="type-tabs__ctrl">
                      <el-select
                        :model-value="t.category_ids"
                        size="small"
                        multiple
                        filterable
                        collapse-tags
                        placeholder="选择一个或多个内容分类"
                        @change="(v: string[]) => updateTypeTab(i, 'category_ids', v)"
                      >
                        <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
                      </el-select>
                    </div>
                  </div>
                  <div v-else-if="t.filter_type === 'tag'" class="type-tabs__row">
                    <span class="type-tabs__name">标签</span>
                    <div class="type-tabs__ctrl">
                      <el-select
                        :model-value="t.tag"
                        size="small"
                        filterable
                        allow-create
                        default-first-option
                        placeholder="输入或选择标签名"
                        @change="(v: string) => updateTypeTab(i, 'tag', v)"
                      >
                        <el-option v-for="tg in tagOptions" :key="tg" :label="tg" :value="tg" />
                      </el-select>
                    </div>
                  </div>
                  <div v-else-if="t.filter_type === 'ids'" class="type-tabs__row">
                    <span class="type-tabs__name">内容</span>
                    <div class="type-tabs__ctrl">
                      <el-select
                        :model-value="t.content_ids || []"
                        size="small"
                        multiple
                        filterable
                        remote
                        :remote-method="searchContentOptions"
                        :loading="contentOptionsLoading"
                        collapse-tags
                        :placeholder="`搜索并选择内容（已选 ${(t.content_ids || []).length}）`"
                        @change="(v: number[]) => updateTypeTab(i, 'content_ids', v)"
                      >
                        <el-option v-for="c in contentOptions" :key="c.id" :label="c.label" :value="c.id" />
                      </el-select>
                    </div>
                  </div>
                  <div class="type-tabs__row">
                    <span class="type-tabs__name">排序</span>
                    <div class="type-tabs__ctrl">
                      <div class="chip-group">
                        <button
                          v-for="opt in SORT_OPTS"
                          :key="opt.value"
                          type="button"
                          class="chip"
                          :class="{ 'chip--on': (t.sort || 'new') === opt.value }"
                          @click="updateTypeTab(i, 'sort', opt.value)"
                        >
                          {{ opt.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="type-tabs__row">
                    <span class="type-tabs__name">本页样式</span>
                    <div class="type-tabs__ctrl">
                      <div class="chip-group">
                        <button
                          v-for="opt in LAYOUT_OPTS"
                          :key="opt.value"
                          type="button"
                          class="chip"
                          :class="{ 'chip--on': (t.layout || '') === opt.value }"
                          @click="updateTypeTab(i, 'layout', opt.value)"
                        >
                          {{ opt.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>
          <el-button class="type-tabs__add" text type="primary" size="small" @click="addTypeTab">
            <el-icon><Plus /></el-icon> 添加页签
          </el-button>
        </div>
        <div class="ds-hint">
          拖动序号调整页签顺序；配置 ≥2 个时顶部显示大 Tab。每页可混选内容形式（长文+笔记+动态同页展示）、多类别筛选、独立排序与展示样式
        </div>
      </el-form-item>
      <el-form-item v-if="typeTabs.length > 1" label="搜索入口">
        <el-switch
          :model-value="data.show_search === true"
          @change="(v: boolean) => emit('update', { show_search: v })"
        />
        <div class="ds-hint">大 Tab 右侧显示搜索圆钮，点击进全局搜索</div>
      </el-form-item>

      <el-form-item v-if="typeTabs.length > 1" label="Tab 字号">
        <el-input-number
          :model-value="Number(data.tab_font_size ?? 16)"
          :min="12"
          :max="24"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { tab_font_size: v ?? 16 })"
        />
        <div class="ds-hint">页签文字大小，单位 px（默认 16）</div>
      </el-form-item>
      <el-form-item v-if="typeTabs.length > 1" label="选中效果">
        <el-radio-group
          :model-value="data.tab_active_style || 'bar'"
          @change="(v: string) => emit('update', { tab_active_style: v })"
        >
          <el-radio-button value="bar">下划线</el-radio-button>
          <el-radio-button value="fill">填充色块</el-radio-button>
          <el-radio-button value="ink">加粗变色</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="typeTabs.length > 1" label="选中色">
        <el-color-picker
          :model-value="data.tab_active_color || ''"
          :predefine="['#c08e6e', '#ec2f55', '#2953ff', '#14171f', '#0f9d58']"
          @change="(v: string | null) => emit('update', { tab_active_color: v || '' })"
        />
        <div class="ds-hint">默认跟随站点主题色；影响下划线/色块/选中文字</div>
      </el-form-item>

      <el-divider content-position="left">卡片</el-divider>
      <el-form-item label="无图文字卡">
        <el-switch
          :model-value="data.text_card === true"
          @change="(v: boolean) => emit('update', { text_card: v })"
        />
        <div class="ds-hint">无封面内容渲染为标题+摘要文字卡（金句卡效果）；关闭则显示 📷 占位图</div>
      </el-form-item>
      <el-form-item label="多图角标">
        <el-radio-group
          :model-value="data.gallery_badge || 'plain'"
          @change="(v: string) => emit('update', { gallery_badge: v })"
        >
          <el-radio-button value="plain">「N 图」</el-radio-button>
          <el-radio-button value="xhs">「图文 N」+「1/N」</el-radio-button>
          <el-radio-button value="none">不显示</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="点赞图标">
        <el-switch
          :model-value="data.like_heart === true"
          @change="(v: boolean) => emit('update', { like_heart: v })"
        />
        <div class="ds-hint">开启后为红色实心 ♥，关闭为线框 ♡</div>
      </el-form-item>

      <el-form-item label="分类标签">
        <el-switch
          :model-value="data.show_category_tabs === true"
          @change="(v: boolean) => emit('update', { show_category_tabs: v })"
        />
        <div class="ds-hint">开启后顶部显示内容分类 Tab</div>
      </el-form-item>
      <el-form-item label="每页条数">
        <el-input-number
          :model-value="Number(data.page_size ?? 12)"
          :min="6"
          :max="30"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { page_size: v ?? 12 })"
        />
      </el-form-item>
      <div class="ds-card">
        <div class="ds-card__head">
          <span>视觉微调</span>
          <span class="ds-card__count">对齐设计稿时用</span>
        </div>

        <el-form-item label="卡片间距">
          <el-input-number
            :model-value="data.item_gap ?? 11"
            @change="(v: number | undefined) => emit('update', { item_gap: v ?? 11 })"
            :min="0"
            :max="48"
            controls-position="right"
          />
          <div class="ds-hint">两列之间的缝隙，单位 px</div>
        </el-form-item>

        <el-form-item label="卡片圆角">
          <el-input-number
            :model-value="data.item_border_radius ?? 14"
            @change="(v: number | undefined) => emit('update', { item_border_radius: v ?? 14 })"
            :min="0"
            :max="28"
            controls-position="right"
          />
          <div class="ds-hint">0 = 直角，小红书约 8px</div>
        </el-form-item>

        <el-form-item label="页面左右边距">
          <el-input-number
            :model-value="data.page_gutter ?? 0"
            @change="(v: number | undefined) => emit('update', { page_gutter: v ?? 0 })"
            :min="0"
            :max="40"
            controls-position="right"
          />
          <div class="ds-hint">在页面基础上再留白，单位 px。0 = 贴边（当前效果）</div>
        </el-form-item>

        <el-form-item label="标题字号">
          <el-input-number
            :model-value="data.title_size ?? 32"
            @change="(v: number | undefined) => emit('update', { title_size: v ?? 32 })"
            :min="24"
            :max="44"
            controls-position="right"
          />
          <div class="ds-hint">卡片标题文字大小，单位 px</div>
        </el-form-item>

        <el-form-item label="列表底色">
          <el-color-picker
            :model-value="data.background_color || '#f7f7f7'"
            :predefine="['#f7f7f7', '#ffffff', '#fff5eb', '#f0f5ff', '#fdf6ec', '#1f1f1f']"
            @change="(v: string | null) => emit('update', { background_color: v || '#f7f7f7' })"
          />
          <el-button text size="small" @click="emit('update', { background_color: '' })">恢复默认</el-button>
          <div class="ds-hint">卡片背后的底色，默认浅米 #f7f7f7</div>
        </el-form-item>
      </div>

      <div class="ds-card">
        <div class="ds-card__head">
          <span>数据来源</span>
          <span class="ds-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇笔记` }}</span>
        </div>
        <div class="ds-hint">已发布笔记，按发布时间倒序无限加载</div>
        <div v-if="liveItems.length" class="ds-preview">
          <div v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="ds-chip">
            {{ item.title }}
          </div>
        </div>
        <div v-else-if="!liveLoading" class="ds-empty">暂无已发布笔记</div>
      </div>

      <SourceTagFields :props="data" @update="(v) => emit('update', v)" />
      <ContentTagFilterFields :props="data" @update="(v) => emit('update', v)" />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { fetchTopContentCategoryTabs, type ContentCategoryTab } from '@/utils/content-category-tabs'
import { get } from '@/api/request'
import SourceTagFields from './SourceTagFields.vue'
import ContentTagFilterFields from './ContentTagFilterFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-note-feed',
  type: ComponentType.NoteFeed,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

interface TypeTab {
  label: string
  /** 内容形式多选：note/article/moment/product，空 = 全部（product 可与内容混排，也可单独成页签） */
  content_types: string[]
  /** 筛选方式：all/category/tag/ids（旧值 type 映射为 all） */
  filter_type: 'all' | 'category' | 'tag' | 'ids'
  category_ids: string[]
  tag: string
  content_ids: number[]
  /** 排序：new 最新 / hot 最热 / oldest 最早 */
  sort: 'new' | 'hot' | 'oldest'
  /** 本页展示样式：'' 跟随全局 / masonry / wechat / list */
  layout: '' | 'masonry' | 'wechat' | 'list'
}

const CONTENT_TYPE_OPTIONS = ['note', 'article', 'moment', 'product']
const FILTER_TYPES = ['all', 'category', 'tag', 'ids']
const SORTS = ['new', 'hot', 'oldest']
const LAYOUTS = ['', 'masonry', 'wechat', 'list']

/** 页签卡内芯片按钮选项（统一视觉语言） */
const CONTENT_TYPE_OPTS = [
  { value: 'note', label: '笔记' },
  { value: 'article', label: '长文' },
  { value: 'moment', label: '动态' },
  { value: 'product', label: '好物' },
]
const SORT_OPTS = [
  { value: 'new', label: '最新' },
  { value: 'hot', label: '最热' },
  { value: 'oldest', label: '最早' },
]
const LAYOUT_OPTS = [
  { value: '', label: '跟随全局' },
  { value: 'masonry', label: '双列瀑布' },
  { value: 'wechat', label: '图文横滑' },
  { value: 'list', label: '单列列表' },
]

function normalizeTypeTab(t: any): TypeTab {
  const legacyFilter = String(t?.filter_type || 'all')
  // 旧配置映射：filter_type=type（单选内容类型）→ all + content_types=[content_type]
  const filterType = (FILTER_TYPES.includes(legacyFilter) ? legacyFilter : (legacyFilter === 'type' ? 'all' : 'all')) as TypeTab['filter_type']
  let contentTypes: string[] = []
  if (Array.isArray(t?.content_types)) {
    contentTypes = t.content_types.map((v: any) => String(v)).filter((v: string) => CONTENT_TYPE_OPTIONS.includes(v))
  } else if (legacyFilter === 'type') {
    const ct = String(t?.content_type || t?.contentType || 'note')
    contentTypes = [ct]
  }
  let categoryIds: string[] = []
  if (Array.isArray(t?.category_ids)) {
    categoryIds = t.category_ids.map((v: any) => String(v)).filter(Boolean)
  } else if (t?.category_id != null && String(t.category_id) !== '') {
    categoryIds = [String(t.category_id)]
  }
  return {
    label: String(t?.label || t?.title || ''),
    content_types: contentTypes,
    filter_type: filterType,
    category_ids: categoryIds,
    tag: String(t?.tag || ''),
    content_ids: Array.isArray(t?.content_ids) ? t.content_ids.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v)) : [],
    sort: (SORTS.includes(String(t?.sort)) ? String(t?.sort) : 'new') as TypeTab['sort'],
    layout: (LAYOUTS.includes(String(t?.layout || '')) ? String(t?.layout || '') : '') as TypeTab['layout'],
  }
}

/** 保存时同步派生旧字段（content_type/category_id），保证未升级的小程序端可降级渲染 */
function deriveLegacyFields(tab: TypeTab): TypeTab & { content_type: string; category_id: string } {
  return {
    ...tab,
    content_type: tab.content_types[0] || 'note',
    category_id: tab.category_ids[0] || '',
  }
}

const typeTabs = computed<TypeTab[]>(() =>
  // 编辑器不过滤行：新增的空行也要可见可编辑，非法行交由小程序端过滤
  (Array.isArray(data.type_tabs) ? data.type_tabs : []).map(normalizeTypeTab),
)

function setTypeTabs(tabs: TypeTab[]) {
  emit('update', { type_tabs: tabs.map(deriveLegacyFields) })
}

function updateTypeTab(index: number, key: keyof TypeTab, value: string | number | string[] | number[]) {
  const next = typeTabs.value.map((t, i) => (i === index ? { ...t, [key]: value } : t))
  setTypeTabs(next)
}

function toggleContentType(index: number, value: string) {
  const cur = typeTabs.value[index]?.content_types || []
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
  updateTypeTab(index, 'content_types', next)
}

function addTypeTab() {
  setTypeTabs([
    ...typeTabs.value,
    { label: '', content_types: ['note'], filter_type: 'all', category_ids: [], tag: '', content_ids: [], sort: 'new', layout: '' },
  ])
}

function removeTypeTab(index: number) {
  setTypeTabs(typeTabs.value.filter((_, i) => i !== index))
}

// ---- 页签筛选项数据 ----
const categoryOptions = ref<ContentCategoryTab[]>([])
const tagOptions = ref<string[]>([])
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

async function searchContentOptions(keyword: string) {
  contentOptionsLoading.value = true
  try {
    const kw = String(keyword || '').trim()
    const rows = await fetchContentList(kw ? { keyword: kw } : {})
    mergeContentOptions(rows)
  } finally {
    contentOptionsLoading.value = false
  }
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

/** 已选中的内容按 ids 反查标题，避免下拉里只显示数字 */
async function loadSelectedContentTitles() {
  const selected = [...new Set(typeTabs.value.flatMap((t) => t.content_ids || []))]
  if (!selected.length) return
  const known = new Set(contentOptions.value.map((o) => o.id))
  const missing = selected.filter((id) => !known.has(id))
  if (!missing.length) return
  const rows = await fetchContentList({ ids: missing.join(','), size: String(Math.max(missing.length, 1)) })
  mergeContentOptions(rows)
}

onMounted(async () => {
  try {
    const tabs = await fetchTopContentCategoryTabs()
    categoryOptions.value = tabs
  } catch {
    categoryOptions.value = []
  }
  tagOptions.value = Array.isArray(data.filter_topic_tags) ? (data.filter_topic_tags as string[]) : []
  await searchContentOptions('')
  await loadSelectedContentTitles()
})
</script>

<style scoped lang="scss">
.ds-hint {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.ds-hint--block {
  margin: 0 0 8px;
}

.ds-card {
  margin-top: 8px;
  padding: 10px 10px 8px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.ds-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.ds-card__count {
  color: #ec2f55;
  font-weight: 500;
}

.ds-empty {
  margin: 0 0 4px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.ds-chip {
  padding: 4px 8px;
  color: #475569;
  font-size: 11px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.type-tabs__item {
  padding: 10px 10px 9px;
  background: #fff;
  border: 1px solid #e6eaf2;
  border-radius: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.type-tabs__item:hover {
  border-color: #d3dcea;
  box-shadow: 0 1px 4px rgba(31, 41, 61, 0.06);
}

.type-tabs__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-tabs__grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: #7a8194;
  font-size: 11px;
  font-weight: 600;
  background: #e9edf4;
  border-radius: 6px;
  cursor: grab;
  user-select: none;
}

.type-tabs__grip:active {
  cursor: grabbing;
  background: #dbe3ef;
}

.type-tabs__label {
  flex: 1;
  min-width: 0;
}

.type-tabs__mode {
  width: 100px;
  flex-shrink: 0;
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
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s;
}

.type-tabs__del:hover {
  color: #ec2f55;
  background: #fdeef2;
}

.type-tabs__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px dashed #eef1f6;
}

.type-tabs__row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.type-tabs__name {
  color: #8a93a6;
  font-size: 12px;
  line-height: 24px;
  white-space: nowrap;
}

.type-tabs__ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.type-tabs__ctrl .el-select {
  width: 100%;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  height: 24px;
  padding: 0 9px;
  color: #5a6478;
  font-size: 12px;
  font-family: inherit;
  line-height: 1;
  background: #f6f8fb;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.chip:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #f3f0ea);
}

.chip--on,
.chip--on:hover {
  color: #fff;
  background: var(--el-color-primary);
}

.type-tabs__tip {
  padding: 5px 9px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.6;
  background: #f4f6fa;
  border: 1px dashed #d8dfea;
  border-radius: 6px;
}

.type-tabs__add {
  align-self: flex-start;
}
</style>
