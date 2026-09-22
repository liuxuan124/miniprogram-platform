<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">用户</h1>
        <div class="sub">{{ tabSub }}</div>
      </div>
      <div class="actions">
        <button v-if="tab === 'list'" type="button" class="btn" :loading="exporting" @click="doExport">导出</button>
        <button v-if="tab === 'tags'" type="button" class="btn primary" @click="openTagForm()">
          <MiniIcon name="plus" :size="15" />新建标签
        </button>
        <button v-if="tab === 'segs'" type="button" class="btn primary" @click="openSegForm()">
          <MiniIcon name="plus" :size="15" />新建分群
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button type="button" :class="{ on: tab === 'list' }" @click="tab = 'list'">用户列表</button>
      <button type="button" :class="{ on: tab === 'segs' }" @click="tab = 'segs'; loadSegs()">分群与触达</button>
      <button type="button" :class="{ on: tab === 'tags' }" @click="tab = 'tags'; loadTags()">标签管理</button>
    </div>

    <!-- 用户列表 -->
    <template v-if="tab === 'list'">
      <div v-if="dupHint" class="hint warn">
        <MiniIcon name="merge" :size="16" />
        <span>{{ dupHint }}</span>
        <button type="button" class="btn sm primary" @click="loadDups">查看重复</button>
      </div>

      <div class="tiles">
        <div v-for="s in statsTiles" :key="s.label" class="tile" style="padding:12px 16px">
          <span class="faint">{{ s.label }}</span>
          <b style="font-size:26px">{{ s.value }}</b>
        </div>
      </div>

      <div class="filters">
        <label class="search">
          <MiniIcon name="search" :size="15" />
          <input v-model="keyword" type="search" placeholder="昵称、手机后四位或标签" @keyup.enter="fetchUsers" />
        </label>
        <button
          v-for="c in payChips"
          :key="c.k"
          type="button"
          class="chip"
          :class="{ on: payFilter === c.k }"
          @click="payFilter = c.k; fetchUsers()"
        >{{ c.l }}</button>
      </div>

      <div v-if="selectedIds.length" class="bulk">
        <b>已选 {{ selectedIds.length }} 人</b>
        <button type="button" class="btn sm" @click="bulkTagOpen = true"><MiniIcon name="tag" :size="14" />打标签</button>
        <button type="button" class="btn sm" @click="openBulkReach"><MiniIcon name="send" :size="14" />发订阅消息</button>
        <button type="button" class="btn sm" @click="giftOpen = true"><MiniIcon name="gift" :size="14" />赠送会员</button>
        <button type="button" class="link" style="margin-left:auto" @click="selectedIds = []">取消选择</button>
      </div>

      <div v-if="listError" class="empty-box">{{ listError }} <button type="button" class="btn sm" @click="fetchUsers">重试</button></div>
      <div v-else class="group">
        <div class="chead">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" aria-label="全选" />
          <span style="flex:1;padding-left:0">用户</span>
          <span class="c-pay">付费会员</span>
          <span class="c-lv">成长等级</span>
          <span class="c-num">积分</span>
          <span class="c-num">累计消费</span>
          <span class="c-num">订单</span>
          <span class="c-tags">标签</span>
          <span class="ctime">最近访问</span>
          <span class="ctime">注册</span>
        </div>
        <div v-if="!users.length" class="muted" style="padding:28px;text-align:center">没有符合条件的用户</div>
        <div v-for="u in users" :key="u.id" class="crow" :class="{ sel: selectedIds.includes(u.id) }">
          <input type="checkbox" :checked="selectedIds.includes(u.id)" @change="toggleSel(u.id)" />
          <button type="button" class="ucell" @click="openDetail(u)">
            <span class="uav" :style="{ width: '36px', height: '36px', background: toneOf(u.id) }">
              {{ (u.nickname || '?').charAt(0) }}
            </span>
            <span style="min-width:0">
              <b>{{ u.nickname || '未命名' }}</b>
              <span class="faint">{{ u.phone || '—' }} · {{ u.sourceLabel || u.source || '—' }}</span>
            </span>
          </button>
          <div class="c-pay">
            <span class="tag" :class="u.planName ? 't-live' : 't-draft'">{{ u.planName || '非会员' }}</span>
          </div>
          <div class="c-lv"><span class="lv">{{ u.levelName || '—' }}</span></div>
          <div class="c-num">{{ u.points ?? 0 }}</div>
          <div class="c-num">{{ money(u.spend ?? u.totalSpend) }}</div>
          <div class="c-num">{{ u.orders ?? 0 }}</div>
          <div class="c-tags">
            <span v-for="t in (u.tags || []).slice(0, 2)" :key="t" class="tag t-acc">{{ t }}</span>
          </div>
          <div class="ctime faint">{{ shortDate(u.lastVisit) }}</div>
          <div class="ctime faint">{{ shortDate(u.createdAt || u.joined) }}</div>
        </div>
      </div>
      <div class="faint">共 {{ total }} 人 · 点用户查看详情</div>
    </template>

    <!-- 分群 -->
    <template v-else-if="tab === 'segs'">
      <div v-if="segError" class="empty-box">{{ segError }}</div>
      <div v-else-if="!segs.length" class="empty-box">暂无分群（后端就绪后会显示预设分群）</div>
      <div v-else class="seg-grid">
        <article v-for="s in segs" :key="s.id" class="card segcard">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div>
              <h2 class="h2">{{ s.name }}</h2>
              <div class="faint" style="margin-top:4px;display:flex;align-items:center;gap:4px">
                <MiniIcon name="filter" :size="12" /> {{ s.ruleDesc || s.ruleCode || '—' }}
              </div>
            </div>
            <span class="todo-n">{{ s.memberCount ?? '—' }}</span>
          </div>
          <div class="avs">
            <span v-for="(a, i) in (s.avatars || []).slice(0, 6)" :key="i" class="uav" :style="{ width: '28px', height: '28px', background: a.tone || 'var(--ns)' }">
              {{ (a.name || '?').charAt(0) }}
            </span>
            <span v-if="!(s.avatars || []).length" class="faint">当前没有人符合 / 人数待加载</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn sm" @click="viewSeg(s)">查看名单</button>
            <button type="button" class="btn sm primary" :disabled="!(s.memberCount)" @click="doReach(s)">
              <MiniIcon name="send" :size="14" />{{ reachLabel(s.reachAction) }}
            </button>
            <button type="button" class="btn sm danger" @click="removeSeg(s)">删除</button>
          </div>
        </article>
      </div>
    </template>

    <!-- 标签 -->
    <template v-else>
      <div v-if="tagError" class="empty-box">{{ tagError }}</div>
      <div v-else class="group">
        <div class="chead">
          <span style="width:40px;padding:0">色</span>
          <span style="width:160px;padding:0">标签名</span>
          <span style="flex:1;padding:0">说明</span>
          <span style="width:80px">操作</span>
        </div>
        <div v-if="!tags.length" class="muted" style="padding:24px;text-align:center">暂无标签</div>
        <div v-for="t in tags" :key="t.id" class="crow">
          <span class="pdot" :style="{ background: t.color || 'var(--acc)', width: '20px', height: '20px' }" />
          <b style="width:160px;font-weight:500">{{ t.name }}</b>
          <span class="faint" style="flex:1">{{ t.description || '—' }}</span>
          <span style="width:80px;display:flex;gap:6px">
            <button type="button" class="link" @click="openTagForm(t)">编辑</button>
            <button type="button" class="link" style="color:var(--r)" @click="removeTag(t)">删</button>
          </span>
        </div>
      </div>
    </template>

    <!-- 详情抽屉 -->
    <div v-if="drawer" class="scrim right" @click.self="drawer = null">
      <aside class="drawer" role="dialog" aria-modal="true">
        <div style="display:flex;gap:12px;align-items:center">
          <span class="uav" :style="{ width: '52px', height: '52px', background: toneOf(drawer.id) }">
            {{ (drawer.nickname || '?').charAt(0) }}
          </span>
          <div style="flex:1;min-width:0">
            <div style="font-size:18px;font-weight:600">{{ drawer.nickname }}</div>
            <div class="faint">{{ drawer.phone || '—' }} · 最近访问 {{ shortDate(drawer.lastVisit) }}</div>
          </div>
          <button type="button" class="iconbtn" @click="drawer = null"><MiniIcon name="x" :size="16" /></button>
        </div>

        <section class="dsec">
          <div class="dhead"><b>付费会员</b>
            <span class="tag" :class="drawer.planName ? 't-live' : 't-draft'">{{ drawer.planName || '非会员' }}</span>
          </div>
          <div class="faint">{{ drawer.expireAt ? '到期 ' + drawer.expireAt : '还不是会员' }}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn sm" @click="selectedIds = [drawer.id]; giftOpen = true">
              <MiniIcon name="gift" :size="14" />赠送会员
            </button>
          </div>
        </section>

        <section class="dsec">
          <div class="dhead"><b>成长等级</b><span class="lv">{{ drawer.levelName || '—' }}</span></div>
          <div class="faint">{{ drawer.points ?? 0 }} 积分 · 等级只做展示，不影响阅读权限</div>
        </section>

        <section class="dsec">
          <div class="dhead"><b>运营备注</b></div>
          <textarea v-model="noteDraft" class="input" rows="2" placeholder="仅后台可见" />
          <button type="button" class="btn sm primary" :disabled="noteSaving" @click="saveNote">保存备注</button>
        </section>

        <section class="dsec">
          <div class="dhead"><b>标签</b></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <label v-for="t in tags" :key="t.id" class="perk">
              <input type="checkbox" :value="t.id" v-model="drawerTagIds" />
              <span>{{ t.name }}</span>
            </label>
            <span v-if="!tags.length" class="faint">请先在「标签管理」建标签</span>
          </div>
          <button type="button" class="btn sm" :disabled="tagSaving" @click="saveDrawerTags">保存标签</button>
        </section>
      </aside>
    </div>

    <!-- 赠送 -->
    <div v-if="giftOpen" class="scrim" @click.self="giftOpen = false">
      <div class="card" style="width:420px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">赠送会员</h2>
        <div class="field"><label>付费档</label>
          <select v-model="giftForm.planId" class="input">
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="field"><label>天数</label>
          <input v-model.number="giftForm.days" type="number" class="input" min="1" />
        </div>
        <div class="field"><label>原因（必填）</label>
          <input v-model="giftForm.reason" class="input" placeholder="如：高活跃体验" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="giftOpen = false">取消</button>
          <button type="button" class="btn primary" :disabled="giftSaving" @click="doGift">确认赠送</button>
        </div>
      </div>
    </div>

    <!-- 打标签 -->
    <div v-if="bulkTagOpen" class="scrim" @click.self="bulkTagOpen = false">
      <div class="card" style="width:400px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">批量打标签</h2>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label v-for="t in tags" :key="t.id" class="perk">
            <input type="checkbox" :value="t.id" v-model="bulkTagIds" />
            <span>{{ t.name }}</span>
          </label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="bulkTagOpen = false">取消</button>
          <button type="button" class="btn primary" @click="doBulkTag">应用</button>
        </div>
      </div>
    </div>

    <!-- 标签表单 -->
    <div v-if="tagFormOpen" class="scrim" @click.self="tagFormOpen = false">
      <div class="card" style="width:400px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">{{ editingTagId ? '编辑标签' : '新建标签' }}</h2>
        <div class="field"><label>名称</label><input v-model="tagForm.name" class="input" /></div>
        <div class="field"><label>说明</label><input v-model="tagForm.description" class="input" /></div>
        <div class="field"><label>颜色</label><input v-model="tagForm.color" type="color" class="input" style="height:40px;padding:4px" /></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="tagFormOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveTag">保存</button>
        </div>
      </div>
    </div>

    <!-- 分群表单 -->
    <div v-if="segFormOpen" class="scrim" @click.self="segFormOpen = false">
      <div class="card" style="width:420px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">新建分群</h2>
        <div class="field"><label>名称</label><input v-model="segForm.name" class="input" /></div>
        <div class="field"><label>规则说明</label><input v-model="segForm.ruleDesc" class="input" /></div>
        <div class="field"><label>规则码</label>
          <select v-model="segForm.ruleCode" class="input">
            <option value="expire_7d">7天内到期</option>
            <option value="high_active_non_member">高活跃非会员</option>
            <option value="expired">已过期</option>
            <option value="sleep_30d">沉睡会员</option>
            <option value="default_nickname">未完善资料</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div class="field"><label>触达动作</label>
          <select v-model="segForm.reachAction" class="input">
            <option value="remind">续费提醒</option>
            <option value="gift">赠送体验</option>
            <option value="coupon">发券</option>
            <option value="content">内容推荐</option>
            <option value="profile">完善资料</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="segFormOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveSeg">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getUserList, getUserDetail, getUserStats, exportUsers } from '@/api/user'
