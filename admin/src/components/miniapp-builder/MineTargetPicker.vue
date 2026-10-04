<template>
  <div class="mine-target">
    <el-select
      :model-value="kind"
      size="small"
      class="mine-target__kind"
      @update:model-value="onKindChange"
    >
      <el-option label="功能入口" value="seed" />
      <el-option label="装修页" value="page" />
      <el-option label="商品" value="product" />
      <el-option label="内容" value="content" />
      <el-option label="自定义" value="custom" />
    </el-select>

    <el-select
      v-if="kind === 'seed'"
      :model-value="seedKey"
      size="small"
      filterable
      clearable
      class="mine-target__grow"
      placeholder="选择小程序功能入口"
      @update:model-value="onSeedChange"
    >
      <el-option-group
        v-for="g in groupedSeeds"
        :key="g.name"
        :label="g.name"
      >
        <el-option
          v-for="s in g.items"
          :key="s.key"
          :label="s.title"
          :value="s.key"
        >
          <span>{{ s.title }}</span>
          <span class="mine-target__hint">{{ shortUrl(s.url) }}</span>
        </el-option>
      </el-option-group>
    </el-select>

    <el-select
      v-else-if="kind === 'page'"
      :model-value="modelValue"
      size="small"
      filterable
      remote
      clearable
      class="mine-target__grow"
      placeholder="搜索装修页面名称或路径"
      :remote-method="searchPages"
      :loading="loading"
      @update:model-value="onUrlChange"
    >
      <el-option
        v-for="p in pageOptions"
        :key="p.id"
        :label="p.name"
        :value="p.path"
      >
        <span>{{ p.name }}</span>
        <span class="mine-target__hint">{{ shortUrl(p.path) }}</span>
      </el-option>
    </el-select>

    <el-select
      v-else-if="kind === 'product'"
      :model-value="modelValue"
      size="small"
      filterable
      remote
      clearable
      class="mine-target__grow"
      placeholder="搜索商品名称"
      :remote-method="searchProducts"
      :loading="loading"
      @update:model-value="onUrlChange"
    >
      <el-option
        v-for="p in productOptions"
        :key="p.id"
        :label="p.name"
        :value="p.path"
      />
    </el-select>

    <template v-else-if="kind === 'content'">
      <el-select
        v-model="contentTypeFilter"
        size="small"
        class="mine-target__type"
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
        :model-value="modelValue"
        size="small"
        filterable
        remote
        clearable
        class="mine-target__grow"
        placeholder="搜索文章/笔记/动态标题"
        :remote-method="searchContents"
        :loading="loading"
        @update:model-value="onUrlChange"
      >
        <el-option
          v-for="c in contentOptions"
          :key="c.id"
          :label="c.name"
          :value="c.path"
        >
          <span>{{ c.name }}</span>
          <span class="mine-target__hint">
            <span class="cf-tag" :class="c.tone">{{ c.kindLabel }}</span>
            <span v-if="c.pinned" class="cf-flag">置顶</span>
            <span v-if="c.recommended" class="cf-flag cf-flag-rec">推荐</span>
          </span>
        </el-option>
      </el-select>
    </template>

    <el-input
      v-else
      :model-value="modelValue"
      size="small"
      class="mine-target__grow"
      placeholder="页面路径，如 /pkg-user/coupon-list/coupon-list"
      @update:model-value="onUrlChange"
    />

    <el-tooltip content="点击前要求登录" placement="top">
      <el-checkbox
        :model-value="needLogin === true"
        size="small"
        class="mine-target__login"
        @update:model-value="onNeedLoginChange"
      >登录</el-checkbox>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPageList } from '@/api/page'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { contentDetailPath, contentKindLabel, contentKindTone, isContentPath } from '@/utils/content-link'
import { MINE_MENU_LIBRARY } from './mineTemplates'

type TargetKind = 'seed' | 'page' | 'product' | 'content' | 'custom'

const props = defineProps<{
  modelValue?: string
  needLogin?: boolean
  /** 当前菜单标题，用于在多个入口共用同一路径时精确回显 */
  menuTitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:needLogin': [value: boolean]
}>()

const loading = ref(false)
const pageOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const productOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const contentOptions = ref<Array<{ id: number; name: string; path: string; kindLabel: string; tone: string; pinned: boolean; recommended: boolean }>>([])
/** 内容形态筛选（''=全部） */
const contentTypeFilter = ref('')

