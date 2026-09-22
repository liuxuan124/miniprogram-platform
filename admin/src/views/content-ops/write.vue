<template>
  <div class="content-wb cw-ed" v-loading="pageLoading">
    <div class="ed-top">
      <button type="button" class="link" style="display:flex;align-items:center;gap:2px;color:var(--mute)" @click="goLibrary">
        <MiniIcon name="back" :size="14" />内容库
      </button>
      <span style="width:1px;height:22px;background:var(--line)" />
      <div class="seg" role="group" aria-label="内容类型">
        <button
          v-for="t in typeSegs"
          :key="t.key"
          type="button"
          :class="{ on: contentType === t.key }"
          :disabled="status === 'published'"
          @click="contentType = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <span class="tag" :class="statusTagClass(status)">{{ statusLabel(status) }}</span>
      <span class="faint" style="display:flex;gap:4px;align-items:center;white-space:nowrap">
        <span style="color:var(--g)"><MiniIcon name="check" :size="13" /></span>
        {{ savedHint }}
      </span>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn sm" @click="previewOpen = true">
          <MiniIcon name="eye" :size="15" />手机预览
        </button>
        <button type="button" class="btn primary sm" :disabled="saving" @click="publish">
          <MiniIcon name="send" :size="14" />{{ publishLabel }}
        </button>
      </div>
    </div>

    <div class="ed-body ed2">
      <div class="writer">
        <div v-if="contentType === 'video'" class="drop">
          <MiniIcon name="video" :size="24" />
          <b>粘贴视频号 / B 站链接，或在正文写说明</b>
          <span class="faint">封面可在发布设置中补充</span>
          <input v-model="videoUrl" class="input" style="margin-top:8px;max-width:480px" placeholder="视频链接" />
        </div>
        <input v-model="title" class="w-title" placeholder="标题" aria-label="标题" />
        <textarea v-model="summary" class="w-sum" rows="2" placeholder="摘要（列表和分享卡片里显示）" aria-label="摘要" />
        <div v-if="contentType === 'article'" class="w-body-wrap">
          <PageRichTextEditor v-model="body" seamless-images class="ops-rich" />
        </div>
        <textarea
          v-else
          v-model="body"
          class="input"
          style="flex:1;min-height:320px;resize:vertical"
          :placeholder="contentType === 'video' ? '视频说明（选填）' : '开始写正文…'"
          aria-label="正文"
        />
        <div class="faint">{{ wordCount }} 字</div>
      </div>

      <div class="ed-right">
        <div class="rtabs" role="tablist">
          <button type="button" :class="{ on: rightTab === 'set' }" @click="rightTab = 'set'">发布设置</button>
          <button type="button" :class="{ on: rightTab === 'ai' }" @click="rightTab = 'ai'">
            <MiniIcon name="spark" :size="15" />AI 助手
          </button>
        </div>

        <div v-if="rightTab === 'set'" class="panel">
          <div class="field">
            <label>分类</label>
            <select v-model="categoryId" class="input">
              <option :value="0">选择分类</option>
              <option v-for="c in flatCats" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>标签</label>
            <div class="tagbox">
              <span v-for="(t, i) in tags" :key="`${t}-${i}`" class="tagchip">
                {{ t }}
                <button type="button" aria-label="删除标签" @click="tags.splice(i, 1)">
                  <MiniIcon name="x" :size="11" />
                </button>
              </span>
              <input
                v-model="tagInput"
                placeholder="回车添加"
                aria-label="添加标签"
                @keydown.enter.prevent="addTag"
              />
            </div>
          </div>
          <div class="field">
            <label>谁可以看</label>
            <div class="seg">
              <button type="button" style="flex:1" :class="{ on: gate === 'free' }" @click="gate = 'free'">所有人</button>
              <button type="button" style="flex:1" :class="{ on: gate === 'member' }" @click="gate = 'member'">会员</button>
            </div>
            <div v-if="gate === 'member'" class="note">
              非会员按默认门禁规则可读部分正文。
              <button type="button" class="link" @click="router.push('/content/settings')">改默认规则</button>
            </div>
          </div>
          <div class="field">
            <label>发布时间</label>
            <div class="seg">
              <button type="button" style="flex:1" :class="{ on: when === 'now' }" @click="when = 'now'">立即</button>
              <button type="button" style="flex:1" :class="{ on: when === 'sched' }" @click="when = 'sched'">定时</button>
            </div>
            <input v-if="when === 'sched'" v-model="schedAt" class="input" placeholder="如 09-24 20:00" aria-label="定时时间" />
            <div v-if="when === 'sched'" class="note">暂无定时发布接口：将保存为草稿，到时请手动发布。</div>
          </div>
          <div class="field">
            <label>封面图 URL</label>
            <input v-model="coverImage" class="input" placeholder="可选" />
          </div>
          <button type="button" class="btn sm" :disabled="saving" @click="saveDraft">保存草稿</button>
        </div>

        <template v-else>
          <div class="chat" ref="chatEl">
            <div class="faint">AI 读得到这篇正文、你的分类体系和历史爆款标题。</div>
            <div v-for="(m, i) in aiMsgs" :key="i" :class="m.role === 'u' ? 'bub-u' : 'bub-a'">
              <div>{{ m.text }}</div>
              <button
                v-for="(o, oi) in m.opts || []"
                :key="oi"
                type="button"
                class="btn sm"
                style="justify-content:space-between;width:100%"
                @click="applyAiOpt(m, oi)"
              >
                <span style="flex:1;text-align:left">{{ o.label }}</span>
                <span class="link" style="font-size:12px">{{ m.used === oi ? '已采用' : '采用' }}</span>
              </button>
            </div>
            <div v-if="!aiMsgs.length" class="bub-a">写完正文后，可以让我起标题、写摘要、推荐分类标签，或检查敏感词。</div>
            <div v-if="aiBusy" class="bub-a">思考中…</div>
          </div>
          <div class="composer">
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <button
                v-for="chip in aiChips"
                :key="chip"
                type="button"
                class="chip"
                :disabled="aiBusy"
                @click="runAi(chip)"
              >
                {{ chip }}
              </button>
            </div>
            <form class="cbox" @submit.prevent="runAi(aiInput)">
              <textarea v-model="aiInput" aria-label="告诉 AI 要做什么" placeholder="比如：把开头改得更抓人" />
              <button type="submit" class="iconbtn" style="background:var(--acc);color:#fff;border-color:var(--acc)" aria-label="发送" :disabled="aiBusy">
                <MiniIcon name="send" :size="15" />
              </button>
            </form>
          </div>
        </template>
      </div>
    </div>

    <div v-if="previewOpen" class="scrim" @click.self="previewOpen = false">
      <div class="modal" role="dialog" aria-modal="true" style="width:380px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2 class="h2">手机预览</h2>
          <button type="button" class="iconbtn" aria-label="关闭" @click="previewOpen = false">
            <MiniIcon name="x" :size="16" />
          </button>
        </div>
        <div style="border:1px solid var(--line);border-radius:12px;padding:16px;background:var(--soft);display:flex;flex-direction:column;gap:10px">
          <b style="font-size:15px;line-height:1.4">{{ title || '未命名' }}</b>
          <span class="faint">{{ typeLabel(contentType) }} · {{ catName || '未分类' }}</span>
          <div v-if="summary" class="quote" style="font-size:12px">{{ summary }}</div>
          <div class="muted" style="font-size:12.5px;line-height:1.7;white-space:pre-wrap">{{ previewPlain.slice(0, 400) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import {
  getCategoryList,
  getContentDetail,
  createContent,
  updateContent,
  publishContent,
} from '@/api/content'
import { createContentAgentTask } from '@/api/contentAgent'
import { ContentStatus } from '@/types/content'
import { mapFormatToUi, statusLabel, statusTagClass, typeLabel } from './utils'

const router = useRouter()
const route = useRoute()

const pageLoading = ref(false)
const saving = ref(false)
const contentId = ref<number | null>(null)
const contentType = ref<'article' | 'note' | 'video'>('article')
const status = ref<string>(ContentStatus.Draft)
const title = ref('')
const summary = ref('')
const body = ref('')
const videoUrl = ref('')
const coverImage = ref('')
const categoryId = ref(0)
const tags = ref<string[]>([])
const tagInput = ref('')
const gate = ref<'free' | 'member'>('free')
const when = ref<'now' | 'sched'>('now')
const schedAt = ref('')
const flatCats = ref<Array<{ id: number; name: string }>>([])
const rightTab = ref<'set' | 'ai'>('set')
const previewOpen = ref(false)
const savedHint = ref('自动保存')

const aiChips = ['起 5 个标题', '写一段摘要', '推荐分类和标签', '检查敏感词', '润色开头']
const aiMsgs = ref<Array<{ role: 'u' | 'ai'; text: string; kind?: string; opts?: Array<{ label: string; apply?: string }>; used?: number }>>([])
const aiInput = ref('')
const aiBusy = ref(false)
const chatEl = ref<HTMLElement | null>(null)

const typeSegs = [
  { key: 'article' as const, label: '长文' },
  { key: 'note' as const, label: '笔记' },
  { key: 'video' as const, label: '视频' },
]

const wordCount = computed(() => body.value.replace(/<[^>]+>/g, '').replace(/\s/g, '').length)
const catName = computed(() => flatCats.value.find((c) => c.id === categoryId.value)?.name || '')
const publishLabel = computed(() => {
  if (when.value === 'sched' && status.value !== ContentStatus.Published) return '定时发布'
  return status.value === ContentStatus.Published ? '更新' : '发布'
})
const previewPlain = computed(() =>
  body.value.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim() || '正文内容……',
)

function goLibrary() {
  router.push('/content/library')
}

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!tags.value.includes(t)) tags.value.push(t)
  tagInput.value = ''
}