import { getMembershipPlanList, type MembershipPlan } from '@/api/membershipPlan'
import { get, post, put, del } from '@/api/request'
import {
  listSegments,
  createSegment,
  deleteSegment,
  reachSegment,
  giftMembership,
  listDuplicateUsers,
  putUserTags,
  putUserNote,
  type MemberSegment,
} from '@/api/memberOps'

const TONES = ['#F3D9A4', '#FCEBDD', '#E6EEFA', '#E3F3EA', '#EFE6DA', '#F3DDE6']

const loading = ref(false)
const exporting = ref(false)
const tab = ref<'list' | 'segs' | 'tags'>('list')
const keyword = ref('')
const payFilter = ref('all')
const users = ref<any[]>([])
const total = ref(0)
const listError = ref('')
const selectedIds = ref<number[]>([])
const stats = ref<any>({})
const dupHint = ref('')
const drawer = ref<any>(null)
const noteDraft = ref('')
const noteSaving = ref(false)
const drawerTagIds = ref<number[]>([])
const tagSaving = ref(false)

const segs = ref<MemberSegment[]>([])
const segError = ref('')
const segFormOpen = ref(false)
const segForm = reactive({ name: '', ruleDesc: '', ruleCode: 'custom', reachAction: 'remind' })

const tags = ref<any[]>([])
const tagError = ref('')
const tagFormOpen = ref(false)
const editingTagId = ref<number | null>(null)
const tagForm = reactive({ name: '', description: '', color: '#B4430F' })

