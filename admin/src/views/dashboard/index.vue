<template>
  <div class="workbench">
    <section class="page-head">
      <div>
        <h1>工作台</h1>
        <p>欢迎回来，{{ userStore.userInfo?.nickname || '管理员' }} - {{ currentDate }}</p>
      </div>
      <el-button type="primary" size="large" @click="router.push('/page-builder/editor/1')">
        <el-icon><Brush /></el-icon>
        进入页面装修器
      </el-button>
    </section>

    <section class="demo-path">
      <div class="demo-title">演示路径：页面管理 → 装修器 → 添加活动入口 → 发布 → 小程序预览</div>
      <div class="step-row">
        <template v-for="(step, index) in demoSteps" :key="step">
          <button class="step" :class="{ done: index < 2, current: index === 2 }">
            {{ step }}
          </button>
          <span v-if="index < demoSteps.length - 1" class="arrow">→</span>
        </template>
      </div>
      <div class="demo-actions">
        <el-button type="primary" @click="router.push('/page-builder/list')">开始演示</el-button>
        <el-button @click="router.push('/page-builder/editor/1')">直接装修首页</el-button>
        <el-button @click="router.push('/page-builder/preview/1')">实时预览</el-button>
      </div>
    </section>

    <section class="metrics">
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
        <div class="bars">
          <div v-for="bar in visits" :key="bar.day" class="bar-item">
            <div class="bar-track">
              <div class="bar-fill" :style="{ height: bar.height + '%' }"></div>
            </div>
            <span>{{ bar.day }}</span>
          </div>
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
          <el-button link type="primary">处理中心</el-button>
        </div>
        <div class="todo-list">
          <div v-for="item in todos" :key="item.label" class="todo-item">
            <span>{{ item.label }}</span>
            <b :class="item.level">{{ item.count }}</b>
            <el-button link type="primary" @click="router.push(item.path)">去处理</el-button>
          </div>
        </div>
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
      <div v-else class="quick-empty">
        <el-icon :size="32" color="#c0c4cc"><Clock /></el-icon>
        <p>暂无访问记录，可从左侧菜单开始操作</p>
      </div>
    </section>

    <section class="content-grid lower-grid">
      <div class="panel">
        <div class="panel-head">
          <h2>销售排行 TOP 3</h2>
          <el-button link type="primary" @click="router.push('/commerce/product')">查看全部商品</el-button>
        </div>
        <div class="rank-list">
          <div v-for="(item, index) in displayProducts" :key="item.name || ('empty-' + index)" class="rank-item" :class="{ 'rank-empty': !item.name }">
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
            <template #default>
              <el-button link type="primary" @click="router.push('/page-builder/editor/1')">进入装修</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getDashboard } from '@/api/statistics'
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
  Menu as MenuIcon,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 图标组件映射（供模板动态渲染）
const iconMap: Record<string, any> = {
  DataLine,
  User,
  Document,
  Wallet,
  Goods,
  Brush,
  Reading,
  Tickets,
  GoldMedal,
  ShoppingCart,
  Present,
}

