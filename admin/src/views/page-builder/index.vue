<template>
  <div class="pages-list builder-studio">
    <StudioHeader title="页面设计" section="页面" description="组织页面、编辑内容，让每个入口都有清晰的目的。">
      <template #actions>
        <el-button @click="handleSelectTemplate"><el-icon><Collection /></el-icon>从模板创建</el-button>
        <el-button type="primary" @click="handleCreate"><el-icon><Plus /></el-icon>新建页面</el-button>
      </template>
    </StudioHeader>
    <div v-if="listError" class="studio-feedback is-error" role="alert"><span>{{ listError }}</span><el-button size="small" @click="fetchList">重新加载</el-button></div>
    <div class="page-library-tools">
      <el-radio-group v-model="searchForm.status" class="page-status-tabs" @change="handleSearch">
        <el-radio-button value="">全部页面</el-radio-button>
        <el-radio-button value="live">已上线</el-radio-button>
        <el-radio-button value="dirty">待更新</el-radio-button>
        <el-radio-button value="draft">草稿</el-radio-button>
      </el-radio-group>
      <div class="page-library-search">
        <el-input v-model="searchForm.keyword" placeholder="搜索页面名称" clearable :prefix-icon="Search" aria-label="搜索页面名称" @input="onSearchInput" @keyup.enter="handleSearch" />
        <el-select v-model="searchForm.type" aria-label="筛选页面用途" @change="handleSearch">
          <el-option label="全部用途" value="" /><el-option label="首页" value="home" /><el-option label="专题页" :value="2" /><el-option label="自定义页" :value="3" />
        </el-select>
        <el-button v-if="searchForm.keyword || searchForm.type || searchForm.status" text @click="handleReset">清除筛选</el-button>
      </div>
    </div>
    <div class="card page-library-table">
      <div class="tw">
        <table v-loading="loading"><caption class="sr-only">小程序页面及其上线状态</caption>
          <thead>
            <tr>
              <th>页面名称</th>
              <th>用途</th>
              <th>访问路径</th>
              <th>状态</th>
              <th>更新时间</th>
              <th class="page-ops-heading">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr class="mine-row">
              <td>
                <b class="page-row-name"><span class="page-row-icon"><el-icon><User /></el-icon></span>我的</b>
                <br />
                <span class="sub">系统个人中心页，使用表单配置</span>
              </td>
              <td><span class="tag">我的</span></td>
              <td><span class="mono">/pages/mine/mine</span></td>
              <td><span class="badge bg">系统页</span></td>
              <td>—</td>
              <td class="ops">
                <button class="btn xs btn-p" @click="router.push('/page-builder/mine')">配置</button>
              </td>
            </tr>
            <tr v-for="row in displayList" :key="row.id">
              <td>
                <b class="page-row-name"><span class="page-row-icon"><el-icon><Document /></el-icon></span>{{ row.name }}</b>
                <br />
                <span class="sub">{{ row.shareTitle || row.share_title || '用于小程序页面展示' }}</span>
              </td>
              <td>
                <span class="tag">{{ getPageTypeLabel(row) }}</span>
              </td>
              <td>
                <div class="path-cell">
                  <span class="mono">{{ row.path }}</span>
                  <div class="path-actions">
                    <button class="btn xs btn-copy" @click="copyPath(row)">复制路径</button>
                    <button class="btn xs btn-copy" @click="showQr(row)">二维码</button>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="getLiveStatusBadgeClass(row)">
                  {{ getLiveStatusLabel(row) }}
                </span>
              </td>
              <td>{{ row.updated_at }}</td>
              <td class="ops">
                <el-button size="small" type="primary" plain @click="handleEdit(row)">设计</el-button>
                <el-button size="small" @click="handlePreview(row)">预览</el-button>
                <el-dropdown trigger="click">
                  <el-button size="small" aria-label="更多页面操作"><el-icon><MoreFilled /></el-icon></el-button>
                  <template #dropdown><el-dropdown-menu>
                    <el-dropdown-item @click="handleEditMeta(row)">页面信息</el-dropdown-item>
                    <el-dropdown-item @click="handleDuplicate(row)">复制页面</el-dropdown-item>
                    <el-dropdown-item @click="showQr(row)">预览二维码</el-dropdown-item>
                    <el-dropdown-item @click="handleVersion(row)">历史版本</el-dropdown-item>
                    <el-dropdown-item v-if="isPublished(row.status)" divided @click="handlePublish(row)">下架页面</el-dropdown-item>
                    <el-dropdown-item v-else divided @click="handleEdit(row)">进入编辑器检查并上线</el-dropdown-item>
                    <el-dropdown-item @click="handleDelete(row)">删除页面</el-dropdown-item>
                  </el-dropdown-menu></template>
                </el-dropdown>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr v-if="!loading && displayList.length === 0">
              <td colspan="6" class="page-library-empty">
                <el-empty :image-size="64" :description="listError ? '页面未能加载' : (searchForm.keyword || searchForm.type || searchForm.status ? '没有匹配的页面' : '从第一个页面开始搭建')">
                  <el-button v-if="searchForm.keyword || searchForm.type || searchForm.status" @click="handleReset">清除筛选</el-button>
                  <template v-else-if="!listError"><el-button type="primary" @click="handleCreate">新建页面</el-button><el-button @click="handleSelectTemplate">选择模板</el-button></template>
                </el-empty>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="summary">页面内容更新后生效；保存草稿不会自动上线。</div>

    <div class="pager">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="onPaginationChange"
        @current-change="onPaginationChange"
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
        <el-form-item label="用途标签">
          <el-select v-model="formData.type" placeholder="可选，仅用于列表筛选" clearable style="width: 100%">
            <el-option label="专题页" :value="2" />
            <el-option label="自定义页" :value="3" />
          </el-select>
          <div class="form-tip">首页由「外观 → 首页绑定」决定，不在此处设置。</div>
        </el-form-item>
        <el-form-item label="访问路径" prop="path">
          <PagePathField v-model="formData.path" :page-type="formData.type" />
          <div class="path-hint">前缀固定；仅后缀可改。首页整段锁定为 /pages/index/index。</div>
          <div v-if="!isHomePathLocked(formData.type)" style="margin-top: 8px">
            <el-button size="small" @click="handleAutoGeneratePath()">重新生成后缀</el-button>
          </div>
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

    <el-dialog v-model="qrVisible" title="扫码查看" width="360px" destroy-on-close>
      <div class="qr-panel">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="预览二维码" />
        <p class="qr-tip">手机扫码打开 H5 预览（需与后台同网或公网可访问）</p>
        <el-input v-model="qrUrl" readonly size="small" />
      </div>
      <template #footer>
        <el-button @click="qrVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyToClipboard(qrUrl, '预览链接已复制')">复制链接</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onActivated, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import StudioHeader from '@/components/builder-studio/StudioHeader.vue'
