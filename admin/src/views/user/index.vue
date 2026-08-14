<template>
  <div class="user-container">
    <div class="page-header">
      <div class="page-title">用户管理</div>
      <div class="page-desc">全量小程序用户，支持来源筛选、导出与画像查看</div>
    </div>

    <el-card shadow="hover" class="search-card">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="8" :md="6">
          <el-input
            v-model="searchKeyword"
            placeholder="昵称 / 手机号"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :xs="12" :sm="8" :md="6">
          <el-select v-model="searchSource" placeholder="来源渠道" clearable style="width:100%">
            <el-option label="分享进入" value="share" />
            <el-option label="扫码进入" value="scan" />
            <el-option label="搜索进入" value="search" />
            <el-option label="广告进入" value="ad" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-col>
        <el-col :xs="12" :sm="8" :md="12" class="search-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button class="export-btn" :loading="exporting" @click="handleExport">导出用户</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="item in statsCards" :key="item.title">
        <el-card shadow="hover" class="stat-card" v-loading="statsLoading">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">{{ item.title }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-change">{{ item.note }}</div>
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

    <el-card shadow="hover" class="table-card">
      <ListStateWrap
        :loading="loading"
        :error="loadError"
        :empty="!loading && !loadError && users.length === 0"
        empty-text="暂无用户数据"
        @retry="fetchUsers"
      >
        <el-table :data="users" stripe style="width:100%">
          <el-table-column prop="nickname" label="用户昵称" min-width="160">
            <template #default="{ row }">
              <div class="user-cell">
                <el-avatar :size="28" class="user-avatar" :src="row.avatar || undefined">
                  {{ (row.nickname || '?').charAt(0) }}
                </el-avatar>
                <span>{{ row.nickname }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="手机号" width="120" />
          <el-table-column label="来源渠道" width="120">
            <template #default="{ row }">
              <el-tag :type="sourceTagType(row.source)" size="small" effect="plain">
                {{ row.sourceLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="levelName" label="会员等级" width="110" />
          <el-table-column prop="points" label="积分" width="90" align="center" />
          <el-table-column prop="lastVisit" label="最近访问" width="160" />
          <el-table-column label="业务记录" min-width="200">
            <template #default="{ row }">
              <span class="biz-record">{{ row.orders }}单 / {{ row.forms }}表单 / {{ row.signups }}报名</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" :loading="profileLoadingId === row.id" @click="showProfile(row)">
                画像
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="table-footer">
          <span class="table-total">共 {{ total }} 个用户</span>
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="sizes, prev, pager, next"
            small
            @current-change="fetchUsers"
            @size-change="handleSizeChange"
          />
        </div>
      </ListStateWrap>
    </el-card>

    <el-dialog v-model="profileVisible" title="用户画像" width="680px" :close-on-click-modal="false">
      <template v-if="currentUser">
        <div class="profile-head">
          <el-avatar :size="48" :src="currentUser.avatar || undefined">
            {{ (currentUser.nickname || '?').charAt(0) }}
          </el-avatar>
          <div>
            <div class="profile-name">{{ currentUser.nickname }}</div>
            <div class="muted">{{ currentUser.phone }} · {{ currentUser.levelName || '未定级' }} · {{ currentUser.points }} 积分</div>
          </div>
        </div>

        <el-descriptions :column="2" border size="small" class="profile-desc">
          <el-descriptions-item label="来源渠道">
            <el-tag :type="sourceTagType(currentUser.source)" size="small">{{ currentUser.sourceLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最近访问">{{ currentUser.lastVisit }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ currentUser.registerTime }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ formatMoney(currentUser.totalSpent) }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentUser.orders }}</el-descriptions-item>
          <el-descriptions-item label="表单提交">{{ currentUser.forms }}</el-descriptions-item>
          <el-descriptions-item label="活动报名" :span="2">{{ currentUser.signups }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="profile-section">
          <div class="profile-section-title">行为标签</div>
          <div class="tag-list">
            <el-tag
              v-for="tag in currentUser.tags"
              :key="tag"
              :type="tagType(tag)"
              size="small"
              style="margin-right:6px;margin-bottom:6px"
            >
              {{ tag }}
            </el-tag>
            <span v-if="!currentUser.tags?.length" class="muted">暂无标签</span>
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-section-title">近期活跃</div>
          <el-timeline v-if="currentUser.activities?.length">
            <el-timeline-item
              v-for="(act, idx) in currentUser.activities"
              :key="idx"
              :timestamp="act.time || '-'"
              size="small"
            >
              {{ act.content }}
            </el-timeline-item>
          </el-timeline>
          <div v-else class="muted">暂无行为记录</div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ListStateWrap from '@/components/ListStateWrap.vue'
import { exportUsers, getUserDetail, getUserList, getUserStats } from '@/api/user'

type UserRow = {
  id: number
  nickname: string
  phone: string
  avatar?: string
  source: string
  sourceLabel: string
  levelName: string
  points: number
  lastVisit: string
  orders: number
  forms: number
  signups: number
  registerTime: string
  totalSpent: number | string
  tags: string[]
  activities: Array<{ content: string; time?: string }>
}

const loading = ref(false)
const loadError = ref<string | null>(null)
const statsLoading = ref(false)
const exporting = ref(false)
const searchKeyword = ref('')
const searchSource = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const profileVisible = ref(false)
const profileLoadingId = ref<number | null>(null)
const currentUser = ref<UserRow | null>(null)
const users = ref<UserRow[]>([])

const stats = reactive({
  totalUsers: 0,
  activeUsers7d: 0,
  usersWithOrders: 0,
  totalOrders: 0,
})

const statsCards = computed(() => [
  { title: '总用户数', value: String(stats.totalUsers), note: '全量用户', icon: 'User', color: '#1769ff', bg: '#eaf1ff' },
  { title: '近7日活跃', value: String(stats.activeUsers7d), note: '有访问记录', icon: 'View', color: '#0faa6e', bg: '#e8faf3' },
  { title: '有订单用户', value: String(stats.usersWithOrders), note: '有效订单口径', icon: 'UserFilled', color: '#f59e0b', bg: '#fff8e6' },
  { title: '有效订单数', value: String(stats.totalOrders), note: '已支付及后续状态', icon: 'ShoppingCart', color: '#7c3aed', bg: '#f3eeff' },
])

function formatMoney(val: number | string | undefined) {
  const n = Number(val ?? 0)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

function normalizeUser(row: any): UserRow {
  const nickname = row.nickname || row.name || row.openid || `用户${row.id}`
  const source = row.sourceChannel || row.source || ''
  const sourceLabel = row.sourceChannelLabel || sourceLabelOf(source)
  return {
    id: row.id,
    nickname,
    phone: row.phone || '未授权',
    avatar: row.avatar || row.avatarUrl || '',
    source,
    sourceLabel,
    levelName: row.levelName || '-',
    points: Number(row.points ?? 0),
    lastVisit: row.lastVisitAt || row.lastVisit || '-',
    orders: Number(row.orderCount ?? row.orders ?? 0),
    forms: Number(row.formCount ?? row.forms ?? 0),
    signups: Number(row.actCount ?? row.signups ?? 0),
    registerTime: row.createTime || row.createdAt || '-',
    totalSpent: row.totalSpent ?? 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    activities: Array.isArray(row.activities)
      ? row.activities.map((a: any) => ({ content: a.content || '-', time: a.time || undefined }))
      : [],
  }
}

function sourceLabelOf(code: string) {
  const map: Record<string, string> = {
    share: '分享进入',
    scan: '扫码进入',
    search: '搜索进入',
    ad: '广告进入',
    other: '其他',
  }
  return map[code] || (code ? code : '未知')
}

function buildListParams() {
  const params: Record<string, any> = {
    current: currentPage.value,
    size: pageSize.value,
  }
  const keyword = searchKeyword.value.trim()
  if (keyword) params.keyword = keyword
  if (searchSource.value) params.source = searchSource.value
  return params
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const res: any = await getUserStats()
    const data = res.data || {}
    stats.totalUsers = Number(data.totalUsers || 0)
    stats.activeUsers7d = Number(data.activeUsers7d || 0)
    stats.usersWithOrders = Number(data.usersWithOrders || 0)
    stats.totalOrders = Number(data.totalOrders || 0)
  } catch {
    /* 统计失败不影响列表 */
  } finally {
    statsLoading.value = false
  }
}

async function fetchUsers() {
  loading.value = true
  loadError.value = null
  try {
    const res: any = await getUserList(buildListParams())
    const page = res.data || {}
    users.value = (page.records || []).map(normalizeUser)
    total.value = Number(page.total || users.value.length)
  } catch {
    loadError.value = '获取用户列表失败，请重试'
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function sourceTagType(source: string) {
  const map: Record<string, string> = {
    share: 'success',
    scan: 'primary',
    search: 'warning',
    ad: 'danger',
    other: 'info',
    分享进入: 'success',
    扫码进入: 'primary',
    搜索进入: 'warning',
    广告进入: 'danger',
  }
  return map[source] || 'info'
}

function tagType(tag: string) {
  if (tag.includes('高价值') || tag.includes('VIP')) return 'danger'
  if (tag.includes('活跃') || tag.includes('复购') || tag.includes('已下单')) return 'success'
  if (tag.includes('新用户')) return 'primary'
  return 'info'
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
  fetchStats()
}

function handleReset() {
  searchKeyword.value = ''
  searchSource.value = ''
  currentPage.value = 1
  fetchUsers()
  fetchStats()
}

function handleSizeChange() {
  currentPage.value = 1
  fetchUsers()
}

function headerValue(headers: any, name: string) {
  if (!headers) return ''
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? String(headers[key] || '') : ''
}

async function handleExport() {
  exporting.value = true
  try {
    const params: Record<string, any> = {}
    const keyword = searchKeyword.value.trim()
    if (keyword) params.keyword = keyword
    if (searchSource.value) params.source = searchSource.value
    const res: any = await exportUsers(params)
    const blob: Blob = res?.data instanceof Blob ? res.data : new Blob([res], { type: 'text/csv;charset=utf-8' })
    if (blob.type && blob.type.includes('application/json')) {
      throw new Error('导出失败')
    }
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `小程序用户_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    const truncated = headerValue(res?.headers, 'x-export-truncated') === '1'
    const exportTotal = headerValue(res?.headers, 'x-export-total')
    if (truncated) {
      ElMessage.warning(`导出已截断：共 ${exportTotal || '较多'} 条，本次最多导出 100000 条`)
    } else {
      ElMessage.success('导出成功')
    }
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

async function showProfile(user: UserRow) {
  profileLoadingId.value = user.id
  try {
    const res: any = await getUserDetail(user.id)
    currentUser.value = normalizeUser(res.data || user)
    profileVisible.value = true
  } catch {
    currentUser.value = user
    profileVisible.value = true
    ElMessage.warning('画像详情加载失败，已展示列表数据')
  } finally {
    profileLoadingId.value = null
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchStats()])
})
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

  .profile-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .profile-name {
    font-size: 16px;
    font-weight: 800;
    color: #0d1b2e;
  }

  .muted {
    color: #6b7b93;
    font-size: 13px;
  }

  .profile-desc {
    margin-bottom: 4px;
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
