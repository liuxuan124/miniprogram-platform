<template>
  <div class="workbench">
    <PageHeader
      title="工作台"
      :description="`欢迎回来，${userStore.userInfo?.nickname || '管理员'} · ${currentDate}`"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/start')">搭建小程序</el-button>
        <el-button type="primary" @click="goDecorateHome">
          <el-icon><Brush /></el-icon>
          进入装修器
        </el-button>
      </template>
    </PageHeader>

    <section v-loading="dashboardLoading" class="metrics">
      <div v-for="item in metrics" :key="item.title" class="metric-card">
        <div class="metric-icon" :style="{ color: item.color, background: item.bg }">
          <el-icon :size="22"><component :is="item.iconComp" /></el-icon>
        </div>
        <div>
          <div class="metric-title">{{ item.title }}</div>
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-note" :class="{ green: item.up }">{{ item.note }}</div>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel trend-panel">
        <div class="panel-head">
          <h2>访问趋势 (近7日)</h2>
          <span>每日凌晨刷新</span>
        </div>
        <div v-loading="dashboardLoading" class="chart-wrap">
          <EmptyState
            v-if="!hasVisitData && !dashboardLoading"
            title="近 7 日暂无访问数据"
            description="有用户访问小程序后，这里会展示趋势"
            :icon="DataLine"
          />
          <div v-show="hasVisitData" ref="visitChartRef" class="chart-box"></div>
        </div>
        <div class="summary-row">
          <div v-for="item in summaries" :key="item.label">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
            <em>{{ item.change }}</em>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>待办事项</h2>
        </div>
        <div v-if="todos.length" class="todo-list">
          <div v-for="item in todos" :key="item.label" class="todo-item">
            <span>{{ item.label }}</span>
            <b :class="item.level">{{ item.count }}</b>
            <el-button link type="primary" @click="router.push(item.path)">去处理</el-button>
          </div>
        </div>
        <EmptyState v-else title="暂无待办" description="当前没有需要处理的事项" />
      </div>
    </section>

    <section class="panel quick-panel">
      <div class="panel-head">
        <h2>最近访问</h2>
        <el-button v-if="recentLinks.length" link type="primary" @click="clearRecent">清空</el-button>
      </div>
      <div v-if="recentLinks.length" class="quick-grid">
        <button v-for="item in recentLinks" :key="item.path" class="quick-card" @click="router.push(item.path)">
          <span class="quick-icon"><el-icon :size="26"><component :is="item.iconComp" /></el-icon></span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.time }}</small>
        </button>
      </div>
      <EmptyState v-else title="暂无访问记录" description="可从左侧菜单开始操作" :icon="Clock" />
    </section>

    <section class="content-grid lower-grid">
      <div class="panel">
        <div class="panel-head">
          <h2>销售排行 TOP 3</h2>
          <el-button link type="primary" @click="router.push('/commerce/product')">查看全部商品</el-button>
        </div>
        <div class="rank-list">
          <div
            v-for="(item, index) in displayProducts"
            :key="item.name || ('empty-' + index)"
            class="rank-item"
            :class="{ 'rank-empty': !item.name }"
          >
            <template v-if="item.name">
              <span class="rank-num">{{ index + 1 }}</span>
              <span class="product-icon"><el-icon><Goods /></el-icon></span>
              <div>
                <strong>{{ item.name }}</strong>
                <small>¥{{ item.price }}</small>
              </div>
              <b>{{ item.sales }}件</b>
            </template>
            <template v-else>
              <span class="rank-num muted">{{ index + 1 }}</span>
              <span class="product-icon muted"><el-icon><Goods /></el-icon></span>
              <div>
                <strong class="muted">暂无数据</strong>
                <small class="muted">—</small>
              </div>
              <b class="muted">—</b>
            </template>
          </div>
        </div>
      </div>

      <div class="panel version-panel">
        <div class="panel-head">
          <h2>最近发布版本记录</h2>
          <el-button link type="primary" @click="router.push('/page-builder/list')">查看更多</el-button>
        </div>
        <el-table :data="versions" size="small" class="version-table">
          <el-table-column prop="name" label="页面名称" min-width="120" />
          <el-table-column prop="status" label="状态" width="90" />
          <el-table-column prop="version" label="版本" width="80" />
          <el-table-column prop="time" label="发布时间" width="150" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="router.push(row.id ? `/page-builder/editor/${row.id}` : '/page-builder/start')"
              >
                进入装修
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { useUserStore } from '@/stores/user'
import { getDashboard } from '@/api/statistics'
import { getPageList } from '@/api/page'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  DataLine,
  User,
  Document,
  Wallet,
  Goods,
  Clock,
  Brush,
  Reading,
  Tickets,
  GoldMedal,
  ShoppingCart,
  Present,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const currentDate = computed(() => new Date().toLocaleDateString('zh-CN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}))

const homePageId = ref<number | null>(null)

async function resolveHomePageId() {
  try {
    const res: any = await getPageList({ page: 1, page_size: 50 } as any)
    const pages = res?.data?.records || res?.data?.list || res?.data || []
    const list = Array.isArray(pages) ? pages : []
    const home = list.find((p: any) => Number(p.type) === 1 || p.path === '/pages/index/index' || p.name === '首页')
      || list[0]
    homePageId.value = home?.id || null
  } catch {
    homePageId.value = null
  }
}

function goDecorateHome() {
  if (homePageId.value) {
    router.push({ name: 'PageBuilderEditor', params: { id: homePageId.value } })
    return
  }
  router.push('/page-builder/start')
}

// 修复：此前全文件多处引用 dashboardLoading 但从未声明，v-loading 与空态判断实际从未生效
const dashboardLoading = ref(false)

const metrics = ref([
  { title: '今日访问', value: '-', note: '加载中...', iconComp: 'DataLine', color: 'var(--brand)', bg: 'var(--brand-soft)', up: true },
  { title: '新增用户', value: '-', note: '加载中...', iconComp: 'User', color: 'var(--success)', bg: 'var(--success-soft)', up: true },
  { title: '表单提交', value: '-', note: '加载中...', iconComp: 'Document', color: 'var(--warning)', bg: 'var(--warning-soft)', up: false },
  { title: '订单金额', value: '-', note: '加载中...', iconComp: 'Wallet', color: 'var(--brand)', bg: 'var(--brand-soft)', up: false },
])

const visits = ref<Array<{ day: string; count: number }>>([
  { day: '周一', count: 0 },
  { day: '周二', count: 0 },
  { day: '周三', count: 0 },
  { day: '周四', count: 0 },
  { day: '周五', count: 0 },
  { day: '周六', count: 0 },
  { day: '周日', count: 0 },
])

const hasVisitData = computed(() => visits.value.some((v) => v.count > 0))
const visitChartRef = ref<HTMLElement>()
let visitChart: echarts.ECharts | null = null

const summaries = ref([
  { value: '-', label: '总访问量', change: '-' },
  { value: '-', label: '累计注册', change: '-' },
  { value: '-', label: '表单提交', change: '-' },
  { value: '-', label: '成交转化', change: '-' },
])

const todos = ref<Array<{ label: string; count: number; level: string; path: string }>>([])
const products = ref<Array<{ name: string; price: number | string; sales: number }>>([])

const displayProducts = computed(() => {
  const list = [...products.value]
  while (list.length < 3) {
    list.push({ name: '', price: '', sales: 0 })
  }
  return list
})

const versions = ref<Array<{ id?: number | null; name: string; status: string; version: string; time: string }>>([])

const RECENT_KEY = 'workbench_recent_visits'
const RECENT_MAX = 6
const recentLinks = ref<Array<{ path: string; title: string; time: string; iconComp: string }>>([])

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return
    const arr: Array<{ path: string; title: string; ts: number }> = JSON.parse(raw)
    recentLinks.value = arr.slice(0, RECENT_MAX).map((r) => ({
      path: r.path,
      title: r.title,
      time: formatRelativeTime(r.ts),
      iconComp: guessIcon(r.path),
    }))
  } catch { /* ignore */ }
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  return `${Math.floor(hr / 24)} 天前`
}

