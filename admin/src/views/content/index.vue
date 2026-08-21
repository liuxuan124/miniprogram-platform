<template>
  <div class="content-page">
    <div class="page-header">
      <div>
        <div class="page-title">内容管理</div>
        <div class="page-desc">文章、图文、视频，支持分类、推荐、上下架。</div>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="searchForm.keyword"
        class="toolbar-input"
        placeholder="搜索标题"
        clearable
        @keyup.enter="handleSearch"
      />
      <el-select v-model="searchForm.type" class="toolbar-select" placeholder="类型：全部" clearable>
        <el-option label="动态" value="moment" />
        <el-option label="文章" value="article" />
        <el-option label="图文" value="rich" />
        <el-option label="视频" value="video" />
      </el-select>
      <el-select v-model="searchForm.categoryId" class="toolbar-select" placeholder="分类：全部" clearable>
        <el-option
          v-for="item in flatCategoryOptions"
          :key="item.id"
          :label="item.label"
          :value="item.id"
        />
      </el-select>
      <el-select v-model="searchForm.source" class="toolbar-select" placeholder="来源：全部" clearable>
        <el-option label="小红书" value="小红书" />
        <el-option label="微信公众号" value="微信公众号" />
        <el-option label="原创" value="原创" />
      </el-select>
      <el-button @click="handleSearch">搜索</el-button>
      <div class="toolbar-spacer" />
      <el-button @click="categoryModalVisible = true">分类</el-button>
      <el-button @click="syncDialogVisible = true">同步导入</el-button>
      <el-button :disabled="!selectedRows.length" :loading="batchLoading" @click="handleBatchPublish">
        批量上架{{ selectedRows.length ? ` (${selectedRows.length})` : '' }}
      </el-button>
      <el-button :disabled="!selectedRows.length" :loading="batchLoading" @click="handleBatchUnpublish">
        批量下架{{ selectedRows.length ? ` (${selectedRows.length})` : '' }}
      </el-button>
      <el-button type="primary" @click="handleCreate">+ 新建</el-button>
    </div>

    <div class="table-panel">
      <ListStateWrap
        :loading="loading"
        :empty="!loading && filteredRows.length === 0"
        empty-text="暂无内容数据"
        empty-description="可以新建文章、图文或视频内容"
        @retry="fetchList"
      >
        <template #empty-action>
          <el-button type="primary" @click="handleCreate">+ 新建</el-button>
        </template>

      <el-table
        ref="tableRef"
        :data="filteredRows"
        stripe
        row-key="id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" reserve-selection />
        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="title-cell">
              <span class="title-text">{{ row.title }}</span>
              <el-tag v-if="isRecommended(row)" size="small" effect="plain" type="primary">推荐</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :type="row.source === '小红书' ? 'danger' : row.source === '微信公众号' ? 'success' : 'info'"
            >
              {{ row.source || '未标注' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.typeLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="阅读" width="100" align="center">
          <template #default="{ row }">{{ row.viewCount ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handlePreview(row)">预览</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link size="small" @click="handleTogglePublish(row)">
              {{ row.status === 'published' ? '下架' : '上架' }}
            </el-button>
            <el-button link size="small" @click="toggleRecommend(row)">
              {{ isRecommended(row) ? '取消推荐' : '设为推荐' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
      </ListStateWrap>
    </div>

    <el-dialog v-model="categoryModalVisible" title="内容分类管理" width="760px" destroy-on-close>
      <div class="category-tip">
        点「发布」后，该分类会出现在「跨境资讯」顶栏，并同步到发文时的「内容分类」下拉。未发布的分类仅在本处管理。
      </div>
      <div class="category-list" v-loading="categoryLoading">
        <div v-for="item in categoryTree" :key="item.id" class="category-item">
          <div class="category-row">
            <span class="category-name">
              ⠿ {{ item.name }}
              <el-tag size="small" :type="isCategoryPublished(item) ? 'success' : 'info'" class="cat-pub-tag">
                {{ isCategoryPublished(item) ? '已发布到顶栏' : '未发布' }}
              </el-tag>
            </span>
            <div class="category-actions">
              <el-button
                size="small"
                :type="isCategoryPublished(item) ? 'warning' : 'primary'"
                @click="toggleCategoryPublish(item)"
              >
                {{ isCategoryPublished(item) ? '取消发布' : '发布' }}
              </el-button>
              <el-button size="small" @click="openCategoryDialog('create', item)">+ 子分类</el-button>
              <el-button size="small" @click="openCategoryDialog('edit', item)">重命名</el-button>
              <el-button size="small" type="danger" plain @click="removeCategory(item)">删除</el-button>
            </div>
          </div>
          <div v-if="item.children.length" class="sub-list">
            <div v-for="sub in item.children" :key="sub.id" class="sub-row">
              <span>
                ⠿ {{ sub.name }}
                <el-tag size="small" :type="isCategoryPublished(sub) ? 'success' : 'info'" class="cat-pub-tag">
                  {{ isCategoryPublished(sub) ? '已发布' : '未发布' }}
                </el-tag>
              </span>
              <div class="category-actions">
                <el-button
                  size="small"
                  :type="isCategoryPublished(sub) ? 'warning' : 'primary'"
                  @click="toggleCategoryPublish(sub)"
                >
                  {{ isCategoryPublished(sub) ? '取消发布' : '发布' }}
                </el-button>
                <el-button size="small" @click="openCategoryDialog('edit', sub)">编辑</el-button>
                <el-button size="small" type="danger" plain @click="removeCategory(sub)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-button type="primary" class="add-root-btn" @click="openCategoryDialog('create', null)">+ 新增一级分类</el-button>
    </el-dialog>

    <el-dialog v-model="syncDialogVisible" title="同步导入小红书 / 公众号内容" width="720px" destroy-on-close>
      <el-tabs v-model="syncTab">
        <el-tab-pane label="公众号全量导入" name="wechat">
          <el-alert
            type="success"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
            title="从已认证企业服务号拉取全部「已发布」图文，一次性导入内容库。需在「系统设置 → 微信配置」填写公众号 AppID/AppSecret（可与小程序不同）。"
          />
          <el-form label-width="96px">
            <el-form-item label="默认分类">
              <el-select v-model="wechatSyncForm.categoryId" placeholder="不指定分类" clearable style="width: 100%">
                <el-option
                  v-for="item in flatCategoryOptions"
                  :key="item.id"
                  :label="item.label"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="导入状态">
              <el-radio-group v-model="wechatSyncForm.publish">
                <el-radio-button :value="true">直接上架（已发布）</el-radio-button>
                <el-radio-button :value="false">存为草稿</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <div v-if="wechatSyncResult" class="sync-result-box">
            <div>{{ wechatSyncResult.message }}</div>
            <div v-if="wechatSyncResult.failures?.length" class="sync-failures">
              <div v-for="(item, idx) in wechatSyncResult.failures" :key="idx">
                {{ item.title }}：{{ item.reason }}
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="JSON 手动导入" name="json">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        title="小红书暂无稳定官方拉取接口，建议粘贴导出 JSON；公众号也可先用 JSON 手动导入。"
      />
      <el-form label-width="88px">
        <el-form-item label="默认来源">
          <el-radio-group v-model="syncForm.defaultSource">
            <el-radio-button value="小红书">小红书</el-radio-button>
            <el-radio-button value="微信公众号">微信公众号</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="导入内容">
          <el-input
            v-model="syncForm.jsonText"
            type="textarea"
            :rows="12"
            placeholder='粘贴 JSON 数组，例如：
[
  {
    "title": "文章标题",
    "summary": "摘要",
    "source": "小红书",
    "viewCount": 1000,
    "likeCount": 20,
    "publish": true
  }
]'
          />
        </el-form-item>
      </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <template v-if="syncTab === 'wechat'">
          <el-button @click="syncDialogVisible = false">关闭</el-button>
          <el-button type="primary" :loading="wechatSyncSubmitting" @click="handleWeChatSyncImport">
            开始全量导入
          </el-button>
        </template>
        <template v-else>
        <el-button @click="fillSyncSample">填入示例</el-button>
        <el-button @click="syncDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="syncSubmitting" @click="handleSyncImport">开始导入</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryDialogMode === 'create' ? '新增分类' : '重命名分类'"
      width="420px"
      destroy-on-close
    >
      <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="78px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" maxlength="30" show-word-limit placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-select v-model="categoryForm.parentId" placeholder="无上级分类" clearable style="width: 100%">
            <el-option :value="null" label="无上级分类（一级）" />
            <el-option v-for="item in allFlatCategoryOptions" :key="item.id" :value="item.id" :label="item.label" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitting" @click="submitCategory">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="440px"
      append-to-body
      destroy-on-close
      align-center
      class="content-preview-dialog"
    >
      <div v-loading="previewLoading" class="preview-dialog-body">
        <ContentPreviewPanel v-if="previewModel" :model="previewModel" />
      </div>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, TableInstance } from 'element-plus'
import ListStateWrap from '@/components/ListStateWrap.vue'
import ContentPreviewPanel from '@/components/content/ContentPreviewPanel.vue'
import {
  getContentList,
  getContentDetail,
  publishContent,
  unpublishContent,
  deleteContent,
  updateContent,
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  createContent,
} from '@/api/content'
import { syncWeChatPublishedContents, type WeChatContentSyncResult } from '@/api/wechat'
import { buildPreviewFromDetail, type ContentPreviewModel } from '@/utils/content-preview'

type RawRecord = Record<string, any>
type ContentStatus = 'draft' | 'published' | 'unpublished' | 'archived'

interface ContentRow {
  id: number
  title: string
  status: ContentStatus
  categoryId?: number
  categoryName: string
  source: string
  typeLabel: '文章' | '图文' | '视频' | '动态'
  typeValue: 'article' | 'rich' | 'video' | 'moment'
  viewCount: number | null
  recommended: boolean
  tags: string[]
  sortOrder: number
}

interface CategoryNode {
  id: number
  name: string
  parentId: number | null
  status: string
  sort: number
  children: CategoryNode[]
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const batchLoading = ref(false)
const tableRef = ref<TableInstance>()
const selectedRows = ref<ContentRow[]>([])
const categoryLoading = ref(false)
const rows = ref<ContentRow[]>([])
const categoryTree = ref<CategoryNode[]>([])
const RECOMMEND_TAG = '推荐'

const searchForm = reactive({
  keyword: '',
  type: '',
  source: '',
  categoryId: undefined as number | undefined,
})

const syncDialogVisible = ref(false)
const syncTab = ref('wechat')
const syncSubmitting = ref(false)
const wechatSyncSubmitting = ref(false)
const wechatSyncResult = ref<WeChatContentSyncResult | null>(null)
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewTitle = ref('内容预览')
const previewModel = ref<ContentPreviewModel | null>(null)
const syncForm = reactive({
  defaultSource: '小红书',
  jsonText: '',
})
const wechatSyncForm = reactive({
  categoryId: undefined as number | undefined,
  publish: true,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

function normalizeStatus(statusRaw: unknown): ContentStatus {
  if (typeof statusRaw === 'number') {
    if (statusRaw === 1) return 'published'
    if (statusRaw === 2) return 'unpublished'
    return 'draft'
  }
  const v = String(statusRaw || '').toLowerCase()
  if (v === 'published') return 'published'
  if (v === 'unpublished' || v === 'offline') return 'unpublished'
  if (v === 'archived') return 'archived'
  return 'draft'
}

function inferType(raw: RawRecord): { typeLabel: '文章' | '图文' | '视频' | '动态'; typeValue: 'article' | 'rich' | 'video' | 'moment' } {
  const explicit = `${raw.type || raw.contentType || raw.content_type || ''}`.toLowerCase()
  if (explicit === 'moment') return { typeLabel: '动态', typeValue: 'moment' }
  if (explicit.includes('video') || explicit.includes('视频')) return { typeLabel: '视频', typeValue: 'video' }
  if (explicit.includes('rich') || explicit.includes('graphic') || explicit.includes('图文')) {
    return { typeLabel: '图文', typeValue: 'rich' }
  }
  const html = `${raw.content || ''}`.toLowerCase()
  if (html.includes('<video')) return { typeLabel: '视频', typeValue: 'video' }
  if (html.includes('<img') || raw.coverImage || raw.cover_image) return { typeLabel: '图文', typeValue: 'rich' }
  return { typeLabel: '文章', typeValue: 'article' }
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t)).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t)).filter(Boolean)
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeArticle(raw: RawRecord): ContentRow {
  const type = inferType(raw)
  const tags = parseTags(raw.tags)
  const sortOrder = Number(raw.sortOrder ?? raw.sort ?? 0)
  const recommended = tags.includes(RECOMMEND_TAG) || sortOrder < 0 || Boolean(
    raw.recommended ?? raw.recommend ?? raw.isRecommend ?? raw.is_recommend ?? false
  )
  const viewRaw = raw.viewCount ?? raw.view_count ?? raw.views
  return {
    id: Number(raw.id),
    title: raw.title || '未命名内容',
    status: normalizeStatus(raw.status),
    categoryId: Number(raw.categoryId ?? raw.category_id) || undefined,
    categoryName: raw.categoryName || raw.category_name || '未分类',
    source: String(raw.source || '').trim(),
    typeLabel: type.typeLabel,
    typeValue: type.typeValue,
    viewCount: Number.isFinite(Number(viewRaw)) ? Number(viewRaw) : null,
    recommended,
    tags,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  }
}

function normalizeCategory(raw: RawRecord): CategoryNode {
  const children = Array.isArray(raw.children) ? raw.children.map((c: RawRecord) => normalizeCategory(c)) : []
  const rawStatus = raw.status
  const normalizedStatus = typeof rawStatus === 'number'
    ? (rawStatus === 1 ? 'enabled' : 'disabled')
    : (rawStatus || 'enabled')
  return {
    id: Number(raw.id),
    name: raw.name || '未命名分类',
    parentId: raw.parentId ?? raw.parent_id ?? null,
    status: normalizedStatus,
    sort: Number(raw.sortOrder ?? raw.sort ?? 0),
    children,
  }
}

const flatCategoryOptions = computed(() => {
  const list: Array<{ id: number; label: string }> = []
  const walk = (arr: CategoryNode[], prefix = '') => {
    arr.forEach((item) => {
      // 仅「已发布到顶栏」的分类出现在发文/筛选下拉（与图1一致）
      if (!isCategoryPublished(item)) return
      list.push({ id: item.id, label: `${prefix}${item.name}` })
      if (item.children.length) walk(item.children, `${prefix}└ `)
    })
  }
  walk(categoryTree.value)
  return list
})

/** 全部一级分类（含未发布），供弹窗里选上级 */
const allFlatCategoryOptions = computed(() => {
  const list: Array<{ id: number; label: string }> = []
  categoryTree.value.forEach((item) => {
    list.push({ id: item.id, label: item.name })
  })
  return list
})

const filteredRows = computed(() => {
  // 类型靠正文推断，服务端无字段，仅在本页结果内二次过滤
  return rows.value.filter((row) => {
    const hitType = !searchForm.type || row.typeValue === searchForm.type
    return hitType
  })
})

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      current: pagination.page,
      size: pagination.pageSize,
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      categoryId: searchForm.categoryId,
      category_id: searchForm.categoryId,
      source: searchForm.source || undefined,
    }
    const res = await getContentList(params as any)
    const data = (res as any).data || {}
    const list = Array.isArray(data) ? data : (data.records || data.list || data.items || [])
    rows.value = Array.isArray(list) ? list.map((item: RawRecord) => normalizeArticle(item)) : []
    const serverTotal = Number(data.total || rows.value.length || 0)
    // 有类型筛选时，总数按本页过滤结果估算展示（避免与服务端不一致误导）
    pagination.total = searchForm.type ? filteredRows.value.length : serverTotal
    clearSelection()
  } catch {
    rows.value = []
    pagination.total = 0
    clearSelection()
    ElMessage.error('加载内容列表失败')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection: ContentRow[]) {
  selectedRows.value = selection
}

function clearSelection() {
  selectedRows.value = []
  nextTick(() => tableRef.value?.clearSelection())
}

async function fetchCategories() {
  categoryLoading.value = true
  try {
    const res = await getCategoryList()
    const rawList = (res as any).data || []
    categoryTree.value = Array.isArray(rawList) ? rawList.map((item: RawRecord) => normalizeCategory(item)) : []
  } catch {
    categoryTree.value = []
  } finally {
    categoryLoading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function fillSyncSample() {
  syncForm.jsonText = JSON.stringify(
    [
      {
        title: '示例：跨境干货标题',
        summary: '一句话摘要，方便小程序列表展示',
        source: syncForm.defaultSource,
        viewCount: 1000,
        likeCount: 20,
        publish: true,
      },
    ],
    null,
    2,
  )
}

async function handleWeChatSyncImport() {
  wechatSyncSubmitting.value = true
  wechatSyncResult.value = null
  try {
    await ElMessageBox.confirm(
      '将从公众号拉取全部已发布图文并导入内容库。已导入过的文章会更新正文与封面，是否继续？',
      '公众号全量导入',
      { type: 'warning', confirmButtonText: '开始导入', cancelButtonText: '取消' },
    )
    const res = await syncWeChatPublishedContents({
      categoryId: wechatSyncForm.categoryId,
      publish: wechatSyncForm.publish,
    })
    wechatSyncResult.value = (res as any)?.data || res
    ElMessage.success(wechatSyncResult.value?.message || '导入完成')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      ElMessage.error(e?.message || '公众号导入失败')
    }
  } finally {
    wechatSyncSubmitting.value = false
  }
}

async function handleSyncImport() {
  let items: any[] = []
  try {
    const parsed = JSON.parse(syncForm.jsonText || '[]')
    items = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    ElMessage.error('JSON 格式不正确，请检查后重试')
    return
  }
  if (!items.length) {
    ElMessage.warning('没有可导入的内容')
    return
  }

  syncSubmitting.value = true
  let success = 0
  let failed = 0
  try {
    for (const item of items) {
      const title = String(item?.title || '').trim()
      if (!title) {
        failed += 1
        continue
      }
      const source = String(item.source || syncForm.defaultSource || '小红书').trim()
      const summary = String(item.summary || item.desc || title).slice(0, 512)
      const defaultCategoryId = flatCategoryOptions.value[0]?.id
      try {
        const res = await createContent({
          title: title.slice(0, 128),
          summary,
          source,
          author: item.author || '跨境IP博主',
          content:
            item.content ||
            `<h2>${title}</h2><p><strong>来源</strong>：${source}</p><p>${summary}</p>`,
          coverImage: item.coverImage || item.cover || '',
          tags: Array.isArray(item.tags) ? item.tags : [source],
          categoryId: item.categoryId || defaultCategoryId,
          sortOrder: Number(item.sortOrder || 0),
        } as any)
        const id = Number((res as any)?.data?.id)
        if (item.publish !== false && id) {
          await publishContent(id)
        }
        success += 1
      } catch {
        failed += 1
      }
    }
    ElMessage.success(`导入完成：成功 ${success} 条${failed ? `，失败 ${failed} 条` : ''}`)
    syncDialogVisible.value = false
    syncForm.jsonText = ''
    fetchList()
  } finally {
    syncSubmitting.value = false
  }
}

function handleCreate() {
  router.push({ name: 'ContentEdit', query: { mode: 'create' } })
}

function handleEdit(row: ContentRow) {
  router.push({ name: 'ContentEdit', query: { id: String(row.id) } })
}

async function handlePreview(row: ContentRow) {
  previewTitle.value = `预览 · ${row.title}`
  previewModel.value = null
  previewVisible.value = true
  previewLoading.value = true
  try {
    const res = await getContentDetail(row.id)
    const data = (res as any).data || {}
    previewModel.value = buildPreviewFromDetail(data, row.categoryName)
  } catch (err: any) {
    previewVisible.value = false
    ElMessage.error(err?.message || '加载预览失败')
  } finally {
    previewLoading.value = false
  }
}

function statusLabel(status: ContentStatus): string {
  if (status === 'published') return '已发布'
  if (status === 'unpublished') return '已下架'
  if (status === 'archived') return '已归档'
  return '草稿'
}

function statusTagType(status: ContentStatus): 'success' | 'warning' | 'info' {
  if (status === 'published') return 'success'
  if (status === 'unpublished') return 'warning'
  return 'info'
}

async function handleTogglePublish(row: ContentRow) {
  try {
    if (row.status === 'published') {
      await ElMessageBox.confirm(`确定下架「${row.title}」？`, '下架确认')
      await unpublishContent(row.id)
      ElMessage.success('已下架')
    } else {
      await ElMessageBox.confirm(`确定上架「${row.title}」？`, '上架确认')
      await publishContent(row.id)
      ElMessage.success('已上架')
    }
    fetchList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err?.message || '操作失败')
  }
}

async function runBatchStatusChange(action: 'publish' | 'unpublish') {
  const targets =
    action === 'publish'
      ? selectedRows.value.filter((row) => row.status !== 'published')
      : selectedRows.value.filter((row) => row.status === 'published')

  if (!targets.length) {
    ElMessage.warning(action === 'publish' ? '所选内容均已上架' : '所选内容均未上架，无需下架')
    return
  }

  const label = action === 'publish' ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(
      `将对 ${targets.length} 条内容执行批量${label}，是否继续？`,
      `批量${label}确认`,
    )
  } catch {
    return
  }

  batchLoading.value = true
  let ok = 0
  let fail = 0
  try {
    for (const row of targets) {
      try {
        if (action === 'publish') await publishContent(row.id)
        else await unpublishContent(row.id)
        ok += 1
      } catch {
        fail += 1
      }
    }
    if (fail === 0) ElMessage.success(`已成功${label} ${ok} 条`)
    else ElMessage.warning(`${label}完成：成功 ${ok} 条，失败 ${fail} 条`)
    await fetchList()
  } finally {
    batchLoading.value = false
  }
}

