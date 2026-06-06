<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="图文标题" />
    </el-form-item>
    <el-form-item label="布局">
      <el-select :model-value="data.layout || 'left-image'" @change="emit('update', { layout: $event })" style="width: 100%">
        <el-option label="左图右文" value="left-image" />
        <el-option label="右图左文" value="right-image" />
        <el-option label="上图下文" value="top-image" />
      </el-select>
    </el-form-item>
    <el-form-item label="内容">
      <el-input :model-value="data.content" @input="emit('update', { content: $event })" type="textarea" :rows="4" placeholder="图文内容" />
    </el-form-item>
    <el-form-item label="图片">
      <div style="width: 100%">
        <el-input :model-value="data.image || ''" @input="emit('update', { image: $event })" placeholder="图片URL" />
        <label style="display: inline-flex; align-items: center; justify-content: center; height: 30px; margin-top: 4px; padding: 0 12px; font-size: 12px; background: #fff; border: 1px solid #e3e8f0; border-radius: 6px; cursor: pointer;">
          上传图片
          <input type="file" accept="image/*" style="display: none" @change="onUploadImage" />
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

async function onUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { image: url }),
  })
  input.value = ''
}
</script>
