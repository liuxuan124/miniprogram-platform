<template>
  <div class="material-page">
    <!-- 顶部栏 -->
    <header class="material-header">
      <div class="header-left">
        <h1>素材库</h1>
        <span class="header-meta">共 {{ total }} 个素材</span>
      </div>
      <div class="header-right">
        <el-button text :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
        <el-button text :icon="Link" @click="handleSyncFromWechat" :loading="syncing">
          从微信同步
        </el-button>
        <el-button type="primary" :icon="Upload" @click="openUploadDialog">上传素材</el-button>
      </div>
    </header>

    <!-- 类型标签导航 (微盟风格) -->
    <div class="type-tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.key"
        class="type-tab"
        :class="{ active: activeType === tab.key }"
        @click="switchType(tab.key as MaterialType | '')"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div class="material-layout">
      <!-- 左侧：分组导航 -->
      <aside class="material-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">分类管理</span>
          <el-button text size="small" :icon="EditPen" @click="groupManagerVisible = true">管理</el-button>
        </div>

        <div class="sidebar-scroll">
          <button
            class="sidebar-item"
            :class="{ active: activeGroup === 'all' }"
            @click="selectGroup('all')"
          >
            <span class="sidebar-icon">📁</span>
            <span class="sidebar-label">全部素材</span>
            <span class="sidebar-count">{{ total }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeGroup === 'ungrouped' }"
            @click="selectGroup('ungrouped')"
          >
            <span class="sidebar-icon">📂</span>
            <span class="sidebar-label">未分组</span>
            <span class="sidebar-count">{{ ungroupedCount }}</span>
          </button>
          <div class="sidebar-divider" />
          <button
            v-for="group in groups"
            :key="group.id"
            class="sidebar-item"
            :class="{ active: activeGroup === String(group.id) }"
            @click="selectGroup(String(group.id))"
          >
            <span class="sidebar-icon">📁</span>
            <span class="sidebar-label">{{ group.name }}</span>
            <span class="sidebar-count">{{ group.count ?? 0 }}</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <el-button text size="small" :icon="Plus" @click="openGroupQuickAdd">新建分类</el-button>
        </div>
      </aside>

      <!-- 右侧：主要内容 -->
      <main class="material-main">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              class="toolbar-search"
              placeholder="搜索素材名称"
              clearable
              :prefix-icon="Search"
              @keyup.enter="performSearch"
              @clear="performSearch"
            />
            <el-select v-model="typeFilter" placeholder="类型筛选" clearable @change="performSearch" style="width: 110px">
              <el-option label="全部类型" value="" />
              <el-option label="图片" value="image" />
              <el-option label="视频" value="video" />
              <el-option label="音频" value="audio" />
              <el-option label="图文" value="richtext" />
            </el-select>
            <el-button :icon="Search" @click="performSearch">搜索</el-button>
          </div>
          <div class="toolbar-right">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button value="grid">
                <el-icon><Grid /></el-icon>
              </el-radio-button>
              <el-radio-button value="list">
                <el-icon><List /></el-icon>
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 选中操作栏 -->
        <transition name="fade-slide">
          <div v-if="selectedIds.size > 0" class="selection-bar">
            <span class="selection-info">已选中 <strong>{{ selectedIds.size }}</strong> 项</span>
            <div class="selection-actions">
              <el-button size="small" @click="openMoveDialog">移动到</el-button>
              <el-button size="small" @click="selectAllVisible">全选本页</el-button>
              <el-button size="small" @click="clearSelection">取消选择</el-button>
              <el-button size="small" @click="handleBatchSync" :disabled="syncing">
                <el-icon><Link /></el-icon>同步到微信
              </el-button>
              <el-button size="small" type="danger" plain :icon="Delete" @click="handleBatchDelete">删除</el-button>
            </div>
          </div>
        </transition>

        <!-- 网格视图 -->
        <div v-show="viewMode === 'grid'" class="material-grid-wrapper">
          <div v-if="loading && !records.length" class="material-grid skeleton-grid">
            <div v-for="n in 12" :key="n" class="material-skeleton">
              <div class="skeleton-thumb" />
              <div class="skeleton-info">
                <div class="skeleton-line short" />
                <div class="skeleton-line" />
              </div>
            </div>
          </div>

          <template v-else-if="records.length">
            <div
              class="material-grid"
              @drop.prevent="handleDrop"
              @dragover.prevent="dragOver = true"
              @dragleave.prevent="dragOver = false"
              :class="{ 'drag-over': dragOver }"
            >
              <MaterialCard
                v-for="item in records"
                :key="item.id"
                :record="item"
                :selected="selectedIds.has(item.id)"
                @select="handleCardSelect"
                @preview="handlePreview"
                @edit="handleEdit"
                @action="handleCardAction"
              />
            </div>
          </template>

          <el-empty v-else description="暂无素材" :image-size="160">
            <el-button type="primary" :icon="Upload" @click="openUploadDialog">上传第一批素材</el-button>
          </el-empty>

          <div class="material-footer">
            <span class="footer-info">{{ rangeStart }}-{{ rangeEnd }} / 共 {{ total }} 个</span>
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              background
              layout="prev, pager, next"
              :total="total"
              @current-change="handlePageChange"
              @size-change="handlePageSizeChange"
            />
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-show="viewMode === 'list'" class="material-list-wrapper">
          <el-table
            v-loading="loading"
            :data="records"
            style="width: 100%"
            @selection-change="handleTableSelection"
            @row-dblclick="(row: any) => handlePreview(row)"
          >
            <el-table-column type="selection" width="44" />
            <el-table-column label="素材" min-width="280">
              <template #default="{ row }">
                <div class="list-cell">
                  <img
                    v-if="row.type === MaterialType.Image"
                    :src="resolveUrl(row.thumbUrl || row.url)"
                    class="list-thumb"
                  />
                  <div v-else class="list-type-icon" :style="{ background: typeColor(row.type) }">
                    <el-icon :size="18" color="#fff">
                      <component :is="typeIcon(row.type)" />
                    </el-icon>
                  </div>
                  <div class="list-info">
                    <span class="list-name">{{ row.name || '未命名' }}</span>
                    <span class="list-date">{{ row.createdAt ? formatDate(row.createdAt) : '' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="大小" width="100">
              <template #default="{ row }">{{ row.size ? formatSize(row.size) : '-' }}</template>
            </el-table-column>
            <el-table-column label="分组" width="100">
              <template #default="{ row }">{{ row.groupName || '未分组' }}</template>
            </el-table-column>
            <el-table-column label="微信同步" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.syncStatus === SyncStatus.Synced" type="success" size="small">已同步</el-tag>
                <span v-else class="sync-pending">未同步</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="right">
              <template #default="{ row }">
                <el-button text size="small" @click="handlePreview(row)">预览</el-button>
                <el-button text size="small" type="primary" @click="handleRename(row)">重命名</el-button>
                <el-popconfirm title="确定删除？" @confirm="handleDeleteOne(row)">
                  <template #reference>
                    <el-button text size="small" type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <div class="material-footer">
            <span class="footer-info">{{ rangeStart }}-{{ rangeEnd }} / 共 {{ total }} 个</span>
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              background
              layout="prev, pager, next"
              :total="total"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- 拖拽上传浮层 -->
    <transition name="fade">
      <div v-if="dragOver" class="drop-overlay">
        <div class="drop-content">
          <Upload class="drop-icon" />
          <span class="drop-text">释放以上传文件</span>
        </div>
      </div>
    </transition>

    <!-- 重命名弹窗 -->
    <el-dialog v-model="renameVisible" title="重命名" width="420px" :close-on-click-modal="false">
      <el-input v-model="renameText" ref="renameInputRef" maxlength="60" show-word-limit @keyup.enter="submitRename" />
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" :loading="renaming" @click="submitRename">确定</el-button>
      </template>
    </el-dialog>

    <!-- 移动到弹窗 -->
    <el-dialog v-model="moveDialogVisible" title="移动到分类" width="420px" :close-on-click-modal="false">
      <p style="margin: 0 0 12px; color: #666; font-size: 13px;">将 {{ selectedIds.size }} 个素材移动到：</p>
      <el-select v-model="moveTargetGroupId" placeholder="选择目标分类" style="width: 100%">
        <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
      </el-select>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!moveTargetGroupId" :loading="moving" @click="submitMove">移动</el-button>
      </template>
    </el-dialog>

    <!-- 分组管理 -->
    <GroupManager
      v-model:visible="groupManagerVisible"
      :groups="groups"
      @changed="refreshGroups"
    />

    <!-- 上传 -->
    <MaterialUpload
      v-model:visible="uploadVisible"
      :active-type="activeType"
      :groups="groups"
      @uploaded="refreshAll"
    />

    <!-- 图文编辑器 -->
    <RichTextEditor
      v-model:visible="richtextEditorVisible"
      :edit-record="editTarget"
      :groups="groups"
      @saved="refreshAll"
    />

    <!-- 预览 -->
    <MaterialPreview
      v-model:visible="previewVisible"
      :record="previewRecord"
      @closed="previewRecord = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete, EditPen, Grid, Link, List, Plus, Refresh, Search, Upload,
} from '@element-plus/icons-vue'
import {
  getMaterialList,
  updateMaterial,
  deleteMaterial,
  batchDeleteMaterials,
  batchMoveMaterials,
  getGroupList,
  syncToWechat,
  syncFromWechat,
} from '@/api/asset'
import { uploadFile } from '@/api/system'
import {
  MaterialType,
  MaterialTypeLabels,
  MaterialTypeColors,
  MaterialTypeIcons,
  SyncStatus,
  type MaterialRecord,
  type MaterialGroup,
  type MaterialQueryParams,
} from '@/types/asset'

import MaterialCard from './components/MaterialCard.vue'
import MaterialPreview from './components/MaterialPreview.vue'
import MaterialUpload from './components/MaterialUpload.vue'
import GroupManager from './components/GroupManager.vue'
import RichTextEditor from './components/RichTextEditor.vue'

// ===== 状态 =====
const searchKeyword = ref('')
const typeFilter = ref('')
const activeType = ref<MaterialType | ''>('')
const activeGroup = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedIds = ref<Set<number>>(new Set())
const records = ref<MaterialRecord[]>([])
const groups = ref<MaterialGroup[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(48)
const loading = ref(false)
const dragOver = ref(false)

const renameVisible = ref(false)
const renameText = ref('')
const renaming = ref(false)
const renameTarget = ref<MaterialRecord | null>(null)
const renameInputRef = ref()

const groupManagerVisible = ref(false)

const moveDialogVisible = ref(false)
const moveTargetGroupId = ref<number | undefined>()
const moving = ref(false)

const uploadVisible = ref(false)
const previewVisible = ref(false)
const previewRecord = ref<MaterialRecord | null>(null)

const richtextEditorVisible = ref(false)
const editTarget = ref<MaterialRecord | null>(null)

const syncing = ref(false)

// ===== 计算属性 =====
const ungroupedCount = computed(() => records.value.filter((a) => !a.groupId).length)
const rangeStart = computed(() => records.value.length ? (currentPage.value - 1) * pageSize.value + 1 : 0)
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

const typeTabs = computed(() => [
  { key: '', label: '全部', icon: '📋', count: total.value },
  { key: MaterialType.Image, label: '图片', icon: '🖼️', count: 0 },
  { key: MaterialType.Video, label: '视频', icon: '🎬', count: 0 },
  { key: MaterialType.Audio, label: '音频', icon: '🎵', count: 0 },
  { key: MaterialType.RichText, label: '图文', icon: '📝', count: 0 },
])

// ===== 工具函数 =====
function resolveUrl(url?: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:)/i.test(value)) return value
  if (value.startsWith('/')) return `${window.location.origin}${value}`
  return `${window.location.origin}/${value}`
}