const plans = ref<MembershipPlan[]>([])
const giftOpen = ref(false)
const giftSaving = ref(false)
const giftForm = reactive({ planId: 0 as number, days: 7, reason: '' })

const bulkTagOpen = ref(false)
const bulkTagIds = ref<number[]>([])

const tabSub = computed(() => {
  if (tab.value === 'segs') return '按条件自动圈人；一键触达走微信订阅消息'
  if (tab.value === 'tags') return '统一维护标签，打标签时只能从这里选'
  return '所有注册用户都在这里，付费会员只是其中一种状态'
})

const payChips = [
  { k: 'all', l: '全部' },
  { k: 'paid', l: '付费会员' },
  { k: 'none', l: '非会员' },
]

const statsTiles = computed(() => [
  { label: '总用户', value: stats.value.totalUsers ?? total.value ?? '—' },
  { label: '近 7 日活跃', value: stats.value.active7d ?? '—' },
  { label: '有订单用户', value: stats.value.orderedUsers ?? '—' },
  { label: '有效订单', value: stats.value.orders ?? '—' },
])

const allSelected = computed(() => users.value.length > 0 && users.value.every((u) => selectedIds.value.includes(u.id)))

function toneOf(id: number) {
  return TONES[Number(id) % TONES.length]
}
function money(n: any) {
  const v = Number(n) || 0
  return '¥' + v.toLocaleString('zh-CN')
}
function shortDate(s: any) {
  if (!s) return '—'
  return String(s).replace('T', ' ').slice(5, 10)
}
function reachLabel(a?: string) {
  const map: Record<string, string> = {
    remind: '发续费提醒',
    gift: '赠送体验',
    coupon: '发券',
    content: '推内容',
    profile: '提醒完善资料',
  }
  return map[a || ''] || '触达'
}

