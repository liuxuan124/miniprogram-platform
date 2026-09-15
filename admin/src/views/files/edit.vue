<template>
  <div class="file-edit-page">
    <header class="page-header">
      <div>
        <h1>{{ isEdit ? '编辑文件' : '上传文件' }}</h1>
        <p class="sub">配置阅读/下载权限与预览比例</p>
      </div>
      <el-button @click="router.back()">返回</el-button>
    </header>

    <div class="edit-layout" v-loading="loading">
      <el-card shadow="never" class="form-card">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item v-if="!isEdit" label="选择文件" prop="file">
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar" @change="onPickFile" />
            <div v-if="pickedFile" class="hint">{{ pickedFile.name }} · {{ formatSize(pickedFile.size) }}</div>
          </el-form-item>

          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="展示名称" />
          </el-form-item>

          <el-form-item label="简介">
            <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit />
          </el-form-item>

          <el-form-item label="分组">
            <el-select v-model="form.groupId" clearable placeholder="未分组" style="width: 240px">
              <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="状态">
            <el-radio-group v-model="form.status">
              <el-radio value="draft">草稿</el-radio>
              <el-radio value="published">已发布</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="质量标记">
            <el-radio-group v-model="form.qualityTier">
              <el-radio value="normal">普通</el-radio>
              <el-radio value="premium">精品</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-divider content-position="left">阅读权限</el-divider>

          <el-form-item label="阅读模式">
            <el-select v-model="form.readMode" style="width: 240px">
              <el-option label="免费" value="free" />
              <el-option label="登录可读" value="login" />
              <el-option label="会员可读" value="member" />
              <el-option label="专栏购买者" value="column_buyer" />
              <el-option label="星球成员" value="planet_member" />
              <el-option label="指定等级" value="level" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="form.readMode === 'column_buyer'" label="绑定专栏商品">
            <el-input-number v-model="form.boundProductId" :min="0" controls-position="right" placeholder="空=任一专栏已购" />
            <span class="hint" style="margin-left: 8px">留空表示任一专栏/电子书/资料包已购可读</span>
          </el-form-item>

          <el-form-item v-if="form.readMode === 'level'" label="最低阅读等级">
            <el-select v-model="form.minReadLevelId" clearable style="width: 240px">
              <el-option v-for="lv in levels" :key="lv.id" :label="lv.name" :value="lv.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="预览模式">
            <el-select v-model="form.previewMode" style="width: 240px">
              <el-option label="不可预览" value="none" />
              <el-option label="首页预览" value="first_page" />
              <el-option label="按页数" value="pages" />
              <el-option label="按比例" value="percent" />
              <el-option label="全文预览" value="full" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="form.previewMode === 'pages' || form.previewMode === 'percent'" label="预览数值">
            <el-input-number
              v-model="form.previewValue"
              :min="0"
              :max="form.previewMode === 'percent' ? 100 : 9999"
              controls-position="right"
            />
            <span class="hint" style="margin-left: 8px">
              {{ form.previewMode === 'percent' ? '%' : '页' }}
            </span>
            <el-tag v-if="previewPercentHint" type="info" size="small" style="margin-left: 12px">{{ previewPercentHint }}</el-tag>
          </el-form-item>

          <el-form-item label="总页数">
            <el-input-number v-model="form.pageCount" :min="0" :max="99999" controls-position="right" />
          </el-form-item>

          <el-form-item label="文本预览比例（兼容）">
            <el-slider v-model="form.previewPercent" :min="0" :max="100" show-input style="width: 360px" />
            <div class="hint">旧字段 previewPercent，新模式请优先使用上方「预览模式」</div>
          </el-form-item>

          <el-form-item label="允许转发">
            <el-switch v-model="allowForwardSwitch" />
          </el-form-item>

          <el-form-item label="水印">
            <el-switch v-model="watermarkSwitch" />
          </el-form-item>

          <el-divider content-position="left">下载权限</el-divider>

          <el-form-item label="允许下载">
            <el-switch v-model="allowDownloadSwitch" />
          </el-form-item>

          <el-form-item v-if="allowDownloadSwitch" label="下载受众">
            <el-select v-model="form.downloadAudience" style="width: 240px">
              <el-option label="禁止下载" value="none" />
              <el-option label="全部可读用户" value="all" />
              <el-option label="会员可下" value="member" />
              <el-option label="指定等级" value="level" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="allowDownloadSwitch && form.downloadAudience === 'level'" label="最低下载等级">
            <el-select v-model="form.minDownloadLevelId" clearable style="width: 240px">
              <el-option v-for="lv in levels" :key="lv.id" :label="lv.name" :value="lv.id" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
            <el-button @click="router.back()">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="preview-head">
            <span>端上效果预览</span>
            <span class="preview-sub">非会员看到的样子 · {{ previewModeLabel }}</span>
          </div>
        </template>

        <div v-if="form.previewMode === 'none'" class="prev-block">
          <div class="prev-title">完全不可见</div>
          <div class="sheetbox sheetbox--empty">
            <div class="lock-only">🔒 加入会员后可查看</div>
          </div>
        </div>

        <div v-else-if="form.previewMode === 'full'" class="prev-block">
          <div class="prev-title">全文可预览</div>
          <div class="sheetbox">
            <div class="ln ln-title" />
            <div class="ln" /><div class="ln w92" /><div class="ln w78" /><div class="ln w88" />
            <div class="ln" /><div class="ln w70" />
          </div>
        </div>

        <div v-else class="prev-grid">
          <div class="prev-block">
            <div class="prev-title">{{ freeRangeLabel }} · 完整可见</div>
            <div class="sheetbox">
              <div class="ln ln-title" />
              <div class="ln" /><div class="ln w92" /><div class="ln w78" /><div class="ln w88" />
            </div>
          </div>
          <div class="prev-block">
            <div class="prev-title">{{ lockedRangeLabel }} · 遮罩</div>
            <div class="sheetbox sheetbox--blur">
              <div class="ln ln-title" />
              <div class="ln" /><div class="ln w92" />
            </div>
            <div class="lock">🔒 {{ lockCta }}</div>
          </div>
        </div>

        <p class="preview-hint">
          务必由服务端裁切后再下发，不要把完整文件传到前端再遮挡。
        </p>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  createFile,
  getFileDetail,
  getFileGroups,
  updateFile,
  uploadFileItem,
  type FileGroupItem,
  type FileItemPayload,
} from '@/api/files'
import { getMemberLevelList } from '@/api/member'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const groups = ref<FileGroupItem[]>([])
const levels = ref<Array<{ id: number; name: string }>>([])
const pickedFile = ref<File | null>(null)
const fileId = computed(() => Number(route.query.id || 0) || 0)
const isEdit = computed(() => fileId.value > 0)

