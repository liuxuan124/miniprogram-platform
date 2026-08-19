<template>
  <div class="hot-news-props">
    <el-form label-width="78px" size="small">
      <el-divider content-position="left">标题头</el-divider>
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
        <el-radio-group
          :model-value="data.date_mode || 'today'"
          @change="(v: string) => emit('update', { date_mode: v })"
        >
          <el-radio value="today">今天</el-radio>
          <el-radio value="fixed">指定日期</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="(data.date_mode || 'today') === 'fixed'" label="指定日期">
        <el-date-picker
          :model-value="data.header_date || ''"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 100%"
          @change="(v: string | null) => emit('update', { header_date: v || '' })"
        />
      </el-form-item>
      <el-form-item label="查看更多">
        <el-switch
          :model-value="data.show_more !== false"
          @change="(v: boolean) => emit('update', { show_more: v })"
        />
      </el-form-item>
      <template v-if="data.show_more !== false">
        <el-form-item label="更多文案">
          <el-input
            :model-value="data.more_text || '查看更多 >'"
            @input="(v: string) => emit('update', { more_text: v })"
          />
        </el-form-item>
        <el-form-item label="更多链接">
          <el-input
            :model-value="data.more_link || '/pages/content-list/content-list'"
            placeholder="/pages/content-list/content-list"
            @input="(v: string) => emit('update', { more_link: v })"
          />
        </el-form-item>
      </template>
      <el-form-item label="标题渐变起">
        <el-color-picker
          :model-value="data.header_from || '#4F7CFF'"
          @change="(v: string | null) => emit('update', { header_from: v || '#4F7CFF' })"
        />
      </el-form-item>
      <el-form-item label="标题渐变止">
        <el-color-picker
          :model-value="data.header_to || '#7BA3FF'"
          @change="(v: string | null) => emit('update', { header_to: v || '#7BA3FF' })"
        />
      </el-form-item>
      <el-form-item label="标题宽度">
        <el-slider
          class="hot-news-slider"
          :model-value="Number(data.title_width ?? 72)"
          :min="40"
          :max="100"
          :step="1"
          show-input
          :show-input-controls="false"
          input-size="small"
          @update:model-value="(v: number | number[]) => emit('update', { title_width: Number(v) })"
        />
        <div class="ds-hint">最小宽度（%）；文字过长时自动撑开，不会截断</div>
      </el-form-item>
      <el-form-item label="标题圆角">
        <el-input-number
          :model-value="Number(data.title_radius ?? 12)"
          :min="0"
          :max="40"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { title_radius: v ?? 12 })"
        />
      </el-form-item>
      <el-form-item label="标题透明度">
        <el-slider
          class="hot-news-slider"
          :model-value="Number(data.header_opacity ?? 96)"
          :min="40"
          :max="100"
          :step="1"
          show-input
          :show-input-controls="false"
          input-size="small"
          @update:model-value="(v: number | number[]) => emit('update', { header_opacity: Number(v) })"
        />
        <div class="ds-hint">标题框背景透明度（%）</div>
      </el-form-item>
      <el-form-item label="内容圆角">
        <el-input-number
          :model-value="Number(data.content_radius ?? 14)"
          :min="0"
          :max="40"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { content_radius: v ?? 14 })"
        />
      </el-form-item>
      <template v-if="data.show_more !== false">
        <el-form-item label="更多底色">
          <el-color-picker
            :model-value="data.more_bg || '#EEF1FF'"
            @change="(v: string | null) => emit('update', { more_bg: v || '#EEF1FF' })"
          />
        </el-form-item>
        <el-form-item label="更多文字色">
          <el-color-picker
            :model-value="data.more_color || '#5B6CFF'"
            @change="(v: string | null) => emit('update', { more_color: v || '#5B6CFF' })"
          />
        </el-form-item>
        <el-form-item label="更多圆角">
          <el-input-number
            :model-value="Number((data.more_radius ?? 20) > 40 ? 20 : (data.more_radius ?? 20))"
            :min="0"
            :max="40"
            controls-position="right"
            @change="(v: number | undefined) => emit('update', { more_radius: v ?? 20 })"
          />
        </el-form-item>
      </template>

      <el-divider content-position="left">文章展示</el-divider>
      <el-form-item label="排列方式">
        <el-radio-group :model-value="layoutValue" @change="onLayoutChange">
          <el-radio-button value="star">星标列表</el-radio-button>
          <el-radio-button value="card">卡片</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="layoutValue === 'card'" label="显示封面">
        <el-switch
          :model-value="data.show_cover !== false"
          @change="(v: boolean) => emit('update', { show_cover: v })"
        />
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="Number(data.limit ?? 3)"
          :min="1"
          :max="20"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { limit: v ?? 3 })"
        />
      </el-form-item>
      <el-form-item label="条目间距">
        <el-input-number
          :model-value="Number(data.item_gap ?? 10)"
          :min="0"
          :max="32"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { item_gap: v ?? 10 })"
        />
      </el-form-item>

      <div class="ds-card">
        <div class="ds-card__head">
          <span>展示哪些内容</span>
          <span class="ds-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇` }}</span>
        </div>
        <div class="ds-hint ds-hint--block">未设筛选时默认按最热（浏览量）展示</div>
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
          <div class="ds-hint">按文章发布时间筛选某一天</div>
        </el-form-item>
        <el-form-item label="排序方式">
          <el-select :model-value="sortBy" style="width: 100%" @change="onSortByChange">
            <el-option label="最热（浏览量）" value="popular" />
            <el-option label="最新发布" value="newest" />
            <el-option label="推荐优先" value="recommended" />
          </el-select>
        </el-form-item>
        <div v-if="liveItems.length" class="ds-preview">
          <div v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="ds-chip">
            {{ item.title }}
          </div>
        </div>
        <div v-else-if="!liveLoading" class="ds-empty">当前筛选下没有已发布内容</div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCategoryList } from '@/api/content'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const categoryOptions = ref<{ id: number | string; name: string }[]>([])

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-hot-news',
  type: ComponentType.HotNews,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const layoutValue = computed(() => {
  const raw = data.layout || 'star'
  return raw === 'card' ? 'card' : 'star'
})

const queryParams = computed(() => {
  const ds = data.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

const sortBy = computed(() => queryParams.value.sort_by || 'popular')

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
  emit('update', {
    data_source: {
      type: 'content',
      params,
      query: params,
    },
  })
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
.ds-card__count { color: #1769ff; font-weight: 500; }
.ds-empty { margin: 0 0 4px; color: #7b8798; font-size: 11px; line-height: 1.4; }
.ds-hint { margin: 4px 0 0; color: #7b8798; font-size: 11px; line-height: 1.4; }
:deep(.hot-news-slider.el-slider) {
  width: 100%;
  padding-right: 4px;
  box-sizing: border-box;
}
:deep(.hot-news-slider .el-slider__runway) {
  margin-right: 12px;
}
.ds-hint--block {
  margin: 0 0 10px;
  padding: 8px 10px;
  background: #f5f7fb;
  border-radius: 6px;
}
.ds-preview { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.ds-chip {
  overflow: hidden;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  color: #172033;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