function guessIcon(path: string): string {
  if (/page-builder|decoration|shop-decoration/.test(path)) return 'Brush'
  if (/content|article/.test(path)) return 'Reading'
  if (/form/.test(path)) return 'Document'
  if (/member/.test(path)) return 'GoldMedal'
  if (/product|commerce/.test(path)) return 'ShoppingCart'
  if (/marketing|coupon/.test(path)) return 'Present'
  if (/order/.test(path)) return 'Wallet'
  if (/user/.test(path)) return 'User'
  return 'Menu'
}

function recordVisit(path: string, title: string) {
  if (!path || path === '/' || path.startsWith('/dashboard')) return
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const arr: Array<{ path: string; title: string; ts: number }> = raw ? JSON.parse(raw) : []
    const filtered = arr.filter((r) => r.path !== path)
    filtered.unshift({ path, title: title || path, ts: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, RECENT_MAX)))
  } catch { /* ignore */ }
}

function clearRecent() {
  localStorage.removeItem(RECENT_KEY)
  recentLinks.value = []
}

watch(
  () => route.fullPath,
  () => {
    const title = (route.meta?.title as string) || route.name?.toString() || route.path
    recordVisit(route.fullPath, title)
    loadRecent()
  },
)

function renderVisitChart() {
  if (!visitChartRef.value || !hasVisitData.value) return
  if (!visitChart) {
    visitChart = echarts.init(visitChartRef.value)
  }
  // echarts 无法直接用 CSS var()，从 :root 读取当前 token 实际值，保持与全站配色联动
  const rootStyle = getComputedStyle(document.documentElement)
  const tokenColor = (name: string, fallback: string) => rootStyle.getPropertyValue(name)?.trim() || fallback
  const brand = tokenColor('--brand', '#1769ff')
  const border = tokenColor('--border', '#e5eaf3')
  const textSecondary = tokenColor('--text-secondary', '#64748b')
  const textMuted = tokenColor('--text-muted', '#94a3b8')

  visitChart.setOption({
    grid: { left: 36, right: 12, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: visits.value.map((v) => v.day),
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: textSecondary },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: border } },
      axisLabel: { color: textMuted },
    },
    series: [{
      type: 'bar',
      data: visits.value.map((v) => v.count),
      barWidth: 18,
      itemStyle: {
        color: brand,
        borderRadius: [6, 6, 0, 0],
      },
    }],
  })
  visitChart.resize()
}

