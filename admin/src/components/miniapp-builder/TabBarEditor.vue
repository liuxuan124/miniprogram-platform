<template>
  <div class="tabbar-editor">
    <div class="editor-header">
      <span class="editor-label">底部导航配置</span>
      <span class="bind-progress">已绑定 {{ boundCount }}/{{ localTabs.length }}</span>
    </div>
    <p class="tabbar-limit-tip">支持 {{ TABBAR_MIN }}~{{ TABBAR_MAX }} 个入口，保存后小程序底部导航即时生效。</p>
    <p class="tabbar-limit-tip">首页默认用系统自带暖阁版式；星球默认用系统自带暖阁星球页。只有给该槽位选了「装修页」才会换成拖出来的布局；发现/商城同理，不选则继续走原有页面。模板中心可套用「暖阁星球页模板」再绑到星球槽。</p>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%', background: progressColor }"></div>
    </div>

    <draggable v-model="localTabs" item-key="id" handle=".drag-handle" @update:modelValue="emitUpdate" class="tab-list">
      <template #item="{ element: tab, index }">
        <div class="tab-item" :class="{ unbound: !tab.pageId && !tab.pagePath.includes('index') && !isNativeShell(tab, index) }">
          <div class="drag-handle">⠿</div>
          <div class="tab-icon-wrap" @click="openIconPicker(index)">
            <TabBarIconDisplay :icon="tab.icon" fallback="📦" />
          </div>
          <div class="tab-fields">
            <el-input v-model="tab.text" placeholder="导航名称" size="small" @input="emitUpdate" />
            <el-select v-model="tab.pageId" placeholder="点了打开哪个页面（可空=系统自带页）" size="small" clearable @change="onPageChange(index)" style="width:100%">
              <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <div class="tab-shell-hint">Tab 槽位：{{ shellLabel(tab, index) }}</div>
            <div v-if="isNativeShell(tab, index)" class="native-tip">未选装修页：用户看到系统自带页面（首页=暖阁原生，星球=暖阁星球原生）</div>
            <div v-else-if="!tab.pageId && !tab.pagePath.includes('index')" class="unbound-tip">还没选页面，用户点了会是空白页</div>
          </div>
          <el-button
            v-if="localTabs.length > TABBAR_MIN"
            type="danger"
            link
            class="tab-remove"
            @click="removeTab(index)"
          >删除</el-button>
        </div>
      </template>
    </draggable>

    <el-button
      v-if="localTabs.length < TABBAR_MAX"
      class="tab-add"
      @click="addTab"
    >+ 添加导航（{{ localTabs.length }}/{{ TABBAR_MAX }}）</el-button>

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
import {
  TABBAR_MIN,
  TABBAR_MAX,
  TAB_SHELL_ROUTES,
  normalizeTabBarItems,
  createEmptyTab,
  resolveTabShellRoute,
  tabBarSnapshot,
} from '@/utils/tabbar'

const props = defineProps<{ tabs: NavTab[]; pages: PageRecord[] }>()
const emit = defineEmits<{ 'update:tabs': [value: NavTab[]] }>()

const SHELL_LABELS: Record<string, string> = {
  '/pages/index/index': '首页槽',
  '/pages/discover/discover': '发现槽',
  '/pages/planet/planet': '星球槽',
  '/pages/shop/shop': '商城槽',
  '/pages/mine/mine': '我的槽',
}

const localTabs = ref<NavTab[]>(normalizeTabBarItems(props.tabs))
watch(
  () => props.tabs,
  (v) => {
    const next = normalizeTabBarItems(v)
    if (JSON.stringify(tabBarSnapshot(next)) === JSON.stringify(tabBarSnapshot(localTabs.value))) return
    localTabs.value = next
  },
  { deep: true },
)

const boundCount = computed(() => localTabs.value.filter(t => t.pageId || t.pagePath.includes('index')).length)
const progressPercent = computed(() => {
  const total = localTabs.value.length || 1
  return Math.round(boundCount.value / total * 100)
})
const progressColor = computed(() => progressPercent.value === 100 ? '#0faa6e' : progressPercent.value >= 50 ? '#f59e0b' : '#ef4444')

const iconLibrary = NAV_FLAT_ICONS

function shellLabel(tab: NavTab, index: number) {
  return SHELL_LABELS[resolveTabShellRoute(tab, index)] || TAB_SHELL_ROUTES[index] || '—'
}

function isNativeShell(tab: NavTab, index: number) {
  const shell = resolveTabShellRoute(tab, index)
  const path = String(tab.pagePath || '')
  const boundCustom = /\/pages\/custom\//.test(path)
  if (boundCustom && tab.pageId) return false
  return (
    shell === '/pages/index/index'
    || shell === '/pages/discover/discover'
    || shell === '/pages/planet/planet'
    || shell === '/pages/shop/shop'
    || shell === '/pages/mine/mine'
  ) && !boundCustom
}

function emitUpdate() {
  const next = normalizeTabBarItems(localTabs.value)
  if (JSON.stringify(tabBarSnapshot(next)) === JSON.stringify(tabBarSnapshot(props.tabs))) {
    localTabs.value = next
    return
  }
  localTabs.value = next
  emit('update:tabs', next)
}

function addTab() {
  if (localTabs.value.length >= TABBAR_MAX) return
  localTabs.value.push(createEmptyTab(localTabs.value))
  emitUpdate()
}

function removeTab(index: number) {
  if (localTabs.value.length <= TABBAR_MIN) return
  localTabs.value.splice(index, 1)
  emitUpdate()
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
.tab-item.unbound { border-color: #ef4444; background: #fef2f2; }
.unbound-tip { font-size: 11.5px; color: #b91c1c; margin-top: 4px; }
.native-tip { font-size: 11.5px; color: #0f766e; margin-top: 4px; }
.tab-shell-hint { font-size: 11px; color: #94a3b8; margin-top: 2px; }
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
.tab-remove { flex-shrink: 0; }
.tab-add { width: 100%; margin-top: 8px; }

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
