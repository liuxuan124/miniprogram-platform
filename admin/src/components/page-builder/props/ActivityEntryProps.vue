<template>
  <div class="activity-entry-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="活动标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="热门活动" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input :model-value="data.subtitle" @input="emit('update', { subtitle: $event })" placeholder="限时优惠" />
      </el-form-item>
      <el-form-item label="封面文案">
        <el-input :model-value="data.cover_text" @input="emit('update', { cover_text: $event })" placeholder="封面图上的文字，可空" />
      </el-form-item>
      <el-form-item label="封面图">
        <div class="img-field">
          <div v-if="imagePreview" class="img-preview">
            <img :src="imagePreview" alt="" />
            <el-button text type="danger" size="small" @click="emit('update', { image: '' })">移除</el-button>
          </div>
          <el-input :model-value="data.image || ''" @input="emit('update', { image: $event })" placeholder="图片URL" />
          <label class="upload-btn">
            上传封面
            <input type="file" accept="image/*" hidden @change="onUploadImage" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="活动时间">
        <div class="datetime-row">
          <input
            type="date"
            class="datetime-input"
            :value="datePart"
            @input="onDatePartInput"
          />
          <el-select
            class="time-select"
            :model-value="hourPart"
            placeholder="时"
            @change="onHourChange"
          >
            <el-option v-for="h in hourOptions" :key="h" :label="`${h} 时`" :value="h" />
          </el-select>
          <el-select
            class="time-select"
            :model-value="minutePart"
            placeholder="分"
            @change="onMinuteChange"
          >
            <el-option v-for="m in minuteOptions" :key="m" :label="`${m} 分`" :value="m" />
          </el-select>
        </div>
        <div class="field-hint">24 小时制，预览显示为 {{ displayDate || '未设置' }}</div>
      </el-form-item>
      <el-form-item label="活动地点">
        <el-input :model-value="data.location || ''" @input="emit('update', { location: $event })" placeholder="如 品牌中心" />
      </el-form-item>
      <el-form-item label="按钮文案">
        <el-input :model-value="data.button_text || '立即预约'" @input="emit('update', { button_text: $event })" placeholder="立即预约" />
      </el-form-item>
      <el-form-item label="显示按钮">
        <el-switch :model-value="data.show_button !== false" @change="(v: boolean) => emit('update', { show_button: v })" />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">外观与跳转</el-divider>
      <el-form-item label="卡片样式">
        <el-radio-group :model-value="data.style_type || 'card'" @change="(v: string) => emit('update', { style_type: v })">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="full">通栏</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="主题色">
        <el-radio-group :model-value="data.theme || 'blue'" @change="(v: string) => emit('update', { theme: v })">
          <el-radio-button value="blue">蓝</el-radio-button>
          <el-radio-button value="purple">紫</el-radio-button>
          <el-radio-button value="dark">深</el-radio-button>
          <el-radio-button value="gold">金</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="链接类型">
        <el-select :model-value="data.link_type || 'page'" @change="(v: string) => emit('update', { link_type: v })" style="width: 100%">
          <el-option label="页面" value="page" />
          <el-option label="外链" value="url" />
          <el-option label="小程序" value="miniapp" />
        </el-select>
      </el-form-item>
      <el-form-item label="链接地址">
        <el-input :model-value="data.link_url || ''" @input="emit('update', { link_url: $event })" placeholder="/pages/activity-detail/..." />
      </el-form-item>

      <TitleFontSizeFields
        :data="data"
        title-label="标题字号"
        subtitle-label="元信息字号"
        :title-default="14"
        :subtitle-default="11"
        @update="(v) => emit('update', v)"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()
const imagePreview = computed(() => normalizeUploadUrl(String(data.image || '')))

function parseDateParts(raw?: string) {
  const text = String(raw || '').trim()
  if (!text) return { date: '', time: '' }
  // 支持 2026-05-10 / 2026-05-10 14:30 / 2026-05-10T14:30
  const normalized = text.replace('T', ' ')
  const [date = '', timeRaw = ''] = normalized.split(/\s+/)
  const time = timeRaw ? timeRaw.slice(0, 5) : ''
  return { date, time }
}

const datePart = computed(() => parseDateParts(data.date).date)
const timePart = computed(() => parseDateParts(data.date).time || '10:00')
const hourPart = computed(() => timePart.value.slice(0, 2) || '10')
const minutePart = computed(() => timePart.value.slice(3, 5) || '00')

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const displayDate = computed(() => {
  const { date, time } = parseDateParts(data.date)
  if (!date) return ''
  return time ? `${date} ${time}` : date
})

function emitDateTime(date: string, time: string) {
  if (!date) {
    emit('update', { date: '' })
    return
  }
  const t = time || '10:00'
  emit('update', { date: `${date} ${t}` })
}

function onDatePartInput(event: Event) {
  const date = (event.target as HTMLInputElement).value
  emitDateTime(date, `${hourPart.value}:${minutePart.value}`)
}

function onHourChange(hour: string) {
  const date = datePart.value || new Date().toISOString().slice(0, 10)
  emitDateTime(date, `${hour}:${minutePart.value}`)
}

function onMinuteChange(minute: string) {
  const date = datePart.value || new Date().toISOString().slice(0, 10)
  emitDateTime(date, `${hourPart.value}:${minute}`)
}

async function onUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { image: normalizeUploadUrl(url) }),
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

.field-hint {
  width: 100%;
  margin-top: 4px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}

.datetime-row {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.datetime-input {
  flex: 1.2;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  color: #1f2937;
  font-size: 13px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
}

.datetime-input:focus {
  border-color: #1769ff;
}

.time-select {
  flex: 0.9;
  min-width: 86px;
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
  width: 72px;
  height: 48px;
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
