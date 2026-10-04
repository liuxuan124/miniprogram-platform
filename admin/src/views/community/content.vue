<template>
  <div class="mw-page community-content">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <router-link v-if="!isAll && !isUnassigned" :to="`/community/overview/${cid}`" class="crumb-link">{{ comm.name || '社区' }}</router-link>
      <span v-else class="crumb-cur">{{ isUnassigned ? '未归属社区' : '全部社区' }}</span>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">内容管理</span>
    </div>

    <!-- 头部 -->
    <div class="page-head">
      <div class="head-left">
        <button v-if="!isAll" class="btn-back" @click="$router.push(isUnassigned ? '/community/content/all' : `/community/overview/${cid}`)">← 返回{{ isUnassigned ? '全部社区' : '概览' }}</button>
        <span class="head-emoji">{{ isAll ? '🌐' : (isUnassigned ? '📦' : (comm.emoji || '🪐')) }}</span>
        <div>
          <h2 class="head-title">{{ isAll ? '全部社区 · 内容管理' : isUnassigned ? '未归属社区 · 内容管理' : `${comm.name || '社区'} · 内容管理` }}</h2>
          <span class="head-id">{{ isAll ? `共 ${comms.length} 个社区` : isUnassigned ? '未归属或社区已下线' : `ID: ${cid}` }}</span>
        </div>
      </div>
      <div class="head-right">
        <select class="inp inp-scope" :value="cid" @change="changeScope(($event.target as HTMLSelectElement).value)">
          <option value="all">🌐 全部社区</option>
          <option v-for="c in comms" :key="c.id" :value="c.id">{{ c.emoji || '🪐' }} {{ c.name }}</option>
          <option value="unassigned">📦 未归属社区</option>
        </select>
        <button class="btn-primary" @click="openComposer">+ 发帖</button>
      </div>
    </div>

    <!-- 概览条 -->
    <div class="kpi-bar">
      <div class="kpi"><span class="kpi-num">{{ posts.length }}</span><span class="kpi-label">总动态</span></div>
      <div class="kpi"><span class="kpi-num">{{ todayCount }}</span><span class="kpi-label">今日</span></div>
      <div class="kpi"><span class="kpi-num">{{ essenceCount }}</span><span class="kpi-label">精华</span></div>
      <div class="kpi"><span class="kpi-num">{{ pinnedCount }}</span><span class="kpi-label">置顶</span></div>
      <div class="kpi"><span class="kpi-num">{{ draftCount }}</span><span class="kpi-label">草稿</span></div>
      <div class="kpi"><span class="kpi-num">{{ offlineCount }}</span><span class="kpi-label">已下架</span></div>
      <div class="kpi"><span class="kpi-num">{{ unassignedCount }}</span><span class="kpi-label">未归属</span></div>
    </div>

    <!-- 批量操作条 -->
    <div v-if="selectedIds.length" class="batch-bar">
      <span class="batch-count">已选 {{ selectedIds.length }} 条</span>
      <button class="btn-ghost btn-sm" @click="batchSet('pinned', true)">批量置顶</button>
      <button class="btn-ghost btn-sm" @click="batchSet('pinned', false)">取消置顶</button>
      <button class="btn-ghost btn-sm" @click="batchSet('essence', true)">批量加精</button>
      <button class="btn-ghost btn-sm" @click="batchSet('essence', false)">取消加精</button>
      <button class="btn-ghost btn-sm" @click="batchSet('status', 'published')">批量上架</button>
      <button class="btn-ghost btn-sm" @click="batchSet('status', 'unpublished')">批量下架</button>
      <button class="btn-ghost btn-sm" @click="clearSelection">取消选择</button>
    </div>

    <!-- 筛选条 -->
    <div class="filter-bar">
      <div class="chip-group">
        <span class="chip-label">类型</span>
        <button v-for="t in KIND_CHIPS" :key="t.v" class="chip" :class="{ on: filterKind === t.v }" @click="filterKind = t.v">{{ t.label }}</button>
      </div>
      <div class="chip-group">
        <span class="chip-label">发布状态</span>
        <button v-for="s in PUBLISH_CHIPS" :key="s.v" class="chip" :class="{ on: filterPublish === s.v }" @click="filterPublish = s.v">{{ s.label }}</button>
      </div>
      <div class="chip-group">
        <span class="chip-label">运营位</span>
        <button v-for="s in STATUS_CHIPS" :key="s.v" class="chip" :class="{ on: filterStatus === s.v }" @click="filterStatus = s.v">{{ s.label }}</button>
      </div>
      <input v-model="searchText" class="inp inp-search" placeholder="搜索标题或正文..." />
      <select v-model="filterTopic" class="inp">
        <option value="">全部话题</option>
        <option v-for="t in topics" :key="t.topic" :value="t.topic">#{{ t.topic }} ({{ t.count }})</option>
      </select>
      <button class="btn-ghost" @click="showTopicPanel = !showTopicPanel">话题管理</button>
    </div>

    <!-- 话题管理面板 -->
    <div v-if="showTopicPanel" class="topic-panel">
      <div class="topic-panel-head">
        <h3>话题热度榜（从动态反算）</h3>
        <button class="btn-ghost btn-sm" @click="showTopicPanel = false">关闭</button>
      </div>
      <div v-if="!topics.length" class="empty-box">暂无话题数据。</div>
      <div v-else class="topic-grid">
        <div v-for="t in topics.slice(0, 20)" :key="t.topic" class="topic-item">
          <span class="topic-hash">#{{ t.topic }}</span>
          <span class="topic-meta">{{ t.count }} 帖 · {{ t.likes }} 赞 · {{ t.comments }} 评</span>
          <span class="topic-heat">{{ heatLabel(t) }}</span>
        </div>
      </div>
    </div>

    <!-- 内容列表 -->
    <div v-if="loading" class="loading-hint">加载中...</div>
    <div v-else-if="!filteredPosts.length" class="empty-box">
      暂无内容。点击右上角「+ 发帖」发布第一条，或
      <router-link :to="`/community/members/${cid}`" class="link">去成员页引导参与</router-link>
    </div>
    <div v-else class="post-list">
      <div v-for="p in filteredPosts" :key="p.id" class="post-card" :class="{ pinned: p.pinned, essence: p.essence, hidden: p.hidden }">
        <div class="post-head">
          <label class="post-check" title="选择用于批量操作" @click.stop>
            <input type="checkbox" :checked="selectedIds.includes(p.id)" @change="toggleSelect(p.id)" />
          </label>
          <div class="post-author">
            <div class="avatar">{{ (p.authorName || '?').slice(0, 1) }}</div>
            <div>
              <div class="post-name">{{ p.authorName || '匿名' }}</div>
              <div class="post-time">{{ fmt(p.createTime) }}</div>
            </div>
          </div>
          <div class="post-badges">
            <span class="badge" :class="publishBadge(p.status)">{{ publishLabel(p.status) }}</span>
            <span v-if="isAll || cid === 'unassigned'" class="badge" :class="isKnownCommunity(p.communityId) ? 'badge-comm' : 'badge-warn'">
              {{ isKnownCommunity(p.communityId) ? commName(p.communityId) : '未归属' }}
            </span>
            <span v-if="p.pinned" class="badge badge-pin">置顶</span>
            <span v-if="p.essence" class="badge badge-ess">精华</span>
            <span v-if="p.hidden" class="badge badge-hid">隐藏</span>
            <span v-if="p.kind" class="badge badge-kind">{{ kindLabel(p.kind) }}</span>
          </div>
        </div>
        <div class="post-body" @click="openDetail(p)">
          <span v-if="p.topic" class="post-topic">#{{ p.topic }}</span>
          <span v-if="p.title" class="post-title">{{ p.title }}</span>
          <span class="post-text">{{ shortText(p.textContent) }}</span>
        </div>
        <div class="post-stats">
          <span>♡ {{ p.likeCount ?? p.likes ?? 0 }}</span>
          <span>💬 {{ p.comments || 0 }}</span>
          <span v-if="p.viewCount">👁 {{ p.viewCount }}</span>
          <span v-if="p.attachmentCount">📎 {{ p.attachmentCount }}</span>
        </div>
        <div class="post-actions">
          <button class="btn-act" @click="togglePin(p)">{{ p.pinned ? '取消置顶' : '置顶' }}</button>
          <button class="btn-act" @click="toggleEssence(p)">{{ p.essence ? '取消精华' : '加精' }}</button>
          <button class="btn-act" @click="toggleHide(p)">{{ p.hidden ? '取消隐藏' : '隐藏' }}</button>
          <button class="btn-act" @click="togglePublish(p)">{{ p.status === 'published' ? '下架' : '上架' }}</button>
          <select class="btn-act act-select" :value="p.communityId" @change="changeComm(p, ($event.target as HTMLSelectElement).value)">
            <option value="">未归属</option>
            <option v-for="c in comms" :key="c.id" :value="c.id">{{ c.emoji || '🪐' }} {{ c.name }}</option>
          </select>
          <button class="btn-act" @click="reachAuthor(p)">联系作者</button>
          <button class="btn-act btn-danger" @click="removePost(p)">删除</button>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="detail.show" class="drawer-mask" @click.self="detail.show = false">
      <div class="drawer-box">
        <div class="drawer-head">
          <h3>帖子详情</h3>
          <button class="btn-close" @click="detail.show = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="detail-author">
            <div class="avatar">{{ (detail.post?.authorName || '?').slice(0, 1) }}</div>
            <div>
              <div class="post-name">{{ detail.post?.authorName || '匿名' }}</div>
              <div class="post-time">{{ fmt(detail.post?.createTime) }}</div>
            </div>
          </div>
          <div v-if="detail.post?.topic" class="detail-topic">#{{ detail.post?.topic }}</div>
          <div class="detail-text">{{ detail.post?.textContent || '(无正文)' }}</div>
          <div v-if="detail.post?.replyText" class="detail-reply">
            <span class="reply-label">星主回复：</span>{{ detail.post?.replyText }}
          </div>
          <div class="detail-stats">
            <span>♡ {{ detail.post?.likes || 0 }} 赞</span>
            <span>💬 {{ detail.post?.comments || 0 }} 评论</span>
            <span v-if="detail.post?.attachmentCount">📎 {{ detail.post?.attachmentCount }} 附件</span>
          </div>
        </div>
        <div class="drawer-foot">
          <button class="btn-act" @click="togglePin(detail.post!); detail.post!.pinned = !detail.post!.pinned">{{ detail.post?.pinned ? '取消置顶' : '置顶' }}</button>
          <button class="btn-act" @click="toggleEssence(detail.post!); detail.post!.essence = !detail.post!.essence">{{ detail.post?.essence ? '取消精华' : '加精' }}</button>
          <button class="btn-act" @click="toggleHide(detail.post!); detail.post!.hidden = !detail.post!.hidden">{{ detail.post?.hidden ? '取消隐藏' : '隐藏' }}</button>
        </div>
      </div>
    </div>

    <!-- 发帖弹窗 -->
    <div v-if="composer.show" class="modal-mask" @click.self="composer.show = false">
      <div class="modal-box modal-box-wide">
        <h3 class="modal-title">发布动态</h3>
        <!-- 发布到哪个社区 -->
        <div v-if="isAll" class="persona-sel">
          <label class="fld-label">发布到社区 <span class="fld-hint">（当前为全部社区视图，需指定目标社区）</span></label>
          <select v-model="composer.targetId" class="inp">
            <option value="">— 选择社区 —</option>
            <option v-for="c in comms" :key="c.id" :value="c.id">{{ c.emoji || '🪐' }} {{ c.name }}</option>
          </select>
        </div>
        <!-- 发布身份选择 -->
        <div class="persona-sel">
          <label class="fld-label">发布身份 <span class="fld-hint">（系统配置身份，用于前期填充内容）</span></label>
          <div class="persona-row">
            <select v-model="composer.personaId" class="inp">
              <option value="">— 选择身份 —</option>
              <option v-for="p in personas" :key="p.id" :value="p.id">
                {{ p.name }}【{{ p.tag || '成员' }}】{{ p.desc ? ' · ' + p.desc : '' }}
              </option>
            </select>
            <button type="button" class="btn-ghost btn-sm" @click="openPersonaMgr">管理身份</button>
          </div>
          <!-- 选中身份预览 -->
          <div v-if="selectedPersona" class="persona-preview">
            <div class="avatar" :style="{ background: selectedPersona.color || '#C08E6E' }">{{ selectedPersona.name.slice(0, 1) }}</div>
            <div>
              <div class="pp-name">{{ selectedPersona.name }} <span class="pp-tag">{{ selectedPersona.tag || '成员' }}</span></div>
              <div v-if="selectedPersona.desc" class="pp-desc">{{ selectedPersona.desc }}</div>
            </div>
          </div>
        </div>
        <select v-model="composer.kind" class="inp">
          <option value="">普通动态</option>
          <option value="hot">热议</option>
          <option value="checkin">打卡</option>
        </select>
        <input v-model="composer.topic" class="inp" placeholder="话题（不带#）" />
        <textarea v-model="composer.textContent" class="inp inp-area" rows="5" placeholder="正文内容"></textarea>
        <div class="modal-foot">
          <button class="btn-ghost" @click="composer.show = false">取消</button>
          <button class="btn-primary" @click="publish">以该身份发布</button>
        </div>
      </div>
    </div>

    <!-- 身份管理弹窗 -->
    <div v-if="personaMgr.show" class="modal-mask" @click.self="personaMgr.show = false">
      <div class="modal-box modal-box-wide">
        <h3 class="modal-title">管理发布身份</h3>
        <div class="fld-hint" style="margin-bottom: 8px;">预设身份仅在本机浏览器生效，用于运营以指定身份发帖填充前期内容。</div>
        <div class="persona-list-edit">
          <div v-for="(p, i) in personaMgr.list" :key="p.id" class="persona-edit-row">
            <div class="avatar sm" :style="{ background: p.color || COMMUNITY_TONES[i % COMMUNITY_TONES.length] }">{{ (p.name || '?').slice(0, 1) }}</div>
            <input v-model="p.name" class="inp inp-name" placeholder="昵称" />
            <select v-model="p.tag" class="inp inp-tag">
              <option value="">无标签</option>
              <option v-for="t in PERSONA_TAG_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
            <input v-model="p.color" type="color" class="inp-color" :title="'头像色'" />
            <input v-model="p.desc" class="inp inp-desc" placeholder="一句话简介（可选）" />
            <button type="button" class="btn-act btn-danger" @click="personaMgr.list.splice(i, 1)">删除</button>
          </div>
        </div>
        <button type="button" class="btn-ghost btn-sm" @click="addPersona">+ 新增身份</button>
        <div class="modal-foot">
          <button class="btn-ghost" @click="personaMgr.show = false">取消</button>
          <button class="btn-primary" @click="savePersonaMgr">保存</button>
        </div>
      </div>
    </div>

    <!-- 联系作者弹窗 -->
    <div v-if="reachBox.show" class="modal-mask" @click.self="reachBox.show = false">
      <div class="modal-box">
        <h3 class="modal-title">发送消息给 {{ reachBox.target?.authorName }}</h3>
        <input v-model="reachBox.title" class="inp" placeholder="消息标题（可选）" />
        <textarea v-model="reachBox.content" class="inp inp-area" rows="4" placeholder="消息内容"></textarea>
        <div class="modal-foot">
          <button class="btn-ghost" @click="reachBox.show = false">取消</button>
          <button class="btn-primary" @click="sendReach">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchPlanetConfig, normalizeCommunities, aggregateTopics, isToday, type CommCard,
  loadPersonas, savePersonas, newPersonaId, COMMUNITY_TONES, PERSONA_TAG_OPTIONS, type Persona,
} from './planet-config'
import {
  listCommunityPosts, createCommunityPost, updateCommunityPost, reachUsers,
  type CommunityPost,
} from '@/api/memberOps'