function typeLabel(type: MaterialType) { return MaterialTypeLabels[type] || '未知' }
function typeColor(type: MaterialType) { return MaterialTypeColors[type] || '#666' }
function typeIcon(type: MaterialType) { return MaterialTypeIcons[type] || 'FolderOpened' }

function typeTagType(type: MaterialType) {
  if (type === MaterialType.Image) return 'primary'
  if (type === MaterialType.Video) return ''
  if (type === MaterialType.Audio) return 'warning'
  if (type === MaterialType.RichText) return 'success'
  return 'info'
}

function formatSize(bytes?: number) {
  if (!bytes) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  } catch { return dateStr }
}

function normalizeRecord(raw: any): MaterialRecord {
  const url = raw?.url || raw?.fileUrl || raw?.path || ''
  const type = (raw?.type as MaterialType) || MaterialType.Image
  return {
    id: Number(raw?.id || 0),
    name: raw?.name || raw?.originalName || '',
    type,
    url,
    thumbUrl: raw?.thumbUrl || raw?.thumbnail || (type === MaterialType.Image ? url : ''),
    size: Number(raw?.size || 0),
    width: raw?.width,
    height: raw?.height,
    duration: raw?.duration,
    format: raw?.format,
    groupId: raw?.groupId ?? null,
    groupName: raw?.groupName,
    richTextContent: raw?.richTextContent,
    syncStatus: raw?.syncStatus ?? SyncStatus.NotSynced,
    tags: raw?.tags,
    description: raw?.description,
    createdBy: raw?.createdBy,
    createdAt: raw?.createdAt || raw?.createTime,
    updatedAt: raw?.updatedAt || raw?.updateTime,
  }
}

