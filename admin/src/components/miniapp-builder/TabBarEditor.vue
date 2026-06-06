<template>
  <div class="tabbar-editor">
    <div class="editor-header">
      <span class="editor-label">底部导航配置</span>
      <span class="bind-progress">已绑定 {{ boundCount }}/{{ tabs.length }}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%', background: progressColor }"></div>
    </div>

    <draggable v-model="localTabs" item-key="id" handle=".drag-handle" @update:modelValue="emitUpdate" class="tab-list">
      <template #item="{ element: tab, index }">
        <div class="tab-item" :class="{ unbound: !tab.pageId && !tab.pagePath.includes('index') }">
          <div class="drag-handle">⠿</div>
          <div class="tab-icon-wrap" @click="openIconPicker(index)">
            <span class="tab-icon-emoji">{{ tab.icon || '📦' }}</span>
          </div>
          <div class="tab-fields">
            <el-input v-model="tab.text" placeholder="导航名称" size="small" @input="emitUpdate" />
            <el-select v-model="tab.pageId" placeholder="绑定页面" size="small" clearable @change="onPageChange(index)" style="width:100%">
              <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </div>
          <el-button v-if="localTabs.length > 2" text size="small" type="danger" @click="removeTab(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </template>
    </draggable>

    <el-button v-if="localTabs.length < 5" text type="primary" size="small" @click="addTab" style="margin-top:8px">
      <el-icon><Plus /></el-icon> 添加导航项
    </el-button>

    <el-dialog v-model="iconPickerVisible" title="选择图标" width="400px" destroy-on-close>
      <div class="icon-grid">
        <button v-for="icon in iconList" :key="icon" class="icon-option" :class="{ active: selectedIcon === icon }" @click="selectIcon(icon)">
          {{ icon }}
        </button>
      </div>
      <template #footer>
        <el-button @click="iconPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmIcon">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import type { NavTab } from '@/types/miniapp'
import type { PageRecord } from '@/types/page'

const props = defineProps<{ tabs: NavTab[]; pages: PageRecord[] }>()
const emit = defineEmits<{ 'update:tabs': [value: NavTab[]] }>()

const localTabs = ref<NavTab[]>([...props.tabs])
watch(() => props.tabs, (v) => { localTabs.value = [...v] }, { deep: true })

const boundCount = computed(() => localTabs.value.filter(t => t.pageId || t.pagePath.includes('index')).length)
const progressPercent = computed(() => localTabs.value.length ? Math.round(boundCount.value / localTabs.value.length * 100) : 0)
const progressColor = computed(() => progressPercent.value === 100 ? '#0faa6e' : progressPercent.value >= 50 ? '#f59e0b' : '#ef4444')

function emitUpdate() { emit('update:tabs', [...localTabs.value]) }

function onPageChange(index: number) {
  const tab = localTabs.value[index]
  const page = props.pages.find(p => p.id === tab.pageId)
  if (page) { tab.pageName = page.name; tab.pagePath = page.path || tab.pagePath }
  emitUpdate()
}

function addTab() {
  localTabs.value.push({ id: `tab-${Date.now()}`, text: '新导航', icon: '📦', pagePath: '/pages/custom/custom', pageId: '', pageName: '' })
  emitUpdate()
}

function removeTab(index: number) {
  localTabs.value.splice(index, 1)
  emitUpdate()
}

const iconPickerVisible = ref(false)
const editingIndex = ref(-1)
const selectedIcon = ref('')
const iconList = ['🏠','📋','🛒','👤','📝','🔍','📅','🛍️','🤖','👑','❤️','⭐','📦','💰','🎫','📞','⚙️','💬','🎯','📊','🎪','🎮','🎵','📸','🔔','🎁','🚀','💡','🔑','📱']

function openIconPicker(index: number) {
  editingIndex.value = index
  selectedIcon.value = localTabs.value[index].icon
  iconPickerVisible.value = true
}

function selectIcon(icon: string) { selectedIcon.value = icon }

function confirmIcon() {
  if (editingIndex.value >= 0) {
    localTabs.value[editingIndex.value].icon = selectedIcon.value
    emitUpdate()
  }
  iconPickerVisible.value = false
}
</script>

<style scoped>
.tabbar-editor { margin-bottom: 20px; }
.editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.editor-label { font-size: 14px; font-weight: 700; color: #172033; }
.bind-progress { font-size: 12px; color: #7b8798; }
.progress-bar { height: 4px; background: #e3e8f0; border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.tab-list { display: flex; flex-direction: column; gap: 8px; }
.tab-item { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; transition: 0.14s; }
.tab-item.unbound { border-color: #fbbf24; background: #fffbeb; }
.drag-handle { cursor: grab; color: #a0b4d0; font-size: 16px; padding: 0 4px; }
.drag-handle:active { cursor: grabbing; }
.tab-icon-wrap { width: 36px; height: 36px; display: grid; place-items: center; background: #f0f4ff; border: 1px solid #d9e2ef; border-radius: 8px; cursor: pointer; flex-shrink: 0; }
.tab-icon-wrap:hover { border-color: #1769ff; }
.tab-icon-emoji { font-size: 18px; }
.tab-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.icon-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.icon-option { width: 40px; height: 40px; display: grid; place-items: center; font-size: 20px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; cursor: pointer; transition: 0.14s; }
.icon-option:hover { border-color: #1769ff; background: #f8faff; }
.icon-option.active { border-color: #1769ff; background: #eff6ff; box-shadow: 0 0 0 2px rgba(23,105,255,0.2); }
</style>
