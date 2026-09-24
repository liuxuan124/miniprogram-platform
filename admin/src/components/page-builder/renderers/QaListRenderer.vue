<template>
  <div class="render-qa-list">
    <div v-if="topicTabs.length" class="qa-tabs">
      <button
        v-for="tab in topicTabs"
        :key="tab"
        type="button"
        class="qa-tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div v-if="state === 'loading'" class="qa-state">
      <div v-for="i in 3" :key="i" class="qa-skeleton" />
    </div>
    <div v-else-if="state === 'error'" class="qa-state">
      <p>问答加载失败</p>
      <button type="button" @click="refresh">重试</button>
    </div>
    <div v-else-if="state === 'empty'" class="qa-state">暂无公开问答</div>
    <div v-else class="qa-rows">
      <div v-for="row in displayRows" :key="String(row.id)" class="qa-row">
        <div class="qa-q">
          <span class="qa-mark">Q</span>
          <span>{{ row.question }}</span>
        </div>
        <div class="qa-a" :style="{ WebkitLineClamp: summaryLines }">
          <span class="qa-mark qa-mark--a">A</span>
          <span>{{ row.answerPreview }}</span>
        </div>
        <div class="qa-meta">
          <span v-for="tag in row.tags" :key="tag" class="qa-tag">{{ tag }}</span>
          <span class="qa-spectators">{{ row.spectatorCount }} 人围观</span>
          <span class="qa-pay">{{ row.payStatusLabel }}</span>
        </div>
      </div>
    </div>

    <div v-if="showAsk" class="qa-ask">我要提问 ›</div>
    <div v-if="showMore" class="qa-more">{{ moreText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { demoQaItems, type QaListItem } from '@/utils/dsl-qa'
import { loadHydratedComponent } from '@/utils/preview-datasource'

const props = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const rows = ref<QaListItem[]>([])
const loading = ref(false)
const failed = ref(false)
const empty = ref(false)
const activeTab = ref('全部')

const limit = computed(() => Math.max(Number(props.component.props?.limit) || 5, 1))
const summaryLines = computed(() => Math.min(Math.max(Number(props.component.props?.summary_lines) || 2, 1), 3))
const showMore = computed(() => props.component.props?.show_more === true)
const showAsk = computed(() => props.component.props?.show_ask_entry === true)
const moreText = computed(() => props.component.props?.more_text || '查看更多问答 ›')
const filterPrivate = computed(() => props.component.props?.filter_private !== false)

const topicTabs = computed(() => {
  const raw = Array.isArray(props.component.props?.topic_tabs) ? props.component.props.topic_tabs : []
  const tabs = raw.map((t: any) => String(t?.name || t || '').trim()).filter(Boolean)
  return tabs.length ? ['全部', ...tabs] : []
})

const displayRows = computed(() => {
  let list = rows.value
  if (filterPrivate.value) {
    list = list.filter((r) => r.visibility !== 'private')
  }
  if (activeTab.value && activeTab.value !== '全部') {
    list = list.filter((r) => r.question.includes(activeTab.value) || r.tags.includes(activeTab.value))
  }
  return list.slice(0, limit.value)
})

const state = computed(() => {
  if (loading.value) return 'loading'
  if (failed.value) return 'error'
  if (empty.value || !displayRows.value.length) return 'empty'
  return 'data'
})

async function refresh() {
  loading.value = true
  failed.value = false
  try {
    if (props.previewMode) {
      rows.value = demoQaItems(limit.value)
      empty.value = false
      return
    }
    const hydrated = await loadHydratedComponent(props.component)
    if (hydrated.props?._previewDataFailed) {
      failed.value = true
      rows.value = []
      empty.value = true
      return
    }
    rows.value = hydrated.props?.items || []
    empty.value = !rows.value.length
  } catch {
    failed.value = true
    empty.value = true
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(() => props.component.props?.limit, refresh)
</script>

<style scoped>
.qa-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 8px;
}
.qa-tab {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.qa-tab.active {
  border-color: #c8923a;
  color: #a66b1f;
}
.qa-row {
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef2f6;
  margin-bottom: 8px;
}
.qa-q,
.qa-a {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
}
.qa-a {
  margin-top: 6px;
  color: #64748b;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.qa-mark {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #c8923a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qa-mark--a {
  background: #64748b;
}
.qa-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
}
.qa-tag {
  background: #f1f5f9;
  padding: 0 6px;
  border-radius: 4px;
}
.qa-ask,
.qa-more {
  text-align: center;
  font-size: 12px;
  color: #c8923a;
  margin-top: 8px;
}
.qa-state {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
}
.qa-skeleton {
  height: 72px;
  background: #f1f5f9;
  border-radius: 12px;
  margin-bottom: 8px;
}
</style>