const route = useRoute()
const router = useRouter()
const cid = computed(() => String(route.params.id || ''))
const isAll = computed(() => cid.value === 'all')
/** V111：未归属社区视图（动态无 community_id 或指向已不存在的社区） */
const isUnassigned = computed(() => cid.value === 'unassigned')

const KIND_CHIPS = [
  { v: '', label: '全部' },
  { v: 'normal', label: '动态' },
  { v: 'hot', label: '热议' },
  { v: 'checkin', label: '打卡' },
]
const STATUS_CHIPS = [
  { v: '', label: '全部' },
  { v: 'pinned', label: '置顶' },
  { v: 'essence', label: '精华' },
  { v: 'hidden', label: '隐藏' },
]

/** 发布状态（来自 mp_content.status，V111 起与社区管理台合并显示） */
const PUBLISH_CHIPS = [
  { v: '', label: '全部' },
  { v: 'published', label: '已上架' },
  { v: 'draft', label: '草稿' },
  { v: 'unpublished', label: '已下架' },
]

const loading = ref(false)
const comms = ref<CommCard[]>([])
const comm = ref<CommCard>({} as CommCard)
const posts = ref<CommunityPost[]>([])
const filterKind = ref('')
const filterStatus = ref('')
/** V111：发布状态筛选（mp_content.status） */
const filterPublish = ref('')
const searchText = ref('')
/** V111：批量操作选中项 */
const selectedIds = ref<number[]>([])
const filterTopic = ref('')
const showTopicPanel = ref(false)
const detail = ref({ show: false, post: null as CommunityPost | null })
const composer = ref({ show: false, personaId: '', kind: '', topic: '', textContent: '', targetId: '' })

