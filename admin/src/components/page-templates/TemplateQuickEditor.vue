<template>
  <div class="quick-editor">
    <div class="editor-left">
      <div class="editor-header">
        <h3>🎨 快速编辑</h3>
        <div class="header-actions">
          <el-button text size="small" @click="undo" :disabled="!canUndo">↩ 撤销</el-button>
          <el-button text size="small" @click="redo" :disabled="!canRedo">↪ 重做</el-button>
          <el-button text size="small" type="danger" @click="resetAll">↺ 重置</el-button>
          <el-button text size="small" type="success" @click="handleExport">📤 导出</el-button>
          <el-button type="primary" size="small" @click="$emit('save', localDsl)">💾 保存</el-button>
        </div>
      </div>

      <div class="editor-groups">
        <div v-for="(fields, groupKey) in groupedFields" :key="groupKey" class="group-section">
          <div class="group-header" @click="toggleGroup(groupKey)">
            <span class="group-title">{{ groupLabels[groupKey] || groupKey }}</span>
            <span class="group-arrow" :class="{ collapsed: !collapsedGroups.has(groupKey) }">▸</span>
          </div>
          <div v-show="collapsedGroups.has(groupKey)" class="group-fields">
            <div v-for="field in fields" :key="field.path" class="field-row">
              <label class="field-label">{{ field.label }}</label>
              <div class="field-control">
                <template v-if="field.type === 'text'">
                  <el-input
                    :model-value="getValue(field.path)"
                    :placeholder="field.placeholder"
                    :maxlength="field.maxLength"
                    show-word-limit
                    size="small"
                    @update:model-value="(val: string) => setValue(field.path, val)"
                  />
                </template>
                <template v-else-if="field.type === 'image'">
                  <div class="image-control">
                    <div v-if="getValue(field.path)" class="image-preview">
                      <img :src="getValue(field.path)" alt="" />
                      <el-icon class="remove-img" @click="setValue(field.path, '')"><Close /></el-icon>
                    </div>
                    <el-button v-else size="small" @click="handleImageUpload(field)">📷 上传图片</el-button>
                  </div>
                </template>
                <template v-else-if="field.type === 'color'">
                  <el-color-picker
                    :model-value="getValue(field.path) || '#1769ff'"
                    size="small"
                    @update:model-value="(val: string) => setValue(field.path, val)"
                  />
                </template>
                <template v-else-if="field.type === 'switch'">
                  <el-switch
                    :model-value="!!getValue(field.path)"
                    @update:model-value="(val: boolean) => setValue(field.path, val)"
                  />
                </template>
                <template v-else-if="field.type === 'number'">
                  <el-input-number
                    :model-value="Number(getValue(field.path) ?? 0)"
                    controls-position="right"
                    size="small"
                    @update:model-value="(val: number | undefined) => setValue(field.path, val ?? 0)"
                  />
                </template>
                <template v-else-if="field.type === 'select'">
                  <el-select
                    :model-value="getValue(field.path)"
                    placeholder="请选择"
                    size="small"
                    @change="(val: string) => setValue(field.path, val)"
                  >
                    <el-option
                      v-for="opt in (field.options || [])"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-right">
      <div class="preview-header">
        <span>📱 实时预览</span>
      </div>
      <div class="preview-body">
        <pre class="dsl-preview">{{ formattedDsl }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { EditableField } from '@/types/pageTemplate'

const props = defineProps<{
  dsl: any
  editableFields?: EditableField[]
}>()

const emit = defineEmits<{
  'update:dsl': [value: any]
  save: [value: any]
  export: [data: any]
}>()

const localDsl = reactive<any>(props.dsl ? JSON.parse(JSON.stringify(props.dsl)) : {})
watch(
  () => props.dsl,
  (val) => {
    if (val) Object.assign(localDsl, JSON.parse(JSON.stringify(val)))
  },
  { deep: true }
)

const fields = computed(() => props.editableFields || [])

const groupLabels: Record<string, string> = {
  banner: '轮播图设置',
  nav: '导航入口配置',
  product: '商品展示',
  member: '会员区域',
  coupon: '优惠券区域',
  style: '页面样式',
  countdown: '倒计时模块',
  content: '内容区',
}

const groupedFields = computed(() => {
  const map: Record<string, EditableField[]> = {}
  for (const f of fields.value) {
    const g = f.group || 'style'
    if (!map[g]) map[g] = []
    map[g].push(f)
  }
  return map
})

const collapsedGroups = ref<Set<string>>(new Set(Object.keys(groupedFields.value)))

function toggleGroup(key: string) {
  if (collapsedGroups.value.has(key)) {
    collapsedGroups.value.delete(key)
  } else {
    collapsedGroups.value.add(key)
  }
  collapsedGroups.value = new Set(collapsedGroups.value)
}

function getValue(path: string): any {
  return path.split('.').reduce((obj, key) => obj?.[key], localDsl)
}

function setValue(path: string, value: any) {
  const keys = path.split('.')
  let target = localDsl
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {}
    target = target[keys[i]]
  }
  const oldValue = target[keys[keys.length - 1]]
  target[keys[keys.length - 1]] = value
  pushHistory({ path, oldValue, newValue: value })
  emit('update:dsl', JSON.parse(JSON.stringify(localDsl)))
}