const currentDate = computed(() => new Date().toLocaleDateString('zh-CN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}))

const demoSteps = ['进入后台', '页面管理', '进入装修器', '添加活动入口', '配置属性', '发布上线', '小程序端预览']

const dashboardLoading = ref(false)
const metrics = ref([
  { title: '今日访问', value: '-', note: '加载中...', iconComp: 'DataLine', color: '#1769ff', bg: '#eaf1ff', up: true },
  { title: '新增用户', value: '-', note: '加载中...', iconComp: 'User', color: '#0faa6e', bg: '#e8faf3', up: true },
  { title: '表单提交', value: '-', note: '加载中...', iconComp: 'Document', color: '#f59e0b', bg: '#fff8e6', up: false },
  { title: '订单金额', value: '-', note: '加载中...', iconComp: 'Wallet', color: '#7c3aed', bg: '#f3eeff', up: false },
])

const visits = ref([
  { day: '周一', height: 0 },
  { day: '周二', height: 0 },
  { day: '周三', height: 0 },
  { day: '周四', height: 0 },
  { day: '周五', height: 0 },
  { day: '周六', height: 0 },
  { day: '周日', height: 0 },
])

const summaries = ref([
  { value: '-', label: '总访问量', change: '-' },
  { value: '-', label: '累计注册', change: '-' },
  { value: '-', label: '表单提交', change: '-' },
  { value: '-', label: '成交转化', change: '-' },
])

const todos = ref<Array<{ label: string; count: number; level: string; path: string }>>([])

const products = ref<Array<{ name: string; price: number | string; sales: number }>>([])

// P1-3：销售排行不足 3 个时补占位，保持布局稳定
const displayProducts = computed(() => {
  const list = [...products.value]
  while (list.length < 3) {
    list.push({ name: '', price: '', sales: 0 })
  }
  return list
})

const versions = ref<Array<{ name: string; status: string; version: string; time: string }>>([])

// P2-5：最近访问 —— 记录用户访问的页面，去重 + 按时间倒序
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
  if (/member/.test(path)) return 'Crown'
  if (/product|commerce/.test(path)) return 'ShoppingCart'
  if (/marketing|coupon/.test(path)) return 'Present'
  if (/order/.test(path)) return 'Wallet'
  if (/user/.test(path)) return 'User'
  return 'MenuIcon'
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

// 监听路由变化，记录访问
watch(
  () => route.fullPath,
  () => {
    const title = (route.meta?.title as string) || route.name?.toString() || route.path
    recordVisit(route.fullPath, title)
    loadRecent()
  },
)

async function loadDashboard() {
  dashboardLoading.value = true
  try {
    const res: any = await getDashboard()
    const data = res.data || {}

    if (data.todayVisits !== undefined) {
      metrics.value[0] = { title: '今日访问', value: String(data.todayVisits ?? 0), note: data.todayVisitsChange || '较昨日', iconComp: 'DataLine', color: '#1769ff', bg: '#eaf1ff', up: true }
    }
    if (data.newUsers !== undefined) {
      metrics.value[1] = { title: '新增用户', value: String(data.newUsers ?? 0), note: data.newUsersChange || '转化率', iconComp: 'User', color: '#0faa6e', bg: '#e8faf3', up: true }
    }
    if (data.formSubmissions !== undefined) {
      metrics.value[2] = { title: '表单提交', value: String(data.formSubmissions ?? 0), note: `待审核 ${data.pendingForms ?? 0} 条`, iconComp: 'Document', color: '#f59e0b', bg: '#fff8e6', up: false }
    }
    if (data.orderAmount !== undefined) {
      metrics.value[3] = { title: '订单金额', value: `¥${data.orderAmount ?? 0}`, note: `待发货 ${data.pendingShipments ?? 0} 单`, iconComp: 'Wallet', color: '#7c3aed', bg: '#f3eeff', up: false }
    }

    if (Array.isArray(data.visitTrend) && data.visitTrend.length > 0) {
      const maxVisit = Math.max(...data.visitTrend.map((v: any) => v.count || 0), 1)
      visits.value = data.visitTrend.map((v: any, i: number) => ({
        day: v.day || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
        height: Math.max(5, Math.round(((v.count || 0) / maxVisit) * 100)),
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
        name: v.name || '-',
        status: v.status || '草稿',
        version: v.version || 'v1',
        time: v.time || '',
      }))
    }
  } catch {
    // 保留默认值
  } finally {
    dashboardLoading.value = false
  }
}

onMounted(() => {
  loadDashboard()
  loadRecent()
})
</script>

<style lang="scss" scoped>
.workbench {
  color: #0f172a;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 4px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}

.demo-path,
.panel,
.metric-card {
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.demo-path {
  padding: 18px 20px;
  margin-bottom: 16px;
}

.demo-title {
  margin-bottom: 14px;
  font-weight: 800;
  color: #1769ff;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.step {
  min-width: 108px;
  height: 38px;
  border: 1px solid #d9e2ef;
  border-radius: 999px;
  color: #475569;
  background: #f8faff;
  font-weight: 700;

  &.done {
    color: #0f8f61;
    border-color: #b7ead2;
    background: #ecfff6;
  }

  &.current {
    color: #fff;
    border-color: #1769ff;
    background: #1769ff;
  }
}

.arrow {
  color: #94a3b8;
}

.demo-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.metrics,
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}

.metric-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.metric-title,
.metric-note {
  color: #64748b;
  font-size: 12px;
}

.metric-value {
  margin: 2px 0;
  font-size: 26px;
  font-weight: 900;
}

.green,
.summary-row em {
  color: #0faa6e;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.8fr);
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 16px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.bars {
  height: 220px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: end;
  gap: 12px;
  padding: 10px 4px 0;
}

.bar-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.bar-track {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: end;
  border-radius: 10px;
  background: #f1f5f9;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  border-radius: 10px 10px 0 0;
  background: linear-gradient(180deg, #19b7ff, #1769ff);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #edf2f7;
  text-align: center;

  strong,
  span,
  em {
    display: block;
    font-style: normal;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.todo-item,
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #edf2f7;

  &:last-child {
    border-bottom: 0;
  }

  span:first-child {
    flex: 1;
  }

  b {
    color: #1769ff;
  }

  .orange {
    color: #f59e0b;
  }

  .red {
    color: #ef4444;
  }
}

.quick-panel {
  margin-bottom: 16px;
}

.quick-card {
  min-height: 118px;
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  padding: 16px;
  background: #f8faff;
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;

  &:hover {
    border-color: #1769ff;
    background: #eaf1ff;
    transform: translateY(-2px);
  }

  span,
  strong,
  small {
    display: block;
  }

  strong {
    margin: 8px 0 4px;
    color: #0f172a;
  }

  small {
    color: #64748b;
  }
}

.quick-icon {
  font-size: 28px;
}

.lower-grid {
  grid-template-columns: minmax(320px, 0.65fr) minmax(0, 1.35fr);
}

.rank-num {
  width: 24px;
  color: #f59e0b;
  font-size: 18px;
  font-weight: 900;
}

.product-icon {
  font-size: 22px;
}

.rank-item {
  div {
    flex: 1;

    strong,
    small {
      display: block;
    }

    small {
      color: #64748b;
    }
  }
}

.rank-empty {
  opacity: 0.55;
}

.muted {
  color: #cbd5e1 !important;
  font-weight: 400 !important;
}

.quick-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;

  p {
    margin: 10px 0 0;
  }
}

.version-table {
  width: 100%;
}

@media (max-width: 1200px) {
  .metrics,
  .quick-grid,
  .content-grid,
  .lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-head,
  .demo-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .metrics,
  .quick-grid,
  .content-grid,
  .lower-grid {
    grid-template-columns: 1fr;
  }
}
</style>
