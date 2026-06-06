<template>
  <div class="ai-recommendation-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="queryParams" @submit.prevent="fetchList">
        <el-form-item label="推荐类型">
          <el-select v-model="queryParams.itemType" placeholder="全部" clearable style="width: 120px">
            <el-option label="商品" value="product" />
            <el-option label="内容" value="content" />
            <el-option label="活动" value="activity" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否点击">
          <el-select v-model="queryParams.isClicked" placeholder="全部" clearable style="width: 120px">
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchList">查询</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>推荐效果日志</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="logList" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="conversationId" label="对话ID" width="100" align="center" />
        <el-table-column prop="userId" label="用户ID" width="90" align="center" />
        <el-table-column prop="itemType" label="推荐类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.itemType === 'product' ? 'success' : row.itemType === 'content' ? 'warning' : 'info'">
              {{ row.itemType === 'product' ? '商品' : row.itemType === 'content' ? '内容' : '活动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="itemId" label="推荐项ID" width="100" align="center" />
        <el-table-column prop="position" label="推荐位" width="80" align="center" />
        <el-table-column label="是否点击" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isClicked ? 'success' : 'info'" size="small">
              {{ row.isClicked ? '已点击' : '未点击' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="推荐时间" width="170" align="center" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAiRecommendationLogs } from '@/api/ai'
import type { AiRecommendationLog } from '@/types/ai'

const logList = ref<AiRecommendationLog[]>([])
const total = ref(0)
const loading = ref(false)
const dateRange = ref<string[]>([])

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  itemType: undefined as string | undefined,
  isClicked: undefined as boolean | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
})

async function fetchList() {
  loading.value = true
  try {
    if (dateRange.value?.length === 2) {
      queryParams.startDate = dateRange.value[0]
      queryParams.endDate = dateRange.value[1]
    }
    const res = await getAiRecommendationLogs(queryParams)
    logList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    logList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleReset() {
  queryParams.itemType = undefined
  queryParams.isClicked = undefined
  queryParams.page = 1
  dateRange.value = []
  queryParams.startDate = undefined
  queryParams.endDate = undefined
  fetchList()
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.ai-recommendation-container {
  .search-card {
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