function handleResize() {
  visitChart?.resize()
}

async function loadDashboard() {
  dashboardLoading.value = true
  try {
    const res: any = await getDashboard()
    const data = res.data || {}

    if (data.todayVisits !== undefined) {
      metrics.value[0] = { title: '今日访问', value: String(data.todayVisits ?? 0), note: data.todayVisitsChange || '较昨日', iconComp: 'DataLine', color: 'var(--brand)', bg: 'var(--brand-soft)', up: true }
    }
    if (data.newUsers !== undefined) {
      metrics.value[1] = { title: '新增用户', value: String(data.newUsers ?? 0), note: data.newUsersChange || '转化率', iconComp: 'User', color: 'var(--success)', bg: 'var(--success-soft)', up: true }
    }
    if (data.formSubmissions !== undefined) {
      metrics.value[2] = { title: '表单提交', value: String(data.formSubmissions ?? 0), note: `待审核 ${data.pendingForms ?? 0} 条`, iconComp: 'Document', color: 'var(--warning)', bg: 'var(--warning-soft)', up: false }
    }
    if (data.orderAmount !== undefined) {
      metrics.value[3] = { title: '订单金额', value: `¥${data.orderAmount ?? 0}`, note: `待发货 ${data.pendingShipments ?? 0} 单`, iconComp: 'Wallet', color: 'var(--brand)', bg: 'var(--brand-soft)', up: false }
    }

    if (Array.isArray(data.visitTrend) && data.visitTrend.length > 0) {
      visits.value = data.visitTrend.map((v: any, i: number) => ({
        day: v.day || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
        count: Number(v.count || 0),
      }))
    }

    if (data.totalVisits !== undefined) {
      summaries.value[0] = { value: String(data.totalVisits), label: '总访问量', change: data.totalVisitsChange || '-' }
    }
    if (data.totalUsers !== undefined) {
      summaries.value[1] = { value: String(data.totalUsers), label: '累计注册', change: data.totalUsersChange || '-' }
    }
    if (data.totalForms !== undefined) {
      summaries.value[2] = { value: String(data.totalForms), label: '表单提交', change: data.totalFormsChange || '-' }
    }
    if (data.conversionRate !== undefined) {
      summaries.value[3] = { value: String(data.conversionRate), label: '成交转化', change: data.conversionRateChange || '-' }
    }

    if (Array.isArray(data.productRanking) && data.productRanking.length > 0) {
      products.value = data.productRanking.slice(0, 3).map((p: any) => ({
        name: p.name || p.productName || '-',
        price: p.price || 0,
        sales: p.sales || p.saleCount || 0,
      }))
    }

    if (Array.isArray(data.todos)) {
      todos.value = data.todos.map((t: any) => ({
        label: t.label,
        count: Number(t.count ?? 0),
        level: t.level || 'blue',
        path: t.path || '',
      }))
    }

    if (Array.isArray(data.versions)) {
      versions.value = data.versions.map((v: any) => ({
        id: v.id || v.pageId || null,
        name: v.name || '-',
        status: v.status || '草稿',
        version: v.version || 'v1',
        time: v.time || '',
      }))
    }

    await nextTick()
    renderVisitChart()
  } catch {
    // keep defaults
  } finally {
    dashboardLoading.value = false
  }
}

