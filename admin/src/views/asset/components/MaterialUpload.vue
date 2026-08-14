<template>
  <el-dialog
    v-model="visibleProxy"
    :title="title"
    width="520px"
    append-to-body
    align-center
    :z-index="4000"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetAll"
  >
    <div class="upload-body">
      <!-- 上传区域 -->
      <div
        class="upload-dropzone"
        :class="{ 'is-dragover': dragOver, 'has-files': files.length > 0 }"
        @click="onDropzoneClick"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="handleDrop"
      >
        <template v-if="!files.length">
          <el-icon class="dropzone-icon" :size="48"><UploadFilled /></el-icon>
          <p class="dropzone-text">拖拽多个文件到此处，或点击选择文件</p>
          <p class="dropzone-hint">{{ acceptHint }}，一次最多 {{ MAX_BATCH }} 个</p>
          <el-button type="primary" plain @click.stop="addFiles">选择文件（可多选）</el-button>
        </template>
        <template v-else>
          <div class="file-list">
            <div v-for="(file, idx) in files" :key="idx" class="file-item">
              <div class="file-preview">
                <img v-if="file.file?.type?.startsWith('image/')" :src="file.previewUrl" class="file-thumb" />
                <el-icon v-else-if="file.file?.type?.startsWith('video/')" :size="36" color="#7c3aed"><VideoCamera /></el-icon>
                <el-icon v-else-if="file.file?.type?.startsWith('audio/')" :size="36" color="#f59e0b"><Headset /></el-icon>
                <el-icon v-else :size="36" color="#999"><Document /></el-icon>
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.file?.name }}</div>
                <div class="file-size">{{ file.file ? formatSize(file.file.size) : '' }}</div>
                <div class="file-status">
                  <template v-if="file.status === 'pending'">等待上传</template>
                  <template v-else-if="file.status === 'uploading'">
                    <el-progress :percentage="file.progress" :stroke-width="4" />
                  </template>
                  <template v-else-if="file.status === 'success'">
                    <span class="status-success">上传成功</span>
                  </template>
                  <template v-else-if="file.status === 'error'">
                    <span class="status-error">{{ file.error || '上传失败' }}</span>
                  </template>
                </div>
              </div>
              <el-button text type="danger" :icon="Close" size="small" @click="removeFile(idx)" />
            </div>
          </div>
          <el-button type="primary" plain size="small" :icon="Plus" :disabled="uploading || files.length >= MAX_BATCH" @click.stop="addFiles">
            继续添加（{{ files.length }}/{{ MAX_BATCH }}）
          </el-button>
        </template>
      </div>

      <!-- 上传设置 -->
      <div class="upload-settings">
        <el-form label-width="72px" label-position="left" size="default">
          <el-form-item label="目标分组">
            <el-select
              v-model="selectGroupId"
              placeholder="选择分组（可选）"
              clearable
              filterable
              teleported
              popper-class="material-upload-group-dropdown"
              style="width: 100%"
            >
              <el-option
                v-for="g in groupOptions"
                :key="g.id"
                :label="g.name"
                :value="g.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="素材描述">
            <el-input
              v-model="description"
              type="textarea"
              :rows="2"
              placeholder="批量上传时，所有文件共用此描述（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="uploading" :disabled="!files.length" @click="startUpload">
        {{ uploading ? '上传中...' : `上传 (${files.length})` }}
      </el-button>
    </template>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="acceptStr"
      style="display: none"
      @change="handleFileInput"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, VideoCamera, Headset, Document, Close, Plus } from '@element-plus/icons-vue'
import { uploadFile } from '@/api/system'
import { createMaterial, getGroupList } from '@/api/asset'
import { MaterialType, type MaterialGroup } from '@/types/asset'

