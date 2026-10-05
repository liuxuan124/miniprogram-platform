<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">会员概览</h1>
        <div class="sub">真实用户 · 付费与待办一眼看清</div>
      </div>
    </div>

    <section class="card mode-card" :class="{ dirty: modeDirty }" style="margin-bottom:16px;padding:16px">
      <div class="mode-head">
        <div>
          <h2 class="h2">会员运营模式</h2>
          <div class="sub">决定平台会员 / 星球会员的售卖与内容可见性分流（A/B/C 三模式）</div>
        </div>
        <span class="mode-state" :class="modeStateClass">
          <span class="mode-dot" />
          {{ modeStateText }}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px">
        <label v-for="m in modeOptions" :key="m.value" class="mode-opt" :class="{ on: mode === m.value }" style="border:1.5px solid var(--bd);border-radius:10px;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:4px">
          <span style="display:flex;align-items:center;gap:6px">
            <input type="radio" v-model="mode" :value="m.value" />
            <b style="font-weight:600">{{ m.label }}</b>
          </span>
          <span class="faint" style="font-size:12px">{{ m.desc }}</span>
        </label>
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <span class="faint">星球版块职能</span>
          <select v-model="planetRole" :disabled="mode === 'platform_primary' || modeSaving" style="padding:4px 8px;border:1px solid var(--bd);border-radius:6px">
            <option value="community_only">仅社区发帖</option>
            <option value="community_plus_resource">社区+专属资源</option>
          </select>
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <span class="faint">跨星球身份</span>
          <select v-model="crossIdentity" :disabled="modeSaving" style="padding:4px 8px;border:1px solid var(--bd);border-radius:6px">
            <option value="isolated">隔离（默认）</option>
            <option value="mutual_recognition">互认</option>
            <option value="ticket_only">仅通票覆盖</option>
          </select>
        </label>
        <div class="mode-actions">
          <span v-if="modeDirty" class="faint mode-tip">有未保存的改动</span>
          <button
            type="button"
            class="btn"
            :class="modeJustSaved ? 'saved' : (modeDirty ? 'primary' : '')"
            :disabled="modeSaving || modeJustSaved || !modeDirty"
            @click="saveMode"
          >
            {{ modeSaving ? '保存中…' : (modeJustSaved ? '✓ 已保存' : '保存运营模式') }}
          </button>
        </div>
      </div>
    </section>

    <div v-if="loadError" class="empty-box">
      {{ loadError }}
      <div style="margin-top:10px">
        <button type="button" class="btn sm" @click="load">重试</button>
      </div>
    </div>

    <template v-else>
      <div class="tiles">
        <div v-for="t in tiles" :key="t.label" class="tile">
          <span class="faint">{{ t.label }}</span>
          <b>{{ t.value }}</b>
          <span v-if="t.hint" class="faint">{{ t.hint }}</span>
        </div>
      </div>

      <div class="todo-grid">
        <button
          v-for="td in todos"
          :key="td.key"
          type="button"
          class="todo"
          @click="goTodo(td)"
        >
          <span class="todo-ic"><MiniIcon :name="todoIcon(td.key)" :size="18" /></span>
          <span style="flex:1;min-width:0;text-align:left">
            <b>{{ td.title }}</b>
            <span class="faint" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ td.hint || '暂无' }}
            </span>
          </span>
          <span class="todo-n">{{ td.count }}</span>
        </button>
      </div>

      <div class="ov2">
        <section class="card">
          <h2 class="h2">从注册到付费</h2>
          <div class="sub">每一步还剩多少人</div>
          <div v-if="funnel.length" class="funnel">
            <div v-for="(f, i) in funnel" :key="f.label" class="f-row">
              <span>{{ f.label }}</span>
              <div class="f-track">
                <div
                  class="f-fill"
                  :style="{ width: `${Math.max(6, (f.value / funnelMax) * 100)}%`, opacity: 1 - i * 0.15 }"
                />
              </div>
              <b>{{ f.value }}</b>
              <span class="faint">{{ i ? Math.round((f.value / Math.max(1, funnel[i - 1].value)) * 100) + '%' : '' }}</span>
            </div>
          </div>
          <div v-else class="muted" style="margin-top:16px">暂无漏斗数据</div>
        </section>

        <section class="card">
          <h2 class="h2">会员构成</h2>
          <div class="sub">有效会员分布</div>
          <div v-if="planMix.length" style="margin-top:12px">
            <div v-for="p in planMix" :key="p.name" class="list-row">
              <span class="pdot" :style="{ background: p.tone || 'var(--ns)' }" />
              <b style="font-weight:500">{{ p.name }}</b>
              <span class="faint" v-if="p.price != null">¥{{ p.price }}{{ p.period ? ' / ' + p.period : '' }}</span>
              <span style="margin-left:auto;font-weight:600">{{ p.count }} 人</span>
            </div>
          </div>
          <div v-else class="muted" style="margin-top:16px">暂无构成数据</div>
          <button type="button" class="link ov2-link" style="font-size:13px" @click="router.push('/member/plans')">
            管理会员与权益 ›
          </button>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getMemberOpsOverview, type MemberOpsOverview } from '@/api/memberOps'
import { getConfigs, updateConfigs } from '@/api/system'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const data = ref<MemberOpsOverview>({})

// 运营模式（A 平台为主 / B 双会员并存 / C 纯星球）
const mode = ref('platform_primary')
const planetRole = ref('community_plus_resource')
const crossIdentity = ref('isolated')
const modeSaving = ref(false)
const modeJustSaved = ref(false)
const modeLoaded = ref(false)
const modeSavedAt = ref('')
/** 上一次成功保存时的取值快照，用于判断是否有未保存改动 */
const modeSnapshot = ref('')
let justSavedTimer: ReturnType<typeof setTimeout> | null = null
const modeOptions = [
  { value: 'platform_primary', label: 'A 平台为主', desc: '星球只承担社区发帖' },
  { value: 'dual', label: 'B 双会员并存', desc: '平台+星球独立售卖' },
  { value: 'planet_only', label: 'C 纯星球', desc: '平台会员隐藏，仅星球售卖' },
]

