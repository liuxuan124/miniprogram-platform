<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="图片">
      <div style="width: 100%">
        <el-input :model-value="data.src || ''" @input="emit('update', { src: $event })" placeholder="图片URL" />
        <label style="display: inline-flex; align-items: center; justify-content: center; height: 30px; margin-top: 4px; padding: 0 12px; font-size: 12px; background: #fff; border: 1px solid #e3e8f0; border-radius: 6px; cursor: pointer;">
          上传图片
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
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()

async function onUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { src: url }),
  })
  input.value = ''
}
</script>
