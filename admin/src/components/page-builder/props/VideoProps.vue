<template>
  <div class="video-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="视频地址">
        <div class="field-col">
          <el-input :model-value="videoSrc" @input="updateSrc($event)" placeholder="视频URL 或点击下方本地上传" />
          <label class="upload-btn">
            {{ videoUploading ? '视频上传中…' : '本地上传视频' }}
            <input type="file" accept="video/mp4,video/*" style="display: none" @change="onUploadVideo" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="封面图">
        <div class="field-col">
          <div v-if="posterUrl" class="poster-thumb">
            <img :src="posterUrl" alt="" />
          </div>
          <el-input
            :model-value="posterUrl"
            @input="emit('update', { poster: $event })"
            placeholder="选填，留空自动用视频首帧"
            @paste="onPastePoster"
          />
          <label class="upload-btn">
            {{ posterUploading ? '上传中…' : '本地上传封面' }}
            <input type="file" accept="image/*" style="display: none" @change="onUploadPoster" />
          </label>
          <div class="field-hint">不上传封面时，将自动使用视频开头画面</div>
        </div>
      </el-form-item>
      <el-form-item label="自动播放">
        <el-switch :model-value="data.autoplay" @change="emit('update', { autoplay: $event as boolean })" />
      </el-form-item>
      <el-form-item label="循环播放">
        <el-switch :model-value="data.loop" @change="emit('update', { loop: $event as boolean })" />
      </el-form-item>
      <el-form-item label="控制栏">
        <el-switch :model-value="data.controls" @change="emit('update', { controls: $event as boolean })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadFile, normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage, uploading: posterUploading } = useImageUpload()
const videoUploading = ref(false)

// 规范字段为 src，兼容旧数据的 url
const videoSrc = computed(() => normalizeUploadUrl(data.src || data.url || ''))
const posterUrl = computed(() => normalizeUploadUrl(data.poster || ''))

function updateSrc(url: string) {
  emit('update', { src: url, url })
}

async function onUploadVideo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 50 * 1024 * 1024) {
    ElMessage.warning('视频大小不能超过 50MB')
    return
  }
  videoUploading.value = true
  try {
    // 先在本地截取首帧（避免跨域限制），供无封面时自动使用
    const frame = await captureVideoFrame(file)
    const res = await uploadFile(file)
    const url = (res.data as any)?.url || ''
    if (!url) {
      ElMessage.error('上传成功但未返回视频地址')
      return
    }
    const patch: Record<string, any> = { src: url, url }
    if (!data.poster && frame) {
      try {
        const posterRes = await uploadFile(frame)
        const posterUrl = (posterRes.data as any)?.url || ''
        if (posterUrl) patch.poster = posterUrl
      } catch { /* 封面生成失败不阻塞视频上传 */ }
    }
    emit('update', patch)
    ElMessage.success(patch.poster ? '视频已上传，并自动生成首帧封面' : '视频已上传')
  } catch (e: any) {
    ElMessage.error(e?.message || '视频上传失败，请重试')
  } finally {
    videoUploading.value = false
  }
}

/** 从本地视频文件截取首帧，生成 jpg 封面 */
function captureVideoFrame(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = objectUrl
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    const timeout = setTimeout(() => { cleanup(); resolve(null) }, 8000)
    video.onloadeddata = () => {
      // 跳到 0.1s，避免部分视频第 0 帧是黑屏
      video.currentTime = Math.min(0.1, video.duration || 0.1)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          clearTimeout(timeout)
          cleanup()
          resolve(blob ? new File([blob], 'video-poster.jpg', { type: 'image/jpeg' }) : null)
        }, 'image/jpeg', 0.85)
      } catch {
        clearTimeout(timeout)
        cleanup()
        resolve(null)
      }
    }
    video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null) }
  })
}

async function onUploadPoster(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { poster: url }),
  })
}

/** 封面输入框支持粘贴剪贴板图片 */
async function onPastePoster(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        await uploadImage(file, { maxSizeMB: 5, onSuccess: (url: string) => emit('update', { poster: url }) })
      }
      return
    }
  }
}
</script>

<style lang="scss" scoped>
.field-col {
  width: 100%;

  .poster-thumb {
    width: 100%;
    height: 72px;
    margin-bottom: 4px;
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5fb;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    margin-top: 4px;
    padding: 0 12px;
    font-size: 12px;
    background: #fff;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
    }
  }

  .field-hint {
    margin-top: 2px;
    font-size: 11px;
    color: #98a2b3;
    line-height: 1.4;
  }
}
</style>
