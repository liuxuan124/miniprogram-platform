<template>
  <div class="member-points-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>积分日志</span>
          <el-button type="warning" icon="Edit" @click="handleAdjust">手动调整</el-button>
        </div>
      </template>

      <!-- 筛选区 -->
      <el-form :inline="true" :model="queryParams" class="filter-form" @submit.prevent="fetchList">
        <el-form-item label="用户">
          <el-input v-model="queryParams.keyword" placeholder="用户昵称/ID" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryParams.type" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in PointsChangeTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
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

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="logList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28" :src="row.user_avatar">
                {{ row.user_nickname?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user_nickname }}</span>
              <span class="text-muted">(#{{ row.user_id }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="PointsChangeTypeTagType[row.type as PointsChangeType]" size="small">
              {{ PointsChangeTypeLabels[row.type as PointsChangeType] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="变动积分" width="120" align="center">
          <template #default="{ row }">
            <span :class="row.points > 0 ? 'text-success' : 'text-danger'">
              {{ row.points > 0 ? '+' : '' }}{{ row.points }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="剩余积分" width="110" align="center" />
        <el-table-column prop="source" label="来源" min-width="160" show-overflow-tooltip />
        <el-table-column prop="order_no" label="关联订单" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.order_no || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="170" align="center" />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 手动调整积分弹窗 -->
    <el-dialog
      v-model="adjustVisible"
      title="手动调整积分"
      width="480px"
      destroy-on-close
      @close="resetAdjustForm"
    >
      <el-form
        ref="adjustFormRef"
        :model="adjustForm"
        :rules="adjustRules"
        label-width="100px"
      >
        <el-form-item label="用户ID" prop="user_id">
          <el-input-number v-model="adjustForm.user_id" :min="1" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="调整积分" prop="points">
          <el-input-number v-model="adjustForm.points" controls-position="right" style="width: 100%" />
          <div class="form-tip">正数为增加积分，负数为扣减积分</div>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="3" placeholder="请输入调整原因" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustLoading" @click="handleAdjustSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getMemberPointsLog, adjustMemberPoints } from '@/api/member'
import type { MemberPointsLog, MemberPointsLogParams, AdjustPointsParams } from '@/types/member'
import { PointsChangeType, PointsChangeTypeLabels, PointsChangeTypeTagType } from '@/types/member'

/** 列表数据 */
const logList = ref<MemberPointsLog[]>([])
const total = ref(0)
const loading = ref(false)
const dateRange = ref<string[]>([])

/** 查询参数 */
const queryParams = reactive<MemberPointsLogParams>({
  page: 1,
  page_size: 20,
  keyword: '',
  type: undefined,
  start_date: undefined,
  end_date: undefined,
})

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      queryParams.start_date = dateRange.value[0]
      queryParams.end_date = dateRange.value[1]
    } else {
      queryParams.start_date = undefined
      queryParams.end_date = undefined
    }
    const res = await getMemberPointsLog(queryParams)
    logList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    logList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 重置筛选 */
function handleReset() {
  queryParams.keyword = ''
  queryParams.type = undefined
  queryParams.page = 1
  queryParams.page_size = 20
  dateRange.value = []
  queryParams.start_date = undefined
  queryParams.end_date = undefined
  fetchList()
}

/** 手动调整积分 */
const adjustVisible = ref(false)
const adjustLoading = ref(false)
const adjustFormRef = ref<FormInstance>()
const adjustForm = reactive<AdjustPointsParams>({
  user_id: 0,
  points: 0,
  remark: '',
})

const adjustRules: FormRules = {
  user_id: [{ required: true, message: '请输入用户ID', trigger: 'blur' }],
  points: [{ required: true, message: '请输入调整积分', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入调整原因', trigger: 'blur' }],
}

function handleAdjust() {
  adjustVisible.value = true
}

function resetAdjustForm() {
  adjustForm.user_id = 0
  adjustForm.points = 0
  adjustForm.remark = ''
  adjustFormRef.value?.resetFields()
}

async function handleAdjustSubmit() {
  const valid = await adjustFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (adjustForm.points === 0) {
    ElMessage.warning('调整积分不能为 0')
    return
  }

  adjustLoading.value = true
  try {
    await adjustMemberPoints(adjustForm)
    ElMessage.success('积分调整成功')
    adjustVisible.value = false
    fetchList()
  } finally {
    adjustLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.member-points-container {
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

  .text-success {
    color: #67c23a;
    font-weight: 600;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .text-muted {
    color: #909399;
    font-size: 12px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    margin-top: 4px;
  }
}
</style>
