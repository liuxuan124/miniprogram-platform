<template>
  <div class="knowledge-page">
    <PageHeader
      kicker="经营管理 / Agent"
      title="知识库"
      description="Agent 可读语料：上传文档、同步站内内容、配置引用策略。分库编排与外部抓取见下方「未接入」标注。"
    >
      <template #actions>
        <el-button @click="$router.push('/ai/agent')">← Agent 列表</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="12" class="kb-stats">
      <el-col :span="6"><el-statistic title="语料源" :value="kbStats.sourceCount" /></el-col>
      <el-col :span="6"><el-statistic title="切片条目" :value="kbStats.chunkCount" /></el-col>
      <el-col :span="6"><el-statistic title="已索引" :value="kbStats.indexedCount" /></el-col>
      <el-col :span="6"><el-statistic title="完成度" :value="kbStats.indexPercent" suffix="%" /></el-col>
    </el-row>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="kb-alert"
      title="可用增强版：列表 / 上传 / 引用策略 / 站内同步已可用。多知识库分库、发布即自动入库、外部链接抓取尚未接入。"
    />

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>知识库列表（语料源）</span>
              <div class="card-head__actions">
                <el-select v-model="uploadCitePolicy" size="small" style="width: 140px" placeholder="引用策略">
                  <el-option label="完整引用" value="full" />
                  <el-option label="仅摘要" value="summary" />
                  <el-option label="不可引用" value="none" />
                </el-select>
                <el-upload
                  :show-file-list="false"
                  accept=".docx,.txt,.md,.markdown,.html,.xlsx,.csv"
                  :disabled="uploading"
                  :http-request="handleUpload"
                >
                  <el-button size="small" type="primary" :loading="uploading">＋ 上传文档</el-button>
                </el-upload>
                <el-tooltip content="多知识库分库尚未接入，当前为扁平语料源列表" placement="top">
                  <el-button size="small" disabled>＋ 新建知识库 · 未接入</el-button>
                </el-tooltip>
              </div>
            </div>
          </template>
          <el-table :data="sources" stripe v-loading="loadingSources" @row-click="openChunks">
            <el-table-column label="名称" min-width="160">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="openChunks(row)">
                  {{ row.fileName || `语料源 #${row.id}` }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">
                {{ sourceTypeLabel(row.sourceType) }}
              </template>
            </el-table-column>
            <el-table-column label="切片" prop="chunkCount" width="72" align="center" />
            <el-table-column label="命中" prop="hitCount" width="72" align="center" />
            <el-table-column label="默认引用策略" width="150">
              <template #default="{ row }">
                <el-select
                  :model-value="row.citePolicy || 'full'"
                  size="small"
                  style="width: 128px"
                  @click.stop
                  @change="(v) => updateCitePolicy(row, String(v))"
                >
                  <el-option label="完整引用" value="full" />
                  <el-option label="仅摘要" value="summary" />
                  <el-option label="不可引用" value="none" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="索引状态" width="110">
              <template #default="{ row }">
                <el-tag :type="vectorTagType(row.vectorStatus)" size="small">
                  {{ vectorLabel(row.vectorStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="权重" width="80" align="center">
              <template #default="{ row }">
                {{ row.recallWeight ?? 1 }}
              </template>
            </el-table-column>
            <el-table-column label="更新" width="150">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt || row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link size="small" @click.stop="downloadSource(row)">下载</el-button>
                <el-button link size="small" @click.stop="openChunks(row)">切片</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never" header="手动问答录入">
          <el-form label-width="72px" @submit.prevent>
            <el-form-item label="问题">
              <el-input v-model="qaForm.question" type="textarea" :rows="2" placeholder="用户可能问的问题" />
            </el-form-item>
            <el-form-item label="答案">
              <el-input v-model="qaForm.answer" type="textarea" :rows="4" placeholder="标准答案" />
            </el-form-item>
            <el-form-item label="引用策略">
              <el-select v-model="qaForm.citePolicy" style="width: 100%">
                <el-option label="完整引用" value="full" />
                <el-option label="仅摘要" value="summary" />
                <el-option label="不可引用" value="none" />
              </el-select>
            </el-form-item>
            <el-button type="primary" :loading="savingQa" @click="submitManualQa">保存问答</el-button>
          </el-form>
        </el-card>

        <el-card shadow="never" header="站内内容同步" style="margin-top:16px">
          <div class="sync-hint">命中条件的内容手动同步入库；「发布即自动入库」未接入。</div>
          <el-checkbox v-model="syncForm.includePublishedContent">已发布内容</el-checkbox>
          <el-checkbox v-model="syncForm.includeAnsweredQa" style="margin-top:8px">已采纳问答</el-checkbox>
          <el-button
            type="primary"
            style="margin-top:12px;width:100%"
            :loading="syncing"
            @click="runSync"
          >
            立即同步
          </el-button>
          <div v-if="syncResult" class="sync-result">{{ syncResult }}</div>
          <div class="capability-list">
            <div class="cap ok">✓ 手动同步站内内容 / 问答</div>
            <div class="cap off">○ 发布即自动入库 · 未接入</div>
            <div class="cap off">○ 外部链接抓取 · 未接入</div>
            <div class="cap off">○ 多知识库分库编排 · 未接入</div>
          </div>
        </el-card>

        <el-card shadow="never" header="检索测试（纯召回）" style="margin-top:16px">
          <el-input
            v-model="searchQ"
            placeholder="输入问题，查看 top5 切片与分数"
            @keyup.enter="runSearchTest"
          />
          <el-button type="primary" style="margin-top:8px;width:100%" :loading="searching" @click="runSearchTest">
            检索
          </el-button>
          <div v-if="searchHits.length" class="search-hits">
            <div v-for="(hit, i) in searchHits" :key="i" class="search-hit">
              <div class="search-hit__score">#{{ i + 1 }} 分数 {{ hit.score?.toFixed(4) ?? '—' }}</div>
              <div class="search-hit__title">{{ hit.title || hit.sourceRef || '切片' }}</div>
              <div class="search-hit__body">{{ truncate(hit.body, 120) }}</div>
            </div>
          </div>
          <el-empty v-else-if="searched" description="无召回结果" :image-size="48" />
        </el-card>
      </el-col>
    </el-row>

    <el-drawer v-model="chunkDrawerVisible" :title="chunkDrawerTitle" size="520px">
      <el-table :data="chunks" stripe v-loading="loadingChunks" size="small">
        <el-table-column label="#" prop="seq" width="48" />
        <el-table-column label="标题" prop="title" min-width="100" show-overflow-tooltip />
        <el-table-column label="正文" min-width="180">
          <template #default="{ row }">
            <span class="chunk-preview">{{ truncate(row.body, 80) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="命中" prop="hitCount" width="56" align="center" />
        <el-table-column label="操作" width="72">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="removeChunk(row)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { get } from '@/api/request'
import {
  createManualQa,
  deleteChunk,
  downloadKnowledge,
  getChunks,
  listKnowledgeSources,
  patchKnowledgeCitePolicy,
  searchTest,
  syncFromContent,
  uploadKnowledgeFile,
  type KnowledgeChunkItem,
  type KnowledgeSourceItem,
} from '@/api/knowledge'

const kbStats = ref({ sourceCount: 0, chunkCount: 0, indexedCount: 0, indexPercent: 0 })

const loadingSources = ref(false)
const loadingChunks = ref(false)
const uploading = ref(false)
const savingQa = ref(false)
const syncing = ref(false)
const searching = ref(false)
const searched = ref(false)

const sources = ref<KnowledgeSourceItem[]>([])
const chunks = ref<KnowledgeChunkItem[]>([])
const searchHits = ref<Array<{ title?: string; body?: string; sourceRef?: string; score?: number }>>([])
const syncResult = ref('')
const uploadCitePolicy = ref('full')

const qaForm = ref({ question: '', answer: '', citePolicy: 'full' })
const syncForm = ref({ includePublishedContent: true, includeAnsweredQa: true })
const searchQ = ref('')

const chunkDrawerVisible = ref(false)
const activeSource = ref<KnowledgeSourceItem | null>(null)

const chunkDrawerTitle = computed(() =>
  activeSource.value?.fileName ? `切片预览 · ${activeSource.value.fileName}` : '切片预览'
)

const KNOWLEDGE_ACCEPT = ['docx', 'txt', 'md', 'markdown', 'html', 'xlsx', 'csv']
const KNOWLEDGE_MAX_SIZE = 10 * 1024 * 1024

function sourceTypeLabel(t?: string) {
  const map: Record<string, string> = {
    file: '手动上传',
    content: '站内内容',
    qa: '问答',
    product: '商品',
    manual: '手动',
  }
  return map[t || 'file'] || t || '文件'
}

function vectorLabel(s?: string) {
  if (s === 'done') return '已索引'
  if (s === 'processing') return '处理中'
  if (s === 'failed') return '失败'
  return '待索引'
}

function vectorTagType(s?: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'done') return 'success'
  if (s === 'processing') return 'warning'
  if (s === 'failed') return 'danger'
  return 'info'
}

function formatDate(value?: string) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

function truncate(text?: string, len = 100) {
  if (!text) return '—'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

async function loadKbStats() {
  try {
    const res = await get<any>('/api/v1/admin/knowledge/stats')
    const d = (res as any)?.data || {}
    kbStats.value = {
      sourceCount: Number(d.sourceCount || 0),
      chunkCount: Number(d.chunkCount || 0),
      indexedCount: Number(d.indexedCount || 0),
      indexPercent: Number(d.indexPercent || 0),
    }
  } catch {
    kbStats.value = { sourceCount: 0, chunkCount: 0, indexedCount: 0, indexPercent: 0 }
  }
}

async function loadSources() {
  loadingSources.value = true
  try {
    const res = await listKnowledgeSources()
    sources.value = res.data || []
  } catch {
    sources.value = []
  } finally {
    loadingSources.value = false
  }
}

async function handleUpload(options: { file: File }) {
  const file = options.file
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!KNOWLEDGE_ACCEPT.includes(ext)) {
    ElMessage.warning('支持 docx / txt / md / html / xlsx / csv，不支持 PDF')
    return
  }
  if (file.size > KNOWLEDGE_MAX_SIZE) {
    ElMessage.warning('文件不能超过 10MB')
    return
  }
  uploading.value = true
  try {
    await uploadKnowledgeFile(file, undefined, uploadCitePolicy.value)
    ElMessage.success(`已上传「${file.name}」`)
    await loadSources()
    await loadKbStats()
  } catch {
    // 拦截器已提示
  } finally {
    uploading.value = false
  }
}

async function submitManualQa() {
  if (!qaForm.value.question.trim() || !qaForm.value.answer.trim()) {
    ElMessage.warning('请填写问题与答案')
    return
  }
  savingQa.value = true
  try {
    await createManualQa({
      question: qaForm.value.question.trim(),
      answer: qaForm.value.answer.trim(),
      citePolicy: qaForm.value.citePolicy || 'full',
    })
    ElMessage.success('问答已入库')
    qaForm.value = { question: '', answer: '', citePolicy: 'full' }
    await loadSources()
    await loadKbStats()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    savingQa.value = false
  }
}

async function updateCitePolicy(row: KnowledgeSourceItem, citePolicy: string) {
  const prev = row.citePolicy || 'full'
  if (prev === citePolicy) return
  row.citePolicy = citePolicy
  try {
    await patchKnowledgeCitePolicy(row.id, citePolicy)
    ElMessage.success('引用策略已更新')
  } catch (e: unknown) {
    row.citePolicy = prev
    const msg = e instanceof Error ? e.message : '更新失败'
    ElMessage.error(msg)
  }
}

async function runSync() {
  syncing.value = true
  syncResult.value = ''
  try {
    const res = await syncFromContent({
      includePublishedContent: syncForm.value.includePublishedContent,
      includeAnsweredQa: syncForm.value.includeAnsweredQa,
    })
    const d = res.data
    syncResult.value = d?.message
      || `同步完成：${d?.synced ?? 0} 篇 · ${d?.chunks ?? 0} 切片`
    ElMessage.success('同步任务已提交')
    await loadSources()
    await loadKbStats()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '同步失败'
    ElMessage.error(msg)
  } finally {
    syncing.value = false
  }
}

async function runSearchTest() {
  const q = searchQ.value.trim()
  if (!q) {
    ElMessage.warning('请输入检索问题')
    return
  }
  searching.value = true
  searched.value = true
  try {
    const res = await searchTest(q)
    searchHits.value = (res.data || []).slice(0, 5)
  } catch {
    searchHits.value = []
  } finally {
    searching.value = false
  }
}

async function openChunks(row: KnowledgeSourceItem) {
  activeSource.value = row
  chunkDrawerVisible.value = true
  loadingChunks.value = true
  try {
    const res = await getChunks(row.id)
    chunks.value = res.data || []
  } catch {
    chunks.value = []
  } finally {
    loadingChunks.value = false
  }
}

async function removeChunk(row: KnowledgeChunkItem) {
  try {
    await ElMessageBox.confirm('确认删除该切片？', '删除切片', { type: 'warning' })
    await deleteChunk(row.id)
    ElMessage.success('已删除')
    if (activeSource.value) await openChunks(activeSource.value)
    await loadSources()
  } catch (e: unknown) {
    if (e === 'cancel' || e === 'close') return
  }
}

async function downloadSource(row: KnowledgeSourceItem) {
  try {
    const res = await downloadKnowledge(row.id)
    const url = res.data?.url || row.fileUrl
    if (url) {
      window.open(url, '_blank')
      return
    }
    ElMessage.warning('暂无下载地址')
  } catch {
    if (row.fileUrl) window.open(row.fileUrl, '_blank')
    else ElMessage.warning('下载失败')
  }
}

onMounted(() => {
  void loadKbStats()
  void loadSources()
})
</script>

<style scoped lang="scss">
.knowledge-page {
  padding: 20px;
}
.kb-alert {
  margin-bottom: 16px;
}
.kb-stats {
  margin-bottom: 12px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.card-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sync-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
  line-height: 1.5;
}
.sync-result {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.capability-list {
  margin-top: 14px;
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.cap.ok {
  color: var(--success, #0faa6e);
}
.cap.off {
  color: var(--text-muted);
}
.search-hits {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}
.search-hit {
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-size: 12px;
}
.search-hit__score {
  color: var(--el-color-primary);
  font-weight: 600;
  margin-bottom: 4px;
}
.search-hit__title {
  font-weight: 600;
  margin-bottom: 4px;
}
.search-hit__body {
  color: var(--text-muted);
  line-height: 1.5;
}
.chunk-preview {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
