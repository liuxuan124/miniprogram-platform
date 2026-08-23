<template>
  <el-dialog
    v-model="visible"
    title="内容 Agent"
    width="920px"
    destroy-on-close
    @open="onOpen"
  >
    <!-- 进度 -->
    <div v-if="task && (task.status === 'pending' || task.status === 'running')" class="agent-progress">
      <el-progress
        :percentage="progressPercent"
        :status="task.status === 'running' ? undefined : 'success'"
        :stroke-width="10"
      />
      <div class="agent-progress__meta">
        {{ task.processed }} / {{ task.total }}
        <span v-if="task.currentTitle"> · {{ task.currentTitle }}</span>
      </div>
    </div>

    <!-- 创建任务 -->
    <template v-if="!task || task.status === 'failed'">
      <p class="agent-hint">勾选内容后选择任务类型，后台异步执行。规则类任务（质检/排版/合规）不依赖模型。</p>
      <el-checkbox-group v-model="selectedTypes" class="agent-types">
        <el-checkbox v-for="t in taskTypes" :key="t.code" :value="t.code" :label="t.code">
          <span class="type-label">{{ t.label }}</span>
          <el-tag size="small" effect="plain" type="info">{{ t.group }}</el-tag>
        </el-checkbox>
      </el-checkbox-group>
      <el-form-item v-if="selectedTypes.includes('multi_format')" label="目标形态" label-width="88px">
        <el-select v-model="targetFormat" style="width: 160px">
          <el-option label="笔记" value="note" />
          <el-option label="动态" value="moment" />
        </el-select>
      </el-form-item>
      <el-input
        v-model="freeformPrompt"
        type="textarea"
        :rows="2"
        placeholder="补充说明或自由指令（可选）"
        class="agent-freeform"
      />
      <div class="agent-scope">已选 {{ contentIds.length }} 篇内容</div>
    </template>

    <!-- 审核 -->
    <template v-else-if="task.status === 'review' || task.status === 'completed'">
      <div v-if="task.issueCount" class="agent-summary warn">
        质检发现 {{ task.issueCount }} 处问题，请查看下方清单
      </div>
      <div v-if="task.pendingReviewCount" class="agent-summary">
        {{ task.pendingReviewCount }} 条建议待审核
      </div>

      <el-tabs v-model="reviewTab">
        <el-tab-pane label="元数据建议" name="meta">
          <el-table :data="metaItems" size="small" max-height="360" @selection-change="onMetaSelect">
            <el-table-column type="selection" width="40" />
            <el-table-column prop="contentTitle" label="标题" min-width="140" show-overflow-tooltip />
            <el-table-column prop="fieldLabel" label="字段" width="88" />
            <el-table-column label="建议值" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ truncate(row.newValue, 80) }}</template>
            </el-table-column>
            <el-table-column label="置信度" width="72" align="center">
              <template #default="{ row }">{{ formatConf(row.confidence) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="reviewTagType(row.reviewStatus)">{{ reviewLabel(row.reviewStatus) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div class="agent-actions">
            <el-button size="small" @click="batchReview('accept')">采纳选中</el-button>
            <el-button size="small" @click="batchReview('reject')">驳回选中</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="正文 diff" name="body">
          <div v-if="!bodyItems.length" class="empty-hint">无正文改动建议</div>
          <div v-for="item in bodyItems" :key="item.id" class="diff-block">
            <div class="diff-title">{{ item.contentTitle }} · {{ item.taskTypeLabel }}</div>
            <div class="diff-panels">
              <div class="diff-panel">
                <div class="diff-label">原文</div>
                <div class="diff-body" v-html="item.oldValue || '—'" />
              </div>
              <div class="diff-panel">
                <div class="diff-label">建议</div>
                <div class="diff-body" v-html="item.newValue || '—'" />
              </div>
            </div>
            <div class="diff-actions">
              <el-button size="small" type="primary" @click="reviewOne(item.id, 'accept')">采纳</el-button>
              <el-button size="small" @click="reviewOne(item.id, 'reject')">驳回</el-button>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="质检清单" name="qc">
          <el-table :data="qcItems" size="small" max-height="360">
            <el-table-column prop="contentTitle" label="标题" min-width="140" show-overflow-tooltip />
            <el-table-column prop="issueLevel" label="级别" width="72">
              <template #default="{ row }">
                <el-tag size="small" :type="row.issueLevel === 'error' ? 'danger' : row.issueLevel === 'warn' ? 'warning' : 'info'">
                  {{ row.issueLevel || 'info' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="newValue" label="问题" min-width="200" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="报告" name="report">
          <pre v-for="item in reportItems" :key="item.id" class="report-pre">{{ item.newValue }}</pre>
        </el-tab-pane>
      </el-tabs>
    </template>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button
        v-if="!task || task.status === 'failed'"
        type="primary"
        :loading="submitting"
        :disabled="!selectedTypes.length"
        @click="submitTask"
      >
        开始执行
      </el-button>
      <el-button
        v-else-if="task.status === 'review'"
        type="primary"
        :loading="applying"
        @click="applyTask"
      >
        写入已采纳项
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  applyContentAgentTask,
  createContentAgentTask,
  getContentAgentTask,
  listContentAgentTaskItems,
  listContentAgentTaskTypes,
  reviewContentAgentItems,
  type ContentAgentTask,
  type ContentAgentTaskItem,
  type ContentAgentTaskTypeOption,
} from '@/api/contentAgent'

const props = defineProps<{
  modelValue: boolean
  contentIds: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  done: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const taskTypes = ref<ContentAgentTaskTypeOption[]>([])
const selectedTypes = ref<string[]>(['import_qc', 'auto_category', 'auto_tags', 'summary_seo'])
const targetFormat = ref('note')
const freeformPrompt = ref('')
const submitting = ref(false)
const applying = ref(false)
const task = ref<ContentAgentTask | null>(null)
const items = ref<ContentAgentTaskItem[]>([])
const metaSelected = ref<ContentAgentTaskItem[]>([])
const reviewTab = ref('meta')
let pollTimer: ReturnType<typeof setInterval> | null = null

const progressPercent = computed(() => {
  if (!task.value?.total) return 0
  return Math.min(100, Math.round((task.value.processed / task.value.total) * 100))
})

const metaItems = computed(() =>
  items.value.filter((i) => i.field !== '_qc' && i.field !== '_report' && !i.bodyField),
)
const bodyItems = computed(() => items.value.filter((i) => i.bodyField))
const qcItems = computed(() => items.value.filter((i) => i.field === '_qc'))
const reportItems = computed(() => items.value.filter((i) => i.field === '_report'))

async function onOpen() {
  task.value = null
  items.value = []
  if (!taskTypes.value.length) {
    const res = await listContentAgentTaskTypes()
    taskTypes.value = res.data || []
  }
}

async function submitTask() {
  if (!props.contentIds.length && !selectedTypes.value.some((t) => ['analytics_review', 'topic_draft'].includes(t))) {
    ElMessage.warning('请先勾选内容')
    return
  }
  submitting.value = true
  try {
    const res = await createContentAgentTask({
      taskTypes: selectedTypes.value,
      contentIds: props.contentIds,
      freeformPrompt: freeformPrompt.value || undefined,
      targetFormat: targetFormat.value,
    })
    task.value = res.data
    if (task.value?.id) {
      startPoll(task.value.id)
    }
  } finally {
    submitting.value = false
  }
}

function startPoll(id: number) {
  stopPoll()
  pollTimer = setInterval(async () => {
    const res = await getContentAgentTask(id)
    task.value = res.data
    if (task.value && (task.value.status === 'review' || task.value.status === 'completed' || task.value.status === 'failed')) {
      stopPoll()
      await loadItems(id)
    }
  }, 2000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function loadItems(taskId: number) {
  const res = await listContentAgentTaskItems(taskId, { size: 200 })
  items.value = res.data?.records || []
}

function onMetaSelect(rows: ContentAgentTaskItem[]) {
  metaSelected.value = rows
}

async function batchReview(action: 'accept' | 'reject') {
  if (!task.value?.id || !metaSelected.value.length) return
  await reviewContentAgentItems(task.value.id, {
    itemIds: metaSelected.value.map((i) => i.id),
    action,
  })
  await loadItems(task.value.id)
  ElMessage.success(action === 'accept' ? '已标记采纳' : '已驳回')
}

async function reviewOne(itemId: number, action: 'accept' | 'reject') {
  if (!task.value?.id) return
  await reviewContentAgentItems(task.value.id, { itemIds: [itemId], action })
  await loadItems(task.value.id)
}

async function applyTask() {
  if (!task.value?.id) return
  applying.value = true
  try {
    const res = await applyContentAgentTask(task.value.id)
    ElMessage.success(res.data?.message || '已写入')
    task.value.status = 'completed'
    emit('done')
  } finally {
    applying.value = false
  }
}

function truncate(s: string | undefined, n: number) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

function formatConf(c?: number) {
  if (c == null) return '—'
  return (c * 100).toFixed(0) + '%'
}

function reviewLabel(s: string) {
  return { pending: '待审', accepted: '已采纳', rejected: '已驳回', applied: '已写入' }[s] || s
}

function reviewTagType(s: string) {
  if (s === 'accepted' || s === 'applied') return 'success'
  if (s === 'rejected') return 'danger'
  return 'info'
}

watch(visible, (v) => {
  if (!v) stopPoll()
})
</script>

<style scoped>
.agent-hint { color: var(--el-text-color-secondary); font-size: 13px; margin: 0 0 12px; }
.agent-types { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 12px; }
.type-label { margin-right: 6px; }
.agent-freeform { margin-top: 8px; }
.agent-scope { margin-top: 8px; font-size: 13px; color: var(--el-text-color-secondary); }
.agent-progress { margin-bottom: 16px; }
.agent-progress__meta { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 6px; }
.agent-summary { margin-bottom: 12px; font-size: 13px; }
.agent-summary.warn { color: var(--el-color-warning); }
.agent-actions { margin-top: 10px; }
.diff-block { border: 1px solid var(--el-border-color-lighter); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.diff-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.diff-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.diff-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.diff-body { max-height: 200px; overflow: auto; font-size: 12px; border: 1px solid var(--el-border-color-lighter); padding: 8px; border-radius: 4px; }
.diff-actions { margin-top: 8px; }
.report-pre { white-space: pre-wrap; font-size: 12px; background: var(--el-fill-color-light); padding: 12px; border-radius: 6px; max-height: 320px; overflow: auto; }
.empty-hint { color: var(--el-text-color-secondary); font-size: 13px; padding: 24px; text-align: center; }
</style>
