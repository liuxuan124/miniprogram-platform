<template>
  <div class="qa-page">
    <div class="page-header">
      <div>
        <div class="page-title">问答管理</div>
        <div class="page-desc">用户提问，仅博主可在后台回答并公开发布。</div>
      </div>
    </div>

    <el-tabs v-model="activeStatus" @tab-change="fetchList">
      <el-tab-pane label="待回答" name="pending" />
      <el-tab-pane label="已回答" name="answered" />
      <el-tab-pane label="已驳回" name="rejected" />
    </el-tabs>

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="提问用户" width="120">
        <template #default="{ row }">{{ row.userNickname || row.userId }}</template>
      </el-table-column>
      <el-table-column label="问题" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">{{ row.body }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="提问时间" width="170" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openAnswer(row)">
            {{ row.status === 'answered' ? '查看/修改' : '回答' }}
          </el-button>
          <el-button v-if="row.status === 'pending'" link size="small" @click="handleReject(row)">驳回</el-button>
          <el-button v-if="row.status === 'answered'" link size="small" @click="handleHide(row)">下架</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="answerVisible" :title="`回答问题 #${current?.id || ''}`" width="720px" destroy-on-close>
      <div v-if="current" class="qa-dialog">
        <div class="qa-question">
          <div class="qa-label">用户问题</div>
          <div class="qa-body">{{ current.body }}</div>
        </div>
        <el-form label-width="72px">
          <el-form-item label="博主回答">
            <el-input v-model="answerContent" type="textarea" :rows="8" placeholder="输入回答内容，支持 HTML" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="answerVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAnswer">发布回答</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { answerQuestion, getQuestionList, hideQuestion, rejectQuestion, type QuestionItem } from '@/api/qa'

const loading = ref(false)
const submitting = ref(false)
const rows = ref<QuestionItem[]>([])
const activeStatus = ref('pending')
const answerVisible = ref(false)
const current = ref<QuestionItem | null>(null)
const answerContent = ref('')

function statusLabel(status: string) {
  if (status === 'answered') return '已回答'
  if (status === 'rejected') return '已驳回'
  if (status === 'hidden') return '已下架'
  return '待回答'
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getQuestionList({ current: 1, size: 50, status: activeStatus.value })
    const data = (res as any).data || {}
    rows.value = data.records || data.list || []
  } catch {
    rows.value = []
    ElMessage.error('加载问答失败')
  } finally {
    loading.value = false
  }
}

function openAnswer(row: QuestionItem) {
  current.value = row
  answerContent.value = row.answer?.content || ''
  answerVisible.value = true
}

async function submitAnswer() {
  if (!current.value?.id) return
  if (!answerContent.value.trim()) {
    ElMessage.warning('请输入回答内容')
    return
  }
  submitting.value = true
  try {
    await answerQuestion(current.value.id, { content: answerContent.value.trim() })
    ElMessage.success('回答已发布')
    answerVisible.value = false
    fetchList()
  } catch (err: any) {
    ElMessage.error(err?.message || '发布失败')
  } finally {
    submitting.value = false
  }
}

async function handleReject(row: QuestionItem) {
  await ElMessageBox.confirm('确定驳回该问题？', '驳回确认')
  await rejectQuestion(row.id)
  ElMessage.success('已驳回')
  fetchList()
}

async function handleHide(row: QuestionItem) {
  await ElMessageBox.confirm('确定下架该问答？', '下架确认')
  await hideQuestion(row.id)
  ElMessage.success('已下架')
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped lang="scss">
.qa-page {
  .page-header { margin-bottom: 16px; }
  .page-title { font-size: 22px; font-weight: 800; color: #0d1b2e; }
  .page-desc { margin-top: 6px; color: #6b7b93; font-size: 13px; }
}
.qa-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.qa-body { background: #f8fafc; border-radius: 8px; padding: 12px; white-space: pre-wrap; line-height: 1.6; }
.qa-dialog { display: flex; flex-direction: column; gap: 16px; }
</style>
