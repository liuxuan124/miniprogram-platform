<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="780px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
    @opened="loadData"
  >
    <div class="version-header">
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">总版本</span>
        </div>
        <div class="stat-item">
          <span class="stat-num draft">{{ stats.draft }}</span>
          <span class="stat-label">草稿</span>
        </div>
        <div class="stat-item">
          <span class="stat-num published">{{ stats.published }}</span>
          <span class="stat-label">已发布</span>
        </div>
        <div class="stat-item">
          <span class="stat-num rolledback">{{ stats.rolledBack }}</span>
          <span class="stat-label">已回滚</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreateSnapshot" :loading="creating">
          <el-icon><Plus /></el-icon> 创建快照
        </el-button>
      </div>
    </div>

    <el-table :data="versions" v-loading="loading" stripe style="width: 100%">
      <el-table-column label="版本号" width="120">
        <template #default="{ row }">
          <span class="semver">{{ row.semver }}</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 1" type="success" effect="dark" size="small">
            <el-icon><CircleCheck /></el-icon> 已发布
          </el-tag>
          <el-tag v-else-if="row.status === 0" type="info" effect="plain" size="small">草稿</el-tag>
          <el-tag v-else type="danger" effect="plain" size="small">已回滚</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="变更摘要" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.changeSummary || '-' }}
        </template>
      </el-table-column>

      <el-table-column label="发布人" width="90" align="center">
        <template #default="{ row }">
          {{ row.publisherName || '-' }}
        </template>
      </el-table-column>

      <el-table-column label="发布时间" width="170" align="center">
        <template #default="{ row }">
          {{ row.publishedAt || '-' }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleViewDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 0"
            link type="success"
            size="small"
            @click="handlePublish(row)"
            :loading="publishingId === row.id"
          >发布</el-button>
          <el-button
            v-if="row.status !== 1"
            link type="warning"
            size="small"
            @click="handleRollback(row)"
            :loading="rollbackId === row.id"
          >回滚</el-button>
          <el-popconfirm
            v-if="row.status === 0"
            title="确认删除此草稿版本？"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="empty-state" v-if="!loading && versions.length === 0">
      <el-empty description="暂无版本记录">
        <el-button type="primary" @click="handleCreateSnapshot">创建第一个快照</el-button>
      </el-empty>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="版本详情" direction="rtl" size="500px">
      <template v-if="currentVersion">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="版本号">{{ currentVersion.semver }}</el-descriptions-item>
          <el-descriptions-item label="模块类型">{{ moduleTypeLabel }}</el-descriptions-item>
          <el-descriptions-item label="目标ID">{{ currentVersion.targetId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="currentVersion.status === 1" type="success" size="small">已发布</el-tag>
            <el-tag v-else-if="currentVersion.status === 0" type="info" size="small">草稿</el-tag>
            <el-tag v-else type="danger" size="small">已回滚</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="变更摘要">{{ currentVersion.changeSummary || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发布人">{{ currentVersion.publisherName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ currentVersion.publishedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentVersion.createTime }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">数据快照</el-divider>
        <div class="snapshot-preview">
          <pre>{{ formatJson(currentVersion.versionData) }}</pre>
        </div>
      </template>
    </el-drawer>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, CircleCheck } from '@element-plus/icons-vue'
import {
  getTargetVersions,
  createModuleVersion,
  publishModuleVersion,
  rollbackModuleVersion,
  deleteModuleVersion,
  getModuleVersionStats,
  type ModuleVersionRecord
} from '@/api/module-version'

const MODULE_LABELS: Record<string, string> = {
  content: '内容管理',
  product: '商品管理',
  activity: '活动管理',
  coupon: '优惠券',
  member_level: '会员等级',
  form_template: '表单模板',
  appointment_service: '预约服务',
  system_config: '系统配置'
}

const props = defineProps<{
  visible: boolean
  moduleType: string
  targetId: number
  moduleTitle?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'published', version: ModuleVersionRecord): void
  (e: 'rolledback', version: ModuleVersionRecord): void
}>()

const loading = ref(false)
const creating = ref(false)
const publishingId = ref<number | null>(null)
const rollbackId = ref<number | null>(null)
const versions = ref<ModuleVersionRecord[]>([])
const detailVisible = ref(false)
const currentVersion = ref<ModuleVersionRecord | null>(null)
const stats = ref({ total: 0, draft: 0, published: 0, rolledBack: 0 })

const dialogTitle = computed(() => {
  const label = MODULE_LABELS[props.moduleType] || props.moduleType
  return `${props.moduleTitle || label} - 版本管理`
})

const moduleTypeLabel = computed(() => {
  return MODULE_LABELS[props.moduleType] || props.moduleType
})

watch(() => props.visible, (val) => {
  if (val) loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [verRes, statRes] = await Promise.all([
      getTargetVersions(props.moduleType, props.targetId),
      getModuleVersionStats(props.moduleType).catch(() => ({ data: { total: 0, draft: 0, published: 0, rolledBack: 0 } }))
    ])
    const data = (verRes.data as any)?.data || verRes.data || []
    versions.value = Array.isArray(data) ? data : []

    const sd = (statRes as any)?.data || statRes
    if (sd && typeof sd === 'object') {
      stats.value = { total: 0, draft: 0, published: 0, rolledBack: 0, ...sd }
    }
  } catch (err) {
    console.error('加载版本列表失败:', err)
    ElMessage.error('加载版本列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreateSnapshot() {
  creating.value = true
  try {
    const { value } = await ElMessageBox.prompt('请输入本次变更摘要（可选）', '创建版本快照', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：修改了活动规则、调整了商品价格等',
      inputType: 'textarea'
    }).catch(() => ({ value: '' }))

    await createModuleVersion({
      moduleType: props.moduleType,
      targetId: props.targetId,
      changeSummary: value || undefined
    })
    ElMessage.success('快照创建成功')
    loadData()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('创建快照失败')
    }
  } finally {
    creating.value = false
  }
}

async function handlePublish(row: ModuleVersionRecord) {
  publishingId.value = row.id
  try {
    const res: any = await publishModuleVersion(row.id)
    ElMessage.success(`版本 ${row.semver} 发布成功`)
    emit('published', res.data || row)
    loadData()
  } catch (err) {
    console.error('发布失败:', err)
  } finally {
    publishingId.value = null
  }
}

async function handleRollback(row: ModuleVersionRecord) {
  rollbackId.value = row.id
  try {
    const { value } = await ElMessageBox.prompt(
      `确认回滚到版本 ${row.semver}？请输入回滚原因`,
      '回滚确认',
      {
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入回滚原因（可选）',
        inputType: 'textarea'
      }
    ).catch(() => ({ value: '' }))

    const res: any = await rollbackModuleVersion(row.id, value || undefined)
    ElMessage.success(`已回滚到版本 ${row.semver}`)
    emit('rolledback', res.data || row)
    loadData()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('回滚失败')
    }
  } finally {
    rollbackId.value = null
  }
}

async function handleDelete(row: ModuleVersionRecord) {
  try {
    await deleteModuleVersion(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

function handleViewDetail(row: ModuleVersionRecord) {
  currentVersion.value = row
  detailVisible.value = true
}

function formatJson(jsonStr?: string) {
  if (!jsonStr) return '(无数据)'
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch {
    return jsonStr
  }
}
</script>

<style scoped>
.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-row {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.stat-num.draft { color: #909399; }
.stat-num.published { color: #67c23a; }
.stat-num.rolledback { color: #f56c6c; }

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.semver {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-weight: 600;
  color: #409eff;
}

.empty-state {
  padding: 40px 0;
}

.snapshot-preview {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  max-height: 400px;
  overflow: auto;
}

.snapshot-preview pre {
  margin: 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: #606266;
}
</style>
