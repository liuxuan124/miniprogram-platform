<template>
  <aside class="cai">
    <div class="cai-head">
      <div>
        <div class="cai-title">AI 辅助创作</div>
        <div class="cai-sub">{{ typeHint }}</div>
      </div>
      <button v-if="collapsible" type="button" class="cai-fold" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div v-show="!collapsed" class="cai-body">
      <div class="cai-actions">
        <button
          v-for="a in actions"
          :key="a.key"
          type="button"
          class="cai-chip"
          :disabled="running"
          @click="runQuick(a)"
        >
          {{ a.label }}
        </button>
      </div>

      <label class="cai-label">补充说明（可选）</label>
      <textarea
        v-model="extraPrompt"
        class="cai-textarea"
        rows="3"
        :placeholder="placeholder"
        :disabled="running"
      />

      <button type="button" class="cai-run" :disabled="running" @click="runCustom">
        {{ running ? '生成中…' : '按说明生成' }}
      </button>

      <div v-if="errorText" class="cai-error">{{ errorText }}</div>
      <div v-if="statusText" class="cai-status">{{ statusText }}</div>

      <div v-if="suggestions.length" class="cai-list">
        <div v-for="(s, idx) in suggestions" :key="`${s.field}-${idx}`" class="cai-item">
          <div class="cai-item-head">
            <b>{{ s.fieldLabel || fieldLabel(s.field) }}</b>
            <button type="button" class="cai-apply" @click="applyOne(s)">采用</button>
          </div>
          <pre class="cai-preview">{{ truncate(s.value, 800) }}</pre>
        </div>
      </div>
      <div v-else-if="!running && finishedOnce" class="cai-empty">
        暂无可用建议。若 LLM（大模型）未配置或调用失败，请检查后台内容 Agent 配置，不会伪造正文。
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createContentAgentTask,
  getContentAgentTask,
  listContentAgentTaskItems,
  type ContentAgentTaskItem,
} from '@/api/contentAgent'

const props = withDefaults(
  defineProps<{
    contentId?: number | null
    contentType: string
    title?: string
    summary?: string
    body?: string
    collapsible?: boolean
  }>(),
  {
    contentId: null,
    title: '',
    summary: '',
    body: '',
    collapsible: true,
  },
)

const emit = defineEmits<{
  applyField: [payload: { field: string; value: string }]
}>()

type QuickAction = {
  key: string
  label: string
  intent: string
  preferTask?: string
}

const collapsed = ref(false)
const extraPrompt = ref('')
const running = ref(false)
const finishedOnce = ref(false)
const errorText = ref('')
const statusText = ref('')
const suggestions = ref<Array<{ field: string; fieldLabel?: string; value: string }>>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const typeHint = computed(() => {
  const t = props.contentType
  if (t === 'note') return '适合短图文：标题、话题与正文润色'
  if (t === 'file') return '适合资料：标题、简介与目录摘要'
  if (t === 'video') return '适合视频：标题、简介与封面文案'
  if (t === 'moment') return '适合动态：短文与话题'
  return '适合长文：标题、大纲、初稿与摘要'
})

const placeholder = computed(() => {
  if (props.contentType === 'note') return '例如：语气轻松，300 字内，带 2 个话题'
  if (props.contentType === 'file') return '例如：面向会员的 PDF 资料包说明'
  return '例如：面向新手的行业入门长文，分三节'
})

