<template>
  <div class="content-wb cw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">{{ pageTitle }}</h1>
        <div class="sub">{{ pageSub }}</div>
      </div>
      <div class="actions">
        <button v-if="lockedType === 'file'" type="button" class="btn" @click="router.push('/content/files')">
          <MiniIcon name="file" :size="15" />打开文件库
        </button>
        <button v-if="showImport" type="button" class="btn" @click="importOpen = true">
          <MiniIcon name="link" :size="15" />从链接导入
        </button>
        <button type="button" class="btn primary" @click="goCreate">
          <MiniIcon name="plus" :size="15" />{{ createLabel }}
        </button>
      </div>
    </div>

    <div v-if="!lockedType" class="tabs-line" role="tablist">
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
        {{ s.label }}{{ s.count != null ? ` ${s.count}` : '' }}
      </button>
      <select v-model="categoryId" class="input" style="width:auto" aria-label="分类" @change="reload">
        <option :value="0">全部分类</option>
        <option v-for="c in flatCats" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="sortBy" class="input" style="width:auto" aria-label="排序" @change="reload">
        <option value="updated">更新时间</option>
        <option value="published">发布时间</option>
        <option value="reads">阅读</option>
      </select>
      <span class="sort-hint">列表排序由服务端按全库生效</span>
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
          <span class="cswitch">上下架</span>
          <span class="creads">阅读</span>
          <span class="ctime">时间</span>
          <span style="width:120px" />
        </div>
        <div v-for="it in filtered" :key="it.id" class="crow">
          <div class="cthumb" :style="thumbStyle(it)">
            <img v-if="it.coverUrl" :src="it.coverUrl" alt="" class="cthumb__img" />
            <MiniIcon v-else :name="typeIcon(it.uiType)" :size="18" />
          </div>
          <div class="cmain">
            <button type="button" class="ctitle" @click="goEdit(it)">{{ it.title }}</button>
            <div class="cmeta">
              <span>{{ typeLabel(it.uiType) }}</span>
              <span v-if="it.categoryName">· {{ it.categoryName }}</span>
              <span v-if="it.author">· {{ it.author }}</span>
            </div>
          </div>
          <div class="cstat">
            <span class="tag" :class="statusTagClass(it.status)">{{ statusLabel(it.status) }}</span>
          </div>
          <div class="cswitch">
            <el-switch
              v-if="it.status === ContentStatus.Published || it.status === ContentStatus.Unpublished"
              :model-value="it.status === ContentStatus.Published"
              :disabled="togglingId === it.id"
              size="small"
              @change="(v: boolean) => onTogglePublish(it, v)"
            />
            <span v-else class="faint">—</span>
          </div>
          <div class="creads">{{ it.status === ContentStatus.Published ? formatReads(it.reads) + ' 阅读' : '—' }}</div>
          <div class="ctime faint">
            <div>{{ primaryTimeLabel(it) }}</div>
            <div>更新 {{ it.updatedAt || '—' }}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button
              v-if="it.status === ContentStatus.Deleted"
              type="button"
              class="btn soft sm"
              @click="doRestore(it)"
            >
              恢复
            </button>
            <button
              v-else-if="it.status !== ContentStatus.Deleted"
              type="button"
              class="btn soft sm"
              @click="goEdit(it)"
            >
              编辑
            </button>
            <button
              v-if="it.status !== ContentStatus.Deleted"
              type="button"
              class="btn soft sm"
              @click="doSoftDelete(it)"
            >
              删除
            </button>
          </div>
        </div>
        <div v-if="!filtered.length" class="muted" style="padding:28px;text-align:center">没有符合条件的内容</div>
      </div>
    </template>
    <div v-else class="cgrid">
      <button v-for="it in filtered" :key="it.id" type="button" class="ccard" @click="goEdit(it)">
        <div class="ccover" :style="thumbStyle(it)">
          <img v-if="it.coverUrl" :src="it.coverUrl" alt="" class="ccover__img" />
          <MiniIcon v-else :name="typeIcon(it.uiType)" :size="22" />
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:6px;text-align:left">
          <b class="clamp">{{ it.title }}</b>
          <span class="faint" style="font-size:12px">
            {{ typeLabel(it.uiType) }}
            <template v-if="it.categoryName"> · {{ it.categoryName }}</template>
            <template v-if="it.author"> · {{ it.author }}</template>
          </span>
          <span style="display:flex;justify-content:space-between;align-items:center">
            <span class="tag" :class="statusTagClass(it.status)">{{ statusLabel(it.status) }}</span>
            <span class="faint">{{ it.status === ContentStatus.Published ? formatReads(it.reads) : '' }}</span>
          </span>
        </div>
      </button>
      <div v-if="!filtered.length" class="muted" style="padding:28px;text-align:center;grid-column:1/-1">
        没有符合条件的内容
      </div>
    </div>

    <div class="faint">共 {{ listTotal }} 条（当前页 {{ filtered.length }} 条）</div>
    <div v-if="listTotal > listPageSize" class="pager" style="margin-top:12px">
      <el-pagination
        layout="prev, pager, next, total"
        :total="listTotal"
        :page-size="listPageSize"
        :current-page="listPage"
        @current-change="onListPageChange"
      />
    </div>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  deleteContent,
  getCategoryList,
  getContentList,
  getContentStats,
  publishContent,
  restoreContent,
  unpublishContent,
} from '@/api/content'
import { importWeChatArticleUrls } from '@/api/wechat'
import { ContentStatus } from '@/types/content'
import { resolveMediaUrl } from '@/utils/media-url'
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
  author: string
  coverUrl: string
  reads: number
  publishedAt: string
  updatedAt: string
  scheduledAt: string
  unpublishedAt: string
  publishedTs: number
  updatedTs: number
  raw: Record<string, unknown>
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const items = ref<Row[]>([])
const typeCounts = ref<Record<string, number>>({ all: 0, article: 0, note: 0, video: 0, file: 0, moment: 0 })
const statusCounts = ref({
  all: 0,
  published: 0,
  unpublished: 0,
  draft: 0,
  scheduled: 0,
  deleted: 0,
})
const flatCats = ref<Array<{ id: number; name: string }>>([])
const typeFilter = ref('all')
const statusFilter = ref('all')
const categoryId = ref(0)
const keyword = ref('')
const viewMode = ref<'list' | 'card'>('list')
const sortBy = ref<'updated' | 'published' | 'reads'>('updated')
const listPage = ref(1)
const listPageSize = 50
const listTotal = ref(0)
const importOpen = ref(false)
const importUrls = ref('')
const importing = ref(false)
const togglingId = ref<number | null>(null)

