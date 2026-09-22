<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">收入概览</h1>
        <div class="sub">{{ data.subtitle || '已排除测试订单 · 真实成交一眼看清' }}</div>
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
          <h2 class="h2">下单到付款</h2>
          <div class="sub">没付款的订单可用召回券拉回</div>
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
          <button type="button" class="link" style="font-size:13px;margin-top:8px" @click="router.push('/commerce/orders?tab=closed')">
            去召回未付款订单 ›
          </button>
        </section>

        <section class="card">
          <h2 class="h2">哪些商品在赚钱</h2>
          <div class="sub">按实收排序</div>
          <div v-if="productRank.length" class="bars">
            <div v-for="p in productRank" :key="p.name" class="bar-row">
              <button type="button" class="link bar-name" @click="router.push('/commerce/products')">{{ p.name }}</button>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: `${Math.max(3, (p.revenue / rankMax) * 100)}%` }" />
              </div>
              <span class="bar-val">¥{{ formatMoney(p.revenue) }}</span>
            </div>
          </div>
          <div v-else class="muted" style="margin-top:16px">暂无商品排行</div>
          <button type="button" class="link" style="font-size:13px;margin-top:8px" @click="router.push('/commerce/products')">
            管理商品 ›
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
import { getCommerceOverview, type CommerceOverview } from '@/api/commerceOps'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const data = ref<CommerceOverview>({})

const tiles = computed(() => {
  const t = data.value.tiles
  if (Array.isArray(t) && t.length) return t
  return [
    { label: '实收（不含测试）', value: '—', hint: '接口未返回' },
    { label: '付款率', value: '—', hint: '' },
    { label: '客单价', value: '—', hint: '' },
    { label: '在售商品', value: '—', hint: '' },
  ]
})

const todos = computed(() => {
  const t = data.value.todos
  if (Array.isArray(t) && t.length) return t
  return [
    { key: 'refund', title: '退款待审', count: 0, hint: '暂无', path: '/commerce/orders?tab=refunding' },
    { key: 'ship', title: '待发货 / 待交付', count: 0, hint: '暂无', path: '/commerce/orders?tab=paid' },
    { key: 'recall', title: '没付款的订单', count: 0, hint: '暂无', path: '/commerce/orders?tab=closed' },
    { key: 'data', title: '数据异常', count: 0, hint: '暂无', path: '/commerce/growth' },
  ]
})

const funnel = computed(() => (Array.isArray(data.value.funnel) ? data.value.funnel : []))
const funnelMax = computed(() => Math.max(1, ...funnel.value.map((f) => Number(f.value) || 0)))
const productRank = computed(() => (Array.isArray(data.value.productRank) ? data.value.productRank : []))
const rankMax = computed(() => Math.max(1, ...productRank.value.map((p) => Number(p.revenue) || 0)))

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function todoIcon(key: string) {
  if (key.includes('refund')) return 'warn'
  if (key.includes('ship') || key.includes('deliver')) return 'truck'
  if (key.includes('recall') || key.includes('unpaid')) return 'send'
  if (key.includes('data') || key.includes('health')) return 'shield'
  return 'warn'
}

function goTodo(td: { path?: string; key?: string }) {
  if (td.path) {
    router.push(td.path)
    return
  }
  const k = td.key || ''
  if (k.includes('refund')) router.push('/commerce/orders?tab=refunding')
  else if (k.includes('ship')) router.push('/commerce/orders?tab=paid')
  else if (k.includes('recall')) router.push('/commerce/orders?tab=closed')
  else if (k.includes('data')) router.push('/commerce/growth')
  else router.push('/commerce/orders')
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res: any = await getCommerceOverview()
    data.value = res?.data ?? res ?? {}
  } catch (e: any) {
    loadError.value = e?.message || '概览接口暂不可用（后端 commerce-ops 可能尚未上线）'
    data.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
