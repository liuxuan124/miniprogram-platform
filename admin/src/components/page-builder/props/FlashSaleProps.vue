<template>
  <el-form label-width="90px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="限时秒杀" />
    </el-form-item>
    <el-form-item label="商品数量">
      <el-input-number
        :model-value="data.limit ?? 4"
        @change="emit('update', { limit: $event as number })"
        :min="1"
        :max="8"
        controls-position="right"
      />
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      subtitle-label="元信息字号"
      :title-default="13"
      :subtitle-default="11"
      @update="(v) => emit('update', v)"
    />
    <el-form-item label="显示倒计时">
      <el-switch
        :model-value="data.countdown !== false"
        @change="onCountdownToggle"
      />
      <div class="field-hint">开启后在标题栏显示距结束的倒计时</div>
    </el-form-item>
    <el-form-item v-if="data.countdown !== false" label="结束时间">
      <input
        type="datetime-local"
        class="datetime-input"
        :value="datetimeLocalValue"
        :min="minDatetimeLocal"
        step="60"
        @input="onDatetimeInput"
      />
      <div class="quick-row">
        <button type="button" class="quick-btn" @click="setQuickHours(1)">1小时后</button>
        <button type="button" class="quick-btn" @click="setQuickHours(2)">2小时后</button>
        <button type="button" class="quick-btn" @click="setQuickHours(24)">24小时后</button>
      </div>
      <div class="field-hint">可直接点选日期时间，或用快捷按钮设置</div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toDatetimeLocal(raw?: string) {
  if (!raw) return ''
  const d = new Date(String(raw).replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultEndTime() {
  return formatDateTime(new Date(Date.now() + 2 * 3600 * 1000))
}

const datetimeLocalValue = computed(() => toDatetimeLocal(data.end_time))

const minDatetimeLocal = computed(() => {
  const d = new Date()
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function onDatetimeInput(event: Event) {
  const val = (event.target as HTMLInputElement).value
  if (!val) {
    emit('update', { end_time: undefined })
    return
  }
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return
  emit('update', { end_time: formatDateTime(d) })
}

function setQuickHours(hours: number) {
  emit('update', { end_time: formatDateTime(new Date(Date.now() + hours * 3600 * 1000)) })
}

function onCountdownToggle(enabled: boolean) {
  const patch: Record<string, any> = { countdown: enabled }
  if (enabled && !data.end_time) patch.end_time = defaultEndTime()
  emit('update', patch)
}
</script>

<style lang="scss" scoped>
.field-hint {
  width: 100%;
  margin-top: 4px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}

.datetime-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  color: #1f2937;
  font-size: 13px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #1769ff;
  }
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.quick-btn {
  padding: 4px 10px;
  color: #475569;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    color: #1769ff;
    border-color: #bfd4ff;
    background: #eff6ff;
  }
}
</style>
