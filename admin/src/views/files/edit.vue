<template>
  <div class="file-edit-page">
    <header class="page-header">
      <div>
        <h1>{{ isEdit ? '编辑文件' : '上传文件' }}</h1>
        <p class="sub">配置阅读/下载权限与预览比例</p>
      </div>
      <el-button @click="router.back()">返回</el-button>
    </header>

    <el-card shadow="never" v-loading="loading">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="max-width: 760px">
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
            <el-option label="指定等级" value="level" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.readMode === 'level'" label="最低阅读等级">
          <el-select v-model="form.minReadLevelId" clearable style="width: 240px">
            <el-option v-for="lv in levels" :key="lv.id" :label="lv.name" :value="lv.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="文本预览比例">
          <el-slider v-model="form.previewPercent" :min="0" :max="100" show-input style="width: 360px" />
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
  previewPercent: 30,
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
      previewPercent: data.previewPercent ?? 30,
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
.page-header h1 { margin: 0 0 4px; font-size: 20px; }
.sub { margin: 0; color: #909399; font-size: 13px; }
.hint { margin-top: 6px; color: #909399; font-size: 12px; }
</style>