const form = reactive<FileItemPayload>({
  name: '',
  summary: '',
  groupId: undefined,
  storageKey: '',
  status: 'draft',
  qualityTier: 'normal',
  readMode: 'free',
  boundProductId: undefined as number | undefined,
  previewPercent: 30,
  previewMode: 'percent',
  previewValue: 30,
  pageCount: undefined as number | undefined,
  allowForward: 1,
  watermark: 0,
  minReadLevelId: undefined,
  allowDownload: 1,
  downloadAudience: 'all',
  minDownloadLevelId: undefined,
})

const allowDownloadSwitch = computed({
  get: () => form.allowDownload === 1,
  set: (v: boolean) => {
    form.allowDownload = v ? 1 : 0
    if (!v) form.downloadAudience = 'none'
    else if (form.downloadAudience === 'none') form.downloadAudience = 'all'
  },
})

const allowForwardSwitch = computed({
  get: () => form.allowForward !== 0,
  set: (v: boolean) => {
    form.allowForward = v ? 1 : 0
  },
})

const watermarkSwitch = computed({
  get: () => form.watermark === 1,
  set: (v: boolean) => {
    form.watermark = v ? 1 : 0
  },
})

const totalPages = computed(() => Math.max(1, Number(form.pageCount) || 12))

const freePages = computed(() => {
  const mode = form.previewMode || 'percent'
  const value = Number(form.previewValue ?? form.previewPercent ?? 0)
  if (mode === 'none') return 0
  if (mode === 'full') return totalPages.value
  if (mode === 'first_page') return 1
  if (mode === 'pages') return Math.min(totalPages.value, Math.max(0, value))
  // percent
  return Math.max(0, Math.min(totalPages.value, Math.ceil((totalPages.value * value) / 100)))
})

const previewModeLabel = computed(() => {
  const map: Record<string, string> = {
    none: '不可预览',
    first_page: '仅首页',
    pages: `前 ${form.previewValue ?? 0} 页`,
    percent: `前 ${form.previewValue ?? form.previewPercent ?? 0}%`,
    full: '全文',
  }
  return map[form.previewMode || 'percent'] || form.previewMode
})

