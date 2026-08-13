<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="资质证书" />
    </el-form-item>
    <el-form-item label="列数">
      <el-radio-group :model-value="data.columns || 2" @change="(v: number) => emit('update', { columns: v })">
        <el-radio-button :value="2">双列</el-radio-button>
        <el-radio-button :value="3">三列</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      subtitle-label="名称字号"
      :title-default="15"
      :subtitle-default="11"
      @update="(v) => emit('update', v)"
    />

    <el-divider content-position="left" class="field-divider">证书条目</el-divider>
    <div v-for="(item, i) in items" :key="i" class="cert-card">
      <div class="cert-card__head">
        <span>证书{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveItem(i)">删除</el-button>
      </div>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.name || ''" @input="onUpdateItem(i, 'name', $event)" placeholder="证书名称" />
      </el-form-item>
      <el-form-item label="说明" label-width="50px">
        <el-input :model-value="item.desc || ''" @input="onUpdateItem(i, 'desc', $event)" placeholder="可选说明" />
      </el-form-item>
      <el-form-item label="图片" label-width="50px">
        <div class="img-field">
          <div v-if="previewUrl(item.image)" class="img-preview">
            <img :src="previewUrl(item.image)" alt="" />
            <el-button text type="danger" size="small" @click="onUpdateItem(i, 'image', '')">移除</el-button>
          </div>
          <el-input
            :model-value="item.image || ''"
            @input="onUpdateItem(i, 'image', $event)"
            placeholder="证书图片URL"
          />
          <label class="upload-btn">
            上传图片
            <input type="file" accept="image/*" hidden @change="(e) => onUploadImage(i, e)" />
          </label>
        </div>
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddItem" style="margin-left: 70px">+ 添加证书</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import { useListEditor } from '../composables/useListEditor'
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()

const items = computed(() => {
  const raw = data.items
  return Array.isArray(raw) ? raw : []
})

const { addItem, removeItem, updateItem } = useListEditor(items, {
  createDefault: () => ({ name: '', desc: '', image: '' }),
  maxItems: 20,
})

function previewUrl(url?: string) {
  return normalizeUploadUrl(String(url || ''))
}

function onAddItem() {
  emit('update', { items: addItem() })
}

function onRemoveItem(index: number) {
  emit('update', { items: removeItem(index) })
}

function onUpdateItem(index: number, field: string, value: string) {
  emit('update', { items: updateItem(index, (item) => ({ ...item, [field]: value })) })
}

async function onUploadImage(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => onUpdateItem(index, 'image', normalizeUploadUrl(url)),
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

.cert-card {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}

.cert-card__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #7b8798;
  font-size: 12px;
}

.img-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.img-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.img-preview img {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: #eef2f7;
  border: 1px solid #e3e8f0;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
}
</style>