function unwrapList(res: any) {
  const d = res?.data ?? res
  if (Array.isArray(d)) return { records: d, total: d.length }
  return {
    records: d?.records || d?.list || d?.rows || [],
    total: Number(d?.total ?? d?.totalElements ?? 0),
  }
}

function toggleSel(id: number) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value = [...selectedIds.value, id]
}
function toggleAll(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  selectedIds.value = on ? users.value.map((u) => u.id) : []
}

async function fetchUsers() {
  loading.value = true
  listError.value = ''
  try {
    const res: any = await getUserList({
      keyword: keyword.value || undefined,
      current: 1,
      size: 50,
      payStatus: payFilter.value === 'all' ? undefined : payFilter.value,
    })
    const page = unwrapList(res)
    users.value = page.records.map((r: any) => ({
      id: Number(r.id),
      nickname: r.nickname || r.name || '微信用户',
      phone: r.phone || r.mobile || '',
      source: r.source,
      sourceLabel: r.sourceLabel || r.source_label || r.source,
      planName: r.planName || r.plan_name || r.memberLevel || r.levelName,
      levelName: r.levelName || r.level_name || r.growthLevel,
      points: r.points ?? r.memberPoints ?? 0,
      spend: r.spend ?? r.totalSpend ?? r.total_amount ?? 0,
      orders: r.orders ?? r.orderCount ?? 0,
      tags: Array.isArray(r.tags) ? r.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean) : [],
      lastVisit: r.lastVisit || r.last_visit || r.lastLoginAt,
      createdAt: r.createdAt || r.createTime || r.joined,
      expireAt: r.expireAt || r.expire_at || r.memberExpireAt,
      adminNote: r.adminNote || r.admin_note || '',
    }))
    total.value = page.total || users.value.length
  } catch (e: any) {
    listError.value = e?.message || '用户列表加载失败'
    users.value = []
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res: any = await getUserStats()
    stats.value = res?.data ?? res ?? {}
  } catch {
    stats.value = {}
  }
}