const actions = computed<QuickAction[]>(() => {
  const t = props.contentType
  if (t === 'note') {
    return [
      { key: 'title', label: '生成标题', intent: '生成 3 个短标题候选，只输出标题文本', preferTask: 'freeform' },
      { key: 'draft', label: '写初稿', intent: '写一篇短笔记正文初稿', preferTask: 'topic_draft' },
      { key: 'polish', label: '润色正文', intent: '润色笔记正文，保持口语化', preferTask: 'content_refresh' },
      { key: 'summary', label: '生成摘要', intent: '生成一句摘要', preferTask: 'summary_seo' },
    ]
  }
  if (t === 'file') {
    return [
      { key: 'title', label: '生成标题', intent: '为资料包生成简洁标题', preferTask: 'freeform' },
      { key: 'draft', label: '写简介', intent: '写一段资料说明/使用指引（200 字内）', preferTask: 'topic_draft' },
      { key: 'summary', label: '生成摘要', intent: '根据资料主题生成摘要', preferTask: 'summary_seo' },
    ]
  }
  if (t === 'moment') {
    return [
      { key: 'title', label: '生成标题', intent: '生成短动态标题候选', preferTask: 'freeform' },
      { key: 'draft', label: '写初稿', intent: '写一条短动态正文', preferTask: 'topic_draft' },
      { key: 'polish', label: '润色正文', intent: '润色动态正文，保持口语化', preferTask: 'content_refresh' },
    ]
  }
  if (t === 'video') {
    return [
      { key: 'title', label: '生成标题', intent: '为视频生成吸引人的标题', preferTask: 'freeform' },
      { key: 'draft', label: '写简介', intent: '写一段视频简介', preferTask: 'topic_draft' },
      { key: 'summary', label: '生成摘要', intent: '生成短摘要', preferTask: 'summary_seo' },
    ]
  }
  return [
    { key: 'title', label: '生成标题', intent: '生成吸引人的长文标题', preferTask: 'freeform' },
    { key: 'outline', label: '写大纲', intent: '输出三级大纲，不要写全文', preferTask: 'topic_draft' },
    { key: 'draft', label: '写初稿', intent: '按大纲风格写正文初稿', preferTask: 'topic_draft' },
    { key: 'polish', label: '润色正文', intent: '润色正文，保持原意', preferTask: 'content_refresh' },
    { key: 'summary', label: '生成摘要', intent: '生成 SEO 友好摘要', preferTask: 'summary_seo' },
  ]
})

watch(
  () => props.contentType,
  () => {
    suggestions.value = []
    finishedOnce.value = false
    errorText.value = ''
    statusText.value = ''
  },
)