import { Document, Collection, Plus, Search, User, MoreFilled } from '@element-plus/icons-vue'
import { getPageList, createPage, updatePage, deletePage, publishPage, unpublishPage, duplicatePage } from '@/api/page'
import { normalizeUploadUrl, getConfigsSilent } from '@/api/system'
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'
import PagePathField from '@/components/page-builder/PagePathField.vue'
import type { PageRecord, CreatePageParams, PageListParams } from '@/types/page'
import QRCode from 'qrcode'
import {
  isHomePathLocked,
  joinEditablePath,
  normalizeBuilderPath,
  pathPrefixByType,
  splitEditablePath,
  validatePathSlug,
} from '@/utils/page-path'

const router = useRouter()
const route = useRoute()
const listError = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(handleSearch, 350)
}
let consumingCreate = false
async function consumeCreateIntent() {
  if (route.query.create !== '1' || dialogVisible.value || consumingCreate) return
  consumingCreate = true
  try {
    const { create, ...query } = route.query
    await router.replace({ query })
    await handleCreate()
  } finally { consumingCreate = false }
}
onActivated(consumeCreateIntent)
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })

const searchForm = reactive({
  keyword: '',
  type: '' as string | number,
  status: '' as string | number,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const pageList = ref<PageRecord[]>([])
const loading = ref(false)
const localPagination = ref(false)
let listSequence = 0
let listLoaded = false
function onPaginationChange() { if (!localPagination.value) fetchList() }
onActivated(() => { if (listLoaded) fetchList() })
const qrVisible = ref(false)
const qrDataUrl = ref('')
const qrUrl = ref('')

const displayList = computed(() => {
  let rows = pageList.value
  if (searchForm.type === 'home') {
    rows = rows.filter((row) => boundHomePageId.value && String(row.id) === boundHomePageId.value)
  }
  if (searchForm.status === 'live') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'live')
  } else if (searchForm.status === 'dirty') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'dirty')
  } else if (searchForm.status === 'draft') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'draft')
  }
  return localPagination.value ? rows.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize) : rows
})



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

