<template>
  <div class="creators-page">
    <div class="page-header">
      <div>
        <div class="page-title">创作者审核</div>
        <div class="page-desc">对应小程序投稿页。通过后将自动授予 contributor（特约）身份。</div>
      </div>
      <el-button @click="load">刷新</el-button>
    </div>

    <div class="toolbar">
      <el-select v-model="status" clearable placeholder="状态" style="width: 160px" @change="reload">
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="申请人" width="140" />
      <el-table-column prop="contact" label="联系方式" min-width="140" show-overflow-tooltip />
      <el-table-column prop="direction" label="方向" width="120" show-overflow-tooltip />
      <el-table-column prop="format" label="形态" width="100" />
      <el-table-column prop="portfolio" label="代表作" min-width="160" show-overflow-tooltip />
      <el-table-column prop="intro" label="简介" min-width="200" show-overflow-tooltip />
      <el-table-column prop="rejectReason" label="驳回理由" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status !== 'approved'"
            link
            type="success"
            @click="setStatus(row, 'approved')"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status !== 'rejected'"
            link
            type="danger"
            @click="setStatus(row, 'rejected')"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        layout="total, prev, pager, next"
        :total="total"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listCreatorApplications, updateCreatorApplicationStatus } from '@/api/creators'

const loading = ref(false)
const rows = ref<any[]>([])
const status = ref<string | undefined>('pending')
const current = ref(1)
const size = ref(20)
const total = ref(0)

function statusLabel(s?: string) {
  if (s === 'approved') return '已通过'
  if (s === 'rejected') return '已驳回'
  return '待审核'
}

function statusTag(s?: string): 'warning' | 'success' | 'danger' | 'info' {
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  return 'warning'
}

function formatTime(v?: string) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  try {
    const res = await listCreatorApplications({
      status: status.value,
      current: current.value,
      size: size.value,
    })
    const data = (res as any).data || {}
    rows.value = data.records || data.list || []
    total.value = Number(data.total || 0)
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reload() {
  current.value = 1
  load()
}

async function setStatus(row: any, next: 'approved' | 'rejected') {
  const action = next === 'approved' ? '通过' : '驳回'
  let rejectReason = ''
  if (next === 'rejected') {
    const { value } = await ElMessageBox.prompt('请填写驳回理由', '驳回申请', {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '理由将展示给申请人',
    }).catch(() => ({ value: null }))
    if (value === null) return
    rejectReason = String(value || '').trim()
  }
  await ElMessageBox.confirm(`确认${action}「${row.name}」的申请？`, '审核确认', { type: 'warning' })
  await updateCreatorApplicationStatus(row.id, { status: next, rejectReason: rejectReason || undefined })
  ElMessage.success(`已${action}`)
  await load()
}

onMounted(load)
</script>

<style scoped>
.creators-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.page-title { font-size: 18px; font-weight: 600; color: #002FA7; }
.page-desc { margin-top: 4px; color: #909399; font-size: 13px; }
.toolbar { margin-bottom: 12px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