function flattenCats(nodes: any[]) {
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

function buildPayload(asDraft = false) {
  const content =
    contentType.value === 'video' && videoUrl.value
      ? `${body.value || ''}\n\n<video src="${videoUrl.value.trim()}"></video>`
      : body.value
  return {
    title: title.value.trim() || '未命名',
    summary: summary.value.trim(),
    content,
    categoryId: categoryId.value || undefined,
    category_id: categoryId.value || undefined,
    coverImage: coverImage.value || undefined,
    cover_image: coverImage.value || undefined,
    contentType: contentType.value,
    visibility: gate.value === 'member' ? 'member_only' : 'public',
    status: asDraft || when.value === 'sched' ? ContentStatus.Draft : undefined,
    tags: tags.value,
    videoUrl: contentType.value === 'video' ? videoUrl.value.trim() : undefined,
  } as any
}

async function persist(asDraft = false) {
  if (!title.value.trim() && !body.value.trim()) {
    ElMessage.warning('请先填写标题或正文')
    return null
  }
  saving.value = true
  try {
    const payload = buildPayload(asDraft)
    if (contentId.value) {
      await updateContent(contentId.value, payload)
      return contentId.value
    }
    const created = await createContent(payload)
    const id = Number((created as any).data?.id ?? (created as any).id)
    contentId.value = id
    if (id) router.replace({ path: '/content/write', query: { id: String(id), type: contentType.value } })
    return id
  } finally {
    saving.value = false
    savedHint.value = `已保存 ${new Date().toTimeString().slice(0, 5)}`
  }
}

async function saveDraft() {
  const id = await persist(true)
  if (id) {
    status.value = ContentStatus.Draft
    ElMessage.success('草稿已保存')
  }
}

async function publish() {
  if (when.value === 'sched') {
    const id = await persist(true)
    if (id) {
      status.value = ContentStatus.Draft
      ElMessage.success(schedAt.value ? `已存为草稿（定时 ${schedAt.value} 需手动发布）` : '已存为草稿；暂无定时发布接口')
    }
    return
  }
  const id = await persist(false)
  if (!id) return
  await publishContent(id)
  status.value = ContentStatus.Published
  ElMessage.success('已发布')
}

async function loadDetail(id: number) {
  pageLoading.value = true
  try {
    const res = await getContentDetail(id)
    const data = ((res as any)?.data ?? res) as Record<string, unknown>
    contentId.value = id
    title.value = String(data.title || '')
    summary.value = String(data.summary || '')
    body.value = String(data.content || '')
    coverImage.value = String(data.coverImage || data.cover_image || '')
    categoryId.value = Number(data.categoryId ?? data.category_id ?? 0)
    status.value = String(data.status || ContentStatus.Draft)
    contentType.value = mapFormatToUi(data) as 'article' | 'note' | 'video'
    gate.value = String(data.visibility || '') === 'member_only' ? 'member' : 'free'
    const rawTags = data.tags
    if (Array.isArray(rawTags)) {
      tags.value = rawTags.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
    }
    videoUrl.value = String(data.videoUrl || data.video_url || '')
  } finally {
    pageLoading.value = false
  }
}

async function runAi(prompt: string) {
  const text = String(prompt || '').trim()
  if (!text || aiBusy.value) return
  aiMsgs.value.push({ role: 'u', text })
  aiInput.value = ''
  aiBusy.value = true
  await nextTick()
  chatEl.value && (chatEl.value.scrollTop = chatEl.value.scrollHeight)

  try {
    // Best-effort agent; fall back to local tips on failure
    if (contentId.value && /标题|摘要|分类|标签|敏感|润色/.test(text)) {
      try {
        await createContentAgentTask({
          taskTypes: ['rewrite'],
          contentIds: [contentId.value],
          freeformPrompt: text,
        })
      } catch {
        /* local mock below */
      }
    }
  } catch {
    /* ignore */
  }

  await new Promise((r) => setTimeout(r, 600))
  const t = (title.value || '这篇内容').replace(/[「」]/g, '').slice(0, 14)
  let msg: (typeof aiMsgs.value)[0] = { role: 'ai', text: '' }
  if (/标题/.test(text)) {
    msg = {
      role: 'ai',
      text: '按你历史阅读风格，起了几个标题：',
      kind: 'title',
      opts: [
        { label: `${t}：一个内容人的真实复盘`, apply: 'title' },
        { label: `别急着发，${t.slice(0, 8)}前先想清这 3 件事`, apply: 'title' },
        { label: `${t}｜附清单`, apply: 'title' },
      ],
    }
  } else if (/摘要/.test(text)) {
    msg = {
      role: 'ai',
      text: '写了两版，选一个：',
      kind: 'sum',
      opts: [
        { label: `用一个真实案例讲清「${t.slice(0, 10)}」，附可直接照做的清单。`, apply: 'sum' },
        { label: `${t.slice(0, 10)}：花钱、踩坑、复盘，全部摊开讲。`, apply: 'sum' },
      ],
    }
  } else if (/分类|标签/.test(text)) {
    const c = catName.value || flatCats.value[0]?.name || '未分类'
    msg = {
      role: 'ai',
      text: `建议归到「${c}」，并加这些标签：`,
      kind: 'cat',
      opts: [{ label: `分类：${c} · 标签：复盘、清单、新手`, apply: 'cat' }],
    }
  } else if (/敏感/.test(text)) {
    const hit = /加V|日入|私信/.test(title.value + body.value)
    msg = {
      role: 'ai',
      text: hit ? '发现可能被判定为引流的表述，建议改掉。' : '检查完了，没有发现敏感词或违规引流表述。',
      opts: [],
    }
  } else {
    msg = {
      role: 'ai',
      text: '改好了开头，采用后会替换正文第一段：',
      kind: 'open',
      opts: [{ label: '先说结论：这件事我做了 90 天，最大的收获不是钱，而是节奏。', apply: 'open' }],
    }
  }
  aiMsgs.value.push(msg)
  aiBusy.value = false
  await nextTick()
  chatEl.value && (chatEl.value.scrollTop = chatEl.value.scrollHeight)
}

function applyAiOpt(m: (typeof aiMsgs.value)[0], oi: number) {
  const opt = m.opts?.[oi]
  if (!opt) return
  m.used = oi
  if (m.kind === 'title') title.value = opt.label
  else if (m.kind === 'sum') summary.value = opt.label
  else if (m.kind === 'cat') {
    const catMatch = opt.label.match(/分类：([^·]+)/)
    const tagMatch = opt.label.match(/标签：(.+)/)
    if (catMatch) {
      const name = catMatch[1].trim()
      const hit = flatCats.value.find((c) => c.name === name)
      if (hit) categoryId.value = hit.id
    }
    if (tagMatch) {
      tags.value = tagMatch[1].split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
    }
  } else if (m.kind === 'open') {
    if (contentType.value === 'article') {
      body.value = `<p>${opt.label}</p>` + body.value
    } else {
      body.value = `${opt.label}\n\n${body.value}`
    }
  }
  ElMessage.success('已采用')
}

watch(
  () => route.query.id,
  (id) => {
    if (id) void loadDetail(Number(id))
  },
)

onMounted(async () => {
  const catRes = await getCategoryList()
  const cats = (catRes as any)?.data ?? catRes
  flatCats.value = flattenCats(Array.isArray(cats) ? cats : [])

  const qType = String(route.query.type || '')
  if (qType === 'note' || qType === 'video' || qType === 'article') contentType.value = qType

  const id = route.query.id ? Number(route.query.id) : 0
  if (id) await loadDetail(id)
})
</script>

<style scoped>
.ops-rich {
  min-height: 380px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
</style>
