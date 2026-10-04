<template>
  <div class="audio-props">
    <el-form label-width="72px" size="small">
      <el-form-item label="音频标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="音频标题" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input :model-value="data.artist || data.subtitle" @input="emit('update', { artist: $event })" placeholder="作者/副标题（选填）" />
      </el-form-item>
      <el-form-item label="音频地址">
        <div class="field-col">
          <el-input :model-value="audioSrc" @input="updateSrc($event)" placeholder="音频URL 或点击下方本地上传" />
          <label class="upload-btn">
            {{ audioUploading ? '上传中…' : '本地上传音频' }}
            <input type="file" accept="audio/mpeg,audio/mp3,audio/*" style="display: none" @change="onUploadAudio" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="封面图">
        <div class="field-col">
          <el-input :model-value="coverUrl" @input="emit('update', { cover: $event })" placeholder="选填" />
          <label class="upload-btn">
            {{ coverUploading ? '上传中…' : '本地上传封面' }}
            <input type="file" accept="image/*" style="display: none" @change="onUploadCover" />
          </label>
          <AssetPickerButton style="margin-left: 8px" @select="(url: string) => emit('update', { cover: url })" />
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadFile, normalizeUploadUrl } from '@/api/system'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage, uploading: coverUploading } = useImageUpload()
const audioUploading = ref(false)

const audioSrc = computed(() => normalizeUploadUrl(data.src || data.url || data.audio_url || ''))
const coverUrl = computed(() => normalizeUploadUrl(data.cover || ''))

function updateSrc(url: string) {
  emit('update', { src: url, url, audio_url: url })
}

async function onUploadAudio(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('音频大小不能超过 30MB')
    return
  }
  audioUploading.value = true
  try {
    const res = await uploadFile(file)
    const url = (res.data as any)?.url || ''
    if (!url) {
      ElMessage.error('上传成功但未返回音频地址')
      return
    }
    emit('update', { src: url, url, audio_url: url })
    ElMessage.success('音频已上传')
  } catch (e: any) {
    ElMessage.error(e?.message || '音频上传失败，请重试')
  } finally {
    audioUploading.value = false
  }
}

async function onUploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { cover: url }),
  })
}
</script>

<style lang="scss" scoped>
.field-col {
  width: 100%;

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
}
</style>