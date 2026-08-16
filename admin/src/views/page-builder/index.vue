<template>
  <div class="pages-list">
    <PageHeader
      kicker="小程序 / 页面"
      title="页面"
      description="在这里创建和装修页面。配好内容并绑定导航后，到「发布」一次性上线。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/start')">导航与外观</el-button>
        <el-button @click="router.push('/page-builder/release')">发布</el-button>
        <el-button type="primary" @click="handleCreate">新建页面</el-button>
      </template>
    </PageHeader>

    <section class="stats-row">
      <div v-for="stat in statsCards" :key="stat.label" class="stat-card">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-icon" :style="{ background: stat.bg }">
          <el-icon :size="18"><component :is="stat.icon" /></el-icon>
        </div>
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
        <button class="btn" @click="handleSelectTemplate">模板</button>
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
              <td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">
                <div style="margin-bottom:12px;">还没有页面。请先创建首页并完成装修，再去「导航与外观」绑定底部导航。</div>
                <el-button type="primary" @click="handleCreate">新建页面</el-button>
                <el-button @click="handleSelectTemplate">从模板创建</el-button>
              </td>
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
          <el-input
            v-model="formData.name"
            placeholder="请输入页面名称"
            maxlength="128"
            show-word-limit
            @input="formRef?.clearValidate('name')"
          />
        </el-form-item>
        <el-form-item label="页面类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择页面类型" style="width: 100%">
            <el-option
              label="首页"
              :value="1"
              :disabled="homePathOccupied && !(dialogType === 'edit' && Number(editingType) === 1)"
            />
            <el-option label="专题页" :value="2" />
            <el-option label="自定义页" :value="3" />
          </el-select>
          <div v-if="homePathOccupied && dialogType === 'create'" class="form-tip">
            已有首页占用 /pages/index/index，请新建专题页或自定义页（勿生成 index-2 等小程序打不开的路径）
          </div>
        </el-form-item>
        <el-form-item label="访问路径" prop="path">
          <el-input v-model="formData.path" placeholder="点击右侧重新生成，无需手输">
            <template #append>
              <el-button @click="handleAutoGeneratePath">重新生成</el-button>
            </template>
          </el-input>
          <div class="path-hint">首页路径固定为 /pages/index/index，已被占用时请改选专题页或自定义页。建议使用自动生成路径。</div>
        </el-form-item>
        <el-form-item label="分享标题">
          <el-input v-model="formData.shareTitle" placeholder="微信分享标题" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="分享封面">
          <div class="share-image-field">
            <div v-if="shareImagePreview" class="share-image-preview">
              <img :src="shareImagePreview" alt="" />
              <el-button text type="danger" size="small" @click="formData.shareImage = ''">移除</el-button>
            </div>
            <el-input v-model="formData.shareImage" placeholder="分享封面图 URL，可不填" />
            <label class="upload-btn">
              {{ uploadingShare ? '上传中…' : '本地上传' }}
              <input type="file" accept="image/*" hidden :disabled="uploadingShare" @change="onUploadShareImage" />
            </label>
          </div>
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
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { Document, Brush, OfficeBuilding, Grid } from '@element-plus/icons-vue'
import { getPageList, createPage, updatePage, deletePage, publishPage, unpublishPage, getPageTemplates } from '@/api/page'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'
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
  { label: '装修页面', value: '-', icon: Document, bg: 'var(--brand-soft)' },
  { label: '可用模板', value: '-', icon: Brush, bg: 'var(--warning-soft)' },
  { label: '行业方案', value: '12', icon: OfficeBuilding, bg: 'var(--success-soft)' },
  { label: '组件类型', value: '26', icon: Grid, bg: '#f3e8ff' },
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
  shareImage: '',
  background_color: '#ffffff',
})

const { uploadImage, uploading: uploadingShare } = useImageUpload()
const shareImagePreview = computed(() => normalizeUploadUrl(String(formData.shareImage || formData.share_image || '')))

/** 是否已存在首页（全量检测，避免分页漏判） */
const homePathOccupied = ref(false)

const editingType = computed(() => {
  if (!editingId.value) return null
  const row = pageList.value.find((r) => Number(r.id) === Number(editingId.value))
  return row?.type ?? null
})