const lockedType = computed<UiContentType | ''>(() => {
  const meta = String(route.meta.lockedType || '')
  if (meta === 'article' || meta === 'note' || meta === 'file' || meta === 'video' || meta === 'moment') {
    return meta
  }
  if (route.path.includes('/articles')) return 'article'
  if (route.path.includes('/notes')) return 'note'
  if (route.path.includes('/materials')) return 'file'
  if (route.path.includes('/moments')) return 'moment'
  if (route.path.includes('/videos')) return 'video'
  return ''
})

const pageTitle = computed(() => {
  if (lockedType.value === 'article') return '长文'
  if (lockedType.value === 'note') return '笔记'
  if (lockedType.value === 'file') return '资料'
  if (lockedType.value === 'moment') return '动态'
  if (lockedType.value === 'video') return '视频'
  return '内容库'
})

const pageSub = computed(() => {
  if (lockedType.value === 'article') return '公众号风格长文；状态含草稿 / 定时 / 已上架 / 已下架 / 回收站'
  if (lockedType.value === 'note') return '短图文笔记，适合信息流与话题'
  if (lockedType.value === 'file') return '以附件/资料包为主的内容；也可从文件库管理原始文件'
  if (lockedType.value === 'moment') return '星球动态，图文短更与轻量附件'
  if (lockedType.value === 'video') return '视频号 / 外链视频，需封面与播放地址'
  return '请从侧栏进入对应类型入口发布'
})

const createLabel = computed(() => {
  if (lockedType.value === 'article') return '写长文'
  if (lockedType.value === 'note') return '写笔记'
  if (lockedType.value === 'file') return '上传资料'
  if (lockedType.value === 'moment') return '发动态'
  if (lockedType.value === 'video') return '发视频'
  return '写内容'
})

const showImport = computed(() => lockedType.value === 'article')

const typeTabs = computed(() => [
  { key: 'all', label: '全部', count: typeCounts.value.all },
  { key: 'article', label: '长文', count: typeCounts.value.article },
  { key: 'note', label: '笔记', count: typeCounts.value.note },
  { key: 'file', label: '资料', count: typeCounts.value.file },
  { key: 'moment', label: '动态', count: typeCounts.value.moment },
  { key: 'video', label: '视频', count: typeCounts.value.video },
])