async function loadDups() {
  try {
    const res: any = await listDuplicateUsers()
    const rows = res?.data ?? res
    const n = Array.isArray(rows) ? rows.length : 0
    dupHint.value = n ? `${n} 组重复账号待合并` : ''
    if (!n) ElMessage.success('未发现重复账号')
  } catch {
    dupHint.value = ''
  }
}

async function doExport() {
  exporting.value = true
  try {
    const res: any = await exportUsers({ keyword: keyword.value || undefined })
    const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data || res])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function openDetail(u: any) {
  try {
    const res: any = await getUserDetail(u.id)
    const d = res?.data ?? res ?? u
    drawer.value = { ...u, ...d, id: u.id }
    noteDraft.value = d.adminNote || d.admin_note || u.adminNote || ''
    if (!tags.value.length) await loadTags()
    const tagRes: any = await get(`/api/v1/admin/member-ops/users/${u.id}/tags`).catch(() => null)
    const list = tagRes?.data ?? tagRes
    drawerTagIds.value = Array.isArray(list)
      ? list.map((t: any) => Number(t.id ?? t.tagId)).filter(Boolean)
      : []
  } catch {
    drawer.value = u
    noteDraft.value = u.adminNote || ''
  }
}

async function saveNote() {
  if (!drawer.value) return
  noteSaving.value = true
  try {
    await putUserNote(drawer.value.id, noteDraft.value)
    ElMessage.success('备注已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    noteSaving.value = false
  }
}

async function saveDrawerTags() {
  if (!drawer.value) return
  tagSaving.value = true
  try {
    await putUserTags(drawer.value.id, drawerTagIds.value)
    ElMessage.success('标签已更新')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    tagSaving.value = false
  }
}

async function loadPlans() {
  try {
    const res: any = await getMembershipPlanList({ scope: 'platform' })
    plans.value = res?.data || []
    if (plans.value.length && !giftForm.planId) giftForm.planId = plans.value[0].id
  } catch {
    plans.value = []
  }
}

async function doGift() {
  if (!giftForm.reason.trim()) {
    ElMessage.warning('请填写原因')
    return
  }
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  giftSaving.value = true
  try {
    await giftMembership({
      userIds: selectedIds.value,
      planId: Number(giftForm.planId),
      days: Number(giftForm.days) || 7,
      reason: giftForm.reason,
    })
    ElMessage.success('已提交赠送')
    giftOpen.value = false
    selectedIds.value = []
    fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '赠送失败（接口可能尚未上线）')
  } finally {
    giftSaving.value = false
  }
}

