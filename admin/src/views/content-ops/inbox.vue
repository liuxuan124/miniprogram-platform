<template>
  <div class="content-wb cw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">互动</h1>
        <div class="sub">评论、用户问答、星球提问、投稿、作者申请统一处理</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="router.push('/content/settings')">审核规则</button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
        <span v-if="t.count" class="cnt2">{{ t.count }}</span>
      </button>
    </div>

    <div class="ilist">
      <article v-for="m in visible" :key="m.key" class="icard">
        <div class="ihead">
          <span class="tag t-new">{{ m.kindLabel }}</span>
          <b>{{ m.who }}</b>
          <span v-if="m.extra" class="faint">{{ m.extra }}</span>
          <span class="faint" style="margin-left:auto">{{ m.at }}</span>
        </div>
        <div class="itext">{{ m.text }}</div>
        <div v-if="m.on" class="faint">评论于《{{ m.on }}》</div>
        <div v-if="m.quote" class="quote">{{ m.quote }}</div>
        <div v-if="m.kvs?.length" class="kvs">
          <span v-for="(kv, i) in m.kvs" :key="i">{{ kv }}</span>
        </div>

        <template v-if="m.done">
          <span class="tag t-draft">{{ m.doneLabel }}</span>
          <div v-if="m.answer" class="answer">{{ m.answer }}</div>
        </template>
        <div v-else style="display:flex;gap:8px;flex-wrap:wrap">
          <template v-if="m.kind === 'comment'">
            <button type="button" class="btn sm" @click="actComment(m, 1)">通过</button>
            <button type="button" class="btn sm danger" @click="actComment(m, 0)">隐藏</button>
          </template>
          <template v-else-if="m.kind === 'qa' || m.kind === 'planet'">
            <button type="button" class="btn sm primary" @click="openReply(m)">回答</button>
            <button type="button" class="btn sm" @click="actRejectQa(m)">不回答</button>
          </template>
          <template v-else-if="m.kind === 'submit'">
            <button type="button" class="btn sm primary" @click="actAudit(m, 'approved')">收入内容库</button>
            <button type="button" class="btn sm" @click="actAudit(m, 'rejected')">驳回</button>
          </template>
          <template v-else-if="m.kind === 'creator'">
            <button type="button" class="btn sm primary" @click="actCreator(m, 'approved')">通过</button>
            <button type="button" class="btn sm" @click="actCreator(m, 'rejected')">驳回</button>
          </template>
        </div>

        <form v-if="replyId === m.key" class="reply" @submit.prevent="submitReply(m)">
          <textarea v-model="replyText" class="input" rows="3" placeholder="写下回复，公开显示在小程序" />
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="link" @click="replyId = ''">取消</button>
            <button type="submit" class="btn sm primary" style="margin-left:auto">公开回答</button>
          </div>
        </form>
      </article>

      <div v-if="!visible.length" class="card muted" style="text-align:center;padding:40px;grid-column:1/-1">
        {{ tab === 'done' ? '还没有处理过的记录' : '都处理完了' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listContentComments, updateCommentStatus, getContentList, updateContent } from '@/api/content'
import { getQuestionList, answerQuestion, rejectQuestion } from '@/api/qa'
import { listCreatorApplications, updateCreatorApplicationStatus } from '@/api/creators'
import { unwrapList } from './utils'

type Kind = 'comment' | 'qa' | 'planet' | 'submit' | 'creator'

interface InboxItem {
  key: string
  kind: Kind
  kindLabel: string
  who: string
  extra?: string
  text: string
  on?: string
  quote?: string
  kvs?: string[]
  at: string
  done: boolean
  doneLabel?: string
  answer?: string
  rawId: number
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const tab = ref('all')
const items = ref<InboxItem[]>([])
const replyId = ref('')
const replyText = ref('')

const allowedTabs = new Set(['all', 'comment', 'qa', 'planet', 'submit', 'creator', 'done'])
function applyTabFromQuery() {
  const q = String(route.query.tab || '')
  if (allowedTabs.has(q)) tab.value = q
}

const openItems = computed(() => items.value.filter((m) => !m.done))
const doneItems = computed(() => items.value.filter((m) => m.done))

const tabs = computed(() => {
  const open = openItems.value
  const count = (k: Kind | 'all' | 'done') => {
    if (k === 'all') return open.length
    if (k === 'done') return doneItems.value.length
    return open.filter((m) => m.kind === k).length
  }
  return [
    { key: 'all', label: '全部', count: count('all') },
    { key: 'comment', label: '评论', count: count('comment') },
    { key: 'qa', label: '用户问答', count: count('qa') },
    { key: 'planet', label: '星球提问', count: count('planet') },
    { key: 'submit', label: '投稿', count: count('submit') },
    { key: 'creator', label: '创作者申请', count: count('creator') },
    { key: 'done', label: '已处理', count: count('done') },
  ]
})

const visible = computed(() => {
  if (tab.value === 'done') return doneItems.value
  if (tab.value === 'all') return openItems.value
  return openItems.value.filter((m) => m.kind === tab.value)
})

function fmtTime(v?: string) {
  return String(v || '').replace('T', ' ').slice(0, 16)
}

function isPlanetQuestion(q: Record<string, unknown>): boolean {
  const src = String(q.source || q.channel || q.from || q.scene || '').toLowerCase()
  if (src.includes('planet') || src.includes('星球')) return true
  if (q.planetId || q.planet_id) return true
  return false
}

async function load() {
  loading.value = true
  try {
    const [cRes, qRes, crRes, auditRes] = await Promise.all([
      listContentComments({ current: 1, size: 50 }),
      getQuestionList({ current: 1, size: 50 }),
      listCreatorApplications({ current: 1, size: 50 }),
      getContentList({ current: 1, size: 50, auditStatus: 'pending' } as any),
    ])

    const list: InboxItem[] = []

    for (const row of unwrapList(cRes).records as any[]) {
      const pending = Number(row.status) !== 1
      list.push({
        key: `c-${row.id}`,
        kind: 'comment',
        kindLabel: '评论',
        who: row.nickname || `用户#${row.userId || ''}`,
        text: row.content || '',
        on: row.contentTitle || (row.contentId ? `内容 #${row.contentId}` : ''),
        at: fmtTime(row.createTime || row.createdAt),
        done: !pending,
        doneLabel: pending ? undefined : '已通过',
        rawId: row.id,
      })
    }

    for (const row of unwrapList(qRes).records as any[]) {
      const pending = String(row.status) === 'pending'
      const planet = isPlanetQuestion(row)
      list.push({
        key: `q-${row.id}`,
        kind: planet ? 'planet' : 'qa',
        kindLabel: planet ? '星球提问' : '用户问答',
        who: row.userNickname || `用户#${row.userId || ''}`,
        text: row.body || '',
        at: fmtTime(row.createTime || row.createdAt),
        done: !pending,
        doneLabel: pending ? undefined : String(row.status),
        answer: row.answer?.content,
        rawId: row.id,
      })
    }

    for (const row of unwrapList(crRes).records as any[]) {
      const pending = String(row.status || 'pending') === 'pending'
      list.push({
        key: `cr-${row.id}`,
        kind: 'creator',
        kindLabel: '创作者申请',
        who: row.name || `申请#${row.id}`,
        extra: row.contact,
        text: row.intro || row.portfolio || '申请成为特约作者',
        kvs: [
          row.direction ? `方向：${row.direction}` : '',
          row.format ? `形态：${row.format}` : '',
          row.intro ? `简介：${row.intro}` : '',
        ].filter(Boolean),
        at: fmtTime(row.createdAt || row.createTime),
        done: !pending,
        doneLabel: pending ? undefined : String(row.status),
        rawId: row.id,
      })
    }

    for (const row of unwrapList(auditRes).records as any[]) {
      const st = String(row.auditStatus || row.audit_status || 'pending')
      const pending = st === 'pending' || st === 'machine_passed'
      list.push({
        key: `s-${row.id}`,
        kind: 'submit',
        kindLabel: '投稿',
        who: row.author || `投稿#${row.id}`,
        text: row.title || '未命名投稿',
        quote: row.summary,
        at: fmtTime(row.created_at || row.createdAt || row.updated_at),
        done: !pending,
        doneLabel: pending ? undefined : st,
        rawId: row.id,
      })
    }

    items.value = list
  } finally {
    loading.value = false
  }
}

async function actComment(m: InboxItem, status: number) {
  await updateCommentStatus(m.rawId, status)
  ElMessage.success(status === 1 ? '已通过' : '已隐藏')
  await load()
}

function openReply(m: InboxItem) {
  replyId.value = m.key
  replyText.value = ''
}

async function submitReply(m: InboxItem) {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回答')
    return
  }
  await answerQuestion(m.rawId, { content: replyText.value.trim() })
  ElMessage.success('已回答')
  replyId.value = ''
  await load()
}

async function actRejectQa(m: InboxItem) {
  await rejectQuestion(m.rawId)
  ElMessage.success('已驳回')
  await load()
}

async function actAudit(m: InboxItem, next: string) {
  await updateContent(m.rawId, { auditStatus: next } as any)
  ElMessage.success(next === 'approved' ? '已收入内容库' : '已驳回')
  await load()
}

async function actCreator(m: InboxItem, status: string) {
  await updateCreatorApplicationStatus(m.rawId, {
    status,
    rejectReason: status === 'rejected' ? '请补充资料后重新申请' : undefined,
  })
  ElMessage.success(status === 'approved' ? '已通过' : '已驳回')
  await load()
}

onMounted(async () => {
  applyTabFromQuery()
  await load()
})
</script>