const statusChips = computed(() => [
  { key: 'all', label: '全部', count: statusCounts.value.all },
  { key: ContentStatus.Published, label: '已上架', count: statusCounts.value.published },
  { key: ContentStatus.Unpublished, label: '已下架', count: statusCounts.value.unpublished },
  { key: ContentStatus.Draft, label: '草稿', count: statusCounts.value.draft },
  { key: ContentStatus.Scheduled, label: '定时', count: statusCounts.value.scheduled },
  { key: ContentStatus.Deleted, label: '回收站', count: statusCounts.value.deleted },
])

const filtered = computed(() => {
  let list = items.value
  const lock = lockedType.value
  const tf = lock || typeFilter.value
  if (tf === 'file') {
    list = list.filter((x) => x.uiType === 'file')
  } else if (tf !== 'all') {
    list = list.filter((x) => x.uiType === tf)
  }
  if (statusFilter.value !== 'all') list = list.filter((x) => x.status === statusFilter.value)
  if (categoryId.value) list = list.filter((x) => x.categoryId === categoryId.value)
  const q = keyword.value.trim()
  if (q) list = list.filter((x) => x.title.includes(q))
  return list
})

function editTypeQuery(it?: Row): string {
  if (lockedType.value) return lockedType.value
  if (it?.uiType) return it.uiType
  return 'article'
}

function goCreate() {
  const type = lockedType.value || 'article'
  router.push({ path: '/content/write', query: { type } })
}

function goEdit(it: Row) {
  if (it.status === ContentStatus.Deleted) return
  router.push({
    path: '/content/write',
    query: { id: String(it.id), type: editTypeQuery(it) },
  })
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

function pickTimeRaw(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = raw[key]
    if (v != null && String(v).trim()) return v
  }
  return ''
}

function toTs(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw).replace(' ', 'T'))
  return Number.isFinite(t) ? t : 0
}

function fmtTime(raw: unknown): string {
  if (!raw) return ''
  return String(raw).replace('T', ' ').slice(0, 16)
}

function pickCoverUrl(raw: Record<string, unknown>): string {
  const cover = String(raw.coverImage || raw.cover_image || '').trim()
  if (cover) return resolveMediaUrl(cover)
  const images = raw.images
  if (Array.isArray(images) && images.length) {
    const first = String(images[0] || '').trim()
    if (first) return resolveMediaUrl(first)
  }
  return ''
}

function mapRow(raw: Record<string, unknown>): Row {
  const uiType = mapFormatToUi(raw)
  const first = pickTimeRaw(raw, ['firstPublishedAt', 'first_published_at'])
  const published = pickTimeRaw(raw, ['publishedAt', 'published_at'])
  const scheduled = pickTimeRaw(raw, ['scheduledAt', 'scheduled_at'])
  const unpublished = pickTimeRaw(raw, ['unpublishedAt', 'unpublished_at'])
  const updated = pickTimeRaw(raw, [
    'updateTime',
    'update_time',
    'updatedAt',
    'updated_at',
    'createTime',
    'create_time',
    'createdAt',
    'created_at',
  ])
  const publishedAt = fmtTime(first || published)
  const updatedAt = fmtTime(updated)
  return {
    id: Number(raw.id),
    title: String(raw.title || '未命名'),
    status: String(raw.status || ContentStatus.Draft),
    uiType,
    categoryName: String(raw.category_name || raw.categoryName || ''),
    categoryId: Number(raw.category_id ?? raw.categoryId ?? 0),
    author: String(raw.author || ''),
    coverUrl: pickCoverUrl(raw),
    reads: readCountOf(raw),
    publishedAt,
    updatedAt,
    scheduledAt: fmtTime(scheduled),
    unpublishedAt: fmtTime(unpublished),
    publishedTs: toTs(first || published || scheduled),
    updatedTs: toTs(updated),
    raw,
  }
}

function primaryTimeLabel(it: Row): string {
  if (it.status === ContentStatus.Scheduled) {
    return it.scheduledAt ? `将于 ${it.scheduledAt} 发布` : '待定时'
  }
  if (it.status === ContentStatus.Unpublished) {
    return it.unpublishedAt ? `下架 ${it.unpublishedAt}` : '已下架'
  }
  if (it.status === ContentStatus.Published && it.publishedAt) {
    return `上架 ${it.publishedAt}`
  }
  if (it.publishedAt) return `发布 ${it.publishedAt}`
  return '—'
}