onMounted(() => {
  resolveHomePageId()
  loadDashboard()
  loadRecent()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  visitChart?.dispose()
  visitChart = null
})
</script>

<style lang="scss" scoped>
.workbench {
  color: var(--text);
}

.metrics,
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.panel,
.metric-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.metric-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
}

.metric-title,
.metric-note {
  color: var(--text-secondary);
  font-size: var(--font-caption);
}

.metric-value {
  margin: var(--space-1) 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.metric-note.green {
  color: var(--success);
}

.content-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.lower-grid {
  grid-template-columns: 1fr 1.2fr;
}

.panel {
  padding: var(--space-4) 18px 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);

  h2 {
    margin: 0;
    font-size: var(--font-h2);
    font-weight: 700;
  }

  span {
    color: var(--text-muted);
    font-size: var(--font-caption);
  }
}

.chart-wrap {
  min-height: 200px;
}

.chart-box {
  width: 100%;
  height: 200px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 16px;

  div {
    padding: var(--space-3);
    border-radius: var(--radius);
    background: var(--brand-soft);
  }

  strong {
    display: block;
    font-size: var(--font-h3);
  }

  span {
    display: block;
    margin-top: var(--space-1);
    color: var(--text-secondary);
    font-size: var(--font-caption);
  }

  em {
    display: block;
    margin-top: var(--space-1);
    color: var(--text-muted);
    font-style: normal;
    font-size: var(--font-caption);
  }
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.todo-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius);
  background: var(--brand-soft);

  b {
    min-width: 24px;
    text-align: center;
    font-size: var(--font-h3);

    &.orange { color: var(--warning); }
    &.blue { color: var(--brand); }
    &.red { color: var(--danger); }
  }
}

.quick-panel {
  margin-bottom: var(--space-4);
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--brand);
    box-shadow: var(--shadow-sm);
  }

  strong {
    font-size: var(--font-body);
  }

  small {
    color: var(--text-muted);
  }
}

.quick-icon {
  color: var(--brand);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.rank-item {
  display: grid;
  grid-template-columns: 28px 36px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius);

  &.rank-empty {
    opacity: 0.55;
  }

  .rank-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--brand-soft);
    color: var(--brand);
    font-size: var(--font-caption);
    font-weight: 700;
  }

  .product-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius);
    display: grid;
    place-items: center;
    background: var(--info-soft);
    color: var(--text-secondary);
  }

  strong {
    display: block;
    font-size: var(--font-body);
  }

  small {
    color: var(--text-muted);
  }

  .muted {
    color: var(--text-muted);
  }
}

.version-table {
  width: 100%;
}

@media (max-width: 1100px) {
  .metrics,
  .quick-grid,
  .content-grid,
  .lower-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .metrics,
  .quick-grid,
  .content-grid,
  .lower-grid,
  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
