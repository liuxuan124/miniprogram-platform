<template>
  <div class="render-search-wrap">
    <!-- 预览模式：可输入、可搜索 -->
    <div v-if="previewMode" class="render-search render-search--active">
      <span class="search-icon">🔍</span>
      <input
        v-model="keyword"
        class="search-input"
        :placeholder="component.props.placeholder || '搜索商品 / 文章 / 活动'"
        @keyup.enter="doSearch"
        @click.stop
      />
      <button class="search-btn" :disabled="searching" @click.stop="doSearch">
        {{ searching ? '搜索中' : '搜索' }}
      </button>
    </div>
    <!-- 编辑画布：静态展示 -->
    <div v-else class="render-search">
      <span class="search-icon">🔍</span>
      <span class="search-text">{{ component.props.placeholder || '搜索商品 / 文章 / 活动' }}</span>
    </div>

    <!-- 搜索结果 -->
    <div v-if="previewMode && searched" class="search-results">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { get } from '@/api/request'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

type ResultType = 'product' | 'content' | 'activity'
type SearchResult = { type: ResultType; id: string | number; title: string; extra: string; desc: string }

const typeLabels: Record<ResultType, string> = { product: '商品', content: '内容', activity: '活动' }

const keyword = ref('')
const lastKeyword = ref('')
const searching = ref(false)
const searched = ref(false)
const results = ref<SearchResult[]>([])

function extractRecords(res: any): any[] {
  const data = res?.data
  return data?.records || data?.list || (Array.isArray(data) ? data : [])
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  searching.value = true
  lastKeyword.value = kw
  const scope = props.component.props?.scope || 'all'
  const found: SearchResult[] = []
  const match = (text: string) => (text || '').toLowerCase().includes(kw.toLowerCase())

  try {
    const tasks: Promise<void>[] = []
    if (scope === 'all' || scope === 'product') {
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
    if (scope === 'all' || scope === 'content') {
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
    if (scope === 'all' || scope === 'activity') {
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
</script>

<style lang="scss" scoped>
.render-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  color: #8a94a6;
  background: #f4f7fb;
  border: 1px solid #e3e8f0;
  border-radius: var(--card-radius, 10px);

  &.render-search--active {
    padding: 6px 6px 6px 12px;
  }

  .search-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .search-text {
    font-size: 12px;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #1f2937;
    font-size: 12px;

    &::placeholder {
      color: #8a94a6;
    }
  }

  .search-btn {
    flex-shrink: 0;
    padding: 5px 12px;
    border: 0;
    border-radius: 999px;
    background: var(--theme-primary, #1769ff);
    color: #fff;
    font-size: 12px;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }
}

.search-results {
  margin-top: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: var(--card-radius, 10px);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);

  .search-empty {
    padding: 12px;
    color: #8a94a6;
    font-size: 12px;
    text-align: center;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background: #f4f7fb;
    }

    .result-tag {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;

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
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #1f2937;
      font-size: 12px;
    }

    .result-extra {
      flex-shrink: 0;
      color: #ef4444;
      font-size: 11px;
    }
  }

  .search-close {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 6px;
    border: 0;
    background: transparent;
    color: #8a94a6;
    font-size: 11px;
    cursor: pointer;

    &:hover {
      color: #475569;
    }
  }
}
</style>