function fieldLabel(field: string) {
  const map: Record<string, string> = {
    title: '标题',
    summary: '摘要',
    content: '正文',
    seoTitle: 'SEO 标题',
    seoDescription: 'SEO 描述',
    body: '正文',
  }
  return map[field] || field || '建议'
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function buildPrompt(intent: string) {
  const parts = [
    `内容类型：${props.contentType || 'article'}`,
    intent,
    props.title ? `当前标题：${props.title}` : '',
    props.summary ? `当前摘要：${props.summary}` : '',
    props.body ? `当前正文节选：${truncate(props.body, 1200)}` : '',
    extraPrompt.value.trim() ? `用户补充：${extraPrompt.value.trim()}` : '',
  ]
  return parts.filter(Boolean).join('\n')
}

function mapItems(items: ContentAgentTaskItem[]) {
  return items
    .filter((i) => i.field !== '_qc' && i.field !== '_report' && String(i.newValue || '').trim())
    .map((i) => ({
      field: String(i.field || (i.bodyField ? 'content' : 'title')),
      fieldLabel: i.fieldLabel || fieldLabel(String(i.field || (i.bodyField ? 'content' : 'title'))),
      value: String(i.newValue || '').trim(),
    }))
}

async function loadItems(taskId: number) {
  const res = await listContentAgentTaskItems(taskId, { size: 200 })
  const records = res.data?.records || []
  suggestions.value = mapItems(records)
}

function startPoll(id: number) {
  stopPoll()
  pollTimer = setInterval(async () => {
    try {
      const res = await getContentAgentTask(id)
      const task = res.data
      if (!task) return
      statusText.value = `进度 ${task.processed || 0}/${task.total || 0} · ${task.status}`
      if (task.status === 'failed') {
        stopPoll()
        running.value = false
        finishedOnce.value = true
        const msg = task.errorMessage || 'AI 任务失败（可能未配置 LLM 或调用出错）'
        errorText.value = msg
        ElMessage.error(msg)
        return
      }
      if (task.status === 'review' || task.status === 'completed') {
        stopPoll()
        await loadItems(id)
        running.value = false
        finishedOnce.value = true
        statusText.value = suggestions.value.length ? '已生成建议，可点击采用' : '任务完成但无可用文本建议'
        if (!suggestions.value.length) {
          ElMessage.warning('未返回可用文案。请确认内容 Agent / LLM 已配置，不会伪造正文。')
        }
      }
    } catch (e: any) {
      stopPoll()
      running.value = false
      finishedOnce.value = true
      const msg = e?.message || '轮询任务失败'
      errorText.value = msg
      ElMessage.error(msg)
    }
  }, 2000)
}

async function runTask(intent: string, preferTask?: string) {
  errorText.value = ''
  suggestions.value = []
  finishedOnce.value = false
  running.value = true
  statusText.value = '已提交任务…'
  const prompt = buildPrompt(intent)
  const hasId = props.contentId != null && Number(props.contentId) > 0

  let taskTypes: string[]
  if (!hasId) {
    taskTypes = ['topic_draft']
  } else if (preferTask === 'summary_seo') {
    taskTypes = ['summary_seo']
  } else if (preferTask === 'content_refresh') {
    taskTypes = ['content_refresh']
  } else {
    taskTypes = ['freeform']
  }

  try {
    const res = await createContentAgentTask({
      taskTypes,
      contentIds: hasId ? [Number(props.contentId)] : undefined,
      freeformPrompt: prompt,
      targetFormat: props.contentType === 'file' ? 'moment' : props.contentType || 'article',
    })
    const task = res.data
    if (!task?.id) {
      throw new Error('任务创建失败')
    }
    if (task.status === 'failed') {
      const msg = task.errorMessage || 'AI 任务失败'
      errorText.value = msg
      ElMessage.error(msg)
      running.value = false
      finishedOnce.value = true
      return
    }
    startPoll(task.id)
  } catch (e: any) {
    running.value = false
    finishedOnce.value = true
    const msg = e?.message || '无法创建 AI 任务（请检查内容 Agent / LLM 配置）'
    errorText.value = msg
    ElMessage.error(msg)
  }
}

function runQuick(a: QuickAction) {
  void runTask(a.intent, a.preferTask)
}

function runCustom() {
  const intent = extraPrompt.value.trim() || '根据当前类型与已有内容，给出可用的标题/摘要/正文建议'
  void runTask(intent, props.contentId ? 'freeform' : 'topic_draft')
}

function applyOne(s: { field: string; value: string }) {
  let field = s.field
  if (field === 'body' || field === 'html' || field === '正文') field = 'content'
  if (field === 'seo_description' || field === 'description') field = 'summary'
  if (field === 'seo_title') field = 'title'
  emit('applyField', { field, value: s.value })
  ElMessage.success('已写入编辑区，请确认后再保存')
}

onBeforeUnmount(stopPoll)
</script>

<style scoped lang="scss">
.cai {
  background: #fff;
  border: 1px solid #e4e9f2;
  border-radius: 12px;
  padding: 14px 12px 16px;
  position: sticky;
  top: 16px;
}
.cai-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.cai-title {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
}
.cai-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #8a94a6;
  line-height: 1.4;
}
.cai-fold {
  border: 1px solid #e3e8f0;
  background: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: #607187;
}
.cai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.cai-chip {
  border: 1px solid #e3e8f0;
  background: #f8fafc;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #334155;
}
.cai-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.cai-label {
  display: block;
  font-size: 12px;
  color: #607187;
  margin-bottom: 4px;
}
.cai-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
}
.cai-run {
  margin-top: 8px;
  width: 100%;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #b4430f;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.cai-run:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.cai-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.4;
}
.cai-status {
  margin-top: 8px;
  font-size: 12px;
  color: #607187;
}
.cai-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cai-item {
  border: 1px solid #e8edf5;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f8fafc;
}
.cai-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}
.cai-apply {
  border: 1px solid #f0d2c2;
  background: #fff7f2;
  color: #b4430f;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
.cai-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  font-family: inherit;
  max-height: 180px;
  overflow: auto;
}
.cai-empty {
  margin-top: 12px;
  font-size: 12px;
  color: #8a94a6;
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .cai {
    position: static;
  }
}
</style>