function handleBatchPublish() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要上架的内容')
    return
  }
  return runBatchStatusChange('publish')
}

function handleBatchUnpublish() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要下架的内容')
    return
  }
  return runBatchStatusChange('unpublish')
}

function isRecommended(row: ContentRow): boolean {
  return row.recommended
}

async function toggleRecommend(row: ContentRow) {
  const next = !isRecommended(row)
  const tags = [...(row.tags || [])].filter((t) => t !== RECOMMEND_TAG)
  if (next) tags.push(RECOMMEND_TAG)
  try {
    await updateContent(row.id, {
      title: row.title,
      categoryId: row.categoryId,
      source: row.source || undefined,
      tags,
      sortOrder: next ? -1 : Math.max(row.sortOrder, 0),
    } as any)
    row.recommended = next
    row.tags = tags
    row.sortOrder = next ? -1 : Math.max(row.sortOrder, 0)
    ElMessage.success(next ? '已设为推荐' : '已取消推荐')
  } catch (err: any) {
    ElMessage.error(err?.message || '更新推荐状态失败')
  }
}

async function handleDelete(row: ContentRow) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？删除后不可恢复。`, '删除确认', { type: 'warning' })
    await deleteContent(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err?.message || '删除失败')
  }
}

const categoryModalVisible = ref(false)
const categoryDialogVisible = ref(false)
const categoryDialogMode = ref<'create' | 'edit'>('create')
const categorySubmitting = ref(false)
const categoryEditingId = ref<number | null>(null)
const categoryFormRef = ref<FormInstance>()

const categoryForm = reactive({
  name: '',
  parentId: null as number | null,
})

const categoryRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

function openCategoryDialog(mode: 'create' | 'edit', target: CategoryNode | null) {
  categoryDialogMode.value = mode
  if (mode === 'create') {
    categoryEditingId.value = null
    categoryForm.name = ''
    categoryForm.parentId = target ? target.id : null
  } else {
    if (!target) return
    categoryEditingId.value = target.id
    categoryForm.name = target.name
    categoryForm.parentId = target.parentId
  }
  categoryDialogVisible.value = true
}

function isCategoryPublished(item: CategoryNode) {
  const s = item.status
  return s === 'enabled' || s === '1' || Number(s) === 1
}

async function toggleCategoryPublish(item: CategoryNode) {
  const next = isCategoryPublished(item) ? 0 : 1
  await updateCategory(item.id, {
    name: item.name,
    parentId: item.parentId,
    sortOrder: item.sort,
    status: next,
  } as any)
  ElMessage.success(next === 1 ? `「${item.name}」已发布到顶栏` : `「${item.name}」已取消发布`)
  await fetchCategories()
}

async function submitCategory() {
  const form = categoryFormRef.value
  if (!form) return
  await form.validate()

  categorySubmitting.value = true
  try {
    if (categoryDialogMode.value === 'create') {
      await createCategory({
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId,
        status: 0,
        sortOrder: 0,
      } as any)
      ElMessage.success('分类已创建（未发布）。点「发布」后会出现在跨境资讯顶栏与发文下拉')
    } else if (categoryEditingId.value) {
      const current = categoryTree.value
        .flatMap((c) => [c, ...c.children])
        .find((c) => c.id === categoryEditingId.value)
      await updateCategory(categoryEditingId.value, {
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId,
        status: isCategoryPublished(current || ({ status: 'disabled' } as CategoryNode)) ? 1 : 0,
        sortOrder: current?.sort ?? 0,
      } as any)
      ElMessage.success('分类已更新')
    }
    categoryDialogVisible.value = false
    await fetchCategories()
  } finally {
    categorySubmitting.value = false
  }
}

async function removeCategory(item: CategoryNode) {
  await ElMessageBox.confirm(`确定删除分类「${item.name}」？`, '删除确认', { type: 'warning' })
  await deleteCategory(item.id)
  ElMessage.success('分类已删除')
  fetchCategories()
}

onMounted(async () => {
  await fetchCategories()
  await fetchList()
})

onActivated(async () => {
  await fetchCategories()
  await fetchList()
})

watch(
  () => [searchForm.categoryId, searchForm.source, searchForm.type] as const,
  () => {
    pagination.page = 1
    fetchList()
  }
)

watch(
  () => route.query.refresh,
  async () => {
    await fetchCategories()
    await fetchList()
  }
)
</script>

<style lang="scss" scoped>
.content-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 22px;
    line-height: 1.2;
    color: #0d1b2e;
    font-weight: 800;
  }

  .page-desc {
    margin-top: 6px;
    color: #6b7b93;
    font-size: 13px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .toolbar-input {
    width: 180px;
  }

  .toolbar-select {
    width: 170px;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .sync-result-box {
    margin-top: 12px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;
    font-size: 13px;
    color: #606266;
  }

  .sync-failures {
    margin-top: 8px;
    color: #f56c6c;
    line-height: 1.6;
  }

  .table-panel {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px;
    max-width: 100%;
    overflow-x: auto;
    box-sizing: border-box;
  }

  .title-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title-text {
    font-weight: 700;
    color: #1f2d3d;
  }

  .pagination-wrap {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
    max-width: 100%;
  }

  .category-tip {
    margin-bottom: 12px;
    color: #6b7b93;
    font-size: 12px;
  }

  .category-list {
    max-height: 56vh;
    overflow: auto;
    padding-right: 2px;
  }

  .category-item {
    background: #f8faff;
    border: 1px solid #e4e9f2;
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 8px;
  }

  .category-row,
  .sub-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .category-name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: #1f2d3d;
  }

  .cat-pub-tag {
    font-weight: 500;
  }

  .category-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sub-list {
    margin-left: 24px;
    margin-top: 6px;
    padding-left: 12px;
    border-left: 2px solid #e4e9f2;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .add-root-btn {
    width: 100%;
    margin-top: 8px;
  }

  .preview-dialog-body {
    min-height: 680px;
  }
}
</style>
