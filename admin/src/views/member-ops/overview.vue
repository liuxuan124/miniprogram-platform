<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">会员概览</h1>
        <div class="sub">真实用户 · 付费与待办一眼看清</div>
      </div>
    </div>

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
          <button type="button" class="link" style="font-size:13px;margin-top:8px" @click="router.push('/member/plans')">
            管理会员与权益 ›
          </button>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getMemberOpsOverview, type MemberOpsOverview } from '@/api/memberOps'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const data = ref<MemberOpsOverview>({})

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

onMounted(load)
</script>
