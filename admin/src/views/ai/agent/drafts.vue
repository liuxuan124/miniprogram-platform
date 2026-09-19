<template>
  <div class="drafts-page">
    <PageHeader kicker="系统 / 智能 Agent" title="智能草稿" description="待人工确认的 AI / UGC 产出。确认前可预览正文与摘要，采用后审核通过并尝试发布。">
      <template #actions>
        <el-button @click="$router.push('/ai/agent')">返回 Agent</el-button>
        <el-button type="primary" @click="load">刷新</el-button>
      </template>
    </PageHeader>
    <el-alert type="info" :closable="false" show-icon class="hint" title="强制卡点：确认发布前不会自动上线。预览可看正文与摘要；采用后写入 auditStatus=approved。" />
    <el-tabs v-model="tab" class="draft-tabs" @tab-change="reload">
      <el-tab-pane label="待确认" name="pending" />
      <el-tab-pane label="已采用" name="approved" />
      <el-tab-pane label="修改后采用" name="returned" />
      <el-tab-pane label="已废弃" name="rejected" />
    </el-tabs>
    <el-table v-loading="loading" :data="rows" stripe class="draft-table">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="草稿标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="署名身份" width="110"><template #default="{ row }">{{ row.authorRole || row.author_role || '—' }}</template></el-table-column>
      <el-table-column label="作者" width="110"><template #default="{ row }">{{ row.author || '—' }}</template></el-table-column>
      <el-table-column label="摘要" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.summary || '—' }}</template></el-table-column>
      <el-table-column label="状态" width="100"><template #default><el-tag :type="tabTagType" size="small">{{ tabLabel }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row)">预览</el-button>
          <el-button link type="primary" @click="goEdit(row.id)">编辑</el-button>
          <el-button v-if="tab === 'pending'" link type="success" @click="confirmPublish(row)">采用发布</el-button>
          <el-button v-if="tab === 'pending'" link type="danger" @click="discard(row)">废弃</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager"><el-pagination v-model:current-page="current" v-model:page-size="size" layout="total, prev, pager, next" :total="total" @current-change="load" /></div>
    <el-drawer v-model="previewVisible" title="草稿预览与采用" size="560px">
      <template v-if="previewRow">
        <h3 class="preview-title">{{ previewRow.title }}</h3>
        <div class="preview-meta"><el-tag size="small">{{ previewRow.authorRole || previewRow.author_role || '—' }}</el-tag><span>{{ previewRow.author || '—' }}</span><span>ID {{ previewRow.id }}</span></div>
        <el-divider content-position="left">摘要 / 引用预览</el-divider>
        <p class="preview-summary">{{ previewRow.summary || '（无摘要）' }}</p>
        <el-divider content-position="left">正文</el-divider>
        <div class="preview-body" v-html="previewBodyHtml" />
        <div class="preview-actions">
          <el-button @click="goEdit(previewRow.id)">去编辑</el-button>
          <el-button v-if="tab === 'pending'" type="success" :loading="adopting" @click="confirmPublish(previewRow)">采用并发布</el-button>
          <el-button v-if="tab === 'pending'" type="danger" plain @click="discard(previewRow)">废弃</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { getContentDetail, getContentList, updateContent, publishContent } from '@/api/content'
const router = useRouter()
const loading = ref(false)
const adopting = ref(false)
const tab = ref<'pending' | 'approved' | 'returned' | 'rejected'>('pending')
const previewVisible = ref(false)
const previewRow = ref<any>(null)
const previewBodyHtml = ref('')
const tabLabel = computed(() => ({ pending: '待确认', approved: '已采用', returned: '修改后采用', rejected: '已废弃' }[tab.value] || tab.value))
const tabTagType = computed(() => (tab.value === 'approved' || tab.value === 'returned') ? 'success' : tab.value === 'rejected' ? 'info' : 'warning')
const rows = ref<any[]>([])
const current = ref(1)
const size = ref(20)
const total = ref(0)
function reload() { current.value = 1; load() }
function goEdit(id: number) { router.push({ path: '/content/edit', query: { id: String(id) } }) }
async function openPreview(row: any) {
  previewRow.value = row; previewBodyHtml.value = ''; previewVisible.value = true
  try {
    const res = await getContentDetail(row.id)
    const d = (res as any)?.data || res || {}
    previewRow.value = { ...row, ...d }
    const raw = d.content || d.body || row.content || ''
    previewBodyHtml.value = typeof raw === 'string' && raw.includes('<') ? raw : `<p>${String(raw || row.summary || '（暂无正文）').replace(/\n/g, '<br/>')}</p>`
  } catch {
    previewBodyHtml.value = `<p>${row.summary || '加载正文失败，可点编辑查看'}</p>`
  }
}
async function load() {
  loading.value = true
  try {
    const res = await getContentList({ current: current.value, size: size.value, auditStatus: tab.value } as any)
    const data = (res as any).data || {}
    const list = (data.records || data.list || []) as any[]
    rows.value = tab.value === 'pending' ? list.filter((item) => { const role = String(item.authorRole || item.author_role || '').toLowerCase(); return role && role !== 'user' }) : list
    if (tab.value === 'pending' && !rows.value.length && list.length) rows.value = list
    total.value = Number(data.total || rows.value.length || 0)
  } catch { rows.value = []; total.value = 0 } finally { loading.value = false }
}
async function confirmPublish(row: any) {
  await ElMessageBox.confirm(`确认采用并发布「${row.title}」？`, '人工确认', { type: 'warning' })
  adopting.value = true
  try {
    await updateContent(row.id, { auditStatus: 'approved' } as any)
    try { await publishContent(row.id) } catch {}
    ElMessage.success('已采用发布'); previewVisible.value = false; await load()
  } finally { adopting.value = false }
}
async function discard(row: any) {
  await ElMessageBox.confirm(`废弃「${row.title}」？`, '废弃确认', { type: 'warning' })
  await updateContent(row.id, { auditStatus: 'rejected' } as any)
  ElMessage.success('已废弃'); previewVisible.value = false; await load()
}
onMounted(load)
</script>
<style scoped>
.hint { margin-bottom: 16px; }
.draft-table { margin-top: 8px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.preview-title { margin: 0 0 8px; font-size: 18px; }
.preview-meta { display: flex; gap: 10px; align-items: center; color: #909399; font-size: 13px; margin-bottom: 8px; }
.preview-summary { color: #606266; line-height: 1.6; white-space: pre-wrap; }
.preview-body { line-height: 1.7; color: #303133; max-height: 50vh; overflow: auto; }
.preview-actions { margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap; }
</style>
