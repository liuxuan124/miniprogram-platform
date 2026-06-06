<template>
  <el-dialog
    v-model="visibleProxy"
    :title="title"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetAll"
  >
    <div class="upload-body">
      <!-- 上传区域 -->
      <div
        class="upload-dropzone"
        :class="{ 'is-dragover': dragOver, 'has-files': files.length > 0 }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="handleDrop"
      >
        <template v-if="!files.length">
          <el-icon class="dropzone-icon" :size="48"><UploadFilled /></el-icon>
          <p class="dropzone-text">拖拽文件到此处，或点击下方按钮选择文件</p>
          <p class="dropzone-hint">{{ acceptHint }}</p>
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
          <el-button type="primary" plain size="small" :icon="Plus" @click="addFiles">继续添加</el-button>
        </template>
      </div>

      <!-- 上传设置 -->
      <div class="upload-settings">
        <el-form label-width="72px" label-position="left" size="default">
          <el-form-item label="目标分组">
            <el-select v-model="selectGroupId" placeholder="选择分组（可选）" clearable style="width: 100%">
              <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="素材描述">
            <el-input
              v-model="description"
              type="textarea"
              :rows="2"
              placeholder="添加描述信息（可选）"
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
import { computed, ref, shallowRef, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, VideoCamera, Headset, Document, Close, Plus } from '@element-plus/icons-vue'
import { uploadFile } from '@/api/system'
import { createMaterial } from '@/api/asset'
import { MaterialType, type MaterialGroup } from '@/types/asset'

const props = defineProps<{
  visible: boolean
  activeType: MaterialType | ''
  groups: MaterialGroup[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  uploaded: []
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

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

function addFileItems(newFiles: File[]) {
  for (const file of newFiles) {
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

async function startUpload() {
  const pendingFiles = files.value.filter((f) => f.status !== 'success')
  if (!pendingFiles.length) {
    visibleProxy.value = false
    return
  }

  uploading.value = true
  let successCount = 0

  for (const item of pendingFiles) {
    if (!item.file) continue
    item.status = 'uploading'
    item.progress = 10

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
        groupId: selectGroupId.value ?? null,
        description: description.value || undefined,
      })

      item.progress = 100
      item.status = 'success'
      successCount++
    } catch (err: any) {
      item.status = 'error'
      item.error = err?.message || '上传失败'
    }
  }

  uploading.value = false

  if (successCount > 0) {
    ElMessage.success(`成功上传 ${successCount} 个素材`)
    visibleProxy.value = false
    emit('uploaded')
  }
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

  &.is-dragover {
    border-color: #2469f0;
    background: #f0f4ff;
  }

  &.has-files {
    padding: 16px;
    align-items: stretch;
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
