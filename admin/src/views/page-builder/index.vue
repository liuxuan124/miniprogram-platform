<template>
  <div class="pages-list">
    <PageHeader
      title="页面管理"
      description="三类页面：固定页（路径锁定，如表单配置的「我的」）· 主站页（可装修的首页等）· 自定义页（运营自建装修页）。改完点「上线」，用户刷新即可看到。"
    >
      <template #actions>
        <el-button @click="openAiDraft">AI 生成页面</el-button>
        <el-button @click="handleSelectTemplate">页面模板</el-button>
        <el-button type="primary" @click="handleCreate">新建页面</el-button>
      </template>
    </PageHeader>

    <el-alert
      class="page-tier-hint"
      type="info"
      :closable="false"
      show-icon
      title="固定页不在下方列表里混排"
      description="「我的」是固定路径壳页，用个人中心表单配置，不是可删除的装修页。首页属于主站页：在装修器编辑，在「品牌导航 / 外观」绑定。"
    />

    <div class="fixed-page-card">
      <div class="fixed-page-card__main">
        <el-tag type="warning" effect="plain" size="small">固定页</el-tag>
        <div class="fixed-page-card__text">
          <b>我的</b>
          <span>路径锁定 /pages/mine/mine · 菜单与会员卡等走表单配置</span>
        </div>
      </div>
      <div class="fixed-page-card__actions">
        <el-button type="primary" @click="router.push('/page-builder/mine')">配置个人中心</el-button>
        <el-button @click="router.push('/page-builder/appearance')">外观绑定</el-button>
      </div>
    </div>

    <el-row :gutter="12" class="stats-row">
      <el-col v-for="stat in statsCards" :key="stat.label" :span="12">
        <button
          type="button"
          class="stat-card"
          :aria-label="stat.ariaLabel"
          @click="handleStatClick(stat.key)"
        >
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-icon" :style="{ background: stat.bg }">
            <el-icon :size="18"><component :is="stat.icon" /></el-icon>
          </div>
        </button>
      </el-col>
    </el-row>

    <div ref="toolbarRef" class="toolbar">
      <el-input
        ref="searchInputRef"
        v-model="searchForm.keyword"
        class="toolbar-search"
        placeholder="搜索页面名称"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="searchForm.type"
        class="toolbar-select"
        placeholder="模块：全部"
        clearable
        @change="handleSearch"
      >
        <el-option label="主站页（首页）" value="home" />
        <el-option label="专题页" :value="2" />
        <el-option label="活动页" value="activity" />
        <el-option label="自定义页" :value="3" />
      </el-select>
      <el-select
        v-model="searchForm.status"
        class="toolbar-select"
        placeholder="状态：全部"
        clearable
        @change="handleSearch"
      >
        <el-option label="已上线" value="live" />
        <el-option label="有未上线的改动" value="dirty" />
        <el-option label="草稿" value="draft" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
      <div class="toolbar-spacer" />
      <template v-if="selectedRows.length">
        <el-button :loading="batchRunning" @click="batchSetStatus('publish')">
          批量上线 {{ selectedRows.length }}
        </el-button>
        <el-button :disabled="batchRunning" @click="batchSetStatus('unpublish')">批量下架</el-button>
        <el-button :disabled="batchRunning" type="danger" plain @click="batchDelete">批量删除</el-button>
      </template>
    </div>

    <section class="table-panel">
      <ListStateWrap
        :loading="loading"
        :error="error"
        :empty="!loading && pageGroups.length === 0"
        empty-text="还没有装修页面"
        empty-description="请先创建页面并完成装修，再到「品牌导航」绑定底部导航"
        @retry="fetchList"
      >
        <template #empty-action>
          <el-button type="primary" @click="handleCreate">新建页面</el-button>
          <el-button @click="openAiDraft">AI 生成页面</el-button>
          <el-button @click="handleSelectTemplate">从模板创建</el-button>
        </template>

        <div v-for="group in pageGroups" :key="group.key" class="module-block">
          <h3 class="module-block__title">{{ group.label }} <span>{{ group.rows.length }}</span></h3>
          <el-table
            :data="group.rows"
            row-key="id"
            table-layout="auto"
            @selection-change="(rows: PageRow[]) => handleGroupSelection(group.key, rows)"
          >
            <el-table-column type="selection" width="44" :selectable="isSelectable" />
            <el-table-column prop="name" label="页面名称" min-width="200" sortable>
              <template #default="{ row }">
                <div class="page-name-cell">
                  <b>{{ row.name }}</b>
                  <span class="sub">{{ pageRowSubtitle(row) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="pageTierTagType(row)" effect="plain">{{ getPageTypeLabel(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="访问路径" min-width="220">
              <template #default="{ row }">
                <div class="path-cell">
                  <span class="mono">{{ row.path }}</span>
                  <el-button
                    class="path-copy"
                    link
                    type="primary"
                    size="small"
                    aria-label="复制路径"
                    @click="copyPath(row)"
                  >复制</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="130" align="center">
              <template #default="{ row }">
                <el-tag :type="getLiveStatusTagType(row)" effect="light">
                  {{ getLiveStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="170" sortable>
              <template #default="{ row }">{{ row.updated_at }}</template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button link type="primary" size="small" @click="handleEdit(row)">装修</el-button>
                  <el-button
                    link
                    :type="isPublished(row.status) ? 'warning' : 'success'"
                    size="small"
                    @click="handlePublish(row)"
                  >{{ isPublished(row.status) ? '下架' : '上线' }}</el-button>
                  <el-dropdown trigger="click" @command="(cmd: string) => handleRowCommand(cmd, row)">
                    <el-button link size="small" class="more-btn" aria-label="更多操作">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="duplicate">复制页面</el-dropdown-item>
                        <el-dropdown-item command="editMeta">编辑信息</el-dropdown-item>
                        <el-dropdown-item command="preview">预览</el-dropdown-item>
                        <el-dropdown-item command="qrcode">扫码查看</el-dropdown-item>
                        <el-dropdown-item command="version">历史版本</el-dropdown-item>
                        <el-dropdown-item
                          v-if="!isMainSiteHome(row)"
                          command="delete"
                          divided
                        >
                          <span class="danger-text">删除</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </ListStateWrap>

      <div class="table-footer">
        <span class="summary">共 {{ pagination.total || pageList.length }} 个页面</span>
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
    </section>

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
          <div class="form-tip">
            此处只能建专题/自定义等运营页。主站首页请在装修后到「外观 / 品牌导航」绑定；固定页「我的」请用上方「配置个人中心」。
          </div>
        </el-form-item>
        <el-form-item label="访问路径" prop="path">
          <PagePathField v-model="formData.path" :page-type="formData.type" />
          <div class="path-hint">自定义页前缀一般为 pages/custom/；勿占用固定页路径 /pages/mine/mine。</div>
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
            <el-button size="small" :loading="uploadingShare" @click="shareFileInput?.click()">
              {{ uploadingShare ? '上传中…' : '本地上传' }}
            </el-button>
            <input ref="shareFileInput" type="file" accept="image/*" hidden @change="onUploadShareImage" />
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

    <AiPagePipelineDialog v-model="aiPipelineVisible" @opened="onAiDraftOpened" @created="fetchList" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ListStateWrap from '@/components/ListStateWrap.vue'
import { Document, Brush, ArrowDown } from '@element-plus/icons-vue'
import { getPageList, createPage, updatePage, deletePage, publishPage, unpublishPage, getPageTemplates, duplicatePage } from '@/api/page'
import { normalizeUploadUrl, getConfigsSilent } from '@/api/system'
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'
import PagePathField from '@/components/page-builder/PagePathField.vue'
import AiPagePipelineDialog from '@/components/page-builder/AiPagePipelineDialog.vue'
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

/** 列表行（可装修的页面记录，不含固定页「我的」虚拟行） */
type PageRow = PageRecord

const router = useRouter()
const route = useRoute()

const searchForm = reactive({
  keyword: '',
  type: '' as string | number,
  status: '' as string | number,
})

const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0,
})

const pageList = ref<PageRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const aiPipelineVisible = ref(false)
const qrVisible = ref(false)
const qrDataUrl = ref('')
const qrUrl = ref('')

const displayList = computed(() => {
  let rows = pageList.value
  if (searchForm.type === 'home') {
    rows = rows.filter((row) => boundHomePageId.value && String(row.id) === boundHomePageId.value)
  } else if (searchForm.type === 'activity') {
    rows = rows.filter((row) => pageModuleKey(row as PageRow) === 'activity')
  } else if (searchForm.type === 2 || searchForm.type === '2') {
    rows = rows.filter((row) => pageModuleKey(row as PageRow) === 'topic')
  } else if (searchForm.type === 3 || searchForm.type === '3') {
    rows = rows.filter((row) => pageModuleKey(row as PageRow) === 'custom')
  }
  if (searchForm.status === 'live') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'live')
  } else if (searchForm.status === 'dirty') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'dirty')
  } else if (searchForm.status === 'draft') {
    rows = rows.filter((row) => getLiveStatusKey(row) === 'draft')
  }
  return rows
})

const tableRows = computed<PageRow[]>(() => displayList.value as PageRow[])

function isMainSiteHome(row: PageRow): boolean {
  return !!(boundHomePageId.value && String(row.id) === boundHomePageId.value)
}

function pageModuleKey(row: PageRow): string {
  if (isMainSiteHome(row)) return 'home'
  const t = String(row.type ?? '')
  if (t === '2' || t === 'topic') return 'topic'
  if (t === 'activity') return 'activity'
  return 'custom'
}

const MODULE_META: Array<{ key: string; label: string }> = [
  { key: 'home', label: '主站页' },
  { key: 'topic', label: '专题页' },
  { key: 'activity', label: '活动页' },
  { key: 'custom', label: '自定义页' },
]

const pageGroups = computed(() => {
  const buckets = new Map<string, PageRow[]>()
  for (const row of tableRows.value) {
    const key = pageModuleKey(row)
    const list = buckets.get(key) || []
    list.push(row)
    buckets.set(key, list)
  }
  return MODULE_META
    .map((m) => ({ ...m, rows: buckets.get(m.key) || [] }))
    .filter((g) => g.rows.length > 0)
})

function isSelectable(_row: PageRow) {
  return true
}

function pageRowSubtitle(row: PageRow): string {
  if (isMainSiteHome(row)) return '主站首页 · 可装修，绑定在外观/品牌导航'
  return row.shareTitle || row.share_title || '运营自建装修页'
}

function pageTierTagType(row: PageRow): 'success' | 'warning' | 'info' | 'primary' {
  const key = pageModuleKey(row)
  if (key === 'home') return 'success'
  if (key === 'topic') return 'warning'
  if (key === 'activity') return 'primary'
  return 'info'
}

const statsCards = ref([
  { key: 'pages', label: '装修页面', value: '-', icon: Document, bg: 'var(--bg-page)', ariaLabel: '查看装修页面列表' },
  { key: 'templates', label: '可用模板', value: '-', icon: Brush, bg: 'var(--bg-page)', ariaLabel: '打开模板' },
])

const toolbarRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<{ focus: () => void } | null>(null)

const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)
const shareFileInput = ref<HTMLInputElement | null>(null)

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