async function refreshHomePathOccupied() {
  try {
    const byType = await getPageList({ current: 1, size: 20, type: 1 })
    const typeRows = (byType.data?.records || []).map(normalizePageRecord)
    if (typeRows.length > 0) {
      homePathOccupied.value = true
      return
    }
    const res = await getPageList({ current: 1, size: 100 })
    const rows = (res.data?.records || []).map(normalizePageRecord)
    homePathOccupied.value = rows.some((row) => {
      const path = normalizeBuilderPath(row.path || '')
      return path === '/pages/index/index' || Number(row.type) === 1
    })
  } catch {
    homePathOccupied.value = pageList.value.some((row) => {
      const path = normalizeBuilderPath(row.path || '')
      return path === '/pages/index/index' || Number(row.type) === 1
    })
  }
}
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
  if (Number(formData.type) === 1) {
    return candidate
  }
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
  if (/^\/pages\/index\/index-\d+$/i.test(normalized)) {
    callback(new Error('该路径不在小程序包内。首页请用 /pages/index/index；其它请用专题/自定义页'))
    return
  }
  if (Number(formData.type) === 1 && normalized !== '/pages/index/index') {
    callback(new Error('首页类型路径必须为 /pages/index/index'))
    return
  }
  if (isPathTaken(normalized)) {
    if (Number(formData.type) === 1) {
      callback(new Error('首页路径已被占用。请改选专题页或自定义页，不要生成小程序无法打开的路径'))
      return
    }
    callback(new Error('访问路径已存在，请更换'))
    return
  }
  callback()
}

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入页面名称', trigger: ['blur', 'change'] },
    { max: 128, message: '页面名称不能超过 128 个字符', trigger: ['blur', 'change'] },
  ],
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
    refreshHomePathOccupied()
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

async function handleCreate() {
  dialogType.value = 'create'
  editingId.value = null
  await refreshHomePathOccupied()
  formData.name = ''
  formData.type = homePathOccupied.value ? 3 : 1
  formData.path = ''
  formData.shareTitle = ''
  formData.shareImage = ''
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
    share_image: row.share_image || row.shareImage,
    shareImage: row.shareImage || row.share_image,
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
    shareImage: formData.shareImage || formData.share_image,
    share_image: formData.shareImage || formData.share_image,
  }
}

async function onUploadShareImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      formData.shareImage = normalizeUploadUrl(url)
    },
  })
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
.pages-list {
  color: var(--text);
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
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
}

.stat-label {
  margin-top: 4px;
  color: var(--text-muted);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.btn-p {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.btn-s {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

.btn-d {
  color: var(--danger);
  border-color: #fecaca;
  background: #fff5f5;
}

.btn-copy {
  color: var(--brand);
  border-color: #bfdbfe;
  background: #eff6ff;
}

.btn-more {
  color: #607187;
  background: var(--bg-page);
}

.xs {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

.card {
  background: #fff;
  border: 1px solid var(--border);
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
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.sub {
  color: var(--text-muted);
  font-size: 11px;
}

.path-hint {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.share-image-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.share-image-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-image-preview img {
  width: 72px;
  height: 48px;
  object-fit: cover;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  background: #eef2f7;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
}

.mono {
  color: var(--text-muted);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(23, 32, 51, 0.12);

  button {
    height: 30px;
    padding: 0 10px;
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      color: var(--brand);
      background: var(--brand-soft);
    }

    &.danger {
      color: var(--danger);

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
  background: var(--bg-page);
  border: 1px solid var(--border);
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
  color: var(--success);
  border-color: #b7ebd4;
  background: #effcf5;
}

.bo {
  color: var(--warning);
  border-color: #fbd38d;
  background: #fffbeb;
}

.bb {
  color: #607187;
  border-color: #d9e2ef;
  background: #f6f9ff;
}

.bbl {
  color: var(--brand);
  border-color: #bfdbfe;
  background: #eff6ff;
}

.nb0 {
  font-weight: 700;
}

.form-tip {
  margin: -4px 0 12px;
  padding: 8px 10px;
  color: #9a6700;
  font-size: 12px;
  line-height: 1.5;
  background: #fffbeb;
  border: 1px solid #fbd38d;
  border-radius: 8px;
}

.summary {
  margin-top: 10px;
  color: var(--text-muted);
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
    color: var(--text);
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
    color: var(--text-muted);
    font-weight: 600;
  }
}
</style>