function thumbStyle(it: Row): Record<string, string> {
  if (it.coverUrl) return { background: '#eef1f6' }
  return { background: toneForId(it.id) }
}

async function loadStats() {
  try {
    const params: { contentType?: string } = {}
    const lock = lockedType.value
    if (lock) params.contentType = lock
    else if (typeFilter.value !== 'all') params.contentType = typeFilter.value
    const res = await getContentStats(params)
    const data = ((res as any)?.data ?? res) as Record<string, number>
    statusCounts.value = {
      all: Number(data.all ?? 0),
      published: Number(data.published ?? 0),
      unpublished: Number(data.unpublished ?? 0),
      draft: Number(data.draft ?? 0),
      scheduled: Number(data.scheduled ?? 0),
      deleted: Number(data.deleted ?? 0),
    }
  } catch {
    /* stats 失败不挡列表 */
  }
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { current: listPage.value, size: listPageSize, sortBy: sortBy.value }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    if (categoryId.value) params.categoryId = categoryId.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()

    const lock = lockedType.value
    if (lock === 'article' || lock === 'note' || lock === 'video' || lock === 'moment' || lock === 'file') {
      params.contentType = lock
    } else if (!lock && typeFilter.value !== 'all') {
      params.contentType = typeFilter.value
    }

    const [listRes, catRes] = await Promise.all([
      getContentList(params as any),
      getCategoryList(),
      loadStats(),
    ])
    const { records, total } = unwrapList(listRes)
    listTotal.value = total
    items.value = (records as Array<Record<string, unknown>>).map(mapRow)

    const counts = { all: items.value.length, article: 0, note: 0, video: 0, file: 0, moment: 0 }
    for (const it of items.value) {
      if (it.uiType === 'article') counts.article += 1
      else if (it.uiType === 'note') counts.note += 1
      else if (it.uiType === 'video') counts.video += 1
      else if (it.uiType === 'file') counts.file += 1
      else if (it.uiType === 'moment') counts.moment += 1
    }
    typeCounts.value = counts

    const cats = (catRes as any)?.data ?? catRes
    flatCats.value = flattenCats(Array.isArray(cats) ? cats : [])
  } finally {
    loading.value = false
  }
}

function reload() {
  listPage.value = 1
  void load()
}

function onListPageChange(p: number) {
  listPage.value = p
  void load()
}

async function onTogglePublish(it: Row, nextOn: boolean) {
  if (togglingId.value) return
  togglingId.value = it.id
  try {
    if (nextOn) {
      await publishContent(it.id)
      ElMessage.success('已上架')
    } else {
      await ElMessageBox.confirm('确认下架该内容？下架后小程序端不可见，可再上架。', '下架确认', {
        type: 'warning',
        confirmButtonText: '下架',
        cancelButtonText: '取消',
      })
      await unpublishContent(it.id)
      ElMessage.success('已下架')
    }
    await load()
  } catch (e: any) {
    if (e !== 'cancel' && e?.toString?.() !== 'cancel') {
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    togglingId.value = null
  }
}

async function doSoftDelete(it: Row) {
  try {
    await ElMessageBox.confirm('移入回收站？可稍后恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '移入回收站',
    })
    await deleteContent(it.id)
    ElMessage.success('已移入回收站')
    await load()
  } catch (e: any) {
    if (e !== 'cancel' && e?.toString?.() !== 'cancel') {
      ElMessage.error(e?.message || '删除失败')
    }
  }
}

async function doRestore(it: Row) {
  try {
    await restoreContent(it.id)
    ElMessage.success('已恢复为草稿')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '恢复失败')
  }
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
    if (v === '1' && showImport.value) importOpen.value = true
  },
  { immediate: true },
)

watch(
  () => [route.path, route.meta.lockedType],
  () => {
    void load()
  },
)

onMounted(() => {
  if (route.query.status) statusFilter.value = String(route.query.status)
  if (!lockedType.value && route.query.type) typeFilter.value = String(route.query.type)
  void load()
})
</script>

<style scoped>
.sort-hint {
  font-size: 12px;
  color: #94a3b8;
  align-self: center;
}
.cswitch {
  width: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ctime {
  width: 148px;
  font-size: 12px;
  line-height: 1.35;
}
.cthumb {
  overflow: hidden;
}
.cthumb__img,
.ccover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ccover {
  overflow: hidden;
}
</style>
