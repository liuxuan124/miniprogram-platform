<template>
  <div class="tabbar-editor">
    <div class="editor-header">
      <span class="editor-label">底部导航配置</span>
      <span class="bind-progress">已绑定 {{ boundCount }}/{{ TABBAR_SLOT_COUNT }}</span>
    </div>
    <p class="tabbar-limit-tip">底部导航固定 {{ TABBAR_SLOT_COUNT }} 个入口（受小程序代码限制，增减需发版）。</p>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%', background: progressColor }"></div>
    </div>

    <draggable v-model="localTabs" item-key="id" handle=".drag-handle" @update:modelValue="emitUpdate" class="tab-list">
      <template #item="{ element: tab, index }">
        <div class="tab-item" :class="{ unbound: !tab.pageId && !tab.pagePath.includes('index') }">
          <div class="drag-handle">⠿</div>
          <div class="tab-icon-wrap" @click="openIconPicker(index)">
            <TabBarIconDisplay :icon="tab.icon" fallback="📦" />
          </div>
          <div class="tab-fields">
            <el-input v-model="tab.text" placeholder="导航名称" size="small" @input="emitUpdate" />
            <el-select v-model="tab.pageId" placeholder="绑定页面" size="small" clearable @change="onPageChange(index)" style="width:100%">
              <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </div>
        </div>
      </template>
    </draggable>

    <el-dialog v-model="iconPickerVisible" title="选择图标" width="520px" destroy-on-close>
      <div class="icon-library">
        <button
          v-for="ic in iconLibrary"
          :key="ic.id"
          type="button"
          class="icon-option icon-option--flat"
          :class="{ active: selectedIcon === ic.src }"
          :title="ic.label"
          @click="selectIcon(ic.src)"
        >
          <img :src="`${ic.src}?t=20260819e`" alt="" />
        </button>
      </div>
      <div class="icon-library__tip">与页面装修「导航栏」相同的扁平图标库</div>
      <template #footer>
        <el-button @click="iconPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmIcon">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import type { NavTab } from '@/types/miniapp'
import type { PageRecord } from '@/types/page'
import { NAV_FLAT_ICONS } from '@/components/page-builder/navIconSet'
import TabBarIconDisplay from './TabBarIconDisplay.vue'

const TABBAR_SLOT_COUNT = 4

const props = defineProps<{ tabs: NavTab[]; pages: PageRecord[] }>()
const emit = defineEmits<{ 'update:tabs': [value: NavTab[]] }>()

function createEmptyTab(index: number): NavTab {
  return {
    id: `tab-${index}-${Date.now()}`,
    text: `导航${index + 1}`,
    icon: '/images/nav-icons/g-bag.png',
    pagePath: '/pages/custom/custom',
    pageId: '',
    pageName: '',
  }
}

function normalizeTabs(tabs: NavTab[]): NavTab[] {
  const source = Array.isArray(tabs) ? tabs : []
  const result = source.slice(0, TABBAR_SLOT_COUNT).map((tab, index) => ({
    ...tab,
    id: tab.id || `tab-${index}`,
  }))
  while (result.length < TABBAR_SLOT_COUNT) {
    result.push(createEmptyTab(result.length))
  }
  return result
}

const localTabs = ref<NavTab[]>(normalizeTabs(props.tabs))
watch(() => props.tabs, (v) => { localTabs.value = normalizeTabs(v) }, { deep: true })

const boundCount = computed(() => localTabs.value.filter(t => t.pageId || t.pagePath.includes('index')).length)
const progressPercent = computed(() => Math.round(boundCount.value / TABBAR_SLOT_COUNT * 100))
const progressColor = computed(() => progressPercent.value === 100 ? '#0faa6e' : progressPercent.value >= 50 ? '#f59e0b' : '#ef4444')

const iconLibrary = NAV_FLAT_ICONS

function emitUpdate() {
  emit('update:tabs', normalizeTabs(localTabs.value))
}

function onPageChange(index: number) {
  const tab = localTabs.value[index]
  const page = props.pages.find(p => String(p.id) === String(tab.pageId))
  if (page) {
    tab.pageName = page.name
    tab.pagePath = page.path || tab.pagePath
  }
  emitUpdate()
}

const iconPickerVisible = ref(false)
const editingIndex = ref(-1)
const selectedIcon = ref('')

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
.editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.editor-label { font-size: 14px; font-weight: 700; color: #172033; }
.bind-progress { font-size: 12px; color: #7b8798; }
.tabbar-limit-tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}
.progress-bar { height: 4px; background: #e3e8f0; border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.tab-list { display: flex; flex-direction: column; gap: 8px; }
.tab-item { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; transition: 0.14s; }
.tab-item.unbound { border-color: #fbbf24; background: #fffbeb; }
.drag-handle { cursor: grab; color: #a0b4d0; font-size: 16px; padding: 0 4px; }
.drag-handle:active { cursor: grabbing; }
.tab-icon-wrap {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: #f0f4ff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
}
.tab-icon-wrap:hover { border-color: var(--color-primary); }
.tab-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.icon-library {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 2px;
}

.icon-option {
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: 0.14s;
  padding: 6px;
}

.icon-option--flat img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
}

.icon-option:hover {
  border-color: var(--color-primary);
  background: #f8faff;
}

.icon-option.active {
  border-color: var(--color-primary);
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.2);
}

.icon-library__tip {
  margin-top: 10px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
