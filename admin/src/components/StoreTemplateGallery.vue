<template>
  <div class="stg">
    <div class="stg-toolbar">
      <div class="stg-copy">
        <h2 class="stg-title">整店模板</h2>
        <p>一套模板 = 页面布局 + 品牌导航。这里管内容版式，不是微信代码包。同时只能有一套「使用中」。也可在小程序「我的 → 整店模版」里切换。</p>
      </div>
      <div class="stg-actions">
        <el-button type="primary" @click="handleCreateFromCurrent">从当前新建</el-button>
        <el-button :loading="galleryLoading" @click="loadGalleryData">刷新</el-button>
      </div>
    </div>

    <div class="stg-stats">
      <div class="stg-stat">
        <span class="stg-stat__value">{{ releases.length }}</span>
        <span class="stg-stat__label">模板套数</span>
      </div>
      <div class="stg-stat">
        <span class="stg-stat__value">{{ currentName }}</span>
        <span class="stg-stat__label">使用中</span>
      </div>
      <div class="stg-stat">
        <span class="stg-stat__value">内容版式</span>
        <span class="stg-stat__label">与微信发版分开</span>
      </div>
    </div>

    <div v-if="releases.length > 0" v-loading="galleryLoading" class="stg-grid">
      <div
        v-for="item in releases"
        :key="item.id"
        class="stg-card"
        :class="{ live: isInUse(item) }"
      >
        <div class="stg-card__head">
          <div class="stg-card__badges">
            <el-tag v-if="isInUse(item)" type="success" size="small" effect="dark">使用中</el-tag>
            <el-tag v-else type="info" size="small">备用</el-tag>
            <el-tag v-if="isSystem(item)" type="warning" size="small">系统 · 暖阁</el-tag>
          </div>
          <span class="stg-card__name">{{ displayName(item) }}</span>
        </div>
        <div class="stg-card__notes">{{ item.releaseNotes || '整店页面与外观快照。选用=内容上线，不是上传微信代码。' }}</div>
        <div class="stg-card__meta">
          <span>{{ item.pageCount }} 页面</span>
          <span>{{ formatTime(item.updateTime || item.createTime) }}</span>
        </div>
        <div class="stg-card__actions">
          <el-button v-if="!isInUse(item)" size="small" type="primary" @click="handleActivate(item)">套用</el-button>
          <el-button size="small" @click="handleEditTemplate(item)">编辑外观</el-button>
          <el-button size="small" @click="handleCapture(item)">覆盖保存</el-button>
          <el-dropdown trigger="click">
            <el-button size="small">更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleRename(item)">重命名</el-dropdown-item>
                <el-dropdown-item @click="handleDuplicate(item)">复制</el-dropdown-item>
                <el-dropdown-item @click="openFullMiniappPreview(item)">预览此模板</el-dropdown-item>
                <el-dropdown-item :disabled="isInUse(item) || isSystem(item)" @click="handleDelete(item)">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <el-empty v-else :description="galleryLoading ? '加载中…' : '还没有整店模板。用当前页面和导航生成一套。'">
      <el-button type="primary" @click="handleCreateFromCurrent">从当前新建</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getStoreTemplates,
  createStoreTemplate,
  duplicateStoreTemplate,
  renameStoreTemplate,
  activateStoreTemplate,
  captureStoreTemplate,
  deleteRelease as deleteReleaseApi,
  toReleaseId,
} from '@/api/version'
import type { ReleaseRecord } from '@/types/page'

const emit = defineEmits<{
  edit: [item: ReleaseRecord]
}>()

const router = useRouter()
const galleryLoading = ref(false)
const releases = ref<ReleaseRecord[]>([])

function isInUse(item: ReleaseRecord) {
  return item.isCurrent === 1 || item.isCurrent === true
}

function isSystem(item: ReleaseRecord) {
  return item.isSystem === 1 || item.isSystem === true || item.templateCode === 'warm'
}

function displayName(item: ReleaseRecord) {
  return item.templateName || item.releaseNotes || (item.semver ? `版式 ${item.semver}` : '未命名模板')
}

const currentName = computed(() => {
  const cur = releases.value.find(isInUse)
  return cur ? displayName(cur) : '未选用'
})

async function loadGalleryData() {
  galleryLoading.value = true
  try {
    const res = await getStoreTemplates()
    const data = (res as any)?.data || res
    releases.value = Array.isArray(data) ? data : []
  } catch {
    releases.value = []
  } finally {
    galleryLoading.value = false
  }
}

