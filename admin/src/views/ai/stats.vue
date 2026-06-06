<template>
  <div class="ai-stats-container">
    <!-- 统计概览卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__icon stat-card__icon--primary">
            <el-icon :size="28"><ChatDotRound /></el-icon>
          </div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.total_conversations }}</div>
            <div class="stat-card__label">对话总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__icon stat-card__icon--success">
            <el-icon :size="28"><Message /></el-icon>
          </div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.total_messages }}</div>
            <div class="stat-card__label">消息总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__icon stat-card__icon--warning">
            <el-icon :size="28"><Promotion /></el-icon>
          </div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.total_recommendations }}</div>
            <div class="stat-card__label">推荐总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__icon stat-card__icon--danger">
            <el-icon :size="28"><TrendCharts /></el-icon>
          </div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ formatPercent(stats.adoption_rate) }}</div>
            <div class="stat-card__label">推荐采纳率</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 + 推荐类型分布 -->
    <el-row :gutter="16" class="stats-charts">
      <el-col :span="14">
        <el-card shadow="hover">
          <template #header>
            <span>每日对话趋势</span>
          </template>
          <div class="chart-wrapper">
            <el-table :data="stats.daily_conversations" border stripe size="small" max-height="320">
              <el-table-column prop="date" label="日期" width="120" align="center" />
              <el-table-column prop="conversations" label="对话数" width="90" align="center" />
              <el-table-column prop="messages" label="消息数" width="90" align="center" />
              <el-table-column prop="recommendations" label="推荐数" width="90" align="center" />
            </el-table>
          </div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="hover">
          <template #header>
            <span>推荐类型分布</span>
          </template>
          <div class="chart-wrapper">
            <el-table :data="stats.recommendation_by_type" border stripe size="small" max-height="320">
              <el-table-column prop="type" label="类型" min-width="100">
                <template #default="{ row }">
                  {{ RecommendationTypeLabels[row.type as RecommendationType] || row.type }}
                </template>
              </el-table-column>
              <el-table-column prop="count" label="推荐次数" width="90" align="center" />
              <el-table-column prop="adoption_count" label="采纳次数" width="90" align="center" />
              <el-table-column prop="adoption_rate" label="采纳率" width="90" align="center">
                <template #default="{ row }">
                  {{ formatPercent(row.adoption_rate) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 活跃用户排行 -->
    <el-card shadow="hover" class="stats-top-users">
      <template #header>
        <span>活跃用户 TOP 10</span>
      </template>
      <el-table :data="stats.top_users" border stripe>
        <el-table-column type="index" label="排名" width="70" align="center" />
        <el-table-column label="用户" min-width="160">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28" :src="row.user_avatar">
                {{ row.user_nickname?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user_nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="conversation_count" label="对话数" width="100" align="center" />
        <el-table-column prop="message_count" label="消息数" width="100" align="center" />
      </el-table>
    </el-card>

    <!-- 推荐日志列表 -->
    <el-card shadow="hover" class="stats-logs">
      <template #header>
        <div class="card-header">
          <span>推荐日志</span>
        </div>
      </template>

      <!-- 筛选区 -->
      <el-form :inline="true" :model="logQueryParams" class="filter-form" @submit.prevent="fetchLogs">
        <el-form-item label="关键词">
          <el-input v-model="logQueryParams.keyword" placeholder="搜索推荐内容" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="推荐类型">
          <el-select v-model="logQueryParams.recommendation_type" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in RecommendationTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="是否采纳">
          <el-select v-model="logQueryParams.is_adopted" placeholder="全部" clearable style="width: 120px">
            <el-option label="已采纳" :value="true" />
            <el-option label="未采纳" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="logDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchLogs">查询</el-button>
          <el-button icon="Refresh" @click="handleLogReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table
        v-loading="logLoading"
        :data="logList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="用户" min-width="130">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="24" :src="row.user_avatar">
                {{ row.user_nickname?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user_nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="miniapp_name" label="小程序" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.miniapp_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="recommendation_type" label="推荐类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="RecommendationTypeTagType[row.recommendation_type as RecommendationType]" size="small">
              {{ RecommendationTypeLabels[row.recommendation_type as RecommendationType] || row.recommendation_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="input_context" label="输入上下文" min-width="180" show-overflow-tooltip />
        <el-table-column prop="recommendation_content" label="推荐内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="is_adopted" label="是否采纳" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_adopted ? 'success' : 'info'" size="small">
              {{ row.is_adopted ? '已采纳' : '未采纳' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="feedback" label="用户反馈" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.feedback || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="170" align="center" />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="logQueryParams.page"
          v-model:page-size="logQueryParams.page_size"
          :total="logTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ChatDotRound, Message, Promotion, TrendCharts } from '@element-plus/icons-vue'
import { getAiStats, getAiRecommendationLogs } from '@/api/ai'
import type { AiStats, AiRecommendationLog, AiRecommendationLogParams } from '@/types/ai'
import { RecommendationType, RecommendationTypeLabels, RecommendationTypeTagType } from '@/types/ai'

/** 统计概览 */
const stats = ref<AiStats>({
  total_conversations: 0,
  total_messages: 0,
  total_recommendations: 0,
  adoption_rate: 0,
  avg_messages_per_conversation: 0,
  daily_conversations: [],
  recommendation_by_type: [],
  top_users: [],
})
const statsLoading = ref(false)

async function fetchStats() {
  statsLoading.value = true
  try {
    const res = await getAiStats()
    if (res.data) {
      stats.value = res.data
    }
  } catch {
    // keep default empty values
  } finally {
    statsLoading.value = false
  }
}

/** 格式化百分比 */
function formatPercent(rate: number): string {
  if (rate === undefined || rate === null) return '-'
  return (rate * 100).toFixed(1) + '%'
}

/** 推荐日志列表 */
const logList = ref<AiRecommendationLog[]>([])
const logTotal = ref(0)
const logLoading = ref(false)
const logDateRange = ref<string[]>([])

const logQueryParams = reactive<AiRecommendationLogParams>({
  page: 1,
  page_size: 20,
  keyword: '',
  recommendation_type: undefined,
  is_adopted: undefined,
  start_date: undefined,
  end_date: undefined,
})

async function fetchLogs() {
  logLoading.value = true
  try {
    if (logDateRange.value && logDateRange.value.length === 2) {
      logQueryParams.start_date = logDateRange.value[0]
      logQueryParams.end_date = logDateRange.value[1]
    } else {
      logQueryParams.start_date = undefined
      logQueryParams.end_date = undefined
    }
    const res = await getAiRecommendationLogs(logQueryParams)
    logList.value = res.data?.list || []
    logTotal.value = res.data?.total || 0
  } catch {
    logList.value = []
    logTotal.value = 0
  } finally {
    logLoading.value = false
  }
}

/** 重置日志筛选 */
function handleLogReset() {
  logQueryParams.keyword = ''
  logQueryParams.recommendation_type = undefined
  logQueryParams.is_adopted = undefined
  logQueryParams.page = 1
  logQueryParams.page_size = 20
  logDateRange.value = []
  logQueryParams.start_date = undefined
  logQueryParams.end_date = undefined
  fetchLogs()
}

onMounted(() => {
  fetchStats()
  fetchLogs()
})
</script>

<style lang="scss" scoped>
.ai-stats-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-form {
    margin-bottom: 16px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .stats-cards {
    margin-bottom: 16px;
  }

  .stat-card {
    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    &__icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &--primary {
        background-color: #ecf5ff;
        color: #409eff;
      }

      &--success {
        background-color: #f0f9eb;
        color: #67c23a;
      }

      &--warning {
        background-color: #fdf6ec;
        color: #e6a23c;
      }

      &--danger {
        background-color: #fef0f0;
        color: #f56c6c;
      }
    }

    &__info {
      flex: 1;
    }

    &__value {
      font-size: 24px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
    }

    &__label {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }

  .stats-charts {
    margin-bottom: 16px;
  }

  .chart-wrapper {
    min-height: 200px;
  }

  .stats-top-users {
    margin-bottom: 16px;
  }
}
</style>
