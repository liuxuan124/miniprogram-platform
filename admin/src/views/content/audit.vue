<template>
  <div class="audit-page">
    <div class="page-header">
      <div>
        <div class="page-title">审核队列</div>
        <div class="page-desc">投稿、评论、星球提问统一入口；规则见
          <router-link to="/content/audit-rules">审核规则</router-link>。
        </div>
      </div>
    </div>

    <el-tabs v-model="workspace" class="workspace-tabs" @tab-change="onWorkspaceChange">
      <el-tab-pane label="投稿" name="content" />
      <el-tab-pane label="评论" name="comments" />
      <el-tab-pane label="星球提问" name="questions" />
    </el-tabs>

    <template v-if="workspace === 'content'">
    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="待审核" name="pending" />
      <el-tab-pane label="机器通过" name="machine_passed" />
      <el-tab-pane label="已驳回" name="rejected" />
      <el-tab-pane label="机器拦截" name="auto_blocked" />
      <el-tab-pane label="已通过" name="approved" />
    </el-tabs>

    <div class="toolbar">
      <el-input v-model="keyword" class="toolbar-input" placeholder="搜索标题" clearable @keyup.enter="reload" />
      <el-button type="primary" @click="reload">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="形态" width="100">
        <template #default="{ row }">{{ row.contentType || row.content_type || '—' }}</template>
      </el-table-column>
      <el-table-column label="作者" width="140">
        <template #default="{ row }">
          {{ row.author || '—' }}
          <span v-if="row.authorRole || row.author_role" class="muted">
            · {{ row.authorRole || row.author_role }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="审核状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.auditStatus || row.audit_status)" size="small">
            {{ statusLabel(row.auditStatus || row.audit_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.updateTime || row.updated_at || row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row.id)">查看</el-button>
          <el-button
            v-if="(row.auditStatus || row.audit_status) !== 'approved'"
            link
            type="success"
            @click="setAudit(row, 'approved')"
          >
            通过
          </el-button>
          <el-button
            v-if="(row.auditStatus || row.audit_status) === 'pending' || (row.auditStatus || row.audit_status) === 'machine_passed'"
            link
            @click="setAudit(row, 'returned')"
          >
            退回修改
          </el-button>
          <el-button
            v-if="(row.auditStatus || row.audit_status) !== 'rejected'"
            link
            type="danger"
            @click="setAudit(row, 'rejected')"
          >
            驳回
          </el-button>
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
    </template>

    <template v-else-if="workspace === 'comments'">
      <el-table v-loading="commentLoading" :data="commentRows" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="content" label="评论" min-width="240" show-overflow-tooltip />
        <el-table-column prop="userNickname" label="用户" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.status === 1 ? '显示' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="warning" @click="hideComment(row)">隐藏</el-button>
            <el-button link type="danger" @click="removeComment(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <template v-else>
      <el-table v-loading="questionLoading" :data="questionRows" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="body" label="提问" min-width="260" show-overflow-tooltip />
        <el-table-column prop="userNickname" label="用户" width="120" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push('/content/qa')">去答复</el-button>
            <el-button link type="danger" @click="rejectQuestionRow(row)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getContentList, updateContent, listContentComments, updateCommentStatus, deleteComment } from '@/api/content'
import { getQuestionList, rejectQuestion } from '@/api/qa'

const router = useRouter()
const workspace = ref<'content' | 'comments' | 'questions'>('content')
const loading = ref(false)
const commentLoading = ref(false)
const questionLoading = ref(false)
const rows = ref<any[]>([])
const commentRows = ref<any[]>([])
const questionRows = ref<any[]>([])
const tab = ref('pending')
const keyword = ref('')
const current = ref(1)
const size = ref(20)
const total = ref(0)

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    pending: '待审核',
    machine_passed: '机器通过',
    approved: '已通过',
    rejected: '已驳回',
    auto_blocked: '机器拦截',
    returned: '退回修改',
  }
  return map[s || ''] || s || '—'
}

function statusTag(s?: string): 'warning' | 'success' | 'danger' | 'info' {
  if (s === 'approved' || s === 'machine_passed') return 'success'
  if (s === 'rejected' || s === 'auto_blocked') return 'danger'
  if (s === 'pending') return 'warning'
  return 'info'
}

function formatTime(v?: string) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(0, 16)
}

function goEdit(id: number) {
  router.push({ path: '/content/edit', query: { id: String(id) } })
}

async function load() {
  loading.value = true
  try {
    const res = await getContentList({
      current: current.value,
      size: size.value,
      keyword: keyword.value || undefined,
      auditStatus: tab.value,
    } as any)
    const data = (res as any).data || {}
    rows.value = data.records || data.list || []
    total.value = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

function reload() {
  current.value = 1
  load()
}

function onTabChange() {
  reload()
}

function onWorkspaceChange() {
  if (workspace.value === 'content') reload()
  else if (workspace.value === 'comments') loadComments()
  else loadQuestions()
}

async function loadComments() {
  commentLoading.value = true
  try {
    const res = await listContentComments({ current: 1, size: 50, status: 1 })
    const data = (res as any).data || {}
    commentRows.value = data.records || data.list || []
  } finally {
    commentLoading.value = false
  }
}

async function loadQuestions() {
  questionLoading.value = true
  try {
    const res = await getQuestionList({ current: 1, size: 50, status: 'pending' })
    const data = (res as any).data || {}
    questionRows.value = data.records || data.list || []
  } finally {
    questionLoading.value = false
  }
}

async function hideComment(row: any) {
  await updateCommentStatus(row.id, 0)
  await loadComments()
}

async function removeComment(row: any) {
  await deleteComment(row.id)
  await loadComments()
}

async function rejectQuestionRow(row: any) {
  await rejectQuestion(row.id)
  await loadQuestions()
}

async function setAudit(row: any, next: 'approved' | 'rejected' | 'returned') {
  const action = next === 'approved' ? '通过' : next === 'returned' ? '退回修改' : '驳回'
  await ElMessageBox.confirm(`确认${action}「${row.title}」？`, '审核确认', { type: 'warning' })
  await updateContent(row.id, { auditStatus: next } as any)
  ElMessage.success(`已${action}`)
  await load()
}

onMounted(load)
</script>

<style scoped>
.audit-page { padding: 16px; }
.page-header { margin-bottom: 12px; }
.page-title { font-size: 18px; font-weight: 600; color: #002FA7; }
.page-desc { margin-top: 4px; color: #909399; font-size: 13px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.toolbar-input { width: 240px; }
.muted { color: #909399; font-size: 12px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