async function openBulkReach() {
  try {
    await ElMessageBox.prompt('订阅消息文案', '批量触达', {
      confirmButtonText: '发送',
      inputPlaceholder: '简短提醒文案',
    })
    ElMessage.info('请通过「分群与触达」发起正式触达；批量直发需后端 segment reach')
  } catch {
    /* cancel */
  }
}

async function doBulkTag() {
  if (!bulkTagIds.value.length) {
    ElMessage.warning('请选择标签')
    return
  }
  try {
    await Promise.all(selectedIds.value.map((id) => putUserTags(id, bulkTagIds.value)))
    ElMessage.success('已打标签')
    bulkTagOpen.value = false
    selectedIds.value = []
    fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '打标签失败')
  }
}

async function loadSegs() {
  segError.value = ''
  try {
    const res: any = await listSegments()
    const rows = res?.data ?? res
    segs.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    segError.value = e?.message || '分群接口暂不可用'
    segs.value = []
  }
}

function openSegForm() {
  Object.assign(segForm, { name: '', ruleDesc: '', ruleCode: 'custom', reachAction: 'remind' })
  segFormOpen.value = true
}

async function saveSeg() {
  try {
    await createSegment({ ...segForm })
    ElMessage.success('已创建')
    segFormOpen.value = false
    loadSegs()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
}

async function removeSeg(s: MemberSegment) {
  try {
    await ElMessageBox.confirm(`删除分群「${s.name}」？`, '确认')
    await deleteSegment(s.id)
    loadSegs()
  } catch {
    /* cancel / err */
  }
}

function viewSeg(s: MemberSegment) {
  tab.value = 'list'
  keyword.value = ''
  ElMessage.info(`分群「${s.name}」名单：后端 members 接口就绪后可筛选；当前请在列表中人工查看`)
  fetchUsers()
}

async function doReach(s: MemberSegment) {
  try {
    await ElMessageBox.confirm(`对「${s.name}」执行：${reachLabel(s.reachAction)}？`, '确认触达')
    await reachSegment(s.id, { action: s.reachAction })
    ElMessage.success('已提交触达')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '触达失败')
  }
}

async function loadTags() {
  tagError.value = ''
  try {
    const res: any = await get('/api/v1/admin/member-tags')
    const rows = res?.data ?? res
    tags.value = Array.isArray(rows) ? rows : rows?.records || []
  } catch (e: any) {
    tagError.value = e?.message || '标签加载失败'
    tags.value = []
  }
}

function openTagForm(t?: any) {
  editingTagId.value = t?.id ?? null
  Object.assign(tagForm, {
    name: t?.name || '',
    description: t?.description || '',
    color: t?.color || '#B4430F',
  })
  tagFormOpen.value = true
}

async function saveTag() {
  try {
    const body = { name: tagForm.name, description: tagForm.description, color: tagForm.color }
    if (editingTagId.value) await put(`/api/v1/admin/member-tags/${editingTagId.value}`, body)
    else await post('/api/v1/admin/member-tags', body)
    tagFormOpen.value = false
    loadTags()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function removeTag(t: any) {
  try {
    await ElMessageBox.confirm(`删除标签「${t.name}」？`, '确认')
    await del(`/api/v1/admin/member-tags/${t.id}`)
    loadTags()
  } catch {
    /* */
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers(), loadStats(), loadPlans(), loadTags(), loadDups()])
})
</script>
