<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">增长数据</h1>
        <div class="sub">埋点、搜索、优惠券效果、内容带货；先把数据接通</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="loadAll">刷新</button>
      </div>
    </div>

    <section v-if="healthError" class="empty-box" style="margin-bottom:16px">
      {{ healthError }}
      <button type="button" class="btn sm" style="margin-left:8px" @click="loadHealth">重试</button>
    </section>

    <section v-else class="card health">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span class="todo-ic" :style="issueCount ? { background: 'var(--rs)', color: 'var(--r)' } : { background: 'var(--gs)', color: 'var(--g)' }">
          <MiniIcon :name="issueCount ? 'warn' : 'check'" :size="18" />
        </span>
        <div style="flex:1">
          <h2 class="h2">数据健康检查 · {{ issueCount }} 个问题</h2>
          <div class="sub">这些问题不解决，下面的数字都不可信</div>
          <div v-if="issues.length" class="hchk">
            <div v-for="(iss, i) in issues" :key="i">
              <span class="tag t-err">{{ iss.tag || iss.key || '问题' }}</span>
              <span>{{ iss.message }}</span>
              <button
                v-if="iss.actionPath || iss.actionLabel"
                type="button"
                class="btn sm"
                @click="goAction(iss)"
              >{{ iss.actionLabel || '查看' }}</button>
            </div>
          </div>
          <div v-else class="note ok" style="margin-top:12px">暂未发现健康问题（或后端尚未返回检查项）</div>
          <div v-if="notes.length" style="margin-top:10px">
            <div v-for="(n, i) in notes" :key="i" class="faint">· {{ n }}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="ov2">
      <section class="card">
        <h2 class="h2">转化漏斗（近 {{ days }} 天）</h2>
        <div class="sub">按埋点事件统计</div>
        <div v-if="growthError" class="note err" style="margin-top:10px">{{ growthError }}</div>
        <div v-else-if="!funnel.length" class="muted" style="margin-top:12px">暂无事件数据</div>
        <div v-else style="margin-top:10px">
          <div v-for="f in funnel" :key="f.event || f.label" class="list-row">
            <span style="flex:1">
              {{ f.label || eventLabel(f.event) }}
              <span v-if="f.event" class="faint">{{ f.event }}</span>
            </span>
            <b>{{ f.count ?? f.value ?? 0 }}</b>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">优惠券效果</h2>
        <div class="comm-stats" style="margin-top:12px">
          <span><b>{{ coupon.useCount || 0 }}</b>核销次数</span>
          <span><b>¥{{ coupon.discountTotal || 0 }}</b>优惠总额</span>
          <span><b>¥{{ coupon.payGmv || 0 }}</b>带动实付</span>
        </div>
        <div class="faint" style="margin-top:10px">核销以订单实付为准</div>
        <button type="button" class="link" style="font-size:13px;margin-top:8px" @click="router.push('/commerce/coupons')">
          去优惠券 ›
        </button>
      </section>
    </div>

    <div class="ov2">
      <section class="card">
        <h2 class="h2">热搜词</h2>
        <div class="sub">用户在小程序里搜了什么</div>
        <div v-if="!hot.length" class="muted" style="margin-top:12px">暂无热搜</div>
        <div v-else style="margin-top:8px">
          <div v-for="s in hot" :key="s.keyword" class="list-row">
            <span style="flex:1">{{ s.keyword }}</span>
            <span class="faint">{{ s.count }} 次</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">无结果词 → 选题清单</h2>
        <div class="sub">用户搜了但还没有的内容或商品</div>
        <div v-if="!noResult.length" class="muted" style="margin-top:12px">暂无无结果词</div>
        <div v-else style="margin-top:8px">
          <div v-for="s in noResult" :key="s.keyword" class="list-row">
            <span style="flex:1">
              <b style="font-weight:500">{{ s.keyword }}</b>
              <span class="faint"> {{ s.count }} 次无结果</span>
            </span>
          </div>
        </div>
      </section>
    </div>

    <section class="card">
      <h2 class="h2">内容带货榜</h2>
      <div class="sub">哪篇内容带来了订单</div>
      <div v-if="!contentGmv.length" class="muted" style="padding:16px 0">暂无带货数据</div>
      <div v-else style="margin-top:8px">
        <div v-for="row in contentGmv" :key="row.contentId" class="list-row">
          <span style="flex:1">内容 #{{ row.contentId }}</span>
          <span class="faint">{{ row.orderCount || 0 }} 单</span>
          <b>¥{{ row.gmv || 0 }}</b>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { get } from '@/api/request'
import { getCommerceHealth, type CommerceHealthIssue } from '@/api/commerceOps'

const router = useRouter()
const loading = ref(false)
const days = 7
const healthError = ref('')
const growthError = ref('')
const issues = ref<CommerceHealthIssue[]>([])
const notes = ref<string[]>([])
const funnel = ref<any[]>([])
const coupon = reactive<any>({})
const hot = ref<any[]>([])
const noResult = ref<any[]>([])
const contentGmv = ref<any[]>([])

const issueCount = computed(() => issues.value.length)

const EVENT_LABELS: Record<string, string> = {
  page_view: '页面浏览',
  component_click: '组件点击',
  product_view: '商品浏览',
  add_cart: '加购',
  order_create: '下单',
  pay_success: '支付成功',
}

function eventLabel(ev?: string) {
  return (ev && EVENT_LABELS[ev]) || ev || '事件'
}

function goAction(iss: CommerceHealthIssue) {
  if (iss.actionPath) router.push(iss.actionPath)
  else if ((iss.key || '').includes('coupon') || (iss.tag || '').includes('券')) router.push('/commerce/coupons')
}

async function loadHealth() {
  healthError.value = ''
  try {
    const res: any = await getCommerceHealth()
    const data = res?.data ?? res ?? {}
    issues.value = Array.isArray(data.issues) ? data.issues : []
    notes.value = Array.isArray(data.notes) ? data.notes : []
  } catch (e: any) {
    healthError.value = e?.message || '健康检查接口暂不可用'
    issues.value = []
    notes.value = []
  }
}

async function loadGrowth() {
  growthError.value = ''
  try {
    const [f, c, s, g]: any[] = await Promise.all([
      get('/api/v1/admin/growth/funnel', { days }),
      get('/api/v1/admin/growth/coupon-effect'),
      get('/api/v1/admin/growth/search-insights'),
      get('/api/v1/admin/growth/content-gmv'),
    ])
    funnel.value = f?.data?.funnel || []
    Object.assign(coupon, c?.data || {})
    hot.value = s?.data?.hot || []
    noResult.value = s?.data?.noResult || []
    contentGmv.value = g?.data || []
  } catch (e: any) {
    growthError.value = e?.message || '增长接口部分失败'
  }
}

async function loadAll() {
  loading.value = true
  await Promise.all([loadHealth(), loadGrowth()])
  loading.value = false
}

onMounted(loadAll)
</script>