/** 外观里绑定的首页 pageId */
const boundHomePageId = ref('')

async function loadBoundHomePageId() {
  try {
    const res = await getConfigsSilent()
    const configs = (res as any)?.data || []
    const hit = configs.find((c: { configKey?: string }) => c.configKey === 'miniappHomePageId')
    boundHomePageId.value = String(hit?.configValue || '').trim()
  } catch {
    boundHomePageId.value = ''
  }
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
  const type = Number(formData.type || 3)
  if (isHomePathLocked(type)) {
    callback()
    return
  }
  const normalized = normalizeBuilderPath(value)
  if (!normalized) {
    callback(new Error('请填写访问路径后缀'))
    return
  }
  const { slug } = splitEditablePath(normalized, type)
  const slugErr = validatePathSlug(slug, type)
  if (slugErr) {
    callback(new Error(slugErr))
    return
  }
  if (!/^\/pages\/[a-z0-9/_-]+$/i.test(normalized)) {
    callback(new Error('路径格式不正确'))
    return
  }
  if (isPathTaken(normalized)) {
    callback(new Error('访问路径已存在，请更换后缀'))
    return
  }
  callback()
}

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入页面名称', trigger: ['blur', 'change'] },
    { max: 128, message: '页面名称不能超过 128 个字符', trigger: ['blur', 'change'] },
  ],
  type: [{ required: false, trigger: 'change' }],
  path: [{ validator: validatePagePath, trigger: 'blur' }],
}

function getLiveStatusKey(row: PageRecord): 'draft' | 'live' | 'dirty' {
  const status = Number(row.status)
  const current = Number(row.currentVersion || row.version || 0)
  const latest = Number(row.latestVersion || row.version || 0)
  const dirty = row.hasUnpublishedChanges === true || (status === 1 && latest > current)
  if (status === 1 && dirty) return 'dirty'
  if (status === 1) return 'live'
  return 'draft'
}

function getLiveStatusLabel(row: PageRecord): string {
  const map = { draft: '草稿', live: '已上线', dirty: '有未上线的改动' }
  return map[getLiveStatusKey(row)]
}

function getLiveStatusBadgeClass(row: PageRecord): string {
  const map = { draft: 'bo', live: 'bg', dirty: 'bw' }
  return map[getLiveStatusKey(row)]
}

function getPageTypeLabel(row: PageRecord): string {
  if (boundHomePageId.value && String(row.id) === boundHomePageId.value) {
    return '首页'
  }
  const map: Record<string, string> = {
    '1': '自定义页',
    '2': '专题页',
    '3': '自定义页',
    home: '自定义页',
    topic: '专题页',
    custom: '自定义页',
    activity: '活动页',
  }
  return map[String(row.type ?? 3)] || '自定义页'
}

function getStatusLabel(status: string | number): string {
  const map: Record<string, string> = { '0': '草稿', '1': '已上线', '2': '草稿', draft: '草稿', published: '已上线', unpublished: '草稿' }
  return map[String(status)] || String(status)
}

