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
        <div class="metric-icon" :style="{ color: item.color, background: item.bg }">{{ item.icon }}</div>
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
        <h2>快捷功能入口</h2>
      </div>
      <div class="quick-grid">
        <button v-for="item in quickLinks" :key="item.title" class="quick-card" @click="router.push(item.path)">
          <span class="quick-icon">{{ item.icon }}</span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </button>
      </div>
    </section>

    <section class="content-grid lower-grid">
      <div class="panel">
        <div class="panel-head">
          <h2>销售排行 TOP 3</h2>
          <el-button link type="primary" @click="router.push('/commerce/product')">查看全部商品</el-button>
        </div>
        <div class="rank-list">
          <div v-for="(item, index) in products" :key="item.name" class="rank-item">
            <span class="rank-num">{{ index + 1 }}</span>
            <span class="product-icon">{{ item.icon }}</span>
            <div>
              <strong>{{ item.name }}</strong>
              <small>¥{{ item.price }}</small>
            </div>
            <b>{{ item.sales }}件</b>
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getDashboard } from '@/api/statistics'

const router = useRouter()
const userStore = useUserStore()

const currentDate = computed(() => new Date().toLocaleDateString('zh-CN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}))

const demoSteps = ['进入后台', '页面管理', '进入装修器', '添加活动入口', '配置属性', '发布上线', '小程序端预览']

const dashboardLoading = ref(false)
const metrics = ref([
  { title: '今日访问', value: '-', note: '加载中...', icon: '📊', color: '#1769ff', bg: '#eaf1ff', up: true },
  { title: '新增用户', value: '-', note: '加载中...', icon: '👤', color: '#0faa6e', bg: '#e8faf3', up: true },
  { title: '表单提交', value: '-', note: '加载中...', icon: '📋', color: '#f59e0b', bg: '#fff8e6', up: false },
  { title: '订单金额', value: '-', note: '加载中...', icon: '💰', color: '#7c3aed', bg: '#f3eeff', up: false },
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

const todos = [
  { label: '待发布草稿页面', count: 3, level: 'orange', path: '/page-builder/list' },
  { label: '待审核表单提交', count: 9, level: 'red', path: '/form/submissions' },
  { label: '待发货订单记录', count: 16, level: 'orange', path: '/order/list' },
  { label: '待确认服务预约', count: 5, level: 'blue', path: '/appointment/list' },
]

const quickLinks = [
  { title: '装修首页', desc: '可视化配置首页组件', path: '/page-builder/editor/1', icon: '🎨' },
  { title: '内容发布', desc: '发布文章、图文、视频', path: '/content/article', icon: '📝' },
  { title: '表单构建', desc: '自定义报名/咨询表单', path: '/form/template', icon: '📋' },
  { title: '会员体系', desc: '配置等级、积分、权益', path: '/member/list', icon: '👑' },
  { title: '商品上架', desc: '管理实物/数字/服务商品', path: '/commerce/product', icon: '🛍️' },
  { title: '营销工具', desc: '配置优惠券、签到活动', path: '/marketing/coupon', icon: '🎁' },
]

const products = ref([
  { name: '品牌文创礼盒', price: 199, sales: 0, icon: '🎁' },
  { name: '会员数字权益卡', price: 99, sales: 0, icon: '💳' },
  { name: '品牌定制马克杯', price: 89, sales: 0, icon: '☕' },
])

const versions = [
  { name: '首页', status: '已发布', version: 'v18', time: '2026-05-04 11:30' },
  { name: '五一活动专题', status: '草稿', version: 'v2', time: '2026-05-04 10:15' },
  { name: '品牌故事', status: '已发布', version: 'v5', time: '2026-04-30 16:40' },
]

async function loadDashboard() {
  dashboardLoading.value = true
  try {
    const res: any = await getDashboard()
    const data = res.data || {}

    // 更新指标卡片
    if (data.todayVisits !== undefined) {
      metrics.value[0] = { title: '今日访问', value: String(data.todayVisits ?? 0), note: data.todayVisitsChange || '较昨日', icon: '📊', color: '#1769ff', bg: '#eaf1ff', up: true }
    }
    if (data.newUsers !== undefined) {
      metrics.value[1] = { title: '新增用户', value: String(data.newUsers ?? 0), note: data.newUsersChange || '转化率', icon: '👤', color: '#0faa6e', bg: '#e8faf3', up: true }
    }
    if (data.formSubmissions !== undefined) {
      metrics.value[2] = { title: '表单提交', value: String(data.formSubmissions ?? 0), note: `待审核 ${data.pendingForms ?? 0} 条`, icon: '📋', color: '#f59e0b', bg: '#fff8e6', up: false }
    }
    if (data.orderAmount !== undefined) {
      metrics.value[3] = { title: '订单金额', value: `¥${data.orderAmount ?? 0}`, note: `待发货 ${data.pendingShipments ?? 0} 单`, icon: '💰', color: '#7c3aed', bg: '#f3eeff', up: false }
    }

    // 更新访问趋势
    if (Array.isArray(data.visitTrend) && data.visitTrend.length > 0) {
      const maxVisit = Math.max(...data.visitTrend.map((v: any) => v.count || 0), 1)
      visits.value = data.visitTrend.map((v: any, i: number) => ({
        day: v.day || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
        height: Math.max(5, Math.round(((v.count || 0) / maxVisit) * 100)),
      }))
    }

    // 更新汇总
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

    // 更新商品排行
    if (Array.isArray(data.productRanking) && data.productRanking.length > 0) {
      products.value = data.productRanking.slice(0, 3).map((p: any) => ({
        name: p.name || p.productName || '-',
        price: p.price || 0,
        sales: p.sales || p.saleCount || 0,
        icon: '🛍️',
      }))
    }
  } catch {
    // 保留默认值
  } finally {
    dashboardLoading.value = false
  }
}

onMounted(loadDashboard)
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