function getLiveStatusTagType(row: PageRecord): 'success' | 'warning' | 'info' {
  const map = { draft: 'info', live: 'success', dirty: 'warning' } as const
  return map[getLiveStatusKey(row)]
}

function getPageTypeLabel(row: PageRecord): string {
  if (boundHomePageId.value && String(row.id) === boundHomePageId.value) {
    return '主站页'
  }
  const map: Record<string, string> = {
    '1': '自定义页',
    '2': '专题页',
    '3': '自定义页',
    home: '主站页',
    topic: '专题页',
    custom: '自定义页',
    activity: '活动页',
  }
  return map[String(row.type ?? 3)] || '自定义页'
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
  error.value = null
  try {
    const params: PageListParams = {
      current: pagination.page,
      size: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
    }
    if (searchForm.type && searchForm.type !== 'home' && searchForm.type !== 'activity' && searchForm.type !== 'mine') {
      params.type = Number(searchForm.type)
    }
    if (searchForm.status === 'live' || searchForm.status === 'dirty') {
      params.status = 1
    } else if (searchForm.status === 'draft') {
      // 草稿含未上线：前端再筛；后端拉全部后本地过滤更准，这里不传 status
    }
    const res = await getPageList(params)
    pageList.value = (res.data?.records || []).map(normalizePageRecord)
    pagination.total = res.data?.total || 0
  } catch (e: any) {
    pageList.value = []
    error.value = e?.response?.data?.message || e?.message || '页面列表加载失败'
  } finally {
    loading.value = false
    loadStats()
    loadBoundHomePageId()
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

/** 筛选条件同步到 URL query，刷新/分享链接后状态不丢 */
watch(
  () => [searchForm.keyword, searchForm.type, searchForm.status],
  ([keyword, type, status]) => {
    const query: Record<string, string> = {}
    if (keyword) query.keyword = String(keyword)
    if (type !== '' && type != null) query.type = String(type)
    if (status) query.status = String(status)
    router.replace({ query })
  },
)

function initSearchFromRoute() {
  const q = route.query
  if (typeof q.keyword === 'string') searchForm.keyword = q.keyword
  if (typeof q.type === 'string') {
    searchForm.type = q.type === 'home' || q.type === 'activity'
      ? q.type
      : (q.type === 'mine' ? '' : Number(q.type) || q.type)
  }
  if (typeof q.status === 'string') searchForm.status = q.status
}

function handleCreate() {
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

function openAiDraft() {
  aiPipelineVisible.value = true
}

function onAiDraftOpened(pageId: string | number) {
  fetchList()
  router.push({ name: 'PageBuilderEditor', params: { id: pageId } })
}

function handleSelectTemplate() {
  router.push({ name: 'TemplateCenter' })
}

function focusPageList() {
  toolbarRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  nextTick(() => searchInputRef.value?.focus())
}

function handleStatClick(key: string) {
  if (key === 'pages') focusPageList()
  else if (key === 'templates') handleSelectTemplate()
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

function handleRowCommand(command: string, row: PageRecord) {
  switch (command) {
    case 'duplicate':
      handleDuplicate(row)
      break
    case 'editMeta':
      handleEditMeta(row)
      break
    case 'preview':
      handlePreview(row)
      break
    case 'qrcode':
      showQr(row)
      break
    case 'version':
      handleVersion(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
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
  if (isMainSiteHome(row as PageRow)) {
    ElMessage.warning('当前绑定的主站首页请先在外观中改绑，再删除旧页')
    return
  }
  await ElMessageBox.confirm(`确定删除页面「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deletePage(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/* ---------- 批量操作 ---------- */

const selectedByGroup = ref<Record<string, PageRow[]>>({})
const selectedRows = computed(() => Object.values(selectedByGroup.value).flat())
const batchRunning = ref(false)

function handleGroupSelection(key: string, rows: PageRow[]) {
  selectedByGroup.value = {
    ...selectedByGroup.value,
    [key]: rows,
  }
}

async function batchSetStatus(action: 'publish' | 'unpublish') {
  if (!selectedRows.value.length) return
  const label = action === 'publish' ? '上线' : '下架'
  try {
    await ElMessageBox.confirm(
      `确定批量${label}选中的 ${selectedRows.value.length} 个页面？`,
      `批量${label}`,
      { type: 'warning' },
    )
  } catch {
    return
  }
  batchRunning.value = true
  try {
    const fn = action === 'publish' ? publishPage : unpublishPage
    const results = await Promise.allSettled(selectedRows.value.map((row) => fn(row.id)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    if (fail) {
      ElMessage.warning(`成功${label} ${ok} 个，失败 ${fail} 个`)
    } else {
      ElMessage.success(`已${label} ${ok} 个页面`)
    }
  } finally {
    batchRunning.value = false
    fetchList()
  }
}

async function batchDelete() {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRows.value.length} 个页面？此操作不可恢复`,
      '批量删除',
      { type: 'error', confirmButtonText: '确定删除' },
    )
  } catch {
    return
  }
  batchRunning.value = true
  try {
    const results = await Promise.allSettled(selectedRows.value.map((row) => deletePage(row.id)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    if (fail) {
      ElMessage.warning(`已删除 ${ok} 个，失败 ${fail} 个`)
    } else {
      ElMessage.success(`已删除 ${ok} 个页面`)
    }
  } finally {
    batchRunning.value = false
    fetchList()
  }
}

/* ---------- 表单 ---------- */

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
  initSearchFromRoute()
  await loadBoundHomePageId()
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

.page-tier-hint {
  margin-bottom: 12px;
}

.fixed-page-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
}

.fixed-page-card__main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.fixed-page-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fixed-page-card__text b {
  font-size: 14px;
}

.fixed-page-card__text span {
  font-size: 12px;
  color: var(--text-secondary, #8b93a7);
}

.fixed-page-card__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 768px) {
  .fixed-page-card {
    flex-direction: column;
    align-items: stretch;
  }
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  position: relative;
  display: block;
  width: 100%;
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--brand, var(--color-primary));
    box-shadow: var(--shadow-md, 0 6px 18px rgba(23, 105, 255, 0.08));
  }

  &:focus-visible {
    outline: 2px solid var(--brand, var(--color-primary));
    outline-offset: 2px;
  }
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
  color: var(--text-secondary);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-search {
  width: 200px;
}

.toolbar-select {
  width: 160px;
}

.toolbar-spacer {
  flex: 1;
}

.table-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 8px 16px 16px;
}

.module-block + .module-block {
  margin-top: 20px;
}

.module-block__title {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);

  span {
    margin-left: 6px;
    font-weight: 500;
    color: var(--text-muted);
  }
}

.page-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  b {
    font-weight: 600;
  }
}

.sub {
  color: var(--text-muted);
  font-size: 12px;
}

.path-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.path-copy {
  opacity: 0;
  flex-shrink: 0;
}

.path-cell:hover .path-copy,
.path-copy:focus-visible {
  opacity: 1;
}

.mono {
  color: var(--text-muted);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 28px;
}

.more-btn {
  display: inline-flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
  color: var(--text-secondary);

  .el-icon {
    margin-left: 2px;
  }
}

.danger-text {
  color: var(--danger);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.summary {
  color: var(--text-muted);
  font-size: 12px;
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
  align-items: flex-start;
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
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-page);
}

.form-tip {
  margin: -4px 0 12px;
  padding: 8px 10px;
  color: var(--warning);
  font-size: 12px;
  line-height: 1.5;
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  border-radius: var(--radius);
}

:deep(.proto-dialog) {
  .el-dialog {
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 16px 20px 8px;
    border-bottom: 1px solid var(--border);
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
</style>
