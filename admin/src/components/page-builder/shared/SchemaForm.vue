<template>
  <div class="wk-form">
    <template v-for="(section, si) in sections" :key="si">
      <el-divider content-position="left">{{ section.title }}</el-divider>
      <el-form label-width="76px" size="small">
        <template v-for="field in section.fields" :key="field.key">
          <el-form-item v-if="visible(field)" :label="field.label">
            <!-- 文本 -->
            <el-input
              v-if="field.type === 'text'"
              :model-value="str(field.key)"
              clearable
              @update:model-value="(v: string) => emit('update', { [field.key]: v })"
            />

            <!-- 多行文本 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              type="textarea"
              :rows="3"
              :model-value="str(field.key)"
              @update:model-value="(v: string) => emit('update', { [field.key]: v })"
            />

            <!-- 数字 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              :model-value="num(field.key)"
              :min="field.min"
              :max="field.max"
              :step="field.step || 1"
              controls-position="right"
              style="width: 100%"
              @change="(v: number | undefined) => emit('update', { [field.key]: v ?? field.min ?? 0 })"
            />

            <!-- 开关 -->
            <el-switch
              v-else-if="field.type === 'switch'"
              :model-value="bool(field.key)"
              @change="(v: boolean) => emit('update', { [field.key]: v })"
            />

            <!-- 下拉 -->
            <el-select
              v-else-if="field.type === 'select'"
              :model-value="data[field.key]"
              style="width: 100%"
              @change="(v: any) => emit('update', { [field.key]: v })"
            >
              <el-option
                v-for="opt in field.options || []"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- 颜色 -->
            <el-color-picker
              v-else-if="field.type === 'color'"
              :model-value="str(field.key)"
              show-alpha
              @change="(v: any) => emit('update', { [field.key]: v || '' })"
            />

            <!-- 图片 -->
            <div v-else-if="field.type === 'image'" class="wk-form__img">
              <img v-if="str(field.key)" :src="normalizeUploadUrl(str(field.key))" alt="" />
              <AssetPickerButton
                :model-value="str(field.key)"
                @update:model-value="(v: string) => emit('update', { [field.key]: v })"
              />
              <el-button
                v-if="str(field.key)"
                text
                type="danger"
                size="small"
                @click="emit('update', { [field.key]: '' })"
              >
                清除
              </el-button>
            </div>

            <!-- 链接 -->
            <LinkPickerField
              v-else-if="field.type === 'link'"
              :label="field.label"
              :model-value="str(field.key)"
              @update:model-value="(v: string) => emit('update', { [field.key]: v })"
            />

            <!-- 列表 -->
            <div v-else-if="field.type === 'list'" class="wk-form__list">
              <div v-for="(row, ri) in list(field.key)" :key="ri" class="wk-form__row">
                <div class="wk-form__row-head">
                  <span>第 {{ ri + 1 }} 项</span>
                  <el-button text type="danger" size="small" @click="removeRow(field.key, ri)">
                    删除
                  </el-button>
                </div>
                <div v-for="sub in field.itemFields || []" :key="sub.key" class="wk-form__sub">
                  <label class="wk-form__sub-label">{{ sub.label }}</label>
                  <el-input
                    :model-value="subText(row, sub)"
                    :type="sub.type === 'textarea' ? 'textarea' : 'text'"
                    :rows="2"
                    @update:model-value="(v: string) => updateRow(field.key, ri, sub.key, v)"
                  />
                </div>
              </div>
              <el-button text type="primary" size="small" @click="addRow(field.key)">
                + 新增一项
              </el-button>
            </div>

            <div v-if="field.hint" class="wk-form__hint">{{ field.hint }}</div>
          </el-form-item>
        </template>
      </el-form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField, FormSection } from './contract'
import type { ComponentInstance } from '@/types/page'
import { normalizeUploadUrl } from '@/api/system'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import LinkPickerField from '../LinkPickerField.vue'

/**
 * Schema 驱动的通用属性面板
 * 22 个新组件共用这一份实现：各自只需在 schema.ts 里声明 formSchema，
 * 不必再为每个组件手写一个近乎重复的 XxxProps.vue。
 */
const props = defineProps<{
  props: ComponentInstance['props']
  sections: FormSection[]
}>()

const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const data = computed<Record<string, any>>(() => props.props || {})
const sections = computed<FormSection[]>(() => props.sections || [])

function str(key: string) {
  const v = data.value[key]
  return v === undefined || v === null ? '' : String(v)
}

function num(key: string) {
  const n = Number(data.value[key])
  return Number.isFinite(n) ? n : 0
}

function bool(key: string) {
  return data.value[key] === true
}

function list(key: string): any[] {
  return Array.isArray(data.value[key]) ? data.value[key] : []
}

/** showIf 条件：字段有 showIf 时按条件显隐 */
function visible(field: FormField) {
  if (!field.showIf) return true
  const actual = data.value[field.showIf.key]
  if (field.showIf.equals === undefined) return !!actual
  return actual === field.showIf.equals
}

function subText(row: any, sub: FormField) {
  const v = row?.[sub.key]
  if (v === undefined || v === null) return ''
  return String(v)
}

function updateRow(listKey: string, index: number, subKey: string, value: string) {
  const next = list(listKey).map((row: any, i: number) =>
    i === index ? { ...(row || {}), [subKey]: value } : row,
  )
  emit('update', { [listKey]: next })
}

function removeRow(listKey: string, index: number) {
  const next = list(listKey).filter((_: any, i: number) => i !== index)
  emit('update', { [listKey]: next })
}

function addRow(listKey: string) {
  // 新增行给空对象，交给运营填；渲染层有 mock 兜底不会白屏
  emit('update', { [listKey]: [...list(listKey), {}] })
}
</script>

<style scoped>
.wk-form__hint {
  width: 100%;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: #a8a29e;
}
.wk-form__img {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.wk-form__img img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ecd9c4;
}
.wk-form__list {
  width: 100%;
}
.wk-form__row {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #f5e6d4;
  border-radius: 8px;
  background: #fffaf3;
}
.wk-form__row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  color: #b45309;
}
.wk-form__sub {
  margin-bottom: 6px;
}
.wk-form__sub-label {
  display: block;
  margin-bottom: 2px;
  font-size: 11px;
  color: #78716c;
}
</style>