/* 发布身份（预设身份） */
const personas = ref<Persona[]>(loadPersonas())
const selectedPersona = computed(() => personas.value.find((p) => p.id === composer.value.personaId))
const personaMgr = ref({ show: false, list: [] as Persona[] })

function addPersona() {
  personaMgr.value.list.push({
    id: newPersonaId(),
    name: '',
    tag: '普通会员',
    color: COMMUNITY_TONES[personaMgr.value.list.length % COMMUNITY_TONES.length],
    desc: '',
  })
}
function savePersonaMgr() {
  const cleaned = personaMgr.value.list.filter((p) => p.name.trim())
  if (!cleaned.length) { ElMessage.warning('至少保留一个有效身份'); return }
  savePersonas(cleaned)
  personas.value = cleaned
  personaMgr.value.show = false
  ElMessage.success(`已保存 ${cleaned.length} 个发布身份`)
}
function openPersonaMgr() {
  personaMgr.value = { show: true, list: JSON.parse(JSON.stringify(personas.value)) }
}

const topics = computed(() => aggregateTopics(posts.value))
const todayCount = computed(() => posts.value.filter((p) => isToday(p.createTime)).length)
const essenceCount = computed(() => posts.value.filter((p) => p.essence).length)
const pinnedCount = computed(() => posts.value.filter((p) => p.pinned).length)
const hiddenCount = computed(() => posts.value.filter((p) => p.hidden).length)
/** V111：内容库状态统计（原动态管理页的口径，合并后同屏可见） */
const draftCount = computed(() => posts.value.filter((p) => (p.status || 'published') === 'draft').length)
const offlineCount = computed(() => posts.value.filter((p) => p.status === 'unpublished').length)
/** 归属到已下线社区（或无归属）的动态条数 */
const unassignedCount = computed(() => posts.value.filter((p) => !isKnownCommunity(p.communityId)).length)

