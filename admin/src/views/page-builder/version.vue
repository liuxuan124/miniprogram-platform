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
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handlePreviewVersion(row)">
              <el-icon><View /></el-icon>查看
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
import { getVersionList, rollbackVersion } from '@/api/page'
import type { VersionRecord, PageDSL } from '@/types/page'
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

    if (Array.isArray(data)) {
      versionList.value = data as VersionRecord[]
    } else {
      const pageData = (data || {}) as PageResult<VersionRecord>
      versionList.value = pageData.records || pageData.list || pageData.items || []
    }
  } catch {
    versionList.value = []
  } finally {
    loading.value = false
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
      `已成功回滚到 v${row.version}。\n\n页面当前为草稿状态，需要进入编辑器点击「发布上线」才能在小程序端生效。`,
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
</style>
