<template>
  <div class="user-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">用户管理</div>
      <div class="page-desc">全量小程序用户，行为分析与来源渠道统计</div>
    </div>

    <!-- 搜索栏 -->
    <el-card shadow="hover" class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="8" :md="6">
          <el-input v-model="searchKeyword" placeholder="昵称/手机号" clearable />
        </el-col>
        <el-col :xs="12" :sm="8" :md="6">
          <el-select v-model="searchSource" placeholder="来源渠道" clearable style="width:100%">
            <el-option label="全部" value="" />
            <el-option label="分享进入" value="分享进入" />
            <el-option label="扫码进入" value="扫码进入" />
            <el-option label="搜索进入" value="搜索进入" />
            <el-option label="广告进入" value="广告进入" />
          </el-select>
        </el-col>
        <el-col :xs="12" :sm="8" :md="12" class="search-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button class="export-btn" @click="handleExport">导出用户</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="item in statsCards" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">{{ item.title }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-change" :class="{ up: item.up }">{{ item.note }}</div>
            </div>
            <div class="stat-icon" :style="{ background: item.bg }">
              <el-icon :size="20" :color="item.color">
                <component :is="item.icon" />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户列表 -->
    <el-card shadow="hover" class="table-card">
      <el-table :data="users" stripe style="width:100%" v-loading="loading">
        <el-table-column prop="nickname" label="用户昵称" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">{{ row.nickname.charAt(0) }}</el-avatar>
              <span>{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column label="来源渠道" width="120">
          <template #default="{ row }">
            <el-tag :type="sourceTagType(row.source)" size="small" effect="plain">
              {{ row.source }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastVisit" label="最近访问时间" width="160" />
        <el-table-column label="业务记录" width="200">
          <template #default="{ row }">
            <span class="biz-record">{{ row.orders }}单 / {{ row.forms }}表单 / {{ row.signups }}报名</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showProfile(row)">画像</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <span class="table-total">共 {{ total }} 个用户</span>
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          small
          @current-change="fetchUsers"
        />
      </div>
    </el-card>

    <!-- 用户画像弹窗 -->
    <el-dialog v-model="profileVisible" title="用户画像" width="640px" :close-on-click-modal="false">
      <template v-if="currentUser">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="用户昵称" :span="2">{{ currentUser.nickname }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="来源渠道">
            <el-tag :type="sourceTagType(currentUser.source)" size="small">{{ currentUser.source }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最近访问">{{ currentUser.lastVisit }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ currentUser.registerTime }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentUser.orders }}</el-descriptions-item>
          <el-descriptions-item label="表单提交">{{ currentUser.forms }}</el-descriptions-item>
          <el-descriptions-item label="活动报名">{{ currentUser.signups }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">{{ currentUser.totalSpent }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="profile-section">
          <div class="profile-section-title">行为标签</div>
          <div class="tag-list">
            <el-tag v-for="tag in currentUser.tags" :key="tag" :type="tagType(tag)" size="small" style="margin-right:6px;margin-bottom:6px">
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-section-title">近期活跃</div>
          <el-timeline>
            <el-timeline-item v-for="(act, idx) in currentUser.activities" :key="idx" :timestamp="act.time" size="small">
              {{ act.content }}
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserList, exportUsers } from '@/api/user'

const loading = ref(false)
const searchKeyword = ref('')
const searchSource = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const profileVisible = ref(false)
const currentUser = ref<any>(null)
const users = ref<any[]>([])

const statsCards = computed(() => {
  const active = users.value.filter((u) => u.lastVisit && u.lastVisit !== '-').length
  const orders = users.value.reduce((sum, u) => sum + Number(u.orders || 0), 0)
  return [
    { title: '总用户数', value: String(total.value), note: '来自真实用户表', up: true, icon: 'User', color: '#1769ff', bg: '#eaf1ff' },
    { title: '当前页用户', value: String(users.value.length), note: `第 ${currentPage.value} 页`, up: true, icon: 'UserFilled', color: '#0faa6e', bg: '#e8faf3' },
    { title: '有访问记录', value: String(active), note: '按最近访问统计', up: false, icon: 'View', color: '#f59e0b', bg: '#fff8e6' },
    { title: '订单记录', value: String(orders), note: '当前页合计', up: false, icon: 'ShoppingCart', color: '#7c3aed', bg: '#f3eeff' },
  ]
})

function normalizeUser(row: any) {
  const nickname = row.nickname || row.name || row.openid || `用户${row.id}`
  const source = row.sourceChannel || row.source || '未知'
  return {
    id: row.id,
    nickname,
    phone: row.phone || '未授权',
    source,
    lastVisit: row.lastVisitAt || row.lastVisit || '-',
    orders: row.orderCount || row.orders || 0,
    forms: row.formCount || row.forms || 0,
    signups: row.actCount || row.signups || 0,
    registerTime: row.createTime || row.createdAt || '-',
    totalSpent: row.totalSpent || '-',
    tags: [source, row.status === 0 ? '已禁用' : '正常用户'],
    activities: row.lastVisitAt || row.lastVisit
      ? [{ content: '最近访问小程序', time: row.lastVisitAt || row.lastVisit }]
      : [{ content: '暂无行为记录', time: '-' }],
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      current: currentPage.value,
      size: pageSize.value,
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (searchSource.value) params.source = searchSource.value
    const res: any = await getUserList(params)
    const page = res.data || {}
    users.value = (page.records || []).map(normalizeUser)
    total.value = Number(page.total || users.value.length)
  } finally {
    loading.value = false
  }
}

function sourceTagType(source: string) {
  const map: Record<string, string> = {
    '分享进入': 'success',
    '扫码进入': 'primary',
    '搜索进入': 'warning',
    '广告进入': 'danger',
  }
  return map[source] || 'info'
}

function tagType(tag: string) {
  if (tag.includes('高价值') || tag.includes('VIP')) return 'danger'
  if (tag.includes('活跃') || tag.includes('复购')) return 'success'
  if (tag.includes('新用户')) return 'primary'
  return 'info'
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

function handleReset() {
  searchKeyword.value = ''
  searchSource.value = ''
  currentPage.value = 1
  fetchUsers()
}

async function handleExport() {
  try {
    const params: Record<string, any> = {}
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (searchSource.value) params.source = searchSource.value
    const res: any = await exportUsers(params)
    const blob = new Blob([res], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小程序用户_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

function showProfile(user: any) {
  currentUser.value = user
  profileVisible.value = true
}

onMounted(fetchUsers)
</script>

<style lang="scss" scoped>
.user-container {
  .page-header {
    margin-bottom: 20px;
    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #0d1b2e;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .page-desc {
      font-size: 13px;
      color: #6b7b93;
    }
  }

  .search-card {
    margin-bottom: 20px;
    border-radius: 14px;
    :deep(.el-card__body) {
      padding: 16px 20px;
    }
    .search-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      .export-btn {
        margin-left: auto;
      }
    }
  }

  .stats-row {
    margin-bottom: 20px;
  }

  .stat-card {
    border-radius: 14px;
    margin-bottom: 12px;
    .stat-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-info {
      .stat-label {
        font-size: 13px;
        color: #6b7b93;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .stat-value {
        font-size: 26px;
        font-weight: 800;
        color: #0d1b2e;
        letter-spacing: -0.03em;
        line-height: 1;
      }
      .stat-change {
        font-size: 12px;
        color: #6b7b93;
        margin-top: 5px;
        &.up { color: #0faa6e; }
      }
    }
    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  }

  .table-card {
    border-radius: 14px;
    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      .user-avatar {
        background: linear-gradient(135deg, #1769ff, #20b7ff);
        color: #fff;
        font-size: 12px;
        flex-shrink: 0;
      }
    }
    .biz-record {
      font-size: 12px;
      color: #6b7b93;
    }
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      .table-total {
        font-size: 12px;
        color: #6b7b93;
      }
    }
  }

  .profile-section {
    margin-bottom: 16px;
    .profile-section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0d1b2e;
      margin-bottom: 10px;
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
    }
  }
}
</style>