const props = defineProps<{
  visible: boolean
  activeType: MaterialType | ''
  groups: MaterialGroup[]
  defaultGroupId?: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  uploaded: []
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const localGroups = ref<MaterialGroup[]>([])
const groupOptions = computed(() => {
  const parentGroups = (props.groups || []).filter((g) => g.id && g.name)
  if (parentGroups.length) return parentGroups
  return localGroups.value
})

async function loadGroupOptions() {
  if (props.groups?.length) return
  try {
    const res: any = await getGroupList({ current: 1, size: 200 })
    const list = (res.data?.records || res.data || []) as any[]
    localGroups.value = list
      .map((g: any) => ({
        id: Number(g.id),
        name: g.name || g.groupName || '',
        sortOrder: g.sortOrder,
      }))
      .filter((g: MaterialGroup) => g.id && g.name)
  } catch {
    localGroups.value = []
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await loadGroupOptions()
    selectGroupId.value = props.defaultGroupId
  },
)

const title = computed(() => {
  const labels: Record<string, string> = {
    [MaterialType.Image]: '上传图片素材',
    [MaterialType.Video]: '上传视频素材',
    [MaterialType.Audio]: '上传音频素材',
  }
  return labels[props.activeType] || '上传素材'
})

const acceptHint = computed(() => {
  const hints: Record<string, string> = {
    [MaterialType.Image]: '支持 JPG、PNG、GIF、WebP 格式，单文件最大 10MB',
    [MaterialType.Video]: '支持 MP4、MOV、AVI 格式，单文件最大 100MB',
    [MaterialType.Audio]: '支持 MP3、WAV、AAC、M4A 格式，单文件最大 50MB',
  }
  return hints[props.activeType] || '支持图片、视频、音频格式'
})

const acceptStr = computed(() => {
  const accepts: Record<string, string> = {
    [MaterialType.Image]: 'image/*',
    [MaterialType.Video]: 'video/*',
    [MaterialType.Audio]: 'audio/*',
  }
  return accepts[props.activeType] || 'image/*,video/*,audio/*'
})

interface UploadFileItem {
  file?: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

const MAX_BATCH = 20
const UPLOAD_CONCURRENCY = 3
const files = ref<UploadFileItem[]>([])
const dragOver = ref(false)
const uploading = ref(false)
const selectGroupId = ref<number | undefined>()
const description = ref('')
const fileInputRef = shallowRef<HTMLInputElement>()

function addFiles() {
  fileInputRef.value?.click()
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const newFiles = Array.from(input.files || [])
  addFileItems(newFiles)
  input.value = ''
}

function onDropzoneClick() {
  if (!files.value.length && !uploading.value) addFiles()
}

function addFileItems(newFiles: File[]) {
  const remaining = MAX_BATCH - files.value.length
  if (remaining <= 0) {
    ElMessage.warning(`一次最多上传 ${MAX_BATCH} 个文件`)
    return
  }
  const incoming = newFiles.slice(0, remaining)
  if (newFiles.length > remaining) {
    ElMessage.warning(`已达上限，仅加入前 ${remaining} 个文件`)
  }
  for (const file of incoming) {
    const duplicated = files.value.some(
      (item) => item.file && item.file.name === file.name && item.file.size === file.size
    )
    if (duplicated) continue
    const valid = validateFile(file)
    if (!valid) continue
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    files.value.push({
      file,
      previewUrl,
      status: 'pending',
      progress: 0,
    })
  }
}

function removeFile(idx: number) {
  const item = files.value[idx]
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  files.value.splice(idx, 1)
}

function validateFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  if (file.type.startsWith('image/')) {
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error(`图片 "${file.name}" 超过 10MB 限制`)
      return false
    }
    return true
  }

  if (file.type.startsWith('video/')) {
    if (file.size > 100 * 1024 * 1024) {
      ElMessage.error(`视频 "${file.name}" 超过 100MB 限制`)
      return false
    }
    return true
  }

  if (file.type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'].includes(ext)) {
    if (file.size > 50 * 1024 * 1024) {
      ElMessage.error(`音频 "${file.name}" 超过 50MB 限制`)
      return false
    }
    return true
  }

  ElMessage.error(`不支持的文件格式: ${ext}`)
  return false
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const dropped = Array.from(e.dataTransfer?.files || [])
  addFileItems(dropped)
}

async function uploadOne(item: UploadFileItem) {
  if (!item.file) return
  item.status = 'uploading'
  item.progress = 10
  item.error = undefined
  try {
    const res: any = await uploadFile(item.file)
    item.progress = 80
    const rawUrl = res.data?.url || ''
    const url = resolveUrl(rawUrl)
    if (!url) throw new Error('上传返回的 URL 为空')

    const file = item.file
    let type = MaterialType.Image
    if (file.type.startsWith('video/')) type = MaterialType.Video
    else if (file.type.startsWith('audio/')) type = MaterialType.Audio

    await createMaterial({
      name: file.name,
      type,
      url,
      thumbUrl: type === MaterialType.Image ? url : '',
      size: file.size,
      format: file.name.split('.').pop()?.toUpperCase(),
      groupId: selectGroupId.value != null ? Number(selectGroupId.value) : null,
      description: description.value || undefined,
    })

    item.progress = 100
    item.status = 'success'
  } catch (err: any) {
    item.status = 'error'
    item.error = err?.message || '上传失败'
  }
}

async function startUpload() {
  const pendingFiles = files.value.filter((f) => f.status !== 'success')
  if (!pendingFiles.length) {
    visibleProxy.value = false
    return
  }

  uploading.value = true
  const queue = [...pendingFiles]
  const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (item) await uploadOne(item)
    }
  })
  await Promise.all(workers)
  uploading.value = false

  const successCount = files.value.filter((f) => f.status === 'success').length
  const failCount = files.value.filter((f) => f.status === 'error').length
  if (successCount > 0) emit('uploaded')
  if (failCount === 0 && successCount > 0) {
    ElMessage.success(`成功上传 ${successCount} 个素材`)
    visibleProxy.value = false
    return
  }
  if (successCount > 0 && failCount > 0) {
    ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个，可点上传重试失败项`)
    return
  }
  ElMessage.error('全部上传失败')
}

function resetAll() {
  for (const item of files.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }
  files.value = []
  selectGroupId.value = undefined
  description.value = ''
}

function resolveUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onBeforeUnmount(() => {
  resetAll()
})
</script>

<style lang="scss" scoped>
.upload-body {
  display: grid;
  gap: 20px;
}

.upload-dropzone {
  border: 2px dashed #d9dde3;
  border-radius: 10px;
  padding: 32px 16px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;

  &.is-dragover {
    border-color: #2469f0;
    background: #f0f4ff;
  }

  &.has-files {
    padding: 16px;
    align-items: stretch;
    cursor: default;
  }
}

.dropzone-icon {
  color: #b3c9ff;
}

.dropzone-text {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.dropzone-hint {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.file-list {
  display: grid;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8f9fb;
  border-radius: 8px;
}

.file-preview {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  background: #eef0f4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #999;
}

.file-status {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}

.status-success {
  color: #67c23a;
}

.status-error {
  color: #f56c6c;
}

.upload-settings {
  padding-top: 4px;
}
</style>

<style lang="scss">
/* teleported 到 body，需全局样式提高层级，避免被上传弹窗挡住 */
.material-upload-group-dropdown {
  z-index: 6000 !important;
}
</style>
