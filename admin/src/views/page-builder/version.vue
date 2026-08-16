<template>
  <div class="page-version">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button icon="ArrowLeft" @click="handleBack">返回</el-button>
            <el-divider direction="vertical" />
            <span>版本管理</span>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="versionList" border stripe style="width: 100%">
        <el-table-column prop="version" label="版本号" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column prop="created_by" label="操作人" width="120" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="170" align="center" />
        <el-table-column label="操作" width="260" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handlePreviewVersion(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button link type="primary" size="small" @click="handleCompareVersion(row)">
              <el-icon><Sort /></el-icon>对比
            </el-button>
            <el-button link type="primary" size="small" @click="handleRollback(row)">
              <el-icon><RefreshLeft /></el-icon>回滚
            </el-button>
            <el-button link type="primary" size="small" @click="handleViewDSL(row)">
              <el-icon><Document /></el-icon>DSL
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- C4：与当前版本对比，按组件粒度展示新增/删除/修改 -->
    <el-dialog v-model="compareDialogVisible" :title="`版本 v${comparingVersion?.version} 与当前页面对比`" width="560px" destroy-on-close>
      <template v-if="!currentPageDSL">
        <el-empty description="未能加载当前页面数据，无法对比" />
      </template>
      <template v-else>
        <div class="compare-summary">
          <span class="compare-tag compare-tag--add">新增 {{ compareResult.added.length }}</span>
          <span class="compare-tag compare-tag--remove">删除 {{ compareResult.removed.length }}</span>
          <span class="compare-tag compare-tag--modify">修改 {{ compareResult.modified.length }}</span>
          <span v-if="!compareResult.added.length && !compareResult.removed.length && !compareResult.modified.length" class="compare-tag compare-tag--same">
            与当前页面一致
          </span>
        </div>
        <div class="compare-list">
          <div v-for="comp in compareResult.added" :key="`add-${comp.id}`" class="compare-row compare-row--add">
            <el-tag type="success" size="small" effect="plain">新增</el-tag>
            <span>{{ ComponentTypeLabels[comp.type] || comp.type }}</span>
          </div>
          <div v-for="comp in compareResult.removed" :key="`rm-${comp.id}`" class="compare-row compare-row--remove">
            <el-tag type="danger" size="small" effect="plain">删除</el-tag>
            <span>{{ ComponentTypeLabels[comp.type] || comp.type }}</span>
          </div>
          <div v-for="comp in compareResult.modified" :key="`mod-${comp.id}`" class="compare-row compare-row--modify">
            <el-tag type="warning" size="small" effect="plain">修改</el-tag>
            <span>{{ ComponentTypeLabels[comp.type] || comp.type }}</span>
          </div>
        </div>
        <div class="compare-note">
          按组件 ID 匹配增删改；若该版本或当前页面经由「导入 DSL / 应用模板」整体替换过，组件 ID 会重新生成，可能被识别为整体新增+删除。
        </div>
      </template>
    </el-dialog>

    <!-- 版本 DSL 查看弹窗 -->
    <el-dialog v-model="dslDialogVisible" :title="`版本 v${viewingVersion?.version} DSL`" width="700px" destroy-on-close>
      <el-input
        :model-value="viewingDSL"
        type="textarea"
        :rows="20"
        readonly
        style="font-family: monospace"
      />
      <template #footer>
        <el-button @click="dslDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleCopyDSL">复制</el-button>
      </template>
    </el-dialog>

    <!-- 版本预览弹窗 -->
    <el-dialog v-model="previewDialogVisible" :title="`版本 v${viewingVersion?.version} 预览`" width="440px" destroy-on-close>
      <div class="version-preview-content">
        <PreviewPhone
          :page-title="viewingVersionDSL?.page?.name || '预览'"
          :page-bg-color="viewingVersionDSL?.page?.background_color || '#f5f5f5'"
        >
          <ComponentItem
            v-for="(comp, index) in (viewingVersionDSL?.components || [])"
            :key="comp.id"
            :component="comp"
            :index="index"
            :selected="false"
            @select="() => {}"
          />
        </PreviewPhone>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVersionList, rollbackVersion, getPageDetail } from '@/api/page'
import type { VersionRecord, PageDSL, ComponentInstance } from '@/types/page'
import { ComponentTypeLabels } from '@/types/page'
import type { PageResult } from '@/types/global'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'

const route = useRoute()
const router = useRouter()

const pageId = computed(() => Number(route.params.id))
const versionList = ref<VersionRecord[]>([])
const loading = ref(false)

const dslDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const viewingVersion = ref<VersionRecord | null>(null)
const viewingDSL = ref('')
const viewingVersionDSL = ref<PageDSL | null>(null)

/**
 * 后端 /pages/{id}/versions 实际返回字段是 dslContent（JSON 字符串）、createTime、
 * statusDesc 等，与前端 VersionRecord 类型（dsl 对象、created_at、remark）不一致。
 * 这里做一层归一化，避免页面拿到 undefined 字段静默显示空白。
 */
function normalizeVersion(raw: any): VersionRecord {
  let dsl: PageDSL | undefined
  if (raw?.dsl && typeof raw.dsl === 'object') {
    dsl = raw.dsl
  } else {
    const raw_content = raw?.dslContent ?? raw?.dsl_content
    if (typeof raw_content === 'string' && raw_content) {
      try {
        dsl = JSON.parse(raw_content)
      } catch {
        dsl = undefined
      }
    }
  }
  return {
    id: Number(raw?.id),
    page_id: Number(raw?.pageId ?? raw?.page_id ?? pageId.value),
    version: Number(raw?.version),
    dsl: (dsl || { schema_version: '1.0', page: {}, components: [], global_config: {} }) as PageDSL,
    remark: raw?.remark || raw?.statusDesc || '',
    created_at: raw?.createTime || raw?.created_at || raw?.publishedAt || '',
    created_by: raw?.created_by || raw?.publisherName || (raw?.publisherId ? `用户 #${raw.publisherId}` : ''),
  }
}