// ===== 数据获取 =====
async function refreshGroups() {
  try {
    const res: any = await getGroupList()
    groups.value = ((res.data?.records || res.data || []) as any[]).map((g: any) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sortOrder,
      parentId: g.parentId,
      count: g.count ?? 0,
    }))
  } catch { groups.value = [] }
}

async function fetchRecords() {
  loading.value = true
  try {
    const params: MaterialQueryParams = {
      current: currentPage.value,
      size: pageSize.value,
    }
    if (activeType.value) params.type = activeType.value
    if (typeFilter.value) params.type = typeFilter.value as MaterialType
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    if (activeGroup.value === 'ungrouped') params.groupId = -1
    else if (activeGroup.value !== 'all') params.groupId = Number(activeGroup.value)

    const res: any = await getMaterialList(params)
    const page = res.data || {}
    records.value = (page.records || []).map(normalizeRecord).filter((item: MaterialRecord) => item.id && item.url)
    total.value = Number(page.total || records.value.length)
  } finally { loading.value = false }
}

async function refreshAll() {
  await Promise.all([refreshGroups(), fetchRecords()])
}

// ===== 类型切换 =====
function switchType(key: MaterialType | '') {
  activeType.value = key
  typeFilter.value = key
  currentPage.value = 1
  selectedIds.value = new Set()
  fetchRecords()
}

