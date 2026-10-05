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
        <el-form label-width="80px" size="small">
          <el-form-item label="组件备注">
            <span class="hn-note">顶部大促快讯条 · 单条带序号的资讯列表</span>
          </el-form-item>

          <el-divider content-position="left">标题与扩展</el-divider>

          <el-form-item label="标题文案">
            <el-input
              :model-value="data.title || ''"
              maxlength="20"
              show-word-limit
              placeholder="今日跨境头条"
              @input="(v: string) => emit('update', { title: v })"
            />
          </el-form-item>

          <el-form-item label="日期模式">
            <BuilderSegmented
              :model-value="dateMode"
              :options="DATE_OPTIONS"
              block
              aria-label="日期模式"
              @update:model-value="(v) => emit('update', { date_mode: v })"
            />
          </el-form-item>
          <!-- 条件联动：仅「指定日期」展开选择器 -->
          <el-form-item v-if="dateMode === 'fixed'" label="指定日期">
            <el-date-picker
              :model-value="data.header_date || ''"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
              @change="(v: string | null) => emit('update', { header_date: v || '' })"
            />
          </el-form-item>
          <el-form-item v-else-if="dateMode === 'today'" label="日期">
            <span class="hn-hint">显示今天的日期与星期，随访问日自动变化</span>
          </el-form-item>

          <el-form-item label="纯文字标题">
            <el-switch
              :model-value="!!data.header_plain"
              @change="(v: boolean) => emit('update', { header_plain: v })"
            />
            <FieldHint text="开启后标题在卡片内以普通文字展示，无渐变胶囊。关闭则用下方「标题样式」里的渐变配色。" />
          </el-form-item>

          <el-form-item label="查看更多">
            <el-switch
              :model-value="showMore"
              @change="(v: boolean) => emit('update', { show_more: v })"
            />
            <FieldHint text="关闭后画布右上角的「查看更多」入口消失，相关的文案、链接与按钮配色一并失效。" />
          </el-form-item>
          <!-- 条件联动：showMore=false 时收起文案 + 链接 -->
          <template v-if="showMore">
            <el-form-item label="更多文案">
              <el-input
                :model-value="data.more_text || '查看更多 >'"
                maxlength="10"
                placeholder="全部 ›"
                @input="(v: string) => emit('update', { more_text: v })"
              />
            </el-form-item>
            <el-form-item label="跳转目标">
              <!-- LinkPickerField 用 linkType/linkUrl 双 prop（见其 defineProps） -->
              <LinkPickerField
                :link-type="data.more_link_type || 'page'"
                :link-url="data.more_link || DEFAULT_MORE_LINK"
                @update:link-type="(v: string) => emit('update', { more_link_type: v })"
                @update:link-url="(v: string) => emit('update', { more_link: v })"
              />
            </el-form-item>
          </template>

          <el-divider content-position="left">数据筛选</el-divider>

          <el-form-item label="内容分类">
            <el-select
              :model-value="queryParams.category_id ?? queryParams.categoryId ?? ''"
              clearable
              filterable
              placeholder="全部分类"
              style="width: 100%"
              @change="(v: string | number) => patchQuery({ category_id: v || undefined, categoryId: v || undefined })"
            >
              <el-option label="全部分类" value="" />
              <el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="发布日期">
            <el-date-picker
              :model-value="queryParams.publish_date || ''"
              type="date"
              value-format="YYYY-MM-DD"
              clearable
              placeholder="不限日期"
              style="width: 100%"
              @change="(v: string | null) => patchQuery({ publish_date: v || undefined })"
            />
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select :model-value="sortBy" style="width: 100%" @change="onSortByChange">
              <el-option label="最热（浏览量）" value="popular" />
              <el-option label="最新发布" value="newest" />
              <el-option label="推荐优先" value="recommended" />
            </el-select>
            <FieldHint text="支持自定义排序规则；未指定时按全站实时热度（浏览量）排序。" />
          </el-form-item>

          <div class="hn-preview">
            <div class="hn-preview__head">
              <span>展示哪些内容</span>
              <span class="hn-preview__count">
                {{ liveLoading ? '读取中…' : `${liveItems.length} 篇` }}
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
            <div v-if="liveItems.length" class="hn-preview__list">
              <!--
                预览条数与画布严格一致（取 limit），原来硬编码 slice(0,3)
                → limit 配 4 时画布显示 4 条、面板只列 3 条，运营以为少了一条。
              -->
              <div v-for="item in liveItems.slice(0, previewLimit)" :key="item.id || item.title" class="hn-chip">
                <span class="hn-chip__idx">{{ liveItems.indexOf(item) + 1 }}</span>
                <span class="hn-chip__title">{{ item.title }}</span>
              </div>
            </div>
            <div v-else-if="!liveLoading" class="hn-preview__empty">
              当前筛选下没有已发布内容，试试放宽分类或日期
            </div>
            <div v-if="liveItems.length > previewLimit" class="hn-preview__more">
              还有 {{ liveItems.length - previewLimit }} 篇未列出（画布同样只展示前 {{ previewLimit }} 条）
            </div>
          </div>
        </el-form>
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
import { Refresh } from '@element-plus/icons-vue'
import { getCategoryList } from '@/api/content'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'
import ColorFieldRow from './ColorFieldRow.vue'
import NumSliderRow from './NumSliderRow.vue'

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

/** 排列方式选项带语义化后缀，运营不必理解 star/card/number */
const LAYOUT_OPTIONS: SegOption[] = [
  { value: 'star', label: '★ 星标' },
  { value: 'card', label: '▤ 卡片' },
  { value: 'number', label: '① 序号' },
]

const tab = ref('content')
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
</style>