const modeLabels: Record<string, string> = {
  platform_primary: 'A 平台为主',
  dual: 'B 双会员并存',
  planet_only: 'C 纯星球',
}

/** A 模式下星球职能被锁定为「仅社区发帖」 */
const effectivePlanetRole = computed(() =>
  mode.value === 'platform_primary' ? 'community_only' : planetRole.value,
)

function modeFingerprint(m = mode.value, r?: string, c?: string) {
  return [m, r ?? effectivePlanetRole.value, c ?? crossIdentity.value].join('|')
}

const modeDirty = computed(() => {
  if (!modeLoaded.value) return false
  return modeFingerprint() !== modeSnapshot.value
})

const modeStateText = computed(() => {
  if (modeSaving.value) return '保存中…'
  if (modeDirty.value) return '有未保存改动'
  if (modeJustSaved.value) return '已保存'
  if (modeSavedAt.value) return `已保存 · ${modeSavedAt.value}`
  return '尚未保存'
})

const modeStateClass = computed(() => {
  if (modeSaving.value) return 'saving'
  if (modeDirty.value) return 'dirty'
  return modeLoaded.value ? 'ok' : 'idle'
})

function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function loadMode() {
  try {
    const res: any = await getConfigs()
    const list: any[] = Array.isArray(res) ? res : (res?.data ?? [])
    for (const c of list) {
      const k = c.configKey || c.config_key
      const v = c.configValue ?? c.config_value
      if (k === 'membership_operating_mode') mode.value = v || 'platform_primary'
      if (k === 'planet_role') planetRole.value = v || 'community_plus_resource'
      if (k === 'planet_cross_identity') crossIdentity.value = v || 'isolated'
    }
    // A 模式锁定 community_only
    if (mode.value === 'platform_primary') planetRole.value = 'community_only'
  } catch (e) {
    // 静默失败，用默认值
  } finally {
    modeLoaded.value = true
    modeSnapshot.value = modeFingerprint()
  }
}

async function saveMode() {
  if (modeSaving.value) return
  modeSaving.value = true
  const prevSnapshot = modeSnapshot.value
  try {
    const role = mode.value === 'platform_primary' ? 'community_only' : planetRole.value
    await updateConfigs([
      { configKey: 'membership_operating_mode', configValue: mode.value, configGroup: 'membership', description: '会员运营模式' },
      { configKey: 'planet_role', configValue: role, configGroup: 'membership', description: '星球版块职能' },
      { configKey: 'planet_cross_identity', configValue: crossIdentity.value, configGroup: 'membership', description: '跨星球身份策略' },
    ])
    planetRole.value = role
    modeSnapshot.value = modeFingerprint()
    modeSavedAt.value = stamp(new Date())
    modeJustSaved.value = true
    if (justSavedTimer) clearTimeout(justSavedTimer)
    justSavedTimer = setTimeout(() => { modeJustSaved.value = false }, 2400)
    ElMessage.success(`运营模式已保存：${modeLabels[mode.value] || mode.value}`)
  } catch (e: any) {
    // 保存失败则回滚快照，状态条仍显示「有未保存改动」
    modeSnapshot.value = prevSnapshot
    ElMessage.error('保存失败：' + (e?.message || '请稍后重试'))
  } finally {
    modeSaving.value = false
  }
}

onBeforeUnmount(() => {
  if (justSavedTimer) clearTimeout(justSavedTimer)
})

const tiles = computed(() => {
  const t = data.value.tiles
  if (Array.isArray(t) && t.length) return t
  return [
    { label: '真实用户', value: '—', hint: '接口未返回' },
    { label: '付费会员', value: '—', hint: '' },
    { label: '7 天内到期', value: '—', hint: '' },
    { label: '本月新增', value: '—', hint: '' },
  ]
})

const todos = computed(() => {
  const t = data.value.todos
  if (Array.isArray(t) && t.length) return t
  return [
    { key: 'expire', title: '到期提醒', count: 0, hint: '暂无', path: '/member/users' },
    { key: 'dup', title: '重复账号待合并', count: 0, hint: '已清理', path: '/member/users' },
    { key: 'expired', title: '已过期未续费', count: 0, hint: '暂无', path: '/member/users' },
    { key: 'support', title: '客服待回复', count: 0, hint: '暂无', path: '/member/support' },
  ]
})

const funnel = computed(() => (Array.isArray(data.value.funnel) ? data.value.funnel : []))
const funnelMax = computed(() => Math.max(1, ...funnel.value.map((f) => Number(f.value) || 0)))
const planMix = computed(() => (Array.isArray(data.value.planMix) ? data.value.planMix : []))

function todoIcon(key: string) {
  if (key.includes('dup') || key.includes('merge')) return 'merge'
  if (key.includes('support') || key.includes('chat')) return 'chat'
  if (key.includes('expire') || key.includes('clock')) return 'clock'
  return 'warn'
}

function goTodo(td: { path?: string; key?: string }) {
  if (td.path) {
    router.push(td.path)
    return
  }
  if (td.key?.includes('support')) router.push('/member/support')
  else router.push('/member/users')
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res: any = await getMemberOpsOverview()
    data.value = res?.data ?? res ?? {}
  } catch (e: any) {
    loadError.value = e?.message || '概览接口暂不可用（后端 member-ops 可能尚未上线）'
    data.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  loadMode()
})
</script>