// ===== 分组选择 =====
function selectGroup(key: string) {
  activeGroup.value = key
  currentPage.value = 1
  selectedIds.value = new Set()
  fetchRecords()
}

// ===== 搜索 =====
function performSearch() {
  currentPage.value = 1
  selectedIds.value = new Set()
  fetchRecords()
}

// ===== 分页 =====
function handlePageChange() { fetchRecords() }
function handlePageSizeChange(val: number) { pageSize.value = val; currentPage.value = 1; fetchRecords() }

// ===== 选择 =====
function handleCardSelect(record: MaterialRecord, event: MouseEvent) {
  const next = new Set(selectedIds.value)
  if (event?.shiftKey && selectedIds.value.size > 0) {
    const lastId = Array.from(selectedIds.value).pop()!
    const idxLast = records.value.findIndex((a) => a.id === lastId)
    const idxThis = records.value.findIndex((a) => a.id === record.id)
    if (idxLast >= 0 && idxThis >= 0) {
      const [start, end] = idxLast < idxThis ? [idxLast, idxThis] : [idxThis, idxLast]
      for (let i = start; i <= end; i++) next.add(records.value[i].id)
      selectedIds.value = next
      return
    }
  }
  if (next.has(record.id)) next.delete(record.id)
  else next.add(record.id)
  selectedIds.value = next
}

