<template>
  <el-form label-width="80px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="品牌介绍" />
    </el-form-item>
    <el-form-item label="副标题">
      <el-input :model-value="data.subtitle" @input="emit('update', { subtitle: $event })" placeholder="副标题" />
    </el-form-item>
    <el-form-item label="介绍">
      <el-input :model-value="data.desc" @input="emit('update', { desc: $event })" type="textarea" :rows="4" placeholder="品牌介绍内容" />
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      subtitle-label="副标题字号"
      show-desc
      :title-default="15"
      :subtitle-default="11"
      :desc-default="12"
      @update="(v) => emit('update', v)"
    />

    <el-divider content-position="left" class="field-divider">布局</el-divider>
    <el-form-item label="Logo位置">
      <el-radio-group :model-value="data.logo_position || 'top'" @change="(v: string) => emit('update', { logo_position: v })">
        <el-radio-button value="top">上方</el-radio-button>
        <el-radio-button value="left">左侧</el-radio-button>
        <el-radio-button value="right">右侧</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="文字对齐">
      <el-radio-group :model-value="data.content_align || 'left'" @change="(v: string) => emit('update', { content_align: v })">
        <el-radio-button value="left">左</el-radio-button>
        <el-radio-button value="center">中</el-radio-button>
        <el-radio-button value="right">右</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="Logo尺寸">
      <el-input-number
        :model-value="data.logo_size ?? 48"
        :min="24"
        :max="120"
        controls-position="right"
        @change="(v: number) => emit('update', { logo_size: v })"
      />
    </el-form-item>

    <el-divider content-position="left" class="field-divider">Logo 偏移</el-divider>
    <el-form-item label="左右">
      <el-slider
        :model-value="Number(data.logo_offset_x || 0)"
        :min="-80"
        :max="80"
        show-input
        :show-input-controls="false"
        @change="(v: number) => emit('update', { logo_offset_x: v })"
      />
    </el-form-item>
    <el-form-item label="上下">
      <el-slider
        :model-value="Number(data.logo_offset_y || 0)"
        :min="-80"
        :max="80"
        show-input
        :show-input-controls="false"
        @change="(v: number) => emit('update', { logo_offset_y: v })"
      />
    </el-form-item>

    <el-divider content-position="left" class="field-divider">文字 偏移</el-divider>
    <el-form-item label="左右">
      <el-slider
        :model-value="Number(data.text_offset_x || 0)"
        :min="-80"
        :max="80"
        show-input
        :show-input-controls="false"
        @change="(v: number) => emit('update', { text_offset_x: v })"
      />
    </el-form-item>
    <el-form-item label="上下">
      <el-slider
        :model-value="Number(data.text_offset_y || 0)"
        :min="-80"
        :max="80"
        show-input
        :show-input-controls="false"
        @change="(v: number) => emit('update', { text_offset_y: v })"
      />
    </el-form-item>

    <el-form-item label="Logo">
      <div class="logo-field">
        <div v-if="logoPreview" class="logo-preview">
          <img :src="logoPreview" alt="logo" />
          <el-button text type="danger" size="small" @click="emit('update', { logo: '' })">移除</el-button>
        </div>
        <el-input
          :model-value="data.logo || ''"
          @input="emit('update', { logo: $event })"
          placeholder="Logo 图片URL"
        />
        <label class="upload-btn">
          上传Logo
          <input type="file" accept="image/*" hidden @change="onUploadLogo" />
        </label>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()
const logoPreview = computed(() => normalizeUploadUrl(String(data.logo || '')))

async function onUploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { logo: normalizeUploadUrl(url) }),
  })
  input.value = ''
}
</script>

<style scoped>
.field-divider {
  margin: 10px 0 6px;
  font-size: 12px;
  color: #8a94a6;
}

.logo-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-preview img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e3e8f0;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
}

:deep(.el-slider) {
  width: 100%;
  padding-right: 8px;
}
</style>