const freeRangeLabel = computed(() => {
  const n = freePages.value
  if (n <= 0) return '无可读页'
  if (n === 1) return '第 1 页'
  return `第 1-${n} 页`
})

const lockedRangeLabel = computed(() => {
  const n = freePages.value
  if (n >= totalPages.value) return '无遮罩'
  return `第 ${n + 1} 页起`
})

const lockCta = computed(() => `加入会员查看全部 ${totalPages.value} 页`)

const previewPercentHint = computed(() => {
  if (form.previewMode === 'none' || form.previewMode === 'full') return ''
  const total = totalPages.value
  const free = freePages.value
  if (!total) return ''
  const pct = Math.min(100, Math.round((free / total) * 100))
  return `可试读 ${free} 页 / 共 ${total} 页 · 约 ${pct}%`
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

function formatSize(size?: number) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  pickedFile.value = file || null
  if (file && !form.name) form.name = file.name
}

async function loadMeta() {
  const [groupRes, levelRes] = await Promise.all([getFileGroups(), getMemberLevelList()])
  groups.value = (groupRes as any).data || []
  levels.value = ((levelRes as any).data || []).map((lv: any) => ({ id: lv.id, name: lv.name }))
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await getFileDetail(fileId.value)
    const data = (res as any).data || {}
    Object.assign(form, {
      name: data.name,
      summary: data.summary,
      groupId: data.groupId,
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      fileType: data.fileType,
      size: data.size,
      status: data.status || 'draft',
      qualityTier: data.qualityTier || 'normal',
      readMode: data.readMode || 'free',
      boundProductId: data.boundProductId ?? data.bound_product_id,
      previewPercent: data.previewPercent ?? 30,
      previewMode: data.previewMode || 'percent',
      previewValue: data.previewValue ?? data.previewPercent ?? 30,
      pageCount: data.pageCount,
      allowForward: data.allowForward ?? 1,
      watermark: data.watermark ?? 0,
      minReadLevelId: data.minReadLevelId,
      allowDownload: data.allowDownload ?? 1,
      downloadAudience: data.downloadAudience || 'all',
      minDownloadLevelId: data.minDownloadLevelId,
    })
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (form.previewMode === 'percent' && form.previewValue != null) {
    form.previewPercent = form.previewValue
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateFile(fileId.value, { ...form })
      ElMessage.success('已保存')
    } else if (pickedFile.value) {
      await uploadFileItem(pickedFile.value, { ...form })
      ElMessage.success('上传成功')
      router.replace('/content/files')
    } else {
      ElMessage.warning('请先选择文件')
      return
    }
    if (isEdit.value) router.back()
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadMeta()
  await loadDetail()
})
</script>

<style scoped>
.file-edit-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-header h1 { margin: 0 0 4px; font-size: 20px; color: #002FA7; }
.sub { margin: 0; color: #909399; font-size: 13px; }
.hint { margin-top: 6px; color: #909399; font-size: 12px; }
.edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}
.form-card { min-width: 0; }
.preview-card { position: sticky; top: 16px; }
.preview-head { display: flex; flex-direction: column; gap: 4px; }
.preview-sub { font-size: 12px; color: #909399; font-weight: 400; }
.prev-grid { display: grid; gap: 12px; }
.prev-block { position: relative; }
.prev-title { font-size: 12px; color: #606266; margin-bottom: 8px; }
.sheetbox {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px;
  background: #fafbfc;
  min-height: 110px;
}
.sheetbox--blur { filter: blur(2px); opacity: 0.65; }
.sheetbox--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  background: #f5f7fa;
}
.ln {
  height: 8px;
  border-radius: 4px;
  background: #dcdfe6;
  margin-bottom: 8px;
  width: 100%;
}
.ln-title { width: 60%; height: 10px; background: #c0c4cc; }
.w92 { width: 92%; }
.w78 { width: 78%; }
.w88 { width: 88%; }
.w70 { width: 70%; }
.lock {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  background: #002FA7;
  color: #fff;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 1;
}
.lock-only { color: #606266; font-size: 13px; }
.preview-hint { margin: 14px 0 0; font-size: 12px; color: #909399; line-height: 1.5; }
@media (max-width: 1100px) {
  .edit-layout { grid-template-columns: 1fr; }
  .preview-card { position: static; }
}
</style>
