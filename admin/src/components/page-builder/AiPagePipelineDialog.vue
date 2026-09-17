<template>
  <el-dialog
    :model-value="modelValue"
    title="AI 生成页面"
    width="760px"
    class="proto-dialog"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <p class="lead">一条流水线：先自由出视觉，再对照装修器组件和真实接口，通过的才写入草稿。</p>
    <el-input
      v-model="prompt"
      type="textarea"
      :rows="3"
      maxlength="200"
      show-word-limit
      placeholder="例如：茶饮品牌首页，沉浸大图、商品货架、活动报名"
      :disabled="running"
    />

    <el-steps :active="activeStep" finish-status="success" align-center class="steps">
      <el-step v-for="s in displayStages" :key="s.key" :title="s.title" :description="s.note" />
    </el-steps>

    <el-table v-if="report.length" :data="report" size="small" class="report" table-layout="auto">
      <el-table-column prop="title" label="区块" min-width="120" />
      <el-table-column label="组件" min-width="130">
        <template #default="{ row }">
          <el-tag :type="tagType(row.componentStatus)" size="small" effect="plain">
            {{ statusLabel(row.componentStatus) }}
          </el-tag>
          <span v-if="row.matchedLabel" class="muted"> {{ row.matchedLabel }}</span>
        </template>
      </el-table-column>
      <el-table-column label="接口" min-width="150">
        <template #default="{ row }">
          <el-tag :type="tagType(row.apiStatus)" size="small" effect="plain">
            {{ statusLabel(row.apiStatus) }}
          </el-tag>
          <div v-if="row.apiPath" class="mono">{{ row.apiPath }}</div>
        </template>
      </el-table-column>
      <el-table-column label="进草稿" width="80" align="center">
        <template #default="{ row }">{{ row.inDraft ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="说明" min-width="220" />
    </el-table>

    <p v-if="result" class="foot-note">
      {{ llmHint }}
      <template v-if="result.draft">草稿「{{ result.draft.name }}」已出现在页面列表，可进装修器继续改。</template>
      <template v-else>没有可通过的区块，未建页。</template>
    </p>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button v-if="result?.draft" type="primary" @click="openDraft">打开草稿</el-button>
      <el-button v-else type="primary" :loading="running" @click="run">开始生成</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { runAiPagePipeline, type AiPagePipelineResult } from '@/api/page'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  opened: [pageId: string | number]
  created: []
}>()

const prompt = ref('')
const running = ref(false)
const activeStep = ref(0)
const result = ref<AiPagePipelineResult | null>(null)

const fallbackStages = [
  { key: 'design', title: '设计 AI', note: '自由视觉，不限组件' },
  { key: 'component', title: '组件检查', note: '对照装修器' },
  { key: 'api', title: '接口检查', note: '对照真实接口' },
  { key: 'draft', title: '转草稿', note: '通过项写入' },
]

const displayStages = computed(() => {
  const stages = result.value?.stages
  if (stages?.length) {
    return stages.map((s) => ({ key: s.key, title: s.title, note: s.note }))
  }
  return fallbackStages
})

const report = computed(() => result.value?.report || [])
const llmHint = computed(() => (result.value?.llmUsed ? '模型已参与设计。' : '模型不可用，已用规则稿继续检查。'))

watch(() => props.modelValue, (open) => {
  if (open) {
    result.value = null
    running.value = false
    activeStep.value = 0
  }
})

function statusLabel(status: string) {
  if (status === 'pass') return '可通过'
  if (status === 'incomplete') return '能力不足'
  if (status === 'missing') return '缺失'
  return '不需要'
}

function tagType(status: string) {
  if (status === 'pass') return 'success'
  if (status === 'incomplete') return 'warning'
  if (status === 'missing') return 'danger'
  return 'info'
}

async function run() {
  const text = prompt.value.trim()
  if (!text) {
    ElMessage.warning('请先描述想要的页面')
    return
  }
  running.value = true
  result.value = null
  activeStep.value = 0
  const tick = window.setInterval(() => {
    activeStep.value = Math.min(activeStep.value + 1, 3)
  }, 700)
  try {
    const res = await runAiPagePipeline(text)
    result.value = res.data
    activeStep.value = 4
    const drafted = (res.data?.report || []).filter((r) => r.inDraft).length
    const gaps = (res.data?.report || []).filter((r) => !r.inDraft).length
    if (res.data?.draft) {
      ElMessage.success(`已写入草稿 ${drafted} 个区块，缺口 ${gaps} 个留在报告`)
      emit('created')
    } else {
      ElMessage.warning('没有可通过的区块，未建草稿')
    }
  } catch {
    /* 全局错误提示 */
  } finally {
    window.clearInterval(tick)
    running.value = false
  }
}

function openDraft() {
  const id = result.value?.draft?.pageId
  if (id == null) return
  emit('opened', id)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.lead {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}
.steps {
  margin: 18px 0 12px;
}
.report {
  width: 100%;
}
.muted {
  color: var(--text-muted);
  font-size: 12px;
}
.mono {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.foot-note {
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}
</style>