/** 社区 id 是否存在于当前星球配置（社区被删/改名后历史动态会落空） */
function isKnownCommunity(id?: string | null) {
  if (!id) return false
  return comms.value.some((c) => c.id === id)
}

const filteredPosts = computed(() => {
  let list = posts.value
  if (isUnassigned.value) list = list.filter((p) => !isKnownCommunity(p.communityId))
  if (filterKind.value) list = list.filter((p) => (p.kind || 'normal') === filterKind.value)
  if (filterPublish.value) list = list.filter((p) => (p.status || 'published') === filterPublish.value)
  if (filterStatus.value === 'pinned') list = list.filter((p) => p.pinned)
  else if (filterStatus.value === 'essence') list = list.filter((p) => p.essence)
  else if (filterStatus.value === 'hidden') list = list.filter((p) => p.hidden)
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    list = list.filter((p) => `${p.title || ''} ${p.textContent || ''}`.toLowerCase().includes(q))
  }
  if (filterTopic.value) list = list.filter((p) => p.topic === filterTopic.value)
  // 置顶永远在前
  return [...list].sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0) || (b.createTime || '').localeCompare(a.createTime || ''))
})

/** 发布状态标签（与内容库文案一致） */
function publishLabel(s?: string | null) {
  return ({ published: '已上架', draft: '草稿', unpublished: '已下架', scheduled: '待发布' } as any)[s || 'published'] || '已上架'
}
function publishBadge(s?: string | null) {
  return ({ published: 'badge-pub', draft: 'badge-draft', unpublished: 'badge-off', scheduled: 'badge-draft' } as any)[s || 'published'] || 'badge-pub'
}