interface HistoryEntry {
  path: string
  oldValue: any
  newValue: any
}
const historyStack = ref<HistoryEntry[]>([])
const historyIndex = ref(-1)

function pushHistory(entry: HistoryEntry) {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value.splice(historyIndex.value + 1)
  }
  historyStack.value.push(entry)
  if (historyStack.value.length > 50) historyStack.value.shift()
  historyIndex.value = historyStack.value.length - 1
}

const canUndo = computed(() => historyIndex.value >= 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

function undo() {
  if (!canUndo.value) return
  const entry = historyStack.value[historyIndex.value]!
  applyToPath(entry.path, entry.oldValue)
  historyIndex.value--
  emit('update:dsl', JSON.parse(JSON.stringify(localDsl)))
}

function redo() {
  if (!canRedo.value) return
  historyIndex.value++
  const entry = historyStack.value[historyIndex.value]!
  applyToPath(entry.path, entry.newValue)
  emit('update:dsl', JSON.parse(JSON.stringify(localDsl)))
}

function applyToPath(path: string, value: any) {
  const keys = path.split('.')
  let target = localDsl
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {}
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value
}

function resetAll() {
  for (const f of fields.value) {
    applyToPath(f.path, f.defaultValue)
  }
  historyStack.value = []
  historyIndex.value = -1
  emit('update:dsl', JSON.parse(JSON.stringify(localDsl)))
  ElMessage.success('已重置为默认值')
}

function handleExport() {
  emit('export', JSON.parse(JSON.stringify(localDsl)))
}

function handleImageUpload(field: EditableField) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setValue(field.path, reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

const formattedDsl = computed(() => {
  try {
    return JSON.stringify(localDsl, null, 2)
  } catch {
    return '{}'
  }
})
</script>

<style scoped>
.quick-editor {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 520px;
}
.editor-left {
  flex: 1;
  min-width: 360px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.editor-right {
  flex: 1.2;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f2f5;
  flex-shrink: 0;
}
.editor-header h3 {
  margin: 0;
  font-size: 15px;
  color: #172033;
}
.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}
.editor-groups {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.group-section {
  border-bottom: 1px solid #f5f7fa;
}
.group-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.14s;
}
.group-header:hover {
  background: #f8faff;
}
.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #3d4a5c;
}
.group-arrow {
  margin-left: auto;
  font-size: 11px;
  color: #a0b4d0;
  transition: transform 0.2s;
}
.group-arrow.collapsed {
  transform: rotate(90deg);
}
.group-fields {
  padding: 4px 16px 12px;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.field-label {
  font-size: 12px;
  color: #607187;
  white-space: nowrap;
  min-width: 80px;
  flex-shrink: 0;
}
.field-control {
  flex: 1;
  min-width: 0;
}
.image-control {
  display: flex;
  align-items: center;
}
.image-preview {
  position: relative;
  width: 64px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e3e8f0;
}
.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-img {
  position: absolute;
  top: -6px;
  right: -6px;
  cursor: pointer;
  color: #f56c6c;
  background: #fff;
  border-radius: 50%;
  font-size: 12px;
}
.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 13px;
  font-weight: 600;
  color: #172033;
  flex-shrink: 0;
}
.preview-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #fafbfc;
}
.dsl-preview {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: #4b5563;
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