function selectAllVisible() {
  const next = new Set(selectedIds.value)
  records.value.forEach((a) => next.add(a.id))
  selectedIds.value = next
}

function clearSelection() { selectedIds.value = new Set() }

function handleTableSelection(rows: MaterialRecord[]) {
  selectedIds.value = new Set(rows.map((r) => r.id))
}

// ===== 预览 =====
function handlePreview(record: MaterialRecord) {
  previewRecord.value = record
  previewVisible.value = true
}

// ===== 编辑 =====
function handleEdit(record: MaterialRecord) {
  if (record.type === MaterialType.RichText) {
    editTarget.value = record
    richtextEditorVisible.value = true
  } else {
    handleRename(record)
  }
}

// ===== 重命名 =====
function handleRename(record: MaterialRecord) {
  renameTarget.value = record
  renameText.value = record.name || ''
  renameVisible.value = true
  nextTick(() => renameInputRef.value?.focus?.() || renameInputRef.value?.$el?.querySelector('input')?.focus())
}

async function submitRename() {
  if (!renameTarget.value || !renameText.value.trim()) return
  renaming.value = true
  try {
    await updateMaterial(renameTarget.value.id, { name: renameText.value.trim() })
    ElMessage.success('已重命名')
    renameVisible.value = false
    await fetchRecords()
  } finally { renaming.value = false }
}

// ===== 卡片菜单操作 =====
function handleCardAction(command: string, record: MaterialRecord) {
  switch (command) {
    case 'rename':
      handleRename(record)
      break
    case 'move':
      selectedIds.value = new Set([record.id])
      openMoveDialog()
      break
    case 'sync':
      handleBatchSync()
      break
    case 'copy-url':
      copyUrl(record.url)
      break
    case 'delete':
      handleDeleteOne(record)
      break
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(resolveUrl(url))
    ElMessage.success('链接已复制')
  } catch { ElMessage.warning('复制失败') }
}

// ===== 删除 =====
async function handleDeleteOne(record: MaterialRecord) {
  try {
    await deleteMaterial(record.id)
    selectedIds.value.delete(record.id)
    selectedIds.value = new Set(selectedIds.value)
    await refreshAll()
  } catch { /* ignore */ }
}

