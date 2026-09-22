<template>
  <div class="content-wb cw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">内容库</h1>
        <div class="sub">长文、笔记、视频、资料都在这里，状态统一为 草稿 / 已发布 / 已下架</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="importOpen = true">
          <MiniIcon name="link" :size="15" />从链接导入
        </button>
        <button type="button" class="btn primary" @click="router.push('/content/write')">
          <MiniIcon name="plus" :size="15" />写内容
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button
        v-for="t in typeTabs"
        :key="t.key"
        type="button"
        :class="{ on: typeFilter === t.key }"
        @click="typeFilter = t.key; reload()"
      >
        {{ t.label }} {{ t.count }}
      </button>
    </div>

    <div class="filters">
      <label class="search">
        <MiniIcon name="search" :size="15" />
        <input v-model="keyword" type="search" placeholder="搜索标题或标签" aria-label="搜索内容" @keyup.enter="reload" />
      </label>
      <button
        v-for="s in statusChips"
        :key="s.key"
        type="button"
        class="chip"
        :class="{ on: statusFilter === s.key }"
        @click="statusFilter = s.key; reload()"
      >
        {{ s.label }}
      </button>
      <select v-model="categoryId" class="input" style="width:auto" aria-label="分类" @change="reload">
        <option :value="0">全部分类</option>
        <option v-for="c in flatCats" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div class="seg" style="margin-left:auto">
        <button type="button" :class="{ on: viewMode === 'list' }" aria-label="列表视图" @click="viewMode = 'list'">
          <MiniIcon name="list" :size="14" />
        </button>
        <button type="button" :class="{ on: viewMode === 'card' }" aria-label="卡片视图" @click="viewMode = 'card'">
          <MiniIcon name="grid" :size="14" />
        </button>
      </div>
    </div>

    <template v-if="viewMode === 'list'">
      <div class="group">
        <div class="chead">
          <span style="width:16px" />
          <span style="flex:1">标题</span>
          <span class="cstat">状态</span>
          <span class="creads">阅读</span>
          <span class="ctime">更新</span>
          <span style="width:84px" />
        </div>
        <div v-for="it in filtered" :key="it.id" class="crow">
          <div class="cthumb" :style="{ background: toneForId(it.id) }">
            <MiniIcon :name="typeIcon(it.uiType)" :size="18" />
          </div>
          <div class="cmain">
            <button type="button" class="ctitle" @click="goEdit(it.id)">{{ it.title }}</button>
            <div class="cmeta">
              <span>{{ typeLabel(it.uiType) }}</span>
              <span v-if="it.categoryName">{{ it.categoryName }}</span>
            </div>
          </div>
          <div class="cstat">
            <span class="tag" :class="statusTagClass(it.status)">{{ statusLabel(it.status) }}</span>
          </div>
          <div class="creads">{{ it.status === 'published' ? formatReads(it.reads) + ' 阅读' : '—' }}</div>
          <div class="ctime faint">{{ it.updatedAt }}</div>
          <div style="display:flex;gap:6px">
            <button type="button" class="btn soft sm" @click="goEdit(it.id)">编辑</button>
          </div>
        </div>
        <div v-if="!filtered.length" class="muted" style="padding:28px;text-align:center">没有符合条件的内容</div>
      </div>
    </template>
    <div v-else class="cgrid">
      <button v-for="it in filtered" :key="it.id" type="button" class="ccard" @click="goEdit(it.id)">
        <div class="ccover" :style="{ background: toneForId(it.id) }">
          <MiniIcon :name="typeIcon(it.uiType)" :size="22" />
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:6px;text-align:left">
          <b class="clamp">{{ it.title }}</b>
          <span style="display:flex;justify-content:space-between;align-items:center">
            <span class="tag" :class="statusTagClass(it.status)">{{ statusLabel(it.status) }}</span>
            <span class="faint">{{ it.status === 'published' ? formatReads(it.reads) : '' }}</span>
          </span>
        </div>
      </button>
      <div v-if="!filtered.length" class="muted" style="padding:28px;text-align:center;grid-column:1/-1">
        没有符合条件的内容
      </div>
    </div>

    <div class="faint">共 {{ filtered.length }} 条</div>

    <div v-if="importOpen" class="scrim" @click.self="importOpen = false">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="h2">从链接导入</h2>
        <div class="muted" style="font-size:13px">支持公众号文章链接。导入后先存为草稿。</div>
        <textarea v-model="importUrls" class="input" rows="4" placeholder="每行一个链接，或用逗号分隔" aria-label="链接" />
        <div class="foot">
          <button type="button" class="btn" @click="importOpen = false">取消</button>
          <button type="button" class="btn primary" :disabled="importing" @click="doImport">
            {{ importing ? '导入中…' : '导入为草稿' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getCategoryList, getContentList } from '@/api/content'
import { importWeChatArticleUrls } from '@/api/wechat'
import { ContentStatus } from '@/types/content'
import {
  formatReads,
  mapFormatToUi,
  readCountOf,
  statusLabel,
  statusTagClass,
  toneForId,
  typeIcon,
  typeLabel,
  unwrapList,
  type UiContentType,
} from './utils'

interface Row {
  id: number
  title: string
  status: string
  uiType: UiContentType
  categoryName: string
  categoryId: number
  reads: number
  updatedAt: string
  raw: Record<string, unknown>
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const items = ref<Row[]>([])
const typeCounts = ref<Record<string, number>>({ all: 0, article: 0, note: 0, video: 0 })
const flatCats = ref<Array<{ id: number; name: string }>>([])
const typeFilter = ref('all')
const statusFilter = ref('all')
const categoryId = ref(0)
const keyword = ref('')
const viewMode = ref<'list' | 'card'>('list')
const importOpen = ref(false)
const importUrls = ref('')
const importing = ref(false)

const typeTabs = computed(() => [
  { key: 'all', label: '全部', count: typeCounts.value.all },
  { key: 'article', label: '长文', count: typeCounts.value.article },
  { key: 'note', label: '笔记', count: typeCounts.value.note },
  { key: 'video', label: '视频', count: typeCounts.value.video },
  { key: 'file', label: '资料', count: 0 },
])

const statusChips = [
  { key: 'all', label: '全部' },
  { key: ContentStatus.Published, label: '已发布' },
  { key: ContentStatus.Draft, label: '草稿' },
  { key: ContentStatus.Unpublished, label: '已下架' },
]

const filtered = computed(() => {
  let list = items.value
  if (typeFilter.value === 'file') return []
  if (typeFilter.value !== 'all') list = list.filter((x) => x.uiType === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter((x) => x.status === statusFilter.value)
  if (categoryId.value) list = list.filter((x) => x.categoryId === categoryId.value)
  const q = keyword.value.trim()
  if (q) list = list.filter((x) => x.title.includes(q))
  return list
})

function goEdit(id: number) {
  router.push({ path: '/content/write', query: { id: String(id) } })
}

function flattenCats(nodes: any[]): Array<{ id: number; name: string }> {
  const out: Array<{ id: number; name: string }> = []
  const walk = (list: any[]) => {
    for (const n of list || []) {
      out.push({ id: Number(n.id), name: String(n.name || '') })
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

function mapRow(raw: Record<string, unknown>): Row {
  const uiType = mapFormatToUi(raw)
  return {
    id: Number(raw.id),
    title: String(raw.title || '未命名'),
    status: String(raw.status || ContentStatus.Draft),
    uiType,
    categoryName: String(raw.category_name || raw.categoryName || ''),
    categoryId: Number(raw.category_id ?? raw.categoryId ?? 0),
    reads: readCountOf(raw),
    updatedAt: String(raw.updated_at || raw.updatedAt || raw.created_at || '').replace('T', ' ').slice(0, 16),
    raw,
  }
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { current: 1, size: 200 }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    if (categoryId.value) params.category_id = categoryId.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (typeFilter.value !== 'all' && typeFilter.value !== 'file') params.contentType = typeFilter.value

    const [listRes, catRes] = await Promise.all([getContentList(params as any), getCategoryList()])
    const { records } = unwrapList(listRes)
    items.value = (records as Array<Record<string, unknown>>).map(mapRow)

    const counts = { all: items.value.length, article: 0, note: 0, video: 0 }
    for (const it of items.value) {
      if (it.uiType === 'article') counts.article += 1
      else if (it.uiType === 'note') counts.note += 1
      else if (it.uiType === 'video') counts.video += 1
    }
    typeCounts.value = counts

    const cats = (catRes as any)?.data ?? catRes
    flatCats.value = flattenCats(Array.isArray(cats) ? cats : [])
  } finally {
    loading.value = false
  }
}

function reload() {
  if (typeFilter.value === 'file') {
    router.push('/content/files')
    return
  }
  void load()
}

async function doImport() {
  const urls = importUrls.value
    .split(/[\n,，\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
  if (!urls.length) {
    ElMessage.warning('请粘贴有效链接')
    return
  }
  importing.value = true
  try {
    await importWeChatArticleUrls({ urls, publish: false })
    ElMessage.success('已提交导入，稍后在草稿中查看')
    importOpen.value = false
    importUrls.value = ''
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

watch(
  () => route.query.import,
  (v) => {
    if (v === '1') importOpen.value = true
  },
  { immediate: true },
)

onMounted(() => {
  if (route.query.status) statusFilter.value = String(route.query.status)
  if (route.query.type) typeFilter.value = String(route.query.type)
  void load()
})
</script>
