<template>
  <div class="article-list-props">
    <el-form label-width="70px" size="small">
      <div class="ds-hint ds-hint--block">
        标题请单独拖入「标题栏」组件放在本列表上方；本组件只渲染文章卡。
      </div>

      <el-divider content-position="left">文章展示</el-divider>
      <el-form-item label="分类标签">
        <el-switch
          :model-value="data.show_category_tabs === true"
          @change="(v: boolean) => emit('update', { show_category_tabs: v, show_more: v ? false : data.show_more })"
        />
        <div class="ds-hint">开启后顶部显示「全部/分类」，点击切换下方文章</div>
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="layoutValue" @change="onLayoutChange">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="compact">紧凑</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示封面">
        <el-switch :model-value="data.show_cover" @change="emit('update', { show_cover: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示日期">
        <el-switch :model-value="data.show_date" @change="emit('update', { show_date: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit"
          @change="emit('update', { limit: $event as number })"
          :min="1"
          :max="50"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="卡片间距">
        <el-input-number
          :model-value="data.item_gap ?? 8"
          @change="(v: number | undefined) => emit('update', { item_gap: v ?? 8 })"
          :min="0"
          :max="48"
          controls-position="right"
        />
        <div class="ds-hint">单位 px，控制每张文章卡之间的空隙</div>
      </el-form-item>
      <TitleFontSizeFields
        :data="data"
        subtitle-label="日期字号"
        :title-default="13"
        :subtitle-default="11"
        @update="(v) => emit('update', v)"
      />

      <div class="ds-card">
        <div class="ds-card__head">
          <span>展示哪些内容</span>
          <span class="ds-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇已发布` }}</span>
        </div>
        <el-form-item label="内容分类">
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
        </el-form-item>
        <el-form-item label="内容类型">
          <el-select
            :model-value="queryParams.type || ''"
            clearable
            placeholder="全部类型"
            style="width: 100%"
            @change="(v: string) => patchQuery({ type: v || undefined })"
          >
            <el-option label="全部类型" value="" />
            <el-option label="图文文章" value="article" />
            <el-option label="图文素材" value="image_text" />
            <el-option label="视频" value="video" />
          </el-select>
        </el-form-item>
        <el-form-item label="仅推荐">
          <el-switch
            :model-value="queryParams.is_recommended === true"
            @change="(v: boolean) => patchQuery({ is_recommended: v ? true : undefined })"
          />
        </el-form-item>
        <el-form-item label="排序方式">
          <el-select :model-value="sortBy" @change="onSortByChange" style="width: 100%">
            <el-option label="最新发布" value="newest" />
            <el-option label="阅读量最多" value="popular" />
            <el-option label="推荐优先" value="recommended" />
          </el-select>
        </el-form-item>
        <div v-if="liveItems.length" class="ds-preview">
          <div v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="ds-chip">
            {{ item.title }}
          </div>
        </div>
        <div v-else-if="!liveLoading" class="ds-empty">当前筛选下没有已发布内容，画布会显示空态</div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCategoryList } from '@/api/content'
import { ComponentType, type ComponentInstance } from '@/types/page'
import TitleFontSizeFields from './TitleFontSizeFields.vue'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const categoryOptions = ref<{ id: number | string; name: string }[]>([])

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-article-list',
  type: ComponentType.ArticleList,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const layoutValue = computed(() => {
  const raw = data.layout || data.style_type || 'list'
  return ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
})

const queryParams = computed(() => {
  const ds = data.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

const sortBy = computed(() => queryParams.value.sort_by || 'newest')

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
  const params = { ...queryParams.value, status: 'published', ...patch }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  emit('update', {
    data_source: {
      type: 'content',
      params,
      query: params,
    },
  })
}

function onLayoutChange(val: string) {
  emit('update', { layout: val, style_type: val })
}

function onSortByChange(val: string) {
  patchQuery({
    sort_by: val,
    is_recommended: val === 'recommended' ? true : queryParams.value.is_recommended,
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

.ds-card__count {
  color: #1769ff;
  font-weight: 500;
}

.ds-empty {
  margin: 0 0 4px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-hint {
  margin: 4px 0 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-hint--block {
  margin: 0 0 12px;
  padding: 8px 10px;
  background: #f5f7fb;
  border-radius: 6px;
}

.ds-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

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

