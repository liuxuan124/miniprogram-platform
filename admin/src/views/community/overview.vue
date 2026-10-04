<template>
  <div class="mw-page community-overview" v-loading="loading">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">{{ activeComm?.name || '社区' }} · 概览</span>
    </div>

    <!-- 头部 -->
    <div class="page-head">
      <div class="head-left">
        <span class="head-emoji">{{ activeComm?.emoji || '🪐' }}</span>
        <div>
          <h2 class="head-title">{{ activeComm?.name || '未命名社区' }}</h2>
          <div class="head-sub">
            <span :class="activeComm?.on ? 'st-on' : 'st-off'">{{ activeComm?.on ? '展示中' : '已停用' }}</span>
            <span v-if="activeComm?.main" class="st-main">主社区</span>
            <span class="st-id">ID <code>{{ activeId }}</code> <button class="btn-copy" @click="copyId">复制</button></span>
            <button class="btn-copy" @click="copyEntryLink">复制介绍页链接</button>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI 概览条 -->
    <div class="kpi-bar">
      <div class="kpi"><span class="kpi-num">{{ activeComm?.memberCount ?? '—' }}</span><span class="kpi-label">成员</span></div>
      <div class="kpi"><span class="kpi-num">{{ stats.postCount }}</span><span class="kpi-label">动态</span></div>
      <div class="kpi"><span class="kpi-num">{{ stats.essenceCount }}</span><span class="kpi-label">精华</span></div>
      <div class="kpi"><span class="kpi-num" :class="{ 'num-acc': stats.todayCount > 0 }">{{ stats.todayCount }}</span><span class="kpi-label">今日</span></div>
      <div class="kpi"><span class="kpi-num">{{ stats.weekCount }}</span><span class="kpi-label">近 7 日</span></div>
      <div class="kpi"><span class="kpi-num">{{ planetPlanCount }}</span><span class="kpi-label">会员档</span></div>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="quick-grid">
      <router-link :to="`/community/profile/${activeId}`" class="quick-card">
        <span class="quick-icon">⚙️</span>
        <div class="quick-body"><div class="quick-title">编辑资料</div><div class="quick-desc">入场设置 · 亮点卖点 · 启停</div></div>
        <span class="quick-arrow">→</span>
      </router-link>
      <router-link :to="`/community/members/${activeId}`" class="quick-card">
        <span class="quick-icon">👥</span>
        <div class="quick-body"><div class="quick-title">管理成员</div><div class="quick-desc">成员档案 · 会员档 · 活跃度</div></div>
        <span class="quick-arrow">→</span>
      </router-link>
      <router-link :to="`/community/content/${activeId}`" class="quick-card">
        <span class="quick-icon">📝</span>
        <div class="quick-body"><div class="quick-title">管理内容</div><div class="quick-desc">动态审核 · 话题 · 置顶加精</div></div>
        <span class="quick-arrow">→</span>
      </router-link>
      <router-link :to="`/community/membership/${activeId}`" class="quick-card">
        <span class="quick-icon">💳</span>
        <div class="quick-body"><div class="quick-title">会员配置</div><div class="quick-desc">会员档 CRUD · 权益编辑</div></div>
        <span class="quick-arrow">→</span>
      </router-link>
    </div>

    <!-- 两栏：最近动态 + 话题/打卡 -->
    <div class="dual-col">
      <div class="col-main">
        <div class="section-head">
          <h3>最近动态</h3>
          <router-link :to="`/community/content/${activeId}`" class="link">管理全部 →</router-link>
        </div>
        <div v-if="!posts.length" class="empty-box">
          暂无动态
          <router-link :to="`/community/content/${activeId}`" class="link">去发第一条 →</router-link>
        </div>
        <div v-else class="recent-posts">
          <div v-for="p in posts.slice(0, 5)" :key="p.id" class="recent-post">
            <div class="rp-head">
              <span class="rp-author">{{ p.authorName || '匿名' }}</span>
              <span class="rp-time">{{ fmt(p.createTime) }}</span>
              <span v-if="p.pinned" class="badge badge-pin">置顶</span>
              <span v-if="p.essence" class="badge badge-ess">精华</span>
            </div>
            <div class="rp-text">{{ shortText(p.textContent) }}</div>
            <div class="rp-stats">♡ {{ p.likes || 0 }} · 💬 {{ p.comments || 0 }}</div>
          </div>
        </div>
      </div>

      <div class="col-side">
        <div class="section-head"><h3>话题热榜</h3></div>
        <div v-if="!topics.length" class="empty-box">暂无话题</div>
        <div v-else class="topic-list">
          <div v-for="(t, i) in topics.slice(0, 6)" :key="t.topic" class="topic-row">
            <span class="topic-rank">{{ i + 1 }}</span>
            <span class="topic-hash">#{{ t.topic }}</span>
            <span class="topic-meta">{{ t.count }} 帖 · {{ t.likes }} 赞</span>
          </div>
        </div>

        <div class="section-head" style="margin-top:20px"><h3>打卡活动</h3></div>
        <div v-if="!checkins.length" class="empty-box">暂无打卡活动</div>
        <div v-else class="checkin-list">
          <div v-for="c in checkins" :key="c.id" class="checkin-row">
            <div class="ck-name">{{ c.name }}</div>
            <div class="ck-meta">{{ c.days }} 天 · {{ c.joinedCount || 0 }} 人参加</div>
            <div class="ck-progress">
              <div class="progress-bar"><div class="progress-fill" :style="{ width: ckPct(c) + '%' }"></div></div>
              <span class="ck-text">今日 {{ c.todayCount || 0 }}/{{ c.joinedCount || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  fetchPlanetConfig, normalizeCommunities, statsFor, aggregateTopics,
  type CommCard,
} from './planet-config'
import { getMembershipPlanList } from '@/api/membershipPlan'
import { listCommunityPosts, listCheckins, type CommunityPost, type CommunityCheckin } from '@/api/memberOps'

const route = useRoute()
const activeId = String(route.params.id || '')

const loading = ref(false)
const activeComm = ref<CommCard | null>(null)
const posts = ref<CommunityPost[]>([])
const checkins = ref<CommunityCheckin[]>([])
const planetPlanCount = ref(0)
const introUrl = ref('')

const stats = computed(() => statsFor(posts.value, activeId))
const topics = computed(() => aggregateTopics(posts.value))

function shortText(s?: string) { return (s || '').slice(0, 100) + ((s || '').length > 100 ? '...' : '') }
function fmt(s?: string) {
  if (!s) return '-'
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function ckPct(c: CommunityCheckin) { const j = Number(c.joinedCount || 0); return j > 0 ? Math.min(100, Math.round((Number(c.todayCount || 0) / j) * 100)) : 0 }
function copyId() { navigator.clipboard.writeText(activeId); ElMessage.success('已复制 ID') }
function copyEntryLink() {
  const url = introUrl.value || `/pages/intro/index?id=${activeId}`
  navigator.clipboard.writeText(url)
  ElMessage.success('已复制介绍页链接')
}

onMounted(async () => {
  loading.value = true
  try {
    const cfg = await fetchPlanetConfig()
    const cards = normalizeCommunities(cfg)
    activeComm.value = cards.find((c) => c.id === activeId) || cards[0] || null
    if (activeComm.value) {
      localStorage.setItem('community_last_id', activeComm.value.id)
      introUrl.value = activeComm.value.raw?.introUrl || ''
    }

    const [ps, ck, pp] = await Promise.all([
      listCommunityPosts({ communityId: activeId }),
      listCheckins({ communityId: activeId }),
      getMembershipPlanList({ scope: 'planet', planetId: activeId }),
    ])
    posts.value = (ps as any).data || []
    checkins.value = (ck as any).data || []
    planetPlanCount.value = ((pp as any).data || []).length
  } finally { loading.value = false }
})
</script>

<style scoped>
.community-overview { padding: 20px 24px; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }

.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.head-emoji { font-size: 32px; }
.head-title { font-size: 18px; font-weight: 500; margin: 0; }
.head-sub { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.st-on { color: #0F6E56; } .st-off { color: #A32D2D; } .st-main { color: #C08E6E; }
.st-id { color: var(--color-text-tertiary, #999); }
.st-id code { font-size: 11px; }
.btn-copy { border: none; background: transparent; color: #C08E6E; cursor: pointer; font-size: 12px; }

.kpi-bar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
.kpi { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 2px; }
.kpi-num { font-size: 20px; font-weight: 500; color: #C08E6E; }
.kpi-num.num-acc { color: #D85A30; }
.kpi-label { font-size: 11px; color: var(--color-text-tertiary, #999); }

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.quick-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; cursor: pointer; text-decoration: none; color: inherit; transition: border-color .15s; }
.quick-card:hover { border-color: #C08E6E; }
.quick-icon { font-size: 24px; }
.quick-body { flex: 1; }
.quick-title { font-size: 14px; font-weight: 500; }
.quick-desc { font-size: 11px; color: var(--color-text-tertiary, #999); }
.quick-arrow { font-size: 16px; color: var(--color-text-tertiary, #ccc); }

.dual-col { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; }
.col-main, .col-side { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-head h3 { font-size: 14px; font-weight: 500; margin: 0; }
.link { font-size: 12px; color: #C08E6E; text-decoration: none; }

.recent-posts { display: flex; flex-direction: column; gap: 10px; }
.recent-post { padding: 10px; background: var(--color-background-secondary, #f9f9f9); border-radius: 8px; }
.rp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.rp-author { font-size: 13px; font-weight: 500; }
.rp-time { font-size: 11px; color: var(--color-text-tertiary, #aaa); }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; }
.badge-pin { background: #FAEEDA; color: #854F0B; }
.badge-ess { background: #EAF3DE; color: #3B6D11; }
.rp-text { font-size: 12px; color: var(--color-text-secondary, #666); line-height: 1.5; margin-bottom: 4px; }
.rp-stats { font-size: 11px; color: var(--color-text-tertiary, #aaa); }

.topic-list { display: flex; flex-direction: column; gap: 6px; }
.topic-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; font-size: 12px; }
.topic-rank { width: 18px; height: 18px; border-radius: 50%; background: #C08E6E; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.topic-hash { color: #C08E6E; font-weight: 500; }
.topic-meta { font-size: 11px; color: var(--color-text-tertiary, #999); margin-left: auto; }

.checkin-list { display: flex; flex-direction: column; gap: 8px; }
.checkin-row { padding: 8px; background: var(--color-background-secondary, #f9f9f9); border-radius: 6px; }
.ck-name { font-size: 13px; font-weight: 500; }
.ck-meta { font-size: 11px; color: var(--color-text-tertiary, #999); margin-bottom: 4px; }
.ck-progress { display: flex; align-items: center; gap: 8px; }
.progress-bar { flex: 1; height: 6px; background: var(--color-background-tertiary, #eee); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #C08E6E; }
.ck-text { font-size: 11px; color: var(--color-text-tertiary, #999); min-width: 60px; }

.empty-box { padding: 20px; text-align: center; font-size: 13px; color: var(--color-text-tertiary, #999); }
</style>