const SEED_URLS = new Set(MINE_MENU_LIBRARY.map((s) => s.url))

/**
 * 反向回显：多个入口可能共用同一路径（如「我的订单」与「发票管理」都指向订单列表），
 * 因此优先按标题精确匹配，匹配不到再按路径兜底。
 */
const seedKey = computed(() => {
  const url = String(props.modelValue || '')
  const title = String(props.menuTitle || '').trim()
  if (!url) return ''
  if (title) {
    const byTitle = MINE_MENU_LIBRARY.find((s) => s.url === url && s.title === title)
    if (byTitle) return byTitle.key
  }
  const byUrl = MINE_MENU_LIBRARY.find((s) => s.url === url)
  return byUrl ? byUrl.key : ''
})

/**
 * 用户显式选择的归类。
 * kind 需要靠 url 反推，但 onKindChange 会先把 url 清空，若不留痕就会立刻弹回 seed，
 * 导致「内容 / 商品 / 页面」分支刚点开就消失、无法在其中挑选目标。
 */
const kindOverride = ref<TargetKind | ''>('')

/** 由现有 url 反推选择器归类，避免打开配置就跳到「自定义」而丢失语义 */
const kind = computed<TargetKind>(() => {
  const url = String(props.modelValue || '')
  if (url) {
    if (SEED_URLS.has(url)) return 'seed'
    if (url.indexOf('/pkg-content/product-detail/product-detail') === 0) return 'product'
    // 内容类：content-detail / moment-detail（含历史主包别名路径）
    if (isContentPath(url)) return 'content'
    if (url.indexOf('/') === 0) return 'page'
    return 'custom'
  }
  return kindOverride.value || 'seed'
})

const groupedSeeds = computed(() => {
  const map = new Map<string, typeof MINE_MENU_LIBRARY>()
  for (const s of MINE_MENU_LIBRARY) {
    const list = map.get(s.group) || []
    list.push(s)
    map.set(s.group, list)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

function shortUrl(url: string) {
  const s = String(url || '')
  const parts = s.split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : s
}

async function searchPages(query: string) {
  loading.value = true
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
    loading.value = false
  }
}

async function searchProducts(query: string) {
  loading.value = true
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
    loading.value = false
  }
}

async function searchContents(query: string) {
  loading.value = true
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
        name: String(r.title || `内容 ${id}`),
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
    loading.value = false
  }
}

function onContentTypeFilter() {
  void searchContents('')
}

function onKindChange(v: string) {
  // 先记住用户选择，再清空 url；否则 kind 会被反推回 seed
  kindOverride.value = v as TargetKind
  emit('update:modelValue', '')
  if (v === 'seed') return
  if (v === 'page') void searchPages('')
  if (v === 'product') void searchProducts('')
  if (v === 'content') void searchContents('')
}

function onSeedChange(key: string) {
  const seed = MINE_MENU_LIBRARY.find((s) => s.key === key)
  if (!seed) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', seed.url)
  emit('update:needLogin', seed.needLogin === true)
}

function onUrlChange(v: string) {
  emit('update:modelValue', v || '')
}

function onNeedLoginChange(v: any) {
  emit('update:needLogin', v === true)
}

onMounted(() => {
  if (kind.value === 'page') void searchPages('')
})
</script>

<style scoped>
.mine-target {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.mine-target__kind {
  width: 92px;
  flex-shrink: 0;
}
.mine-target__grow {
  flex: 1;
  min-width: 0;
}
.mine-target__login {
  flex-shrink: 0;
  margin-right: 0;
  font-size: 12px;
}
.mine-target__hint {
  margin-left: 6px;
  color: #9aa3b2;
  font-size: 11px;
}
.mine-target__type {
  width: 100px;
  flex-shrink: 0;
}
.cf-tag { padding: 1px 6px; border-radius: 8px; font-size: 11px; }
.cf-article { background: #EEF4FB; color: #3A6EA5; }
.cf-note { background: #EAF3DE; color: #3B6D11; }
.cf-moment { background: #FAEEDA; color: #854F0B; }
.cf-video { background: #F1EFE8; color: #5F5E5A; }
.cf-data { background: #E6EEFA; color: #185FA5; }
.cf-flag { margin-left: 4px; padding: 1px 5px; border-radius: 8px; font-size: 11px; background: #FAEEDA; color: #854F0B; }
.cf-flag-rec { background: #FCEBEB; color: #A32D2D; }
</style>
