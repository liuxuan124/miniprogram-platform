<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="图片">
      <div style="width: 100%">
        <div v-if="imageUrl" style="width: 100%; height: 90px; margin-bottom: 4px; border-radius: 6px; overflow: hidden; background: #f1f5fb;">
          <img :src="imageUrl" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block" />
        </div>
        <el-input :model-value="imageUrl" @input="updateImage($event)" placeholder="图片URL / 直接粘贴截图" @paste="onPaste" />
        <label style="display: inline-flex; align-items: center; justify-content: center; height: 30px; margin-top: 4px; padding: 0 12px; font-size: 12px; background: #fff; border: 1px solid #e3e8f0; border-radius: 6px; cursor: pointer;">
          {{ uploading ? '上传中…' : '本地上传' }}
          <input type="file" accept="image/*" style="display: none" @change="onUploadImage" />
        </label>
      </div>
    </el-form-item>
    <el-form-item label="链接类型">
      <el-select :model-value="data.link_type || 'page'" @change="emit('update', { link_type: $event })" style="width: 100%">
        <el-option label="页面" value="page" />
        <el-option label="外部链接" value="url" />
        <el-option label="小程序" value="miniapp" />
      </el-select>
    </el-form-item>
    <el-form-item label="链接地址">
      <el-input :model-value="data.link_url || ''" @input="emit('update', { link_url: $event })" placeholder="/pages/xxx/xxx" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage, uploading } = useImageUpload()

// 兼容历史数据：旧版本把图片存在 src 字段，规范字段为 image
const imageUrl = computed(() => normalizeUploadUrl(data.image || data.src || ''))

function updateImage(url: string) {
  emit('update', { image: url, src: url })
}

async function onUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => updateImage(url),
  })
  input.value = ''
}

/** 支持直接粘贴剪贴板中的图片（如截图） */
async function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        await uploadImage(file, { maxSizeMB: 5, onSuccess: (url: string) => updateImage(url) })
      }
      return
    }
  }
}
</script>
