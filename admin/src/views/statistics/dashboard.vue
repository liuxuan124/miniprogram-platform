<template>
  <div class="dashboard-container">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409eff"><el-icon :size="28"><ShoppingCart /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dashboard.todayOrderCount || 0 }}</div>
            <div class="stat-label">今日订单</div>
            <div class="stat-change" :class="dashboard.orderCountChange >= 0 ? 'up' : 'down'">
              {{ dashboard.orderCountChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.orderCountChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #67c23a"><el-icon :size="28"><Money /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.todayOrderAmount || 0).toFixed(2) }}</div>
            <div class="stat-label">今日金额</div>
            <div class="stat-change" :class="dashboard.orderAmountChange >= 0 ? 'up' : 'down'">
              {{ dashboard.orderAmountChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.orderAmountChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #e6a23c"><el-icon :size="28"><User /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dashboard.todayNewUsers || 0 }}</div>
            <div class="stat-label">今日新用户</div>
            <div class="stat-change" :class="dashboard.newUserChange >= 0 ? 'up' : 'down'">
              {{ dashboard.newUserChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.newUserChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #f56c6c"><el-icon :size="28"><View /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dashboard.todayPageViews || 0 }}</div>
            <div class="stat-label">今日浏览量</div>
            <div class="stat-change" :class="dashboard.pageViewChange >= 0 ? 'up' : 'down'">
              {{ dashboard.pageViewChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.pageViewChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 销售趋势 -->
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>销售趋势</span>
              <el-radio-group v-model="trendGranularity" size="small" @change="fetchSalesTrend">
                <el-radio-button label="day">日</el-radio-button>
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div v-if="salesTrend.length === 0" class="empty-chart">暂无数据</div>
            <table v-else class="trend-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>订单数</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in salesTrend" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ item.orderCount }}</td>
                  <td>¥{{ (item.orderAmount || 0).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-card>
      </el-col>

      <!-- 商品排行 -->
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>商品排行</span>
              <el-select v-model="rankingType" size="small" style="width: 90px" @change="fetchProductRanking">
                <el-option label="销量" value="sales" />
                <el-option label="金额" value="amount" />
              </el-select>
            </div>
          </template>
          <div class="ranking-list">
            <div v-if="productRanking.length === 0" class="empty-chart">暂无数据</div>
            <div v-for="(item, index) in productRanking" :key="item.productId" class="ranking-item">
              <span class="ranking-index" :class="{ top: index < 3 }">{{ index + 1 }}</span>
              <span class="ranking-name">{{ item.productName }}</span>
              <span class="ranking-value">
                {{ rankingType === 'sales' ? `${item.salesCount}件` : `¥${(item.salesAmount || 0).toFixed(0)}` }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <!-- 用户增长 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>用户增长趋势</span>
          </template>
          <div class="chart-container">
            <div v-if="userGrowth.length === 0" class="empty-chart">暂无数据</div>
            <table v-else class="trend-table">
              <thead>
                <tr><th>日期</th><th>新增用户</th><th>累计用户</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in userGrowth" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ item.newUsers }}</td>
                  <td>{{ item.totalUsers }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-card>
      </el-col>

      <!-- 页面访问排行 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>页面访问排行</span>
          </template>
          <div class="chart-container">
            <div v-if="pageAccess.length === 0" class="empty-chart">暂无数据</div>
            <div v-for="(item, index) in pageAccess" :key="item.pagePath" class="ranking-item">
              <span class="ranking-index" :class="{ top: index < 3 }">{{ index + 1 }}</span>
              <span class="ranking-name">{{ item.pagePath }}</span>
              <span class="ranking-value">{{ item.visitCount }}次</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShoppingCart, Money, User, View } from '@element-plus/icons-vue'
import { getDashboard, getSalesTrend, getProductRanking, getUserGrowth, getPageAccess } from '@/api/statistics'
import type { DashboardData, SalesTrendItem, ProductRankingItem, UserGrowthItem, PageAccessItem } from '@/types/statistics'

const dashboard = ref<DashboardData>({} as DashboardData)
const salesTrend = ref<SalesTrendItem[]>([])
const productRanking = ref<ProductRankingItem[]>([])
const userGrowth = ref<UserGrowthItem[]>([])
const pageAccess = ref<PageAccessItem[]>([])
const trendGranularity = ref('day')
const rankingType = ref('sales')

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  }
}

async function fetchDashboard() {
  try {
    const res = await getDashboard()
    dashboard.value = res.data || ({} as DashboardData)
  } catch { /* ignore */ }
}

async function fetchSalesTrend() {
  try {
    const range = getDateRange(30)
    const res = await getSalesTrend({
      start_date: range.start_date,
      end_date: range.end_date,
      granularity: trendGranularity.value,
    })
    salesTrend.value = res.data || []
  } catch { salesTrend.value = [] }
}

async function fetchProductRanking() {
  try {
    const res = await getProductRanking(rankingType.value, 10)
    productRanking.value = res.data || []
  } catch { productRanking.value = [] }
}

async function fetchUserGrowth() {
  try {
    const range = getDateRange(30)
    const res = await getUserGrowth(range.start_date, range.end_date)
    userGrowth.value = res.data || []
  } catch { userGrowth.value = [] }
}

async function fetchPageAccess() {
  try {
    const range = getDateRange(7)
    const res = await getPageAccess(range.start_date, range.end_date)
    pageAccess.value = res.data || []
  } catch { pageAccess.value = [] }
}

onMounted(() => {
  fetchDashboard()
  fetchSalesTrend()
  fetchProductRanking()
  fetchUserGrowth()
  fetchPageAccess()
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  .stat-cards {
    margin-bottom: 16px;
  }

  .stat-card {
    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }

    .stat-info {
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #303133;
      }
      .stat-label {
        font-size: 13px;
        color: #909399;
        margin-top: 2px;
      }
      .stat-change {
        font-size: 12px;
        margin-top: 2px;
        &.up { color: #67c23a; }
        &.down { color: #f56c6c; }
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chart-container {
    min-height: 200px;
  }

  .empty-chart {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #c0c4cc;
    font-size: 14px;
  }

  .trend-table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #ebeef5;
      font-size: 13px;
    }
    th {
      color: #909399;
      font-weight: 500;
    }
  }

  .ranking-list {
    .ranking-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;

      .ranking-index {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #909399;
        background: #f4f4f5;
        margin-right: 10px;
        flex-shrink: 0;

        &.top {
          background: #409eff;
          color: #fff;
        }
      }

      .ranking-name {
        flex: 1;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ranking-value {
        font-size: 13px;
        color: #409eff;
        font-weight: 500;
        margin-left: 8px;
      }
    }
  }
}
</style>
