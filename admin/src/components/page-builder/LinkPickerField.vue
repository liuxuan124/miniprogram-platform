<template>
  <div class="link-picker">
    <el-select
      :model-value="linkType"
      style="width: 96px; flex-shrink: 0"
      @update:model-value="onTypeChange"
    >
      <el-option label="页面" value="page" />
      <el-option label="商品" value="product" />
      <el-option label="内容" value="content" />
      <el-option label="网页" value="webview" />
      <el-option label="链接" value="url" />
      <el-option label="小程序" value="miniapp" />
      <el-option label="电话" value="phone" />
      <el-option label="无" value="none" />
    </el-select>
    <template v-if="linkType === 'page'">
      <el-select
        :model-value="linkUrl"
        filterable
        remote
        clearable
        placeholder="搜索页面名称或路径"
        class="link-picker__grow"
        :remote-method="searchPages"
        :loading="pageLoading"
        @update:model-value="onUrlChange"
      >
        <el-option
          v-for="p in pageOptions"
          :key="p.id"
          :label="`${p.name} · ${p.path}`"
          :value="p.path"
        />
      </el-select>
    </template>
    <template v-else-if="linkType === 'product'">
      <el-select
        :model-value="linkUrl"
        filterable
        remote
        clearable
        placeholder="搜索商品名称"
        class="link-picker__grow"
        :remote-method="searchProducts"
        :loading="productLoading"
        @update:model-value="onUrlChange"
      >
        <el-option
          v-for="p in productOptions"
          :key="p.id"
          :label="p.name"
          :value="p.path"
        />
      </el-select>
    </template>
    <template v-else-if="linkType === 'content'">
      <el-select
        v-model="contentTypeFilter"
        size="small"
        style="width: 104px; flex-shrink: 0"
        title="按内容形态筛选"
        @change="onContentTypeFilter"
      >
        <el-option label="全部形态" value="" />
        <el-option label="长文" value="article" />
        <el-option label="图文笔记" value="note" />
        <el-option label="星球动态" value="moment" />
        <el-option label="视频" value="video" />
      </el-select>
      <el-select
        :model-value="linkUrl"
        filterable
        remote
        clearable
        placeholder="搜索文章/笔记/动态标题"
        class="link-picker__grow"
        :remote-method="searchContents"
        :loading="contentLoading"
        @update:model-value="onUrlChange"
      >
        <el-option
          v-for="c in contentOptions"
          :key="c.id"
          :label="c.title"
          :value="c.path"
        >
          <span>{{ c.title }}</span>
          <span class="link-picker__hint">
            <span class="cf-tag" :class="c.tone">{{ c.kindLabel }}</span>
            <span v-if="c.pinned" class="cf-flag">置顶</span>
            <span v-if="c.recommended" class="cf-flag cf-flag-rec">推荐</span>
          </span>
        </el-option>
      </el-select>
    </template>
    <el-input
      v-else-if="linkType !== 'none'"
      :model-value="linkUrl"
      :placeholder="placeholder"
      class="link-picker__grow"
      @update:model-value="onUrlChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPageList } from '@/api/page'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { contentDetailPath, contentKindLabel, contentKindTone } from '@/utils/content-link'

const props = defineProps<{
  linkType?: string
  linkUrl?: string
}>()

const emit = defineEmits<{
  'update:linkType': [value: string]
  'update:linkUrl': [value: string]
}>()

const linkType = computed(() => props.linkType || 'page')
const linkUrl = computed(() => props.linkUrl || '')

const placeholder = computed(() => {
  if (linkType.value === 'phone') return '电话号码'
  if (linkType.value === 'miniapp') return 'AppId|路径'
  return '链接地址'
})

const pageLoading = ref(false)
const productLoading = ref(false)
const contentLoading = ref(false)
const pageOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const productOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const contentOptions = ref<Array<{ id: number; title: string; path: string; kindLabel: string; tone: string; pinned: boolean; recommended: boolean }>>([])
/** 内容形态筛选（''=全部） */
const contentTypeFilter = ref('')

async function searchPages(query: string) {
  pageLoading.value = true
  try {
    const res = await getPageList({ current: 1, size: 30, keyword: query || undefined })
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    pageOptions.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || '未命名'),
      path: String(r.path || ''),
    }))
  } catch {
    pageOptions.value = []
  } finally {
    pageLoading.value = false
  }
}

async function searchProducts(query: string) {
  productLoading.value = true
  try {
    const res = await getProductList({ current: 1, size: 30, keyword: query || undefined, status: 'on_sale' })
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    productOptions.value = (Array.isArray(records) ? records : []).map((r: any) => {
      const id = Number(r.id)
      return {
        id,
        name: String(r.name || `商品 ${id}`),
        path: `/pkg-content/product-detail/product-detail?id=${id}`,
      }
    })
  } catch {
    productOptions.value = []
  } finally {
    productLoading.value = false
  }
}

async function searchContents(query: string) {
  contentLoading.value = true
  try {
    const res = await getContentList({
      current: 1,
      size: 30,
      keyword: query || undefined,
      status: 'published',
      contentType: contentTypeFilter.value || undefined,
    } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    contentOptions.value = (Array.isArray(records) ? records : []).map((r: any) => {
      const id = Number(r.id)
      const type = String(r.contentType || r.content_type || 'article')
      return {
        id,
        title: String(r.title || `内容 ${id}`),
        // 动态走专用详情页；其余形态统一内容详情页（与 miniapp/utils/content-id.js 一致）
        path: contentDetailPath(id, type),
        kindLabel: contentKindLabel(type),
        tone: contentKindTone(type),
        pinned: Number(r.isPinned || 0) === 1,
        recommended: Number(r.isRecommended || 0) === 1,
      }
    }).filter((x: any) => !!x.path)
  } catch {
    contentOptions.value = []
  } finally {
    contentLoading.value = false
  }
}

function onContentTypeFilter() {
  void searchContents('')
}

function onTypeChange(v: string) {
  emit('update:linkType', v)
  if (v === 'none') {
    emit('update:linkUrl', '')
    return
  }
  if (v === 'page' || v === 'product' || v === 'content') {
    emit('update:linkUrl', '')
    if (v === 'page') void searchPages('')
    if (v === 'product') void searchProducts('')
    if (v === 'content') void searchContents('')
  }
}

function onUrlChange(v: string) {
  emit('update:linkUrl', v)
}

onMounted(() => {
  void searchPages('')
})
</script>

<style scoped>
.link-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
}
.link-picker__grow {
  flex: 1;
  min-width: 120px;
}
.link-picker__hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-tertiary, #999);
}
.cf-tag { padding: 1px 6px; border-radius: 8px; font-size: 11px; }
.cf-article { background: #EEF4FB; color: #3A6EA5; }
.cf-note { background: #EAF3DE; color: #3B6D11; }
.cf-moment { background: #FAEEDA; color: #854F0B; }
.cf-video { background: #F1EFE8; color: #5F5E5A; }
.cf-data { background: #E6EEFA; color: #185FA5; }
.cf-flag { padding: 1px 5px; border-radius: 8px; font-size: 11px; background: #FAEEDA; color: #854F0B; }
.cf-flag-rec { background: #FCEBEB; color: #A32D2D; }
</style>