async function handleBatchDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确定删除 ${ids.length} 个素材？此操作不可撤销。`, '批量删除', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    await batchDeleteMaterials({ ids })
    selectedIds.value = new Set()
    await refreshAll()
    ElMessage.success(`已删除 ${ids.length} 个素材`)
  } catch { /* ignore */ }
}

// ===== 移动 =====
function openMoveDialog() {
  if (!selectedIds.value.size) return
  moveTargetGroupId.value = undefined
  moveDialogVisible.value = true
}

async function submitMove() {
  if (moveTargetGroupId.value === undefined) return
  moving.value = true
  try {
    const ids = Array.from(selectedIds.value)
    await batchMoveMaterials({ ids, groupId: moveTargetGroupId.value })
    selectedIds.value = new Set()
    moveDialogVisible.value = false
    await refreshAll()
    ElMessage.success('已移动')
  } finally { moving.value = false }
}

// ===== 上传 =====
function openUploadDialog() { uploadVisible.value = true }

// ===== 分组快速添加 =====
function openGroupQuickAdd() { groupManagerVisible.value = true }

// ===== 微信同步 =====
async function handleBatchSync() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) {
    ElMessage.warning('请先选择素材')
    return
  }
  syncing.value = true
  try {
    await syncToWechat({ ids })
    ElMessage.success(`已发起 ${ids.length} 个素材的同步`)
    await fetchRecords()
  } catch { /* ignore */ } finally { syncing.value = false }
}

async function handleSyncFromWechat() {
  syncing.value = true
  try {
    const res: any = await syncFromWechat()
    const data = res.data || {}
    const count = data.synced ?? 0
    const msg = data.message || ''
    if (count > 0) {
      ElMessage.success(`已从微信同步 ${count} 个素材`)
    } else if (msg) {
      ElMessage.info(msg)
    } else {
      ElMessage.success('同步完成')
    }
    await refreshAll()
  } catch { /* ignore */ } finally { syncing.value = false }
}

// ===== 拖拽上传 =====
function validateFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a'].includes(ext)
  if (!isImage && !isVideo && !isAudio) return false
  const maxSizes: Record<string, number> = { image: 10, video: 100, audio: 50 }
  const type = isImage ? 'image' : isVideo ? 'video' : 'audio'
  if (file.size / 1024 / 1024 > maxSizes[type]) {
    ElMessage.error(`文件 "${file.name}" 超过 ${maxSizes[type]}MB 限制`)
    return false
  }
  return true
}

async function handleDrop(e: DragEvent) {
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  for (const file of files) {
    if (!validateFile(file)) continue
    try {
      const res: any = await uploadFile(file)
      const rawUrl = res.data?.url || ''
      const url = resolveUrl(rawUrl)
      if (!url) continue
      let type = MaterialType.Image
      if (file.type.startsWith('video/')) type = MaterialType.Video
      else if (file.type.startsWith('audio/')) type = MaterialType.Audio
      await import('@/api/asset').then(m =>
        m.createMaterial({
          name: file.name,
          type,
          url,
          thumbUrl: type === MaterialType.Image ? url : '',
          size: file.size,
          format: file.name.split('.').pop()?.toUpperCase(),
          groupId: activeGroup.value !== 'all' && activeGroup.value !== 'ungrouped'
            ? Number(activeGroup.value) : null,
        })
      )
    } catch { /* skip failed */ }
  }
  await refreshAll()
  if (files.length) ElMessage.success('拖拽上传完成')
}

// ===== 初始化 =====
onMounted(refreshAll)
</script>

<style lang="scss" scoped>
/* ===== 整体 ===== */
.material-page {
  min-height: 100%;
  color: #1a1a2e;
}

/* ===== 顶部 ===== */
.material-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
  h1 { margin: 0; font-size: 22px; font-weight: 800; color: #111; }
}
.header-meta { color: #999; font-size: 13px; }
.header-right { display: flex; align-items: center; gap: 8px; }

/* ===== 类型标签导航（微盟风格） ===== */
.type-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
  padding: 4px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  overflow-x: auto;
}
.type-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  font-size: 13px;
  color: #666;
  &:hover { background: #f3f5f8; color: #333; }
  &.active {
    background: #2469f0;
    color: #fff;
    font-weight: 600;
    .tab-count { background: rgba(255, 255, 255, 0.25); color: #fff; }
  }
}
.tab-icon { font-size: 15px; }
.tab-label { font-size: 13px; }
.tab-count {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f0f1f4;
  color: #999;
  font-weight: 500;
}

/* ===== 布局 ===== */
.material-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* ===== 侧边栏 ===== */
.material-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  .sidebar-title { font-size: 13px; font-weight: 700; color: #333; letter-spacing: 0.3px; }
}
.sidebar-scroll {
  padding: 0 8px 8px;
  display: grid;
  gap: 2px;
  max-height: calc(100vh - 440px);
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #e0e3e8; border-radius: 4px; }
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  &:hover { background: #f3f5f8; }
  &.active {
    background: #f0f4ff;
    .sidebar-label { color: #2469f0; font-weight: 600; }
    .sidebar-count { color: #2469f0; }
  }
}
.sidebar-icon { font-size: 15px; flex-shrink: 0; }
.sidebar-label { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-count { font-size: 11px; color: #999; font-variant-numeric: tabular-nums; }
.sidebar-divider { height: 1px; background: #edf0f5; margin: 6px 2px; }
.sidebar-footer { padding: 8px 16px 12px; border-top: 1px solid #edf0f5; }

/* ===== 主区域 ===== */
.material-main { flex: 1; min-width: 0; display: grid; gap: 14px; }

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.toolbar-search { width: min(320px, 40vw); }
.toolbar-right { display: flex; align-items: center; gap: 8px; }

/* ===== 选中操作栏 ===== */
.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #f0f4ff;
  border: 1px solid #d6e4ff;
  border-radius: 10px;
}
.selection-info { font-size: 13px; color: #333; strong { color: #2469f0; } }
.selection-actions { display: flex; align-items: center; gap: 8px; }

/* ===== 网格视图 ===== */
.material-grid-wrapper {
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  padding: 16px;
}
.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  min-height: 200px;
  &.drag-over {
    outline: 2px dashed #2469f0;
    outline-offset: -10px;
    background: #f0f4ff;
    border-radius: 8px;
  }
}

/* 骨架屏 */
.skeleton-grid { gap: 14px; }
.material-skeleton {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf0f5;
}
.skeleton-thumb {
  aspect-ratio: 1;
  background: linear-gradient(90deg, #f0f1f5 25%, #e4e6ed 50%, #f0f1f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-info { padding: 10px 12px; display: grid; gap: 6px; }
.skeleton-line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f1f5 25%, #e4e6ed 50%, #f0f1f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  &.short { width: 60%; }
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ===== 列表视图 ===== */
.material-list-wrapper {
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  overflow: hidden;
}
.list-cell { display: flex; align-items: center; gap: 10px; }
.list-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; background: #f6f8fb; flex-shrink: 0; }
.list-type-icon {
  width: 40px; height: 40px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.list-info { display: flex; flex-direction: column; gap: 2px; }
.list-name { font-size: 13px; color: #222; font-weight: 500; }
.list-date { font-size: 11px; color: #999; }
.sync-pending { font-size: 12px; color: #999; }

/* ===== 页脚 ===== */
.material-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
}
.footer-info { font-size: 12px; color: #999; }

/* ===== 拖拽浮层 ===== */
.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(36, 105, 240, 0.06);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 64px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  .drop-icon { font-size: 48px; color: #2469f0; }
  .drop-text { font-size: 16px; color: #333; font-weight: 600; }
}

/* ===== 过渡 ===== */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.25s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .material-layout { flex-direction: column; }
  .material-sidebar { width: 100%; }
  .sidebar-scroll { max-height: none; display: flex; flex-wrap: wrap; gap: 4px; }
  .sidebar-item { width: auto; }
  .sidebar-divider { display: none; }
  .sidebar-footer { display: none; }
}
@media (max-width: 768px) {
  .material-header { flex-direction: column; align-items: flex-start; }
  .header-right { width: 100%; }
  .type-tabs { flex-wrap: nowrap; }
  .toolbar { flex-direction: column; }
  .toolbar-left { width: 100%; }
  .toolbar-search { width: 100%; }
  .selection-bar { flex-direction: column; align-items: flex-start; }
  .selection-actions { flex-wrap: wrap; }
  .material-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
@media (max-width: 480px) {
  .material-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
}
</style>
