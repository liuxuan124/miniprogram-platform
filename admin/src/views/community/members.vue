<template>
  <div class="mw-page community-members">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <router-link v-if="!isAll" :to="`/community/overview/${cid}`" class="crumb-link">{{ comm.name || '社区' }}</router-link>
      <span v-else class="crumb-cur">全部社区</span>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">成员管理</span>
    </div>

    <!-- 头部 -->
    <div class="page-head">
      <div class="head-left">
        <button v-if="!isAll" class="btn-back" @click="$router.push(`/community/overview/${cid}`)">← 返回概览</button>
        <span class="head-emoji">{{ isAll ? '🌐' : (comm.emoji || '🪐') }}</span>
        <div>
          <h2 class="head-title">{{ isAll ? '全部社区 · 成员管理' : `${comm.name || '社区'} · 成员管理` }}</h2>
          <span class="head-id">{{ isAll ? `共 ${comms.length} 个社区` : `ID: ${cid}` }}</span>
        </div>
      </div>
      <select class="inp inp-scope" :value="cid" @change="changeScope(($event.target as HTMLSelectElement).value)">
        <option value="all">🌐 全部社区</option>
        <option v-for="c in comms" :key="c.id" :value="c.id">{{ c.emoji || '🪐' }} {{ c.name }}</option>
      </select>
    </div>

    <!-- 概览条 -->
    <div class="kpi-bar">
      <div class="kpi"><span class="kpi-num">{{ planetPlans.length }}</span><span class="kpi-label">专属会员档</span></div>
      <div class="kpi"><span class="kpi-num">{{ activeAuthors.length }}</span><span class="kpi-label">动态参与人数</span></div>
      <div class="kpi"><span class="kpi-num">{{ checkinParticipants }}</span><span class="kpi-label">打卡参与人数</span></div>
      <div class="kpi"><span class="kpi-num">{{ todayActive }}</span><span class="kpi-label">今日活跃</span></div>
    </div>

    <!-- Tab 切换 -->
    <div class="tabs-line">
      <button v-for="t in TABS" :key="t.key" class="tab-btn" :class="{ on: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <!-- 会员档 Tab -->
    <div v-if="tab === 'plans'" class="tab-panel">
      <div class="section-head">
        <h3>{{ isAll ? '全部专属会员档（scope=planet，跨社区）' : '本社区专属会员档（scope=planet）' }}</h3>
        <router-link v-if="!isAll" :to="`/community/membership/${cid}`" class="btn-link">去会员配置页编辑 →</router-link>
      </div>
      <div v-if="loading" class="loading-hint">加载中...</div>
      <div v-else-if="!planetPlans.length" class="empty-box">
        {{ isAll ? '暂无任何专属会员档。' : '本社区暂未绑定专属会员档。' }}
        <router-link v-if="!isAll" :to="`/community/membership/${cid}`" class="link">前往绑定</router-link>
      </div>
      <div v-else class="plan-grid">
        <div v-for="p in planetPlans" :key="p.id" class="plan-card">
          <div class="plan-card-head">
            <span class="plan-card-name">{{ p.name }}</span>
            <span class="plan-card-status" :class="{ on: p.status === 1 }">{{ p.status === 1 ? '启用' : '停用' }}</span>
          </div>
          <p class="plan-card-desc">{{ p.description || '无描述' }}</p>
          <div class="plan-card-meta">
            <span>{{ p.rights?.length || 0 }} 项权益</span>
            <span v-if="p.discountRate">折扣 {{ p.discountRate }}%</span>
            <span v-if="p.giftPlanetDays">赠 {{ p.giftPlanetDays }} 天</span>
            <span v-if="p.showBadge">显示角标</span>
          </div>
          <div class="plan-card-foot">
            <button class="btn-sm" @click="goPlanSubscribers(p.id)">查看订阅用户</button>
            <router-link v-if="!isAll" :to="`/community/membership/${cid}?edit=${p.id}`" class="btn-sm btn-sm-ghost">编辑</router-link>
          </div>
        </div>
      </div>

      <div class="section-head" style="margin-top:24px">
        <h3>平台通用会员档（可复用）</h3>
      </div>
      <div v-if="platformPlans.length" class="plan-grid">
        <div v-for="p in platformPlans" :key="p.id" class="plan-card plan-card-alt">
          <div class="plan-card-head">
            <span class="plan-card-name">{{ p.name }}</span>
            <span class="plan-card-tag">平台档</span>
          </div>
          <p class="plan-card-desc">{{ p.description || '无描述' }}</p>
          <div class="plan-card-meta"><span>{{ p.rights?.length || 0 }} 项权益</span></div>
          <div class="plan-card-foot">
            <button class="btn-sm" @click="goPlanSubscribers(p.id)">查看订阅用户</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-box">暂无平台会员档。</div>
    </div>

    <!-- 活跃成员 Tab -->
    <div v-if="tab === 'active'" class="tab-panel">
      <div class="filter-bar">
        <input v-model="searchAuthor" class="inp inp-search" placeholder="搜索昵称..." />
        <select v-model="sortAuthor" class="inp">
          <option value="posts">按发帖数</option>
          <option value="essence">按精华数</option>
          <option value="recent">按最近活跃</option>
        </select>
        <span class="filter-hint">按发帖统计 · 潜水用户不在此列</span>
      </div>
      <div v-if="!filteredAuthors.length" class="empty-box">
        暂无活跃成员数据。
        <router-link :to="`/community/content/${cid}`" class="link">去发动态引导参与 →</router-link>
      </div>
      <div v-else class="member-table">
        <div class="member-thead">
          <span class="col-author">成员</span>
          <span class="col-posts">发帖</span>
          <span class="col-essence">精华</span>
          <span class="col-likes">获赞</span>
          <span class="col-recent">最近活跃</span>
          <span class="col-actions">操作</span>
        </div>
        <div v-for="a in filteredAuthors" :key="a.userId || a.authorName" class="member-row">
          <div class="col-author">
            <div class="avatar">{{ (a.authorName || '?').slice(0, 1) }}</div>
            <div>
              <div class="member-name">{{ a.authorName || '匿名用户' }} <span v-if="isAll && a.commNames" class="member-comm">{{ a.commNames }}</span></div>
              <div class="member-uid">UID: {{ a.userId || '-' }}</div>
            </div>
          </div>
          <span class="col-posts">{{ a.postCount }}</span>
          <span class="col-essence">{{ a.essenceCount }}</span>
          <span class="col-likes">{{ a.totalLikes }}</span>
          <span class="col-recent">{{ a.lastActive ? fmt(a.lastActive) : '-' }}</span>
          <div class="col-actions">
            <button class="btn-sm" @click="reachUser(a)">发消息</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 打卡成员 Tab -->
    <div v-if="tab === 'checkin'" class="tab-panel">
      <div v-if="!checkins.length" class="empty-box">
        {{ isAll ? '暂无打卡活动。' : '本社区暂无打卡活动。' }}
        <router-link :to="`/community/overview/${cid}`" class="link">去概览页查看 →</router-link>
      </div>
      <div v-else class="checkin-list">
        <div v-for="c in checkins" :key="c.id" class="checkin-card">
          <div class="checkin-head">
            <span class="checkin-name">{{ isAll && c.communityId ? commName(c.communityId) + ' · ' : '' }}{{ c.name }}</span>
            <span class="checkin-days">{{ c.days }} 天挑战</span>
          </div>
          <div class="checkin-stats">
            <span>已加入 {{ c.joinedCount || 0 }} 人</span>
            <span>今日打卡 {{ c.todayCount || 0 }} 人</span>
          </div>
          <div class="checkin-progress">
            <div class="progress-bar"><div class="progress-fill" :style="{ width: progressPct(c) + '%' }"></div></div>
            <span class="progress-text">{{ c.todayCount || 0 }} / {{ c.joinedCount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 发消息弹窗 -->
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
import { ElMessage } from 'element-plus'
import {
  fetchPlanetConfig, normalizeCommunities, isToday, type CommCard,
} from './planet-config'
import { getMembershipPlanList, type MembershipPlan } from '@/api/membershipPlan'
import {
  listCommunityPosts, listCheckins, reachUsers, type CommunityPost, type CommunityCheckin,
} from '@/api/memberOps'

const route = useRoute()
const router = useRouter()
const cid = computed(() => String(route.params.id || ''))
const isAll = computed(() => cid.value === 'all')

const TABS = [
  { key: 'plans', label: '会员档' },
  { key: 'active', label: '活跃成员' },
  { key: 'checkin', label: '打卡成员' },
]
const tab = ref('plans')
const loading = ref(false)
const comms = ref<CommCard[]>([])
const comm = ref<CommCard>({} as CommCard)
const planetPlans = ref<MembershipPlan[]>([])
const platformPlans = ref<MembershipPlan[]>([])
const posts = ref<CommunityPost[]>([])
const checkins = ref<CommunityCheckin[]>([])
const searchAuthor = ref('')
const sortAuthor = ref('posts')

const reachBox = ref({ show: false, title: '', content: '', target: null as null | { userId?: number; authorName?: string } })

const activeAuthors = computed(() => {
  const map = new Map<string, { userId?: number; authorName?: string; postCount: number; essenceCount: number; totalLikes: number; lastActive?: string; commSet?: Set<string> }>()
  for (const p of posts.value) {
    const key = String(p.userId || p.authorName || '?')
    const cur = map.get(key) || { userId: p.userId, authorName: p.authorName, postCount: 0, essenceCount: 0, totalLikes: 0, lastActive: undefined, commSet: new Set<string>() }
    cur.postCount += 1
    if (p.essence) cur.essenceCount += 1
    cur.totalLikes += Number(p.likes || 0)
    if (p.createTime && (!cur.lastActive || p.createTime > cur.lastActive)) cur.lastActive = p.createTime
    if (p.communityId) cur.commSet!.add(p.communityId)
    map.set(key, cur)
  }
  return Array.from(map.values()).map((a) => ({
    ...a,
    commNames: a.commSet && a.commSet.size ? [...a.commSet].map((id) => commName(id)).join(' / ') : '',
  }))
})
function commName(id?: string) {
  const c = comms.value.find((x) => x.id === id)
  return c ? `${c.emoji || '🪐'} ${c.name}` : '未知社区'
}
const filteredAuthors = computed(() => {
  let list = activeAuthors.value
  if (searchAuthor.value.trim()) {
    const q = searchAuthor.value.trim().toLowerCase()
    list = list.filter((a) => (a.authorName || '').toLowerCase().includes(q))
  }
  const s = sortAuthor.value
  return [...list].sort((a, b) => {
    if (s === 'posts') return b.postCount - a.postCount
    if (s === 'essence') return b.essenceCount - a.essenceCount
    return (b.lastActive || '').localeCompare(a.lastActive || '')
  })
})
const checkinParticipants = computed(() => checkins.value.reduce((s, c) => s + Number(c.joinedCount || 0), 0))
const todayActive = computed(() => activeAuthors.value.filter((a) => isToday(a.lastActive)).length)

function progressPct(c: CommunityCheckin) {
  const j = Number(c.joinedCount || 0), t = Number(c.todayCount || 0)
  return j > 0 ? Math.min(100, Math.round((t / j) * 100)) : 0
}
function fmt(s?: string) {
  if (!s) return '-'
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function copyId() { navigator.clipboard.writeText(cid.value); ElMessage.success('已复制') }
function goPlanSubscribers(pid: number) {
  router.push({ path: '/member/users', query: { membershipPlan: String(pid) } })
}
function reachUser(a: { userId?: number; authorName?: string }) {
  if (!a.userId) { ElMessage.warning('该用户无 UID，无法发消息'); return }
  reachBox.value = { show: true, title: '', content: '', target: a }
}
async function sendReach() {
  if (!reachBox.value.content.trim()) { ElMessage.warning('请填写消息内容'); return }
  const t = reachBox.value.target
  try {
    await reachUsers([t!.userId!], reachBox.value.content, reachBox.value.title || undefined)
    ElMessage.success('消息已发送')
    reachBox.value.show = false
  } catch (e: any) {
    ElMessage.error('发送失败：' + (e?.message || ''))
  }
}

function changeScope(v: string) {
  if (!v || v === cid.value) return
  if (v !== 'all') localStorage.setItem('community_last_id', v)
  router.replace(`/community/members/${v}`)
}

async function load() {
  loading.value = true
  try {
    const cfg = await fetchPlanetConfig()
    const cards = normalizeCommunities(cfg)
    comms.value = cards
    if (isAll.value) {
      comm.value = {} as CommCard
    } else {
      comm.value = cards.find((c) => c.id === cid.value) || cards[0] || ({} as CommCard)
    }

    const [pr, pp, ps, ck] = await Promise.all([
      // all 模式：不传 planetId → 返回全部 scope=planet 档（跨社区）
      isAll.value ? getMembershipPlanList({ scope: 'planet' }) : getMembershipPlanList({ scope: 'planet', planetId: cid.value }),
      getMembershipPlanList({ scope: 'platform' }),
      isAll.value ? listCommunityPosts() : listCommunityPosts({ communityId: cid.value }),
      isAll.value ? listCheckins() : listCheckins({ communityId: cid.value }),
    ])
    planetPlans.value = (pr as any).data || []
    platformPlans.value = (pp as any).data || []
    posts.value = (ps as any).data || []
    checkins.value = (ck as any).data || []
  } finally {
    loading.value = false
  }
}

onMounted(load)
// 切换社区范围（同组件路由复用，onMounted 不会重跑）
watch(() => route.params.id, (nv, ov) => { if (nv !== ov && nv) load() })
</script>

<style scoped>
.community-members { padding: 20px 24px; }
.inp-scope { width: 210px; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }
.filter-hint { font-size: 12px; color: var(--color-text-tertiary, #999); }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.btn-back { padding: 6px 14px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.head-emoji { font-size: 28px; }
.head-title { font-size: 16px; font-weight: 500; margin: 0; }
.head-id { font-size: 12px; color: var(--color-text-tertiary, #999); }
.member-comm { font-size: 11px; color: #3A6EA5; background: #EEF4FB; border: 1px solid #C9DCF0; border-radius: 6px; padding: 1px 6px; margin-left: 6px; }
.btn-copy { border: none; background: transparent; color: #C08E6E; cursor: pointer; font-size: 12px; }

.kpi-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.kpi { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.kpi-num { font-size: 22px; font-weight: 500; color: #C08E6E; }
.kpi-label { font-size: 12px; color: var(--color-text-tertiary, #999); }

.tabs-line { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.tab-btn { padding: 8px 16px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); border-bottom: 2px solid transparent; }
.tab-btn.on { color: #C08E6E; border-bottom-color: #C08E6E; }

.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-head h3 { font-size: 14px; font-weight: 500; margin: 0; }
.btn-link { font-size: 13px; color: #C08E6E; text-decoration: none; }

.plan-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.plan-card { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; }
.plan-card-alt { background: var(--color-background-secondary, #f9f9f9); }
.plan-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.plan-card-name { font-size: 14px; font-weight: 500; }
.plan-card-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--color-background-tertiary, #eee); color: var(--color-text-tertiary, #999); }
.plan-card-status.on { background: #E3F3EA; color: #0F6E56; }
.plan-card-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #E6EEFA; color: #185FA5; }
.plan-card-desc { font-size: 12px; color: var(--color-text-secondary, #666); margin: 0 0 8px; line-height: 1.4; }
.plan-card-meta { display: flex; gap: 10px; font-size: 11px; color: var(--color-text-tertiary, #999); margin-bottom: 10px; }
.plan-card-foot { display: flex; gap: 8px; }
.btn-sm { padding: 5px 10px; border: 1px solid #C08E6E; background: #C08E6E; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-sm-ghost { background: transparent; color: #C08E6E; text-decoration: none; display: inline-block; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; }
.inp { padding: 7px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; font-size: 13px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #222); }
.inp-search { flex: 1; max-width: 300px; }

.member-table { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; overflow: hidden; }
.member-thead, .member-row { display: grid; grid-template-columns: 2fr 0.6fr 0.6fr 0.6fr 1fr 0.8fr; align-items: center; padding: 0 14px; }
.member-thead { background: var(--color-background-secondary, #f5f5f5); font-size: 12px; color: var(--color-text-tertiary, #999); height: 38px; }
.member-row { border-top: 1px solid var(--color-border-tertiary, rgba(0,0,0,.06)); font-size: 13px; padding-top: 10px; padding-bottom: 10px; }
.col-author { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: #C08E6E; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; }
.member-name { font-size: 13px; font-weight: 500; }
.member-uid { font-size: 11px; color: var(--color-text-tertiary, #aaa); }

.checkin-list { display: flex; flex-direction: column; gap: 10px; }
.checkin-card { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; }
.checkin-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.checkin-name { font-size: 14px; font-weight: 500; }
.checkin-days { font-size: 12px; color: #C08E6E; }
.checkin-stats { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-secondary, #666); margin-bottom: 8px; }
.checkin-progress { display: flex; align-items: center; gap: 10px; }
.progress-bar { flex: 1; height: 8px; background: var(--color-background-tertiary, #eee); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #C08E6E; transition: width .3s; }
.progress-text { font-size: 12px; color: var(--color-text-tertiary, #999); min-width: 50px; }

.empty-box, .loading-hint { padding: 30px; text-align: center; font-size: 13px; color: var(--color-text-tertiary, #999); }
.link { color: #C08E6E; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 99; }
.modal-box { background: var(--color-background-primary, #fff); border-radius: 12px; padding: 20px; width: 420px; display: flex; flex-direction: column; gap: 12px; }
.modal-title { font-size: 15px; font-weight: 500; margin: 0; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; }
.inp-area { resize: vertical; }
.btn-ghost { padding: 7px 16px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; }
.btn-primary { padding: 7px 16px; background: #C08E6E; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
</style>
