<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="展示比例">
      <el-select
        :model-value="aspectRatio"
        style="width: 100%"
        @change="(v: string) => emit('update', { aspect_ratio: v })"
      >
        <el-option
          v-for="opt in IMAGE_ASPECT_RATIO_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <div class="ds-hint">固定比例时预览区按所选比例展示；可裁剪适配</div>
    </el-form-item>

    <el-form-item label="图片">
      <div class="image-field">
        <div v-if="imageUrl" class="image-preview" :style="previewBoxStyle">
          <img :src="imageUrl" alt="" class="image-preview__img" />
        </div>
        <el-input :model-value="imageUrl" @input="updateImage($event)" placeholder="图片URL / 直接粘贴截图" @paste="onPaste" />
        <div class="image-actions">
          <label class="upload-btn">
            {{ uploading ? '上传中…' : '本地上传' }}
            <input type="file" accept="image/*" style="display: none" @change="onUploadImage" />
          </label>
          <el-button
            v-if="imageUrl && canCrop"
            size="small"
            :disabled="uploading"
            @click="openCropDialog"
          >
            裁剪图片
          </el-button>
        </div>
      </div>
    </el-form-item>

    <el-form-item label="链接类型">
      <el-select :model-value="data.link_type || 'page'" @change="emit('update', { link_type: $event })" style="width: 100%">
        <el-option label="页面" value="page" />
        <el-option label="外部链接" value="url" />
        <el-option label="小程序" value="miniapp" />
        <el-option label="无跳转" value="none" />
      </el-select>
    </el-form-item>
    <el-form-item label="链接地址">
      <el-input :model-value="data.link_url || ''" @input="emit('update', { link_url: $event })" placeholder="/pages/xxx/xxx" />
    </el-form-item>

    <ImageCropDialog
      v-model:visible="cropVisible"
      :src="cropSource"
      :aspect-ratio="aspectRatio"
      @confirm="onCropConfirm"
    />
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import ImageCropDialog from '../ImageCropDialog.vue'
import {
  IMAGE_ASPECT_RATIO_OPTIONS,
  aspectRatioCss,
  normalizeAspectRatio,
} from '@/utils/image-aspect-ratio'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage, uploadBlob, uploading } = useImageUpload()
const cropVisible = ref(false)

const aspectRatio = computed(() => normalizeAspectRatio(data.aspect_ratio))
const canCrop = computed(() => aspectRatio.value !== 'auto')

const imageUrl = computed(() => normalizeUploadUrl(data.image || data.src || ''))
const cropSource = computed(() => normalizeUploadUrl(data.image_original || data.image || data.src || ''))

const previewBoxStyle = computed(() => {
  const ratio = aspectRatioCss(aspectRatio.value)
  if (!ratio) {
    return { minHeight: '90px', height: 'auto' }
  }
  return { aspectRatio: ratio, height: 'auto' }
})

function patchImage(url: string, original?: string) {
  const payload: Record<string, string> = { image: url, src: url }
  if (original) payload.image_original = original
  emit('update', payload)
}

function updateImage(url: string) {
  patchImage(url, url)
}

function openCropDialog() {
  if (!cropSource.value) {
    ElMessage.warning('请先上传图片')
    return
  }
  if (!canCrop.value) {
    ElMessage.info('「自适应」模式下无需裁剪')
    return
  }
  cropVisible.value = true
}

async function onCropConfirm(blob: Blob) {
  const url = await uploadBlob(blob, `crop-${Date.now()}.jpg`)
  if (!url) return
  const original = data.image_original || data.image || data.src || url
  patchImage(url, original)
  ElMessage.success('裁剪并已更新图片')
}

async function handleUploadedFile(file: File, openCropAfter = true) {
  await uploadImage(file, {
    maxSizeMB: 8,
    onSuccess: (url) => {
      patchImage(url, url)
      if (openCropAfter && canCrop.value) {
        cropVisible.value = true
      }
    },
  })
}

async function onUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await handleUploadedFile(file)
  input.value = ''
}

async function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        await handleUploadedFile(file)
      }
      return
    }
  }
}
</script>

<style scoped lang="scss">
.ds-hint {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: #8a94a6;
}

.image-field {
  width: 100%;
}

.image-preview {
  width: 100%;
  margin-bottom: 6px;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f5fb;

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
}
</style>
