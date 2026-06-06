<template>
  <div class="pages-prototype">
    <div class="ph">
      <div class="pt">页面管理</div>
      <div class="ps">管理所有小程序页面，支持装修、发布与版本管理。</div>
    </div>

    <section class="stats-row">
      <div v-for="stat in statsCards" :key="stat.label" class="stat-card">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-icon" :style="{ background: stat.bg }">{{ stat.icon }}</div>
      </div>
    </section>

    <div class="toolbar">
      <input
        v-model="searchForm.keyword"
        class="inp"
        placeholder="搜索页面名称"
        @keyup.enter="handleSearch"
      />
      <select v-model="searchForm.type" class="sel">
        <option value="">类型：全部</option>
        <option :value="1">首页</option>
        <option :value="2">专题页</option>
        <option :value="3">自定义页</option>
      </select>
      <select v-model="searchForm.status" class="sel">
        <option value="">状态：全部</option>
        <option :value="1">已发布</option>
        <option :value="0">草稿</option>
        <option :value="2">未发布</option>
      </select>
      <div class="mla actions">
        <button class="btn" @click="handleSelectTemplate">页面模板</button>
        <button class="btn" @click="handleReset">重置</button>
        <button class="btn btn-p" @click="handleCreate">+ 新建页面</button>
      </div>
    </div>

    <div class="card">
      <div class="tw">
        <table v-loading="loading">
          <thead>
            <tr>
              <th>页面名称</th>
              <th>类型</th>
              <th>访问路径</th>
              <th>状态</th>
              <th>版本</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pageList" :key="row.id">
              <td>
                <b>{{ row.name }}</b>
                <br />
                <span class="sub">{{ row.shareTitle || row.share_title || '用于小程序页面展示' }}</span>
              </td>
              <td>
                <span class="tag">{{ getPageTypeLabel(row.type) }}</span>
              </td>
              <td>
                <div class="path-cell">
                  <span class="mono">{{ row.path }}</span>
                  <div class="path-actions">
                    <button class="btn xs btn-copy" @click="copyPath(row)">复制页面路径</button>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="getStatusBadgeClass(row.status)">
                  {{ getStatusLabel(row.status) }}
                </span>
              </td>
              <td>
                <span class="badge bbl nb0">v{{ row.version || 1 }}</span>
              </td>
              <td>{{ row.updated_at }}</td>
              <td class="ops">
                <button class="btn xs btn-p" @click="handleEdit(row)">装修</button>
                <button class="btn xs btn-s" @click="handlePublish(row)">{{ isPublished(row.status) ? '下架' : '发布' }}</button>
                <details class="more-menu">
                  <summary class="btn xs btn-more">更多</summary>
                  <div class="more-pop">
                    <button @click="handlePreview(row)">预览</button>
                    <button @click="handleVersion(row)">版本</button>
                    <button class="danger" @click="handleDelete(row)">删除</button>
                  </div>
                </details>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr v-if="!loading && pageList.length === 0">
              <td colspan="7" style="text-align:center;padding:40px;color:#7b8798;">暂无页面，点击"新建页面"或"页面模板"开始搭建</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="summary">共 {{ pagination.total || pageList.length }} 个页面</div>

    <div class="pager">
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '新建页面' : '编辑页面'"
      width="520px"
      destroy-on-close
      class="proto-dialog"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="90px">
        <el-form-item label="页面名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入页面名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="页面类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择页面类型" style="width: 100%">
            <el-option label="首页" :value="1" />
            <el-option label="专题页" :value="2" />
            <el-option label="自定义页" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="访问路径" prop="path">
          <el-input v-model="formData.path" placeholder="点击右侧重新生成，无需手输">
            <template #append>
              <el-button @click="handleAutoGeneratePath">重新生成</el-button>
            </template>
          </el-input>
          <div class="path-hint">建议直接使用自动生成路径，避免跳转失败。</div>
        </el-form-item>
        <el-form-item label="分享标题">
          <el-input v-model="formData.shareTitle" placeholder="微信分享标题" maxlength="30" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ dialogType === 'create' ? '创建并装修' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getPageList, createPage, updatePage, deletePage, publishPage, unpublishPage, getPageTemplates } from '@/api/page'
import type { PageRecord, CreatePageParams, PageListParams } from '@/types/page'

const router = useRouter()

const searchForm = reactive<PageListParams>({
  keyword: '',
  type: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const pageList = ref<PageRecord[]>([])
const loading = ref(false)

const statsCards = ref([
  { label: '装修页面', value: '-', icon: '📄', bg: '#eff6ff' },
  { label: '可用模板', value: '-', icon: '🎨', bg: '#fef3c7' },
  { label: '行业方案', value: '12', icon: '🏭', bg: '#ecfdf5' },
  { label: '组件类型', value: '26', icon: '🧩', bg: '#fdf2f8' },
])

const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const formData = reactive<CreatePageParams>({
  name: '',
  type: 3,
  path: '',
  shareTitle: '',
  background_color: '#ffffff',
})

function normalizeBuilderPath(raw: string): string {
  const value = (raw || '').trim()
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

function slugifyName(name: string): string {
  const source = (name || '').trim().toLowerCase()
  const latin = source
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (latin) return latin
  return `page-${Date.now().toString().slice(-6)}`
}

function buildBasePathByType(type: number, slug: string): string {
  if (type === 1) return '/pages/index/index'
  if (type === 2) return `/pages/activity/${slug}`
  return `/pages/custom/${slug}`
}

function isPathTaken(path: string): boolean {
  const target = normalizeBuilderPath(path)
  if (!target) return false
  return pageList.value.some((row) => {
    const rowPath = normalizeBuilderPath(row.path || '')
    if (rowPath !== target) return false
    if (dialogType.value === 'edit' && editingId.value && Number(row.id) === Number(editingId.value)) {
      return false
    }
    return true
  })
}

function resolveUniquePath(basePath: string): string {
  let candidate = normalizeBuilderPath(basePath)
  if (!candidate) return ''
  if (!isPathTaken(candidate)) return candidate
  let idx = 2
  while (idx < 1000) {
    const next = `${candidate}-${idx}`
    if (!isPathTaken(next)) return next
    idx += 1
  }
  return `${candidate}-${Date.now().toString().slice(-4)}`
}

function handleAutoGeneratePath(silent = false) {
  const slug = slugifyName(formData.name || '')
  const basePath = buildBasePathByType(Number(formData.type || 3), slug)
  formData.path = resolveUniquePath(basePath)
  nextTick(() => {
    formRef.value?.clearValidate('path')
  })
  if (!silent) {
    ElMessage.success('已自动生成访问路径')
  }
}

function validatePagePath(_: unknown, value: string, callback: (error?: Error) => void) {
  const normalized = normalizeBuilderPath(value)
  if (!normalized) {
    callback(new Error('请先点击“重新生成”获得页面路径'))
    return
  }
  if (!/^\/pages\/[a-z0-9/_-]+$/i.test(normalized)) {
    callback(new Error('路径格式不正确，应为 /pages/模块/页面'))
    return
  }
  if (isPathTaken(normalized)) {
    callback(new Error('访问路径已存在，请更换'))
    return
  }
  callback()
}

const formRules: FormRules = {
  name: [{ required: true, message: '请输入页面名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择页面类型', trigger: 'change' }],
  path: [{ validator: validatePagePath, trigger: 'blur' }],
}

function getPageTypeLabel(type: string | number): string {
  const map: Record<string, string> = { '1': '首页', '2': '专题页', '3': '自定义页', home: '首页', topic: '专题页', custom: '自定义页', activity: '活动页' }
  return map[String(type)] || String(type)
}

function getStatusLabel(status: string | number): string {
  const map: Record<string, string> = { '0': '草稿', '1': '已发布', '2': '未发布', draft: '草稿', published: '已发布', unpublished: '未发布' }
  return map[String(status)] || String(status)
}

function getStatusBadgeClass(status: string | number): string {
  const map: Record<string, string> = { '0': 'bo', '1': 'bg', '2': 'bb', draft: 'bo', published: 'bg', unpublished: 'bb' }
  return map[String(status)] || 'bb'
}

function isPublished(status: string | number): boolean {
  return ['1', 'published'].includes(String(status))
}

function normalizeCopyPath(path: string): string {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

async function copyToClipboard(text: string, successMessage: string) {
  if (!text) {
    ElMessage.warning('无可复制内容')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success(successMessage)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function copyPath(row: PageRecord) {
  copyToClipboard(normalizeCopyPath(row.path || ''), '页面路径已复制')
}

async function loadStats() {
  try {
    statsCards.value[0].value = String(pagination.total || pageList.value.length || 0)
    const res = await getPageTemplates({ current: 1, size: 1 })
    const data = res.data as any
    statsCards.value[1].value = String(data?.total || data?.length || (Array.isArray(data) ? data.length : 0))
  } catch {
    statsCards.value[0].value = String(pageList.value.length || 0)
  }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getPageList({
      current: pagination.page,
      size: pagination.pageSize,
      ...searchForm,
    })
    pageList.value = (res.data?.records || []).map(normalizePageRecord)
    pagination.total = res.data?.total || 0
  } catch {
    pageList.value = []
  } finally {
    loading.value = false
    loadStats()
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.type = ''
  searchForm.status = ''
  pagination.page = 1
  fetchList()
}

function handleCreate() {
  dialogType.value = 'create'
  editingId.value = null
  formData.name = ''
  formData.type = 3
  formData.path = ''
  formData.shareTitle = ''
  formData.background_color = '#ffffff'
  handleAutoGeneratePath(true)
  dialogVisible.value = true
}

function handleSelectTemplate() {
  router.push({ name: 'TemplateCenter' })
}

function handleEdit(row: PageRecord) {
  router.push({ name: 'PageBuilderEditor', params: { id: row.id } })
}

function handlePreview(row: PageRecord) {
  router.push({ name: 'PageBuilderPreview', params: { id: row.id } })
}

function handleVersion(row: PageRecord) {
  router.push({ name: 'PageBuilderVersion', params: { id: row.id } })
}

async function handlePublish(row: PageRecord) {
  if (['1', 'published'].includes(String(row.status))) {
    await ElMessageBox.confirm(`页面「${row.name}」已发布，是否下架？`, '操作确认', { type: 'warning' })
    await unpublishPage(row.id)
    ElMessage.success('已下架')
    fetchList()
    return
  }
  await ElMessageBox.confirm(`确定发布页面「${row.name}」？`, '发布确认')
  await publishPage(row.id)
  ElMessage.success('发布成功')
  fetchList()
}

async function handleDelete(row: PageRecord) {
  await ElMessageBox.confirm(`确定删除页面「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deletePage(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

async function handleSubmit() {
  const form = formRef.value
  if (!form) return
  await form.validate()
  submitLoading.value = true
  try {
    if (dialogType.value === 'create') {
      const res = await createPage(buildPagePayload())
      ElMessage.success('创建成功')
      const createdId = (res?.data as any)?.id || (res?.data as any)?.pageId || null
      if (createdId) {
        dialogVisible.value = false
        fetchList()
        router.push({ name: 'PageBuilderEditor', params: { id: createdId } })
        return
      }
    } else if (editingId.value) {
      await updatePage(editingId.value, buildPagePayload())
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

function normalizePageRecord(row: PageRecord): PageRecord {
  return {
    ...row,
    share_title: row.share_title || row.shareTitle,
    shareTitle: row.shareTitle || row.share_title,
    version: row.version || row.currentVersion || 0,
    updated_at: row.updated_at || row.updateTime || '',
    created_at: row.created_at || row.createTime || '',
  }
}

function buildPagePayload(): CreatePageParams {
  const normalizedPath = normalizeBuilderPath(formData.path)
  return {
    name: formData.name,
    type: Number(formData.type),
    path: normalizedPath,
    shareTitle: formData.shareTitle || formData.share_title,
  }
}

onMounted(() => {
  fetchList()
})

watch(
  () => [formData.name, formData.type, dialogVisible.value, dialogType.value],
  ([name, type, visible, mode], [prevName, prevType]) => {
    if (!visible || mode !== 'create') return
    if (name === prevName && type === prevType && formData.path) return
    handleAutoGeneratePath(true)
  },
)
</script>

<style lang="scss" scoped>
.pages-prototype {
  color: #172033;
}

.ph {
  margin-bottom: 12px;
}

.pt {
  font-size: 24px;
  font-weight: 800;
}

.ps {
  margin-top: 4px;
  color: #7b8798;
  font-size: 13px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  position: relative;
  padding: 16px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
}

.stat-label {
  margin-top: 4px;
  color: #7b8798;
  font-size: 12px;
}

.stat-icon {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.inp,
.sel {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  color: #172033;
  font-size: 13px;
  outline: none;
}

.inp {
  width: 180px;
}

.sel {
  min-width: 140px;
}

.mla {
  margin-left: auto;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  color: #172033;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.btn-p {
  background: #1769ff;
  border-color: #1769ff;
  color: #fff;
}

.btn-s {
  background: #0faa6e;
  border-color: #0faa6e;
  color: #fff;
}

.btn-d {
  color: #ef4444;
  border-color: #fecaca;
  background: #fff5f5;
}

.btn-copy {
  color: #1769ff;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.btn-more {
  color: #607187;
  background: #f8faff;
}

.xs {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

.card {
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
}

.tw {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #edf1f7;
  text-align: left;
  font-size: 13px;
}

th {
  color: #7b8798;
  font-size: 12px;
  font-weight: 700;
}

.sub {
  color: #7b8798;
  font-size: 11px;
}

.path-hint {
  margin-top: 6px;
  color: #7b8798;
  font-size: 12px;
  line-height: 1.4;
}

.mono {
  color: #7b8798;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.path-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.path-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ops {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.more-menu {
  position: relative;
  display: inline-block;

  summary {
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &[open] .more-pop {
    display: grid;
  }
}

.more-pop {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 20;
  display: none;
  min-width: 92px;
  padding: 6px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(23, 32, 51, 0.12);

  button {
    height: 30px;
    padding: 0 10px;
    color: #172033;
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      color: #1769ff;
      background: #eaf2ff;
    }

    &.danger {
      color: #ef4444;

      &:hover {
        background: #fff5f5;
      }
    }
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 99px;
  color: #607187;
  font-size: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 12px;
  border: 1px solid transparent;
}

.bg {
  color: #0faa6e;
  border-color: #b7ebd4;
  background: #effcf5;
}

.bo {
  color: #f59e0b;
  border-color: #fbd38d;
  background: #fffbeb;
}

.bb {
  color: #607187;
  border-color: #d9e2ef;
  background: #f6f9ff;
}

.bbl {
  color: #1769ff;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.nb0 {
  font-weight: 700;
}

.summary {
  margin-top: 10px;
  color: #7b8798;
  font-size: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

:deep(.proto-dialog) {
  .el-dialog {
    border-radius: 14px;
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 16px 20px 8px;
    border-bottom: 1px solid #edf1f7;
  }

  .el-dialog__title {
    color: #172033;
    font-size: 18px;
    font-weight: 800;
  }

  .el-dialog__body {
    padding: 14px 20px 8px;
  }

  .el-dialog__footer {
    padding: 10px 20px 16px;
  }

  .el-form-item__label {
    color: #7b8798;
    font-weight: 600;
  }
}
</style>