async function promptName(title: string, initial: string) {
  const { value } = await ElMessageBox.prompt('给这套版式起个短名字', title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: initial,
    inputPlaceholder: '例如：春日版式',
  })
  return String(value || '').trim()
}

async function handleCreateFromCurrent() {
  try {
    const name = await promptName('从当前新建', '当前版式')
    await createStoreTemplate(name)
    ElMessage.success('已保存为模板')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error((e as any)?.message || '新建失败')
  }
}

async function handleActivate(item: ReleaseRecord) {
  if (toReleaseId(item.id) == null) return
  try {
    await ElMessageBox.confirm(
      `选用「${displayName(item)}」后，当前站点的页面布局与底部导航会换成这套，并按内容通道上线（用户刷新即可看到）。\n\n这不是上传微信代码包。日常改页也不用推体验版。`,
      '套用整店模板',
      { type: 'warning', confirmButtonText: '套用到当前站点', cancelButtonText: '取消' },
    )
    await activateStoreTemplate(item.id)
    ElMessage.success('已套用：内容已上线，未上传微信代码')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error((e as any)?.message || '套用失败')
  }
}

async function handleEditTemplate(item: ReleaseRecord) {
  if (toReleaseId(item.id) == null) return
  if (!isInUse(item)) {
    try {
      await ElMessageBox.confirm(
        '编辑会先把这套设为使用中，再打开配色与导航。继续？',
        '编辑模板',
        { type: 'info', confirmButtonText: '先选用再编辑', cancelButtonText: '取消' },
      )
      await activateStoreTemplate(item.id)
      await loadGalleryData()
    } catch {
      return
    }
  }
  emit('edit', item)
}

async function handleCapture(item: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(
      `用当前正在搭建的内容覆盖「${displayName(item)}」？`,
      '覆盖保存',
      { type: 'warning', confirmButtonText: '覆盖', cancelButtonText: '取消' },
    )
    await captureStoreTemplate(item.id)
    ElMessage.success('已保存到该模板')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error((e as any)?.message || '保存失败')
  }
}

async function handleRename(item: ReleaseRecord) {
  try {
    const name = await promptName('重命名', displayName(item))
    if (!name) return
    await renameStoreTemplate(item.id, name)
    ElMessage.success('已改名')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error((e as any)?.message || '改名失败')
  }
}

async function handleDuplicate(item: ReleaseRecord) {
  try {
    await duplicateStoreTemplate(item.id)
    ElMessage.success('已复制')
    await loadGalleryData()
  } catch (e) {
    ElMessage.error((e as any)?.message || '复制失败')
  }
}

async function handleDelete(item: ReleaseRecord) {
  if (isSystem(item)) {
    ElMessage.warning('系统预置「暖阁」模板不能删，可复制后再改')
    return
  }
  if (isInUse(item)) {
    ElMessage.warning('使用中的模板不能删，请先选用另一套')
    return
  }
  try {
    await ElMessageBox.confirm('确认删除此模板？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
    await deleteReleaseApi(item.id)
    ElMessage.success('已删除')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败，请重试')
  }
}

function openFullMiniappPreview(item?: ReleaseRecord) {
  const query: Record<string, string> = { view: 'config' }
  if (item?.id) {
    query.releaseId = String(item.id)
    if (item.semver) query.semver = item.semver
  } else {
    query.source = 'live'
  }
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  window.open(`${window.location.origin}${href}`, '_blank', 'noopener,noreferrer')
}

function formatTime(t: string | Date | null | undefined): string {
  if (!t) return '-'
  const d = typeof t === 'string' ? new Date(t) : t
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  loadGalleryData()
})

defineExpose({ loadGalleryData })
</script>

<style lang="scss" scoped>
.stg { min-width: 0; }

.stg-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stg-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.stg-copy p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.stg-actions { display: flex; gap: 8px; flex-shrink: 0; }

.stg-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stg-stat {
  padding: 14px 16px;
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
}

.stg-stat__value { font-size: 18px; font-weight: 800; color: var(--text); }
.stg-stat__label { margin-top: 2px; font-size: 12px; color: var(--text-muted); }

.stg-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stg-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 3px solid var(--brand);

  &.live { border-left-color: var(--success); }
}

.stg-card__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.stg-card__name { font-size: 15px; font-weight: 800; text-align: right; }
.stg-card__notes { font-size: 13px; color: var(--text-secondary); min-height: 36px; line-height: 1.45; }
.stg-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}
.stg-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

@media (max-width: 900px) {
  .stg-stats, .stg-grid { grid-template-columns: 1fr; }
  .stg-toolbar { flex-direction: column; }
}
</style>
