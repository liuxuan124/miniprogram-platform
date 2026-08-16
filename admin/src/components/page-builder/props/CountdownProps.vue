<template>
  <div class="countdown-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="倒计时标题" />
      </el-form-item>
      <el-form-item label="结束时间">
        <div class="datetime-row">
          <input type="date" class="datetime-input" :value="datePart" @input="onDateChange" />
          <el-select class="time-select" :model-value="hourPart" placeholder="时" @change="onHourChange">
            <el-option v-for="h in hourOptions" :key="h" :label="`${h} 时`" :value="h" />
          </el-select>
          <el-select class="time-select" :model-value="minutePart" placeholder="分" @change="onMinuteChange">
            <el-option v-for="m in minuteOptions" :key="m" :label="`${m} 分`" :value="m" />
          </el-select>
        </div>
        <div class="quick-row">
          <button type="button" class="quick-btn" @click="setAfterHours(2)">+2小时</button>
          <button type="button" class="quick-btn" @click="setAfterHours(24)">+1天</button>
          <button type="button" class="quick-btn" @click="setAfterHours(72)">+3天</button>
        </div>
        <div class="field-hint">24 小时制，当前：{{ displayTime || '未设置' }}</div>
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type || 'card'" @change="(v: string) => emit('update', { style_type: v })">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="banner">横幅</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示格式">
        <el-select :model-value="formatValue" style="width: 100%" @change="onFormatChange">
          <el-option label="仅天数（d）" value="d" />
          <el-option label="天 + 时（dh）" value="dh" />
          <el-option label="天 + 时 + 分（dhm）" value="dhm" />
          <el-option label="天时分秒（dhms）" value="dhms" />
        </el-select>
      </el-form-item>
      <el-form-item label="结束文案">
        <el-input :model-value="data.end_text || '已结束'" @input="emit('update', { end_text: $event })" placeholder="已结束" />
      </el-form-item>
      <el-form-item label="标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 15"
          :min="10"
          :max="32"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseParts(raw?: string) {
  const text = String(raw || '').trim()
  if (!text) return { date: '', time: '' }
  const normalized = text.replace('T', ' ')
  const [date = '', timeRaw = ''] = normalized.split(/\s+/)
  return { date, time: timeRaw ? timeRaw.slice(0, 5) : '' }
}

const datePart = computed(() => parseParts(data.end_time || data.target_time).date)
const hourPart = computed(() => parseParts(data.end_time || data.target_time).time.slice(0, 2) || '10')
const minutePart = computed(() => parseParts(data.end_time || data.target_time).time.slice(3, 5) || '00')
const displayTime = computed(() => {
  const { date, time } = parseParts(data.end_time || data.target_time)
  if (!date) return ''
  return time ? `${date} ${time}` : date
})

const formatValue = computed(() => {
  const raw = data.format
  if (raw === 'd' || raw === 'dh' || raw === 'dhm' || raw === 'dhms') return raw
  return 'dhms'
})

function onFormatChange(format: string) {
  emit('update', { format, show_days: true })
}

function emitDateTime(date: string, hour: string, minute: string) {
  if (!date) {
    emit('update', { end_time: '', target_time: '' })
    return
  }
  const value = `${date} ${hour}:${minute}:00`
  emit('update', { end_time: value, target_time: value })
}

function onDateChange(event: Event) {
  const date = (event.target as HTMLInputElement).value
  emitDateTime(date, hourPart.value, minutePart.value)
}

function onHourChange(hour: string) {
  const date = datePart.value || new Date().toISOString().slice(0, 10)
  emitDateTime(date, hour, minutePart.value)
}

function onMinuteChange(minute: string) {
  const date = datePart.value || new Date().toISOString().slice(0, 10)
  emitDateTime(date, hourPart.value, minute)
}

function setAfterHours(hours: number) {
  const value = formatDateTime(new Date(Date.now() + hours * 3600 * 1000))
  emit('update', { end_time: value, target_time: value })
}
</script>

<style scoped>
.datetime-row {
  display: flex;
  gap: 6px;
  width: 100%;
  align-items: center;
}

.datetime-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  color: #1f2937;
  font-size: 13px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-sizing: border-box;
}

.time-select {
  width: 88px;
  flex-shrink: 0;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.quick-btn {
  padding: 2px 8px;
  color: #1769ff;
  font-size: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  cursor: pointer;
}

.field-hint {
  width: 100%;
  margin-top: 4px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}
</style>