/** 加载版本列表 */
async function fetchVersions() {
  if (!pageId.value || isNaN(pageId.value)) {
    versionList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getVersionList(pageId.value)
    const data = res.data as unknown

    let rawList: any[] = []
    if (Array.isArray(data)) {
      rawList = data
    } else {
      const pageData = (data || {}) as PageResult<VersionRecord>
      rawList = pageData.records || pageData.list || pageData.items || []
    }
    versionList.value = rawList.map(normalizeVersion)
  } catch {
    versionList.value = []
  } finally {
    loading.value = false
  }
}

/** C4：当前页面 DSL，用于"与当前版本对比" */
const currentPageDSL = ref<PageDSL | null>(null)
async function fetchCurrentPage() {
  if (!pageId.value || isNaN(pageId.value)) return
  try {
    const res = await getPageDetail(pageId.value)
    const record = res.data as any
    if (record?.dsl) {
      currentPageDSL.value = record.dsl as PageDSL
    } else if (typeof record?.draftDslContent === 'string' && record.draftDslContent) {
      currentPageDSL.value = JSON.parse(record.draftDslContent)
    } else {
      currentPageDSL.value = null
    }
  } catch {
    currentPageDSL.value = null
  }
}

const compareDialogVisible = ref(false)
const comparingVersion = ref<VersionRecord | null>(null)

/** 按组件 id 匹配，分别得出新增/删除/修改列表（相对"当前页面"而言） */
const compareResult = computed<{ added: ComponentInstance[]; removed: ComponentInstance[]; modified: ComponentInstance[] }>(() => {
  const base = comparingVersion.value?.dsl?.components || []
  const target = currentPageDSL.value?.components || []
  const baseById = new Map(base.map((c) => [c.id, c]))
  const targetById = new Map(target.map((c) => [c.id, c]))

  const added: ComponentInstance[] = []
  const modified: ComponentInstance[] = []
  for (const c of target) {
    const b = baseById.get(c.id)
    if (!b) {
      added.push(c)
    } else if (JSON.stringify(b.props) !== JSON.stringify(c.props) || JSON.stringify(b.style) !== JSON.stringify(c.style)) {
      modified.push(c)
    }
  }
  const removed: ComponentInstance[] = base.filter((c) => !targetById.has(c.id))

  return { added, removed, modified }
})

async function handleCompareVersion(row: VersionRecord) {
  comparingVersion.value = row
  compareDialogVisible.value = true
  if (!currentPageDSL.value) {
    await fetchCurrentPage()
  }
}

/** 返回 */
function handleBack() {
  router.push({ name: 'PageBuilderList' })
}

/** 预览版本 */
function handlePreviewVersion(row: VersionRecord) {
  viewingVersion.value = row
  viewingVersionDSL.value = row.dsl
  previewDialogVisible.value = true
}

/** 查看 DSL */
function handleViewDSL(row: VersionRecord) {
  viewingVersion.value = row
  viewingDSL.value = JSON.stringify(row.dsl, null, 2)
  dslDialogVisible.value = true
}

/** 回滚版本 */
async function handleRollback(row: VersionRecord) {
  try {
    await ElMessageBox.confirm(
      `确定回滚到版本 v${row.version}？回滚后页面将变为草稿状态，需要重新发布才能在小程序端生效。`,
      '版本回滚',
      { type: 'warning', confirmButtonText: '确定回滚', cancelButtonText: '取消' }
    )
    if (!pageId.value || isNaN(pageId.value)) return
    await rollbackVersion(pageId.value, row.version)
    fetchVersions()
    // 回滚后提示用户去编辑器发布
    await ElMessageBox.confirm(
      `已成功回滚到 v${row.version}。\n\n页面当前为草稿，需要进入装修器点击「发布此页」后才会在小程序端生效。`,
      '回滚成功',
      {
        confirmButtonText: '去编辑器发布',
        cancelButtonText: '留在版本列表',
        type: 'success',
      }
    ).then(() => {
      router.push({ name: 'PageBuilderEditor', params: { id: pageId.value } })
    }).catch(() => {})
  } catch {
    // 用户取消或请求失败
  }
}

/** 复制 DSL */
function handleCopyDSL() {
  navigator.clipboard.writeText(viewingDSL.value).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

watch(
  () => route.params.id,
  () => {
    fetchVersions()
    currentPageDSL.value = null
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.page-version {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 15px;
      font-weight: 500;
    }
  }

  .version-preview-content {
    display: flex;
    justify-content: center;
    max-height: 600px;
    overflow-y: auto;
  }
}

/* C4：版本对比 */
.compare-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.compare-tag {
  padding: 4px 10px;
  font-size: var(--font-caption);
  font-weight: 600;
  border-radius: var(--radius-sm);

  &--add {
    color: var(--success);
    background: var(--success-soft);
  }

  &--remove {
    color: var(--danger);
    background: var(--danger-soft);
  }

  &--modify {
    color: var(--warning);
    background: var(--warning-soft);
  }

  &--same {
    color: var(--text-muted);
    background: var(--bg-page);
  }
}

.compare-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.compare-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 10px;
  font-size: var(--font-body);
  border-radius: var(--radius-sm);
  background: var(--bg-page);
}

.compare-note {
  margin-top: var(--space-3);
  padding: var(--space-3);
  color: var(--text-muted);
  font-size: var(--font-caption);
  line-height: 1.6;
  background: var(--bg-page);
  border-radius: var(--radius);
}
</style>
