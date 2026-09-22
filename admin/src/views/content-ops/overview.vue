<template>
  <div class="content-wb cw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">今天要处理的</h1>
        <div class="sub">
          已发布 {{ publishedCount }} · 草稿 {{ draftCount }}
          <template v-if="scheduledCount"> · 定时 {{ scheduledCount }}</template>
        </div>
      </div>
    </div>

    <div class="todo-grid">
      <button type="button" class="todo" @click="router.push('/content/inbox')">
        <span class="todo-ic"><MiniIcon name="inbox" :size="18" /></span>
        <span style="flex:1;min-width:0">
          <b>待处理互动</b>
          <span class="faint" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            评论、提问、投稿、作者申请统一在这里
          </span>
        </span>
        <span class="todo-n">{{ pendingInteract }}</span>
      </button>
      <button type="button" class="todo" @click="router.push({ path: '/content/articles', query: { status: 'draft' } })">
        <span class="todo-ic"><MiniIcon name="pen" :size="18" /></span>
        <span style="flex:1;min-width:0">
          <b>草稿</b>
          <span class="faint" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            {{ draftHint }}
          </span>
        </span>
        <span class="todo-n">{{ draftCount }}</span>
      </button>
      <button v-if="scheduledCount > 0" type="button" class="todo" @click="router.push('/content/articles')">
        <span class="todo-ic"><MiniIcon name="clock" :size="18" /></span>
        <span style="flex:1;min-width:0">
          <b>定时发布</b>
          <span class="faint" style="display:block">有排期内容</span>
        </span>
        <span class="todo-n">{{ scheduledCount }}</span>
      </button>
      <button type="button" class="todo" disabled title="占位：暂无 AI 分类建议接口">
        <span class="todo-ic"><MiniIcon name="spark" :size="18" /></span>
        <span style="flex:1;min-width:0">
          <b>分类可能不准</b>
          <span class="faint" style="display:block">AI 建议重新归类（即将接入）</span>
        </span>
        <span class="todo-n">0</span>
      </button>
    </div>

    <div class="ways ways4">
      <button type="button" class="way" @click="goWrite('article')">
        <MiniIcon name="doc" :size="20" />
        <span><b>写长文</b><span class="muted" style="font-size:12.5px">深度文章，支持会员门禁</span></span>
      </button>
      <button type="button" class="way" @click="goWrite('note')">
        <MiniIcon name="note" :size="20" />
        <span><b>写笔记</b><span class="muted" style="font-size:12.5px">图文短内容</span></span>
      </button>
      <button type="button" class="way" @click="goWrite('video')">
        <MiniIcon name="video" :size="20" />
        <span><b>写视频</b><span class="muted" style="font-size:12.5px">上传或粘贴视频链接</span></span>
      </button>
      <button type="button" class="way" @click="goWrite('file')">
        <MiniIcon name="file" :size="20" />
        <span><b>写资料</b><span class="muted" style="font-size:12.5px">PDF 等文件，可设下载权限</span></span>
      </button>
    </div>

    <div class="ov2">
      <section class="card">
        <div class="head">
          <div>
            <h2 class="h2">阅读最多</h2>
            <div class="sub">已发布内容的累计阅读</div>
          </div>
          <div class="actions">
            <button type="button" class="link" @click="router.push('/content/articles')">全部内容 ›</button>
          </div>
        </div>
        <div v-if="topReads.length" class="bars">
          <div v-for="it in topReads" :key="it.id" class="bar-row">
            <button type="button" class="link bar-name" :title="it.title" @click="goEdit(it.id)">
              {{ it.title }}
            </button>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${Math.max(4, (it.reads / maxReads) * 100)}%` }" />
            </div>
            <span class="bar-val">{{ formatReads(it.reads) }}</span>
          </div>
        </div>
        <div v-else class="muted" style="margin-top:16px">暂无已发布内容</div>
      </section>

      <div style="display:flex;flex-direction:column;gap:16px">
        <section class="card">
          <h2 class="h2">最近发布与排期</h2>
          <div style="margin-top:8px">
            <div v-for="it in recentList" :key="it.id" class="list-row">
              <span class="tag" :class="statusTagClass(it.status)">{{ statusLabel(it.status) }}</span>
              <button
                type="button"
                class="link"
                style="color:var(--ink);font-weight:500;text-align:left;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                @click="goEdit(it.id)"
              >
                {{ it.title }}
              </button>
              <span class="faint">{{ it.at }}</span>
            </div>
            <div v-if="!recentList.length" class="muted" style="padding:12px 0">暂无记录</div>
          </div>
        </section>
        <section class="card">
          <h2 class="h2">分类分布</h2>
          <div class="sub">按已加载内容统计</div>
          <div class="catdist">
            <div v-for="c in catDist" :key="c.name">
              <span>{{ c.name }}</span>
              <b>{{ c.count }}</b>
            </div>
            <div v-if="!catDist.length" class="muted">暂无分类</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getCategoryList, getContentList, listContentComments } from '@/api/content'
import { getQuestionList } from '@/api/qa'
import { listCreatorApplications } from '@/api/creators'
import { ContentStatus } from '@/types/content'
import {
  formatReads,
  readCountOf,
  statusLabel,
  statusTagClass,
  unwrapList,
} from './utils'

const router = useRouter()
const loading = ref(false)
const pendingInteract = ref(0)
const draftCount = ref(0)
const publishedCount = ref(0)
const scheduledCount = ref(0)
const draftTitles = ref<string[]>([])
const allItems = ref<Array<Record<string, unknown>>>([])
const categories = ref<Array<{ id: number; name: string }>>([])

const draftHint = computed(() => {
  if (!draftTitles.value.length) return '没有草稿'
  return draftTitles.value.slice(0, 2).join('、')
})

const topReads = computed(() => {
  const live = allItems.value
    .filter((x) => String(x.status) === ContentStatus.Published)
    .map((x) => ({
      id: Number(x.id),
      title: String(x.title || '未命名'),
      reads: readCountOf(x),
    }))
    .sort((a, b) => b.reads - a.reads)
    .slice(0, 6)
  return live
})

const maxReads = computed(() => Math.max(1, ...topReads.value.map((x) => x.reads)))

const recentList = computed(() => {
  return [...allItems.value]
    .filter((x) => String(x.status) !== ContentStatus.Draft)
    .sort((a, b) => {
      const ta = String(a.published_at || a.publishedAt || a.updated_at || a.updatedAt || a.created_at || '')
      const tb = String(b.published_at || b.publishedAt || b.updated_at || b.updatedAt || b.created_at || '')
      return tb.localeCompare(ta)
    })
    .slice(0, 5)
    .map((x) => ({
      id: Number(x.id),
      title: String(x.title || '未命名'),
      status: String(x.status || ''),
      at: String(x.published_at || x.publishedAt || x.updated_at || x.updatedAt || '').replace('T', ' ').slice(0, 16),
    }))
})

const catDist = computed(() => {
  const live = allItems.value.filter((x) => String(x.status) === ContentStatus.Published)
  if (categories.value.length) {
    return categories.value.map((c) => ({
      name: c.name,
      count: live.filter((x) => Number(x.category_id ?? x.categoryId) === c.id || String(x.category_name || x.categoryName) === c.name).length,
    }))
  }
  const map = new Map<string, number>()
  for (const x of live) {
    const name = String(x.category_name || x.categoryName || '未分类')
    map.set(name, (map.get(name) || 0) + 1)
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }))
})

function goWrite(type: string) {
  router.push({ path: '/content/write', query: { type } })
}

function goEdit(id: number) {
  router.push({ path: '/content/write', query: { id: String(id) } })
}

function flattenCats(nodes: any[]): Array<{ id: number; name: string }> {
  const out: Array<{ id: number; name: string }> = []
  const walk = (list: any[]) => {
    for (const n of list || []) {
      out.push({ id: Number(n.id), name: String(n.name || '') })
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

async function load() {
  loading.value = true
  try {
    const [commentsRes, qaRes, creatorsRes, draftRes, pubRes, allRes, catRes] = await Promise.all([
      listContentComments({ status: 0, current: 1, size: 1 }),
      getQuestionList({ status: 'pending', current: 1, size: 1 }),
      listCreatorApplications({ status: 'pending', current: 1, size: 1 }),
      getContentList({ status: ContentStatus.Draft, current: 1, size: 5 }),
      getContentList({ status: ContentStatus.Published, current: 1, size: 1 }),
      getContentList({ current: 1, size: 100 }),
      getCategoryList(),
    ])
    const c = unwrapList(commentsRes)
    const q = unwrapList(qaRes)
    const cr = unwrapList(creatorsRes)
    pendingInteract.value = c.total + q.total + cr.total

    const drafts = unwrapList(draftRes)
    draftCount.value = drafts.total
    draftTitles.value = drafts.records.map((r) => String((r as any).title || '')).filter(Boolean)

    publishedCount.value = unwrapList(pubRes).total
    scheduledCount.value = 0

    const all = unwrapList(allRes)
    allItems.value = all.records as Array<Record<string, unknown>>

    const cats = (catRes as any)?.data ?? catRes
    categories.value = flattenCats(Array.isArray(cats) ? cats : [])
  } catch {
    /* keep zeros */
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