function getStatusBadgeClass(status: string | number): string {
  const map: Record<string, string> = { '0': 'bo', '1': 'bg', '2': 'bo', draft: 'bo', published: 'bg', unpublished: 'bo' }
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

async function fetchList() {
  const sequence = ++listSequence
  loading.value = true
  listError.value = ''
  const localFilter = Boolean(searchForm.status || searchForm.type === 'home')
  const params: PageListParams = {
    current: localFilter ? 1 : pagination.page,
    size: localFilter ? 100 : pagination.pageSize,
    keyword: searchForm.keyword || undefined,
  }
  if (searchForm.type && searchForm.type !== 'home') params.type = Number(searchForm.type)
  try {
    await loadBoundHomePageId()
    if (sequence !== listSequence) return
    const first = await getPageList(params)
    let records = (first.data?.records || []).map(normalizePageRecord)
    const total = first.data?.total || 0
    if (localFilter) {
      let current = 2
      while (records.length < total) {
        if (sequence !== listSequence) return
        const result = await getPageList({ ...params, current: current++ })
        const batch = (result.data?.records || []).map(normalizePageRecord)
        if (!batch.length) break
        records = records.concat(batch)
      }
    }
    if (sequence !== listSequence) return
    pageList.value = records
    localPagination.value = localFilter
    const filtered = records.filter(row =>
      (searchForm.type !== 'home' || String(row.id) === boundHomePageId.value)
      && (!searchForm.status || getLiveStatusKey(row) === searchForm.status))
    pagination.total = localFilter ? filtered.length : total
    listLoaded = true
  } catch {
    if (sequence !== listSequence) return
    listError.value = '页面数据未能读取，请重试。已有页面不会被删除。'
    pageList.value = []
    pagination.total = 0
  } finally {
    if (sequence === listSequence) loading.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
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
  formData.name = ''
  formData.type = 3
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

function handleEditMeta(row: PageRecord) {
  dialogType.value = 'edit'
  editingId.value = Number(row.id)
  formData.name = row.name || ''
  formData.type = Number(row.type) || 3
  formData.path = normalizeBuilderPath(row.path || '')
  formData.shareTitle = row.shareTitle || row.share_title || ''
  formData.shareImage = row.shareImage || row.share_image || ''
  if (isHomePathLocked(formData.type)) {
    formData.path = '/pages/index/index'
  } else if (!formData.path) {
    formData.path = joinEditablePath(pathPrefixByType(formData.type), slugifyName(formData.name), formData.type)
  }
  dialogVisible.value = true
}

function handlePreview(row: PageRecord) {
  router.push({ name: 'PageBuilderPreview', params: { id: row.id } })
}

function handleVersion(row: PageRecord) {
  router.push({ name: 'PageBuilderVersion', params: { id: row.id } })
}

async function handleDuplicate(row: PageRecord) {
  try {
    await ElMessageBox.confirm(`复制页面「${row.name}」为新草稿？`, '复制页面')
    const res = await duplicatePage(row.id)
    ElMessage.success('已复制为草稿')
    const newId = (res as any)?.data?.id
    fetchList()
    if (newId) {
      router.push({ name: 'PageBuilderEditor', params: { id: newId } })
    }
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || err?.message || '复制失败')
  }
}

async function showQr(row: PageRecord) {
  try {
    const { href } = router.resolve({ path: `/page-builder/preview/${row.id}` })
    qrUrl.value = `${window.location.origin}${href}`
    qrDataUrl.value = await QRCode.toDataURL(qrUrl.value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    qrVisible.value = true
  } catch {
    ElMessage.error('生成二维码失败')
  }
}

async function handlePublish(row: PageRecord) {
  if (['1', 'published'].includes(String(row.status))) {
    await ElMessageBox.confirm(`页面「${row.name}」已上线，是否下架？`, '操作确认', { type: 'warning' })
    await unpublishPage(row.id)
    ElMessage.success('已下架')
    fetchList()
    return
  }
  await ElMessageBox.confirm(`确定上线页面「${row.name}」？`, '上线确认')
  await publishPage(row.id)
  ElMessage.success('已上线')
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
    currentVersion: row.currentVersion ?? row.version ?? 0,
    latestVersion: row.latestVersion,
    hasUnpublishedChanges: row.hasUnpublishedChanges,
    updated_at: row.updated_at || row.updateTime || '',
    created_at: row.created_at || row.createTime || '',
  }
}

function buildPagePayload(): CreatePageParams {
  const normalizedPath = normalizeBuilderPath(formData.path)
  return {
    name: formData.name,
    type: Number(formData.type || 3),
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

onMounted(async () => {
  await loadBoundHomePageId()
  fetchList()
  await consumeCreateIntent()
})

watch(
  () => [formData.name, formData.type, dialogVisible.value, dialogType.value],
  ([name, type, visible, mode], [prevName, prevType]) => {
    if (!visible || mode !== 'create') return
    if (name === prevName && type === prevType && formData.path) return
    handleAutoGeneratePath(true)
  },
)

watch(
  () => formData.type,
  (type) => {
    if (!dialogVisible.value) return
    if (isHomePathLocked(type)) {
      formData.path = '/pages/index/index'
      return
    }
    const { slug } = splitEditablePath(formData.path, type)
    formData.path = joinEditablePath(pathPrefixByType(type), slug || slugifyName(formData.name), type)
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

.bw {
  color: #c2410c;
  border-color: #fdba74;
  background: #fff7ed;
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

.mine-row td {
  background: #f8fafc;
}

.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-panel img {
  width: 220px;
  height: 220px;
}

.qr-tip {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

/* Design studio: page library */
.page-library-tools { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.page-status-tabs :deep(.el-radio-button__inner) { background: none; border: 0 !important; box-shadow: none !important; border-radius: 6px; padding: 10px 14px; color: var(--studio-muted); font-size: .875rem; }
.page-status-tabs :deep(.el-radio-button.is-active .el-radio-button__inner) { color: var(--studio-blue); background: #e8edf9; }
.page-library-search { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.page-library-search > .el-input { width: 220px; }
.page-library-search > .el-select { width: 140px; }
.page-library-table { border-color: var(--studio-line); border-radius: 12px; box-shadow: none; }
.page-library-table table { min-width: 860px; width: 100%; font-size: .875rem; }
.page-library-table th { background: #fafbfd; font-size: .8125rem; font-weight: 500; color: var(--studio-muted); padding: 16px 20px; }
.page-library-table td { padding: 20px; vertical-align: middle; }
.page-row-name { display: flex; align-items: center; gap: 10px; font-size: .9375rem; font-weight: 600; }
.page-row-icon { width: 30px; height: 30px; display: inline-grid; place-items: center; border-radius: 6px; background: #edf2ff; color: var(--studio-blue); flex: none; }
.page-library-table .sub { display: block; margin-top: -8px; padding-left: 40px; font-size: .75rem; }
.page-library-table .mine-row { background: #fafbfd; }
.page-library-table .mine-row:hover { background: #f3f6fc; }
.page-library-table .ops { white-space: nowrap; }
.page-library-table .ops > .el-button, .page-library-table .ops > .el-dropdown { margin-right: 6px; }
.page-library-table .path-actions { gap: 8px; }
.page-library-table .btn-copy { border: none; background: none; padding: 0; color: #657491; font-size: .75rem; }
.page-library-table .mono { font-size: .75rem; color: var(--studio-muted); overflow-wrap: anywhere; }
.page-library-empty { padding: 20px !important; }
.page-ops-heading { min-width: 206px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.pages-list .pager { margin-top: 16px; }
.pages-list .summary { color: var(--studio-muted); font-size: .8125rem; }
@media (max-width: 700px) { .page-library-search { width: 100%; } .page-library-search > .el-input { flex: 1; min-width: 160px; } }
</style>
