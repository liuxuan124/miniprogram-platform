<template>
  <el-form label-width="80px" size="small">
    <el-form-item label="模块标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="活动列表标题" />
    </el-form-item>
    <el-form-item label="显示数量">
      <el-input-number
        :model-value="data.limit || 4"
        @change="(v: number) => emit('update', { limit: v })"
        :min="1"
        :max="20"
        controls-position="right"
      />
    </el-form-item>
    <el-form-item label="按钮文案">
      <el-input :model-value="data.button_text || '报名'" @input="emit('update', { button_text: $event })" placeholder="报名" />
    </el-form-item>
    <el-form-item label="显示按钮">
      <el-switch :model-value="data.show_button !== false" @change="(v: boolean) => emit('update', { show_button: v })" />
    </el-form-item>
    <el-form-item label="标题字号">
      <el-input-number
        :model-value="data.section_title_font_size ?? 15"
        :min="10"
        :max="28"
        controls-position="right"
        @change="(v: number) => emit('update', { section_title_font_size: v })"
      />
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      title-label="条目字号"
      subtitle-label="元信息字号"
      :title-default="12"
      :subtitle-default="10"
      @update="(v) => emit('update', v)"
    />

    <el-divider content-position="left" class="field-divider">活动条目</el-divider>
    <div v-for="(item, i) in items" :key="i" class="act-card">
      <div class="act-card__head">
        <span>活动{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveItem(i)">删除</el-button>
      </div>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.title || ''" @input="onUpdateItem(i, 'title', $event)" placeholder="活动名称" />
      </el-form-item>
      <el-form-item label="时间" label-width="50px">
        <div class="datetime-row">
          <input type="date" class="datetime-input" :value="datePart(item.date)" @input="(e) => onDateChange(i, e)" />
          <el-select class="time-select" :model-value="hourPart(item.date)" placeholder="时" @change="(v: string) => onHourChange(i, v)">
            <el-option v-for="h in hourOptions" :key="h" :label="`${h} 时`" :value="h" />
          </el-select>
          <el-select class="time-select" :model-value="minutePart(item.date)" placeholder="分" @change="(v: string) => onMinuteChange(i, v)">
            <el-option v-for="m in minuteOptions" :key="m" :label="`${m} 分`" :value="m" />
          </el-select>
        </div>
      </el-form-item>
      <el-form-item label="地点" label-width="50px">
        <el-input :model-value="item.location || ''" @input="onUpdateItem(i, 'location', $event)" placeholder="活动地点" />
      </el-form-item>
      <el-form-item label="封面" label-width="50px">
        <div class="img-field">
          <div v-if="previewUrl(item.cover)" class="img-preview">
            <img :src="previewUrl(item.cover)" alt="" />
            <el-button text type="danger" size="small" @click="onUpdateItem(i, 'cover', '')">移除</el-button>
          </div>
          <el-input :model-value="item.cover || ''" @input="onUpdateItem(i, 'cover', $event)" placeholder="封面图片URL" />
          <label class="upload-btn">
            上传
            <input type="file" accept="image/*" hidden @change="(e) => onUploadCover(i, e)" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="链接" label-width="50px">
        <el-input :model-value="item.link_url || ''" @input="onUpdateItem(i, 'link_url', $event)" placeholder="/pages/activity-detail/..." />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddItem">+ 添加活动</el-button>
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

const items = computed(() => (Array.isArray(data.items) ? data.items : []))

const { addItem, removeItem, updateItem } = useListEditor(items, {
  createDefault: () => ({
    title: '',
    date: '',
    location: '',
    cover: '',
    link_url: '',
  }),
  maxItems: 20,
})

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function previewUrl(url?: string) {
  return normalizeUploadUrl(String(url || ''))
}

function parseDateParts(raw?: string) {
  const text = String(raw || '').trim()
  if (!text) return { date: '', time: '' }
  const normalized = text.replace('T', ' ')
  const [date = '', timeRaw = ''] = normalized.split(/\s+/)
  return { date, time: timeRaw ? timeRaw.slice(0, 5) : '' }
}

function datePart(raw?: string) {
  return parseDateParts(raw).date
}

function hourPart(raw?: string) {
  return parseDateParts(raw).time.slice(0, 2) || '10'
}

function minutePart(raw?: string) {
  return parseDateParts(raw).time.slice(3, 5) || '00'
}

function emitItemDate(index: number, date: string, hour: string, minute: string) {
  if (!date) {
    onUpdateItem(index, 'date', '')
    return
  }
  onUpdateItem(index, 'date', `${date} ${hour}:${minute}`)
}

function onDateChange(index: number, event: Event) {
  const date = (event.target as HTMLInputElement).value
  emitItemDate(index, date, hourPart(items.value[index]?.date), minutePart(items.value[index]?.date))
}

function onHourChange(index: number, hour: string) {
  const date = datePart(items.value[index]?.date) || new Date().toISOString().slice(0, 10)
  emitItemDate(index, date, hour, minutePart(items.value[index]?.date))
}

function onMinuteChange(index: number, minute: string) {
  const date = datePart(items.value[index]?.date) || new Date().toISOString().slice(0, 10)
  emitItemDate(index, date, hourPart(items.value[index]?.date), minute)
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

async function onUploadCover(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => onUpdateItem(index, 'cover', normalizeUploadUrl(url)),
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

.act-card {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}

.act-card__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #7b8798;
  font-size: 12px;
}

.datetime-row {
  display: flex;
  gap: 6px;
  width: 100%;
  align-items: center;
}

.datetime-input {
  flex: 1.2;
  min-width: 0;
  height: 32px;
  padding: 0 6px;
  color: #1f2937;
  font-size: 12px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
}

.time-select {
  flex: 0.85;
  min-width: 78px;
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
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e3e8f0;
  background: #eef2f7;
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