function kindLabel(k?: string) { return ({ hot: '热议', checkin: '打卡', normal: '动态', feed: '信息流' } as any)[k || 'normal'] || k || '动态' }
function commName(id?: string | null) {
  const c = comms.value.find((x) => x.id === id)
  return c ? `${c.emoji || '🪐'} ${c.name}` : '未知社区'
}
function changeScope(v: string) {
  if (!v || v === cid.value) return
  if (v !== 'all' && v !== 'unassigned') localStorage.setItem('community_last_id', v)
  router.replace(`/community/content/${v}`)
}
function openComposer() {
  composer.value.targetId = (isAll.value || isUnassigned.value) ? '' : cid.value
  composer.value.show = true
}
function heatLabel(t: { count: number; likes: number; comments: number }) {
  const s = t.likes + t.comments * 2
  if (s > 50) return '🔥 爆'
  if (s > 20) return '热'
  if (s > 5) return '温'
  return '普通'
}
function shortText(s?: string) { return (s || '').slice(0, 120) + ((s || '').length > 120 ? '...' : '') }
function fmt(s?: string) {
  if (!s) return '-'
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function openDetail(p: CommunityPost) { detail.value = { show: true, post: { ...p } } }

async function togglePin(p: CommunityPost) {
  try { await updateCommunityPost(p.id, { pinned: !p.pinned }); p.pinned = !p.pinned; ElMessage.success(p.pinned ? '已置顶' : '已取消置顶') } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}
async function toggleEssence(p: CommunityPost) {
  try { await updateCommunityPost(p.id, { essence: !p.essence }); p.essence = !p.essence; ElMessage.success(p.essence ? '已加精' : '已取消加精') } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}
async function toggleHide(p: CommunityPost) {
  try { await updateCommunityPost(p.id, { hidden: !p.hidden }); p.hidden = !p.hidden; ElMessage.success(p.hidden ? '已隐藏' : '已取消隐藏') } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

/** V111：内容库状态下架/上架（合并后不再需要回「动态管理」改状态） */
async function togglePublish(p: CommunityPost) {
  const next = p.status === 'published' ? 'unpublished' : 'published'
  try {
    await updateCommunityPost(p.id, { status: next })
    p.status = next
    ElMessage.success(next === 'published' ? '已上架' : '已下架')
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

/** V111：调整动态归属社区（空值=未归属） */
async function changeComm(p: CommunityPost, next: string) {
  const prev = p.communityId || ''
  if (prev === next) return
  try {
    await updateCommunityPost(p.id, { communityId: next })
    p.communityId = next
    ElMessage.success(next ? `已归属到「${commName(next)}」` : '已移出社区')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

/* 批量操作（V111） */
function toggleSelect(id: number) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}
function clearSelection() { selectedIds.value = [] }
async function batchSet(field: 'pinned' | 'essence' | 'status', value: boolean | string) {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  const label = field === 'pinned' ? (value ? '置顶' : '取消置顶') : field === 'essence' ? (value ? '加精' : '取消加精') : (value === 'published' ? '上架' : '下架')
  try {
    await ElMessageBox.confirm(`确认对选中的 ${ids.length} 条动态批量${label}？`, '批量操作', { type: 'warning' })
  } catch { return }
  try {
    for (const id of ids) {
      await updateCommunityPost(id, { [field]: value } as any)
      const p = posts.value.find((x) => x.id === id)
      if (p) {
        if (field === 'status') p.status = value as string
        else (p as any)[field] = value
      }
    }
    ElMessage.success(`已批量${label} ${ids.length} 条`)
    clearSelection()
  } catch (e: any) { ElMessage.error(e?.message || '批量操作失败') }
}
async function removePost(p: CommunityPost) {
  try {
    await ElMessageBox.confirm('确认删除该帖子？', '提示', { type: 'warning' })
    const { del } = await import('@/api/request')
    await del(`/api/v1/admin/member-ops/community/posts/${p.id}`)
    posts.value = posts.value.filter((x) => x.id !== p.id)
    ElMessage.success('已删除')
  } catch { /* cancelled */ }
}
async function publish() {
  if (!composer.value.personaId) { ElMessage.warning('请选择发布身份'); return }
  const targetCid = isAll.value ? composer.value.targetId : cid.value
  if (!targetCid) { ElMessage.warning('请选择要发布到的社区'); return }
  if (!composer.value.textContent.trim()) { ElMessage.warning('请填写正文'); return }
  const persona = personas.value.find((p) => p.id === composer.value.personaId)
  if (!persona) { ElMessage.error('身份不存在，请重新选择'); return }
  try {
    const res: any = await createCommunityPost({
      communityId: targetCid, authorName: persona.name,
      kind: composer.value.kind, topic: composer.value.topic, textContent: composer.value.textContent,
    })
    if (res.data) posts.value.unshift(res.data)
    composer.value = { show: false, personaId: '', kind: '', topic: '', textContent: '', targetId: '' }
    ElMessage.success(`已以「${persona.name}」身份发布到「${commName(targetCid)}」`)
  } catch (e: any) { ElMessage.error(e?.message || '发布失败') }
}

const reachBox = ref({ show: false, title: '', content: '', target: null as null | { userId?: number; authorName?: string } })
function reachAuthor(p: CommunityPost) {
  if (!p.userId) { ElMessage.warning('该用户无 UID，无法发消息'); return }
  reachBox.value = { show: true, title: '', content: '', target: { userId: p.userId, authorName: p.authorName } }
}
async function sendReach() {
  if (!reachBox.value.content.trim()) { ElMessage.warning('请填写消息内容'); return }
  try {
    await reachUsers([reachBox.value.target!.userId!], reachBox.value.content, reachBox.value.title || undefined)
    ElMessage.success('消息已发送')
    reachBox.value.show = false
  } catch (e: any) { ElMessage.error('发送失败：' + (e?.message || '')) }
}

async function load() {
  loading.value = true
  selectedIds.value = []
  try {
    const cfg = await fetchPlanetConfig()
    const cards = normalizeCommunities(cfg)
    comms.value = cards
    if (isAll.value || isUnassigned.value) {
      // 未归属视图需要全量再本地筛，必须走不带 communityId 的查询
      comm.value = ({} as CommCard)
      const res: any = await listCommunityPosts()
      posts.value = res.data || []
    } else {
      comm.value = cards.find((c) => c.id === cid.value) || cards[0] || ({} as CommCard)
      const res: any = await listCommunityPosts({ communityId: cid.value })
      posts.value = res.data || []
    }
  } finally { loading.value = false }
}

onMounted(load)
// 切换社区范围（同组件路由复用，onMounted 不会重跑）
watch(() => route.params.id, (nv, ov) => { if (nv !== ov && nv) load() })
</script>

<style scoped>
.community-content { padding: 20px 24px; }
.head-right { display: flex; align-items: center; gap: 10px; }
.inp-scope { width: 210px; }
.badge-comm { background: #EEF4FB; color: #3A6EA5; border: 1px solid #C9DCF0; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.btn-back { padding: 6px 14px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.head-emoji { font-size: 28px; }
.head-title { font-size: 16px; font-weight: 500; margin: 0; }
.head-id { font-size: 12px; color: var(--color-text-tertiary, #999); }
.btn-primary { padding: 7px 16px; background: #C08E6E; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }

.kpi-bar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.kpi-num { font-size: 20px; font-weight: 500; color: #C08E6E; }
.kpi-label { font-size: 11px; color: var(--color-text-tertiary, #999); }

/* V111 批量操作条 */
.batch-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; margin-bottom: 12px; background: #FDF6F1; border: 1px solid #EBD9CB; border-radius: 10px; }
.batch-count { font-size: 13px; color: #8A5A38; margin-right: 4px; }

.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.chip-group { display: flex; gap: 4px; align-items: center; }
.chip-label { font-size: 12px; color: var(--color-text-tertiary, #999); margin-right: 4px; flex: none; }
.chip { padding: 5px 12px; border: 1px solid var(--color-border-tertiary, #ddd); background: var(--color-background-primary, #fff); border-radius: 16px; cursor: pointer; font-size: 12px; color: var(--color-text-secondary, #666); }
.chip.on { background: #C08E6E; color: #fff; border-color: #C08E6E; }
.inp { padding: 7px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; font-size: 13px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #222); }
.inp-search { flex: 1; max-width: 220px; }
.btn-ghost { padding: 6px 12px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 12px; color: var(--color-text-secondary, #666); }
.btn-sm { padding: 4px 10px; font-size: 12px; }

.topic-panel { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; margin-bottom: 14px; }
.topic-panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.topic-panel-head h3 { font-size: 14px; font-weight: 500; margin: 0; }
.topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.topic-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--color-background-secondary, #f5f5f5); border-radius: 8px; font-size: 12px; }
.topic-hash { color: #C08E6E; font-weight: 500; }
.topic-meta { color: var(--color-text-tertiary, #999); flex: 1; }
.topic-heat { font-size: 11px; color: #D85A30; }

.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-card { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; }
.post-card.pinned { border-left: 3px solid #C08E6E; }
.post-card.essence { border-left: 3px solid #EF9F27; }
.post-card.hidden { opacity: .55; }
.post-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.post-author { display: flex; align-items: center; gap: 8px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: #C08E6E; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; }
.post-name { font-size: 13px; font-weight: 500; }
.post-time { font-size: 11px; color: var(--color-text-tertiary, #aaa); }
.post-badges { display: flex; gap: 4px; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.badge-pin { background: #FAEEDA; color: #854F0B; }
.badge-ess { background: #EAF3DE; color: #3B6D11; }
.badge-hid { background: #FCEBEB; color: #A32D2D; }
.badge-kind { background: #E6EEFA; color: #185FA5; }
/* V111 发布状态徽标（口径与内容库一致） */
.badge-pub { background: #EAF3DE; color: #3B6D11; }
.badge-draft { background: #F1EFE8; color: #5F5E5A; }
.badge-off { background: #FAEEDA; color: #854F0B; }
.badge-warn { background: #FCEBEB; color: #A32D2D; }
.post-check { display: flex; align-items: center; cursor: pointer; }
.post-check input { cursor: pointer; width: 15px; height: 15px; }
.post-title { font-weight: 500; color: var(--color-text-primary, #222); margin-right: 6px; }
.act-select { max-width: 130px; }
.post-body { font-size: 13px; color: var(--color-text-primary, #222); line-height: 1.6; margin-bottom: 8px; cursor: pointer; }
.post-body:hover { color: #C08E6E; }
.post-topic { color: #C08E6E; margin-right: 4px; }
.post-stats { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 8px; }
.post-actions { display: flex; gap: 6px; }
.btn-act { padding: 4px 10px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--color-text-secondary, #666); }
.btn-act:hover { border-color: #C08E6E; color: #C08E6E; }
.btn-danger { color: #D85A30; }
.btn-danger:hover { border-color: #D85A30; color: #D85A30; }

.drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; justify-content: flex-end; z-index: 99; }
.drawer-box { width: 480px; background: var(--color-background-primary, #fff); height: 100%; display: flex; flex-direction: column; }
.drawer-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.drawer-head h3 { font-size: 15px; font-weight: 500; margin: 0; }
.btn-close { border: none; background: transparent; font-size: 16px; cursor: pointer; color: var(--color-text-tertiary, #999); }
.drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
.detail-author { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.detail-topic { color: #C08E6E; margin-bottom: 10px; font-weight: 500; }
.detail-text { font-size: 14px; line-height: 1.7; color: var(--color-text-primary, #222); margin-bottom: 14px; white-space: pre-wrap; }
.detail-reply { background: var(--color-background-secondary, #f5f5f5); padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; }
.reply-label { color: #C08E6E; font-weight: 500; }
.detail-stats { display: flex; gap: 16px; font-size: 13px; color: var(--color-text-secondary, #666); }
.drawer-foot { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 99; }
.modal-box { background: var(--color-background-primary, #fff); border-radius: 12px; padding: 20px; width: 420px; display: flex; flex-direction: column; gap: 12px; }
.modal-box-wide { width: 540px; }
.modal-title { font-size: 15px; font-weight: 500; margin: 0 0 4px; }
.inp-area { resize: vertical; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; }

.empty-box, .loading-hint { padding: 30px; text-align: center; font-size: 13px; color: var(--color-text-tertiary, #999); }

/* 发布身份选择 */
.persona-sel { display: flex; flex-direction: column; gap: 8px; }
.fld-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary, #222); }
.fld-hint { font-size: 11px; color: var(--color-text-tertiary, #999); font-weight: normal; }
.persona-row { display: flex; gap: 8px; align-items: center; }
.persona-row .inp { flex: 1; }
.persona-preview { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--color-background-secondary, #f7f3ee); border-radius: 8px; border: 1px dashed #C08E6E; }
.persona-preview .avatar { width: 36px; height: 36px; font-size: 14px; }
.pp-name { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.pp-tag { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: rgba(192,142,110,.15); color: #C08E6E; }
.pp-desc { font-size: 11px; color: var(--color-text-tertiary, #999); margin-top: 2px; }

/* 身份管理弹窗 */
.persona-list-edit { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; margin-bottom: 8px; }
.persona-edit-row { display: flex; align-items: center; gap: 6px; padding: 6px; background: var(--color-background-secondary, #f7f3ee); border-radius: 8px; }
.avatar.sm { width: 28px; height: 28px; font-size: 12px; flex-shrink: 0; }
.inp-name { flex: 1.2; min-width: 0; }
.inp-tag { width: 100px; flex-shrink: 0; }
.inp-color { width: 32px; height: 32px; padding: 0; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 6px; cursor: pointer; background: transparent; flex-shrink: 0; }
.inp-desc { flex: 1.5; min-width: 0; }
.link { color: #C08E6E; text-decoration: none; }
.link:hover { text-decoration: underline; }
</style>
