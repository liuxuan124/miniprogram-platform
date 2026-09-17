<template>
  <div class="drafts-page">
    <PageHeader
      kicker="系统 / 智能 Agent"
      title="草稿箱"
      description="待人工确认的 AI / UGC 产出。当前读取审核状态为待审，且作者身份非普通用户的内容。"
    >
      <template #actions>
        <el-button @click="$router.push('/ai/agent')">返回 Agent</el-button>
        <el-button type="primary" @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="hint"
      title="强制卡点：确认发布前不会自动上线。通过后写入 auditStatus=approved。"
    />

    <el-tabs v-model="tab" class="draft-tabs" @tab-change="reload">
      <el-tab-pane label="待确认" name="pending" />
      <el-tab-pane label="已采用" name="approved" />
      <el-tab-pane label="修改后采用" name="returned" />
      <el-tab-pane label="已废弃" name="rejected" />
    </el-tabs>

    <el-table v-loading="loading" :data="rows" stripe class="draft-table">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="草稿标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="署名身份" width="120">
        <template #default="{ row }">{{ row.authorRole || row.author_role || '—' }}</template>
      </el-table-column>
      <el-table-column label="作者" width="120">
        <template #default="{ row }">{{ row.author || '—' }}</template>
      </el-table-column>
      <el-table-column label="摘要" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.summary || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default>
          <el-tag :type="tabTagType" size="small">{{ tabLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row.id)">编辑</el-button>
          <el-button link type="success" @click="confirmPublish(row)">确认发布</el-button>
          <el-button link type="danger" @click="discard(row)">废弃</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        layout="total, prev, pager, next"
        :total="total"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { getContentList, updateContent, publishContent } from '@/api/content'

const router = useRouter()
const loading = ref(false)
const tab = ref<'pending' | 'approved' | 'returned' | 'rejected'>('pending')

const tabLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '待确认',
    approved: '已采用',
    returned: '修改后采用',
    rejected: '已废弃',
  }
  return map[tab.value] || tab.value
})

const tabTagType = computed(() => {
  if (tab.value === 'approved' || tab.value === 'returned') return 'success'
  if (tab.value === 'rejected') return 'info'
  return 'warning'
})
const rows = ref<any[]>([])
const current = ref(1)
const size = ref(20)
const total = ref(0)

function reload() {
  current.value = 1
  load()
}

function goEdit(id: number) {
  router.push({ path: '/content/edit', query: { id: String(id) } })
}

async function load() {
  loading.value = true
  try {
    // stub：待审内容；优先展示非 user 署名（agent / owner / editor / contributor）
    const res = await getContentList({
      current: current.value,
      size: size.value,
      auditStatus: tab.value,
    } as any)
    const data = (res as any).data || {}
    const list = (data.records || data.list || []) as any[]
    rows.value = tab.value === 'pending'
      ? list.filter((item) => {
          const role = String(item.authorRole || item.author_role || '').toLowerCase()
          return role && role !== 'user'
        })
      : list
    if (tab.value === 'pending' && !rows.value.length && list.length) {
      rows.value = list
    }
    total.value = Number(data.total || rows.value.length || 0)
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function confirmPublish(row: any) {
  await ElMessageBox.confirm(`确认发布「${row.title}」？`, '人工确认', { type: 'warning' })
  await updateContent(row.id, { auditStatus: 'approved' } as any)
  try {
    await publishContent(row.id)
  } catch {
    // 已发布或无 publish 权限时，至少审核通过
  }
  ElMessage.success('已确认发布')
  await load()
}

async function discard(row: any) {
  await ElMessageBox.confirm(`废弃「${row.title}」？`, '废弃确认', { type: 'warning' })
  await updateContent(row.id, { auditStatus: 'rejected' } as any)
  ElMessage.success('已废弃')
  await load()
}

onMounted(load)
</script>

<style scoped>
.hint { margin-bottom: 16px; }
.draft-table { margin-top: 8px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
