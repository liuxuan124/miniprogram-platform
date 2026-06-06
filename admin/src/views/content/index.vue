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
      <div class="toolbar-spacer" />
      <el-button @click="categoryModalVisible = true">分类</el-button>
      <el-button type="primary" @click="handleCreate">+ 新建</el-button>
    </div>

    <div class="table-panel">
      <el-table :data="filteredRows" stripe v-loading="loading">
        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="title-cell">
              <span class="title-text">{{ row.title }}</span>
              <el-tag v-if="isRecommended(row)" size="small" effect="plain" type="primary">推荐</el-tag>
            </div>
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link size="small" @click="handleTogglePublish(row)">
              {{ row.status === 'published' ? '下架' : '上架' }}
            </el-button>
            <el-button link size="small" @click="toggleRecommend(row)">
              {{ isRecommended(row) ? '取消推荐' : '设为推荐' }}
            </el-button>
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
    </div>

    <el-dialog v-model="categoryModalVisible" title="内容分类管理" width="760px" destroy-on-close>
      <div class="category-tip">支持二级分类嵌套，可拖拽调整显示顺序：</div>
      <div class="category-list" v-loading="categoryLoading">
        <div v-for="item in categoryTree" :key="item.id" class="category-item">
          <div class="category-row">
            <span class="category-name">⠿ {{ item.name }}</span>
            <div class="category-actions">
              <el-button size="small" @click="openCategoryDialog('create', item)">+ 子分类</el-button>
              <el-button size="small" @click="openCategoryDialog('edit', item)">重命名</el-button>
              <el-button size="small" type="danger" plain @click="removeCategory(item)">删除</el-button>
            </div>
          </div>
          <div v-if="item.children.length" class="sub-list">
            <div v-for="sub in item.children" :key="sub.id" class="sub-row">
              <span>⠿ {{ sub.name }}</span>
              <div class="category-actions">
                <el-button size="small" @click="openCategoryDialog('edit', sub)">编辑</el-button>
                <el-button size="small" type="danger" plain @click="removeCategory(sub)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-button type="primary" class="add-root-btn" @click="openCategoryDialog('create', null)">+ 新增一级分类</el-button>
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
            <el-option v-for="item in flatCategoryOptions" :key="item.id" :value="item.id" :label="item.label" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitting" @click="submitCategory">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getContentList,
  publishContent,
  unpublishContent,
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api/content'

type RawRecord = Record<string, any>
type ContentStatus = 'draft' | 'published' | 'unpublished' | 'archived'

interface ContentRow {
  id: number
  title: string
  status: ContentStatus
  categoryId?: number
  categoryName: string
  typeLabel: '文章' | '图文' | '视频'
  typeValue: 'article' | 'rich' | 'video'
  viewCount: number | null
  recommended: boolean
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
const categoryLoading = ref(false)
const rows = ref<ContentRow[]>([])
const categoryTree = ref<CategoryNode[]>([])
const recommendMap = reactive<Record<number, boolean>>({})

const searchForm = reactive({
  keyword: '',
  type: '',
  categoryId: undefined as number | undefined,
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

function inferType(raw: RawRecord): { typeLabel: '文章' | '图文' | '视频'; typeValue: 'article' | 'rich' | 'video' } {
  const explicit = `${raw.type || raw.contentType || raw.content_type || ''}`.toLowerCase()
  if (explicit.includes('video') || explicit.includes('视频')) return { typeLabel: '视频', typeValue: 'video' }
  if (explicit.includes('rich') || explicit.includes('graphic') || explicit.includes('图文')) {
    return { typeLabel: '图文', typeValue: 'rich' }
  }
  const html = `${raw.content || ''}`.toLowerCase()
  if (html.includes('<video')) return { typeLabel: '视频', typeValue: 'video' }
  if (html.includes('<img') || raw.coverImage || raw.cover_image) return { typeLabel: '图文', typeValue: 'rich' }
  return { typeLabel: '文章', typeValue: 'article' }
}

function normalizeArticle(raw: RawRecord): ContentRow {
  const type = inferType(raw)
  const recommended = Boolean(
    raw.recommended ?? raw.recommend ?? raw.isRecommend ?? raw.is_recommend ?? raw.rec ?? false
  )
  const viewRaw = raw.viewCount ?? raw.view_count ?? raw.views
  return {
    id: Number(raw.id),
    title: raw.title || '未命名内容',
    status: normalizeStatus(raw.status),
    categoryId: Number(raw.categoryId ?? raw.category_id) || undefined,
    categoryName: raw.categoryName || raw.category_name || '未分类',
    typeLabel: type.typeLabel,
    typeValue: type.typeValue,
    viewCount: Number.isFinite(Number(viewRaw)) ? Number(viewRaw) : null,
    recommended,
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
      list.push({ id: item.id, label: `${prefix}${item.name}` })
      if (item.children.length) walk(item.children, `${prefix}└ `)
    })
  }
  walk(categoryTree.value)
  return list
})

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const kw = searchForm.keyword.trim()
    const hitKw = !kw || row.title.includes(kw)
    const hitType = !searchForm.type || row.typeValue === searchForm.type
    const hitCategory = !searchForm.categoryId || row.categoryId === searchForm.categoryId
    return hitKw && hitType && hitCategory
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
    }
    const res = await getContentList(params as any)
    const data = (res as any).data || {}
    const list = Array.isArray(data) ? data : (data.records || data.list || data.items || [])
    rows.value = Array.isArray(list) ? list.map((item: RawRecord) => normalizeArticle(item)) : []
    pagination.total = Number(data.total || rows.value.length || 0)
  } catch {
    rows.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
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

function handleCreate() {
  router.push({ name: 'ContentEdit', query: { mode: 'create' } })
}

function handleEdit(row: ContentRow) {
  router.push({ name: 'ContentEdit', query: { id: String(row.id) } })
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
}

function isRecommended(row: ContentRow): boolean {
  if (Object.prototype.hasOwnProperty.call(recommendMap, row.id)) return recommendMap[row.id]
  return row.recommended
}

function toggleRecommend(row: ContentRow) {
  const current = isRecommended(row)
  recommendMap[row.id] = !current
  ElMessage.success(current ? '已取消推荐' : '已设为推荐')
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

async function submitCategory() {
  const form = categoryFormRef.value
  if (!form) return
  await form.validate()

  categorySubmitting.value = true
  try {
    const payload = {
      name: categoryForm.name.trim(),
      parentId: categoryForm.parentId,
      status: 1,
      sortOrder: 0,
    }
    if (categoryDialogMode.value === 'create') {
      await createCategory(payload as any)
      ElMessage.success('分类已创建')
    } else if (categoryEditingId.value) {
      await updateCategory(categoryEditingId.value, payload as any)
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
  () => route.query.refresh,
  async () => {
    await fetchCategories()
    await fetchList()
  }
)
</script>

<style lang="scss" scoped>
.content-page {
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

  .table-panel {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px;
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
    font-weight: 700;
    color: #1f2d3d;
  }

  .category-actions {
    display: flex;
    align-items: center;
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
}
</style>
