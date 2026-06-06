<template>
  <div class="operation-logs-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><Document /></el-icon>操作日志</span>
          <el-button icon="Refresh" @click="fetchList">刷新</el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchParams" inline class="search-form">
        <el-form-item label="操作人">
          <el-input
            v-model="searchParams.username"
            placeholder="用户名"
            clearable
            style="width: 140px"
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item label="操作类型">
          <el-select
            v-model="searchParams.action"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="创建" value="create" />
            <el-option label="编辑" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="发布" value="publish" />
            <el-option label="停用" value="disable" />
            <el-option label="审核" value="approve" />
            <el-option label="导出" value="export" />
            <el-option label="登录" value="login" />
            <el-option label="配置" value="config" />
          </el-select>
        </el-form-item>

        <el-form-item label="模块">
          <el-select
            v-model="searchParams.module"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="页面管理" value="page" />
            <el-option label="内容管理" value="content" />
            <el-option label="商品管理" value="product" />
            <el-option label="会员管理" value="member" />
            <el-option label="营销中心" value="marketing" />
            <el-option label="订单管理" value="order" />
            <el-option label="系统设置" value="system" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="searchParams.status"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="成功" value="success" />
            <el-option label="失败" value="fail" />
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
            @change="handleDateChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">查询</el-button>
          <el-button icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="logList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="username" label="操作人" width="110" align="center" />
        <el-table-column prop="module" label="模块" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getModuleTagType(row.module)">{{ getModuleLabel(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="getActionTagType(row.action)"
              effect="plain"
            >
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="操作内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="method" label="请求方法" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="getMethodTagType(row.method)"
              effect="plain"
            >
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP地址" width="130" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small" effect="dark">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.duration > 1000 }">
              {{ row.duration }}ms
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="操作时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="searchParams.page"
          v-model:page-size="searchParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="日志详情"
      width="680px"
      destroy-on-close
    >
      <template v-if="currentLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentLog.id }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentLog.username }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ getModuleLabel(currentLog.module) }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag size="small" :type="getActionTagType(currentLog.action)" effect="plain">
              {{ getActionLabel(currentLog.action) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="请求方法">
            <el-tag size="small" :type="getMethodTagType(currentLog.method)" effect="plain">
              {{ currentLog.method }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'" size="small" effect="dark">
              {{ currentLog.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作内容" :span="2">{{ currentLog.content || '-' }}</el-descriptions-item>
          <el-descriptions-item label="请求路径" :span="2">{{ currentLog.url }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentLog.ip }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ currentLog.duration }}ms</el-descriptions-item>
          <el-descriptions-item label="User-Agent" :span="2">{{ currentLog.userAgent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作时间" :span="2">{{ formatTime(currentLog.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="currentLog.params" class="log-detail-section">
          <h4>请求参数</h4>
          <el-input
            type="textarea"
            :model-value="formatJson(currentLog.params)"
            :rows="6"
            readonly
          />
        </div>

        <div v-if="currentLog.result" class="log-detail-section">
          <h4>响应结果</h4>
          <el-input
            type="textarea"
            :model-value="formatJson(currentLog.result)"
            :rows="6"
            readonly
          />
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { OperationLog, OperationLogParams } from '@/types/system'
import { getOperationLogs } from '@/api/system'

const loading = ref(false)
const logList = ref<OperationLog[]>([])
const total = ref(0)
const dateRange = ref<string[]>([])

const searchParams = reactive<OperationLogParams>({
  page: 1,
  pageSize: 20,
  username: '',
  module: '',
  action: '',
  status: undefined,
  startTime: '',
  endTime: '',
})

/** 详情弹窗 */
const detailVisible = ref(false)
const currentLog = ref<OperationLog | null>(null)

// ==================== 辅助函数 ====================

/** 模块标签映射 */
const moduleMap: Record<string, string> = {
  page: '页面管理',
  content: '内容管理',
  product: '商品管理',
  member: '会员管理',
  marketing: '营销中心',
  order: '订单管理',
  system: '系统设置',
}

function getModuleLabel(module: string): string {
  return moduleMap[module] || module
}

function getModuleTagType(module: string): string {
  const map: Record<string, string> = {
    page: '',
    content: 'success',
    product: 'warning',
    member: '',
    marketing: 'danger',
    order: 'warning',
    system: 'info',
  }
  return map[module] || 'info'
}

/** 操作类型标签映射 */
const actionMap: Record<string, string> = {
  create: '创建',
  update: '编辑',
  delete: '删除',
  publish: '发布',
  disable: '停用',
  approve: '审核',
  export: '导出',
  login: '登录',
  config: '配置',
}

function getActionLabel(action: string): string {
  return actionMap[action] || action
}

function getActionTagType(action: string): string {
  const map: Record<string, string> = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    publish: 'warning',
    disable: 'info',
    approve: '',
    export: '',
    login: '',
    config: '',
  }
  return map[action] || 'info'
}

/** 请求方法标签颜色 */
function getMethodTagType(method: string): string {
  const map: Record<string, string> = {
    GET: 'success',
    POST: '',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info',
  }
  return map[method.toUpperCase()] || 'info'
}

/** 时间格式化 */
function formatTime(time: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** JSON 格式化 */
function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function normalizeLog(row: any): OperationLog {
  const operation = row.operation || ''
  const [module = 'system', action = 'view'] = operation.includes(':')
    ? operation.split(':')
    : ['system', operation || 'view']

  return {
    id: row.id,
    userId: row.userId,
    username: row.username || '-',
    module,
    action,
    content: operation || row.errorMsg || '-',
    method: row.method || '-',
    url: row.url || '-',
    ip: row.ip || '-',
    userAgent: row.userAgent || '-',
    params: row.params,
    result: row.errorMsg,
    status: row.status === 1 || row.status === 'success' ? 'success' : 'fail',
    duration: row.duration || 0,
    createdAt: row.createdAt,
  }
}

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: any = {
      current: searchParams.page,
      size: searchParams.pageSize,
      username: searchParams.username || undefined,
      operation: searchParams.action || searchParams.module || undefined,
      status: searchParams.status === 'success' ? 1 : searchParams.status === 'fail' ? 0 : undefined,
      startTime: searchParams.startTime ? `${searchParams.startTime} 00:00:00` : undefined,
      endTime: searchParams.endTime ? `${searchParams.endTime} 23:59:59` : undefined,
    }
    const res = await getOperationLogs(params)
    const page = res.data as any
    logList.value = (page?.records || []).map(normalizeLog)
    total.value = Number(page?.total || 0)
  } catch {
    logList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleSearch() {
  searchParams.page = 1
  fetchList()
}

/** 重置 */
function handleReset() {
  searchParams.page = 1
  searchParams.pageSize = 20
  searchParams.username = ''
  searchParams.module = ''
  searchParams.action = ''
  searchParams.status = undefined
  searchParams.startTime = ''
  searchParams.endTime = ''
  dateRange.value = []
  fetchList()
}

/** 日期范围变化 */
function handleDateChange(val: string[] | null) {
  if (val && val.length === 2) {
    searchParams.startTime = val[0]
    searchParams.endTime = val[1]
  } else {
    searchParams.startTime = ''
    searchParams.endTime = ''
  }
  handleSearch()
}

/** 查看详情 */
function handleDetail(row: OperationLog) {
  currentLog.value = row
  detailVisible.value = true
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.operation-logs-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-form {
    margin-bottom: 16px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .log-detail-section {
    margin-top: 20px;

    h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #303133;
    }
  }
}
</style>
