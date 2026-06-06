<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="品牌介绍" />
    </el-form-item>
    <el-form-item label="副标题">
      <el-input :model-value="data.subtitle" @input="emit('update', { subtitle: $event })" placeholder="副标题" />
    </el-form-item>
    <el-form-item label="介绍">
      <el-input :model-value="data.desc" @input="emit('update', { desc: $event })" type="textarea" :rows="4" placeholder="品牌介绍内容" />
    </el-form-item>
    <el-form-item label="Logo">
      <div style="width: 100%">
        <el-input :model-value="data.logo || ''" @input="emit('update', { logo: $event })" placeholder="Logo 图片URL" />
        <label style="display: inline-flex; align-items: center; justify-content: center; height: 30px; margin-top: 4px; padding: 0 12px; font-size: 12px; background: #fff; border: 1px solid #e3e8f0; border-radius: 6px; cursor: pointer;">
          上传Logo
          <input type="file" accept="image/*" style="display: none" @change="onUploadLogo" />
        </label>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()

async function onUploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { logo: url }),
  })
  input.value = ''
}
</script>
