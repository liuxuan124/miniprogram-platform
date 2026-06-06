<template>
  <div class="member-center">
    <div class="page-header">
      <div>
        <div class="page-title">会员运营中心</div>
        <div class="page-desc">管理会员等级、积分规则、权益配置及用户标签。</div>
      </div>
      <div class="header-actions">
        <el-button icon="Refresh" @click="refreshCurrent">刷新</el-button>
        <el-button type="primary" @click="openLevelDialog()">等级体系配置</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="prototype-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="会员列表" name="members">
        <div class="toolbar">
          <el-input v-model="memberSearch.keyword" placeholder="搜索昵称/手机号" clearable class="toolbar-input" @keyup.enter="fetchMembers" />
          <el-select v-model="memberSearch.level" placeholder="会员等级：全部" clearable class="toolbar-select">
            <el-option label="普通会员" value="普通" />
            <el-option label="银卡会员" value="银卡" />
            <el-option label="金卡会员" value="金卡" />
            <el-option label="钻石会员" value="钻石" />
          </el-select>
          <el-select v-model="memberSearch.tag" placeholder="核心标签：全部" clearable class="toolbar-select">
            <el-option label="高价值" value="高价值" />
            <el-option label="活跃" value="活跃" />
            <el-option label="新用户" value="新用户" />
            <el-option label="活动用户" value="活动用户" />
          </el-select>
          <div class="toolbar-spacer" />
          <el-button @click="batchTag">批量操作</el-button>
          <el-button type="primary" @click="openLevelDialog()">等级体系配置</el-button>
        </div>

        <div class="table-panel">
          <el-table :data="filteredMembers" stripe v-loading="memberLoading">
            <el-table-column label="用户信息" min-width="180">
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar :size="34" class="avatar">{{ row.name.charAt(0) }}</el-avatar>
                  <div>
                    <div class="user-name">{{ row.name }}</div>
                    <div class="user-phone">{{ row.phone }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="会员等级" width="130">
              <template #default="{ row }">
                <el-tag :type="levelTagType(row.level)" effect="plain">{{ row.level }}会员</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="points" label="积分余额" width="110" align="center" />
            <el-table-column prop="growth" label="累计成长值" width="120" align="center" />
            <el-table-column label="消费行为" width="160">
              <template #default="{ row }">
                <span class="muted">{{ row.orders }}单 / ¥{{ row.amount }}</span>
              </template>
            </el-table-column>
            <el-table-column label="用户标签" min-width="180">
              <template #default="{ row }">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain" class="tag">{{ tag }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openProfile(row)">画像</el-button>
                <el-button link type="primary" size="small" @click="openAdjustDialog(row)">调积分</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="等级权益设置" name="levels">
        <div class="level-grid" v-loading="levelLoading">
          <div v-for="level in levelList" :key="level.id" class="level-card">
            <div class="level-head">
              <div>
                <div class="level-name">{{ level.name }}</div>
                <div class="muted">条件：成长值 / 积分 >= {{ level.min_points }}</div>
              </div>
              <el-tag :type="level.status === 1 ? 'success' : 'info'" effect="plain">{{ level.status === 1 ? '启用' : '禁用' }}</el-tag>
            </div>
            <div class="benefit-line">权益：{{ level.benefits.length ? level.benefits.join('、') : '基础功能使用' }}</div>
            <div class="level-actions">
              <el-button link type="primary" @click="openLevelDialog(level)">配置权益</el-button>
              <el-button link :type="level.status === 1 ? 'warning' : 'success'" @click="toggleLevelStatus(level)">
                {{ level.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteLevel(level)">删除</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="积分规则" name="points">
        <div class="toolbar">
          <el-select v-model="pointsSearch.type" placeholder="积分类型：全部" clearable class="toolbar-select">
            <el-option label="每日签到" value="sign_in" />
            <el-option label="消费赠送" value="consume" />
            <el-option label="积分兑换" value="exchange" />
            <el-option label="后台调整" value="admin" />
          </el-select>
          <div class="toolbar-spacer" />
          <el-button type="warning" @click="openAdjustDialog()">手动调整积分</el-button>
        </div>
        <div class="rules-strip">
          <div v-for="rule in pointRules" :key="rule.title" class="rule-card">
            <div class="rule-title">{{ rule.title }}</div>
            <div class="rule-value">{{ rule.value }}</div>
            <div class="muted">{{ rule.desc }}</div>
          </div>
        </div>
        <div class="table-panel">
          <el-table :data="pointsList" stripe v-loading="pointsLoading">
            <el-table-column label="用户" min-width="140">
              <template #default="{ row }">{{ row.user_nickname || `用户${row.user_id}` }}</template>
            </el-table-column>
            <el-table-column label="类型" width="120">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ pointsTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="积分变动" width="120" align="center">
              <template #default="{ row }">
                <span :class="row.points >= 0 ? 'points-add' : 'points-sub'">{{ row.points >= 0 ? '+' : '' }}{{ row.points }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="source" label="来源说明" min-width="180" />
            <el-table-column prop="created_at" label="时间" width="170" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="标签管理" name="tags">
        <div class="tag-board">
          <div v-for="tag in tagGroups" :key="tag.name" class="tag-card">
            <div class="tag-title">{{ tag.name }}</div>
            <div class="tag-count">{{ tag.count }} 人</div>
            <div class="muted">{{ tag.rule }}</div>
            <el-button link type="primary">配置规则</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="profileVisible" :title="currentMember ? `会员画像：${currentMember.name}` : '会员画像'" width="680px">
      <template v-if="currentMember">
        <div class="profile-stats">
          <div class="profile-stat"><span>会员等级</span><strong>{{ currentMember.level }}会员</strong></div>
          <div class="profile-stat"><span>积分余额</span><strong>{{ currentMember.points }}</strong></div>
          <div class="profile-stat"><span>累计成长值</span><strong>{{ currentMember.growth }}</strong></div>
          <div class="profile-stat"><span>累计消费</span><strong>¥{{ currentMember.amount }}</strong></div>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="微信昵称">{{ currentMember.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentMember.phone }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentMember.orders }}</el-descriptions-item>
          <el-descriptions-item label="当前标签">
            <el-tag v-for="tag in currentMember.tags" :key="tag" size="small" class="tag">{{ tag }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <el-dialog v-model="levelDialogVisible" :title="isEditMode ? '编辑会员等级' : '新增会员等级'" width="560px" @closed="resetLevelForm">
      <el-form ref="levelFormRef" :model="levelForm" :rules="levelRules" label-width="100px">
        <el-form-item label="等级名称" prop="name">
          <el-input v-model="levelForm.name" placeholder="如：金卡会员" />
        </el-form-item>
        <el-form-item label="等级序号" prop="level">
          <el-input-number v-model="levelForm.level" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="最低积分" prop="min_points">
          <el-input-number v-model="levelForm.min_points" :min="0" />
        </el-form-item>
        <el-form-item label="折扣率">
          <el-input-number v-model="levelForm.discount_rate" :min="0.01" :max="1" :step="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="权益描述">
          <div class="benefits-editor">
            <div v-for="(_b, i) in levelForm.benefits" :key="i" class="benefit-item">
              <el-input v-model="levelForm.benefits[i]" placeholder="权益描述" />
              <el-button type="danger" link @click="removeBenefit(i)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-button type="primary" link @click="addBenefit"><el-icon><Plus /></el-icon>添加权益</el-button>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="levelForm.statusBool" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="levelDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="levelSubmitting" @click="handleLevelSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adjustDialogVisible" title="手动调整积分" width="480px" @closed="resetAdjustForm">
      <el-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" label-width="100px">
        <el-form-item label="用户ID" prop="user_id">
          <el-input-number v-model="adjustForm.user_id" :min="1" controls-position="right" class="full" />
        </el-form-item>
        <el-form-item label="调整积分" prop="points">
          <el-input-number v-model="adjustForm.points" controls-position="right" class="full" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="3" placeholder="请输入调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustSubmitting" @click="handleAdjustSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import request from '@/api/request'
import {
  adjustMemberPoints,
  createMemberLevel,
  deleteMemberLevel,
  getMemberLevelList,
  getMemberPointsLog,
  updateMemberLevel,
} from '@/api/member'
import type { CreateMemberLevelParams, MemberLevel, MemberPointsLogParams, UpdateMemberLevelParams } from '@/types/member'

interface MemberRow {
  id: number
  name: string
  phone: string
  level: string
  points: number
  growth: number
  orders: number
  amount: number
  tags: string[]
}

const prototypeMembers: MemberRow[] = [
  { id: 1, name: '张小明', level: '金卡', points: 1280, growth: 5600, orders: 4, amount: 2680, tags: ['高价值', '活跃'], phone: '138****8888' },
  { id: 2, name: '李小红', level: '银卡', points: 680, growth: 2400, orders: 2, amount: 890, tags: ['活动用户'], phone: '139****9999' },
  { id: 3, name: '王大力', level: '普通', points: 230, growth: 800, orders: 1, amount: 199, tags: ['新用户'], phone: '135****7777' },
  { id: 4, name: '赵美丽', level: '钻石', points: 3680, growth: 12000, orders: 12, amount: 8600, tags: ['VIP', '高价值'], phone: '136****6666' },
]

const activeTab = ref('members')
const memberLoading = ref(false)
const members = ref<MemberRow[]>([])
const levelLoading = ref(false)
const levelList = ref<MemberLevel[]>([])
const pointsLoading = ref(false)
const pointsList = ref<any[]>([])
const profileVisible = ref(false)
const currentMember = ref<MemberRow | null>(null)

const memberSearch = reactive({ keyword: '', level: '', tag: '' })
const pointsSearch = reactive({ type: '' })

const pointRules = [
  { title: '每日签到', value: '+10 分', desc: '连续签到可叠加活跃标签' },
  { title: '消费赠送', value: '1 元 = 1 分', desc: '按实付金额计算' },
  { title: '积分兑换', value: '100 分起兑', desc: '可兑换优惠券或商品' },
  { title: '后台调整', value: '需备注', desc: '进入积分日志留痕' },
]

const tagGroups = computed(() => [
  { name: '高价值', count: members.value.filter((m) => m.tags.includes('高价值')).length, rule: '累计消费 >= 2000 元' },
  { name: '活跃', count: members.value.filter((m) => m.tags.includes('活跃')).length, rule: '近 30 天有访问或交易' },
  { name: '新用户', count: members.value.filter((m) => m.tags.includes('新用户')).length, rule: '首次访问或注册 7 天内' },
  { name: '活动用户', count: members.value.filter((m) => m.tags.includes('活动用户')).length, rule: '参与活动或预约服务' },
])

const filteredMembers = computed(() => {
  return members.value.filter((m) => {
    const keywordMatched = !memberSearch.keyword || m.name.includes(memberSearch.keyword) || m.phone.includes(memberSearch.keyword)
    const levelMatched = !memberSearch.level || m.level === memberSearch.level
    const tagMatched = !memberSearch.tag || m.tags.includes(memberSearch.tag)
    return keywordMatched && levelMatched && tagMatched
  })
})

function normalizeMember(row: any, index: number): MemberRow {
  const fallback = prototypeMembers[index % prototypeMembers.length]
  const points = Number(row.points ?? fallback.points)
  return {
    id: row.id,
    name: row.nickname || row.name || fallback.name,
    phone: row.phone || fallback.phone,
    level: levelNameByPoints(points),
    points,
    growth: Number(row.growth ?? (points ? points * 4 : fallback.growth)),
    orders: Number(row.orderCount ?? row.orders ?? fallback.orders),
    amount: Number(row.totalAmount ?? fallback.amount),
    tags: row.tags || fallback.tags,
  }
}

function levelNameByPoints(points: number) {
  if (points >= 3000) return '钻石'
  if (points >= 1000) return '金卡'
  if (points >= 500) return '银卡'
  return '普通'
}

async function fetchMembers() {
  memberLoading.value = true
  try {
    const res: any = await request.get('/api/v1/admin/users', {
      params: { current: 1, size: 50, nickname: memberSearch.keyword || undefined },
    })
    const rows = res.data?.records || []
    members.value = rows.length ? rows.map(normalizeMember) : prototypeMembers
  } catch {
    members.value = prototypeMembers
  } finally {
    memberLoading.value = false
  }
}

async function fetchLevelList() {
  levelLoading.value = true
  try {
    const res = await getMemberLevelList()
    levelList.value = res.data?.length ? res.data : defaultLevels()
  } catch {
    levelList.value = defaultLevels()
  } finally {
    levelLoading.value = false
  }
}

function defaultLevels(): MemberLevel[] {
  return [
    { id: 1, name: '普通会员', level: 1, min_points: 0, max_points: -1, points_rate: 1, discount_rate: 1, benefits: ['基础功能使用'], status: 1, created_at: '', updated_at: '' },
    { id: 2, name: '银卡会员', level: 2, min_points: 500, max_points: -1, points_rate: 1.1, discount_rate: 0.95, benefits: ['积分兑换资格'], status: 1, created_at: '', updated_at: '' },
    { id: 3, name: '金卡会员', level: 3, min_points: 1000, max_points: -1, points_rate: 1.2, discount_rate: 0.9, benefits: ['全年9折', '积分加速'], status: 1, created_at: '', updated_at: '' },
    { id: 4, name: '钻石会员', level: 4, min_points: 3000, max_points: -1, points_rate: 1.5, discount_rate: 0.85, benefits: ['全年85折', '专属客服', '生日双倍积分'], status: 1, created_at: '', updated_at: '' },
  ]
}

async function fetchPointsLog() {
  pointsLoading.value = true
  try {
    const params: MemberPointsLogParams = { page: 1, page_size: 20 }
    if (pointsSearch.type) params.type = pointsSearch.type
    const res = await getMemberPointsLog(params)
    pointsList.value = res.data?.list || []
  } catch {
    pointsList.value = []
  } finally {
    pointsLoading.value = false
  }
}

function handleTabChange(name: string | number) {
  if (name === 'members') fetchMembers()
  if (name === 'levels') fetchLevelList()
  if (name === 'points') fetchPointsLog()
}

function refreshCurrent() {
  handleTabChange(activeTab.value)
}

function levelTagType(level: string) {
  const map: Record<string, string> = { 普通: 'info', 银卡: '', 金卡: 'warning', 钻石: 'danger' }
  return map[level] || 'info'
}

function pointsTypeLabel(type: string) {
  const map: Record<string, string> = { sign_in: '每日签到', consume: '消费赠送', exchange: '积分兑换', admin: '后台调整' }
  return map[type] || type || '-'
}

function openProfile(row: MemberRow) {
  currentMember.value = row
  profileVisible.value = true
}

function batchTag() {
  ElMessage.success('批量打标签')
}

const levelDialogVisible = ref(false)
const isEditMode = ref(false)
const editingLevelId = ref<number | null>(null)
const levelSubmitting = ref(false)
const levelFormRef = ref()
const levelForm = reactive({
  name: '',
  level: 1,
  min_points: 0,
  max_points: -1,
  points_rate: 1,
  discount_rate: 1,
  benefits: [] as string[],
  statusBool: true,
})

const levelRules = {
  name: [{ required: true, message: '请输入等级名称', trigger: 'blur' }],
  min_points: [{ required: true, message: '请输入最低积分', trigger: 'change' }],
}

function openLevelDialog(row?: MemberLevel) {
  isEditMode.value = !!row
  editingLevelId.value = row?.id || null
  levelForm.name = row?.name || ''
  levelForm.level = row?.level || 1
  levelForm.min_points = row?.min_points || 0
  levelForm.max_points = row?.max_points || -1
  levelForm.points_rate = row?.points_rate || 1
  levelForm.discount_rate = row?.discount_rate || 1
  levelForm.benefits = row?.benefits ? [...row.benefits] : []
  levelForm.statusBool = row ? row.status === 1 : true
  levelDialogVisible.value = true
}

function resetLevelForm() {
  levelFormRef.value?.resetFields()
  levelForm.benefits = []
}

function addBenefit() {
  levelForm.benefits.push('')
}

function removeBenefit(index: number) {
  levelForm.benefits.splice(index, 1)
}

async function handleLevelSubmit() {
  const valid = await levelFormRef.value?.validate().catch(() => false)
  if (!valid) return
  levelSubmitting.value = true
  try {
    const payload: CreateMemberLevelParams = {
      name: levelForm.name,
      level: levelForm.level,
      min_points: levelForm.min_points,
      max_points: levelForm.max_points,
      points_rate: levelForm.points_rate,
      discount_rate: levelForm.discount_rate,
      benefits: levelForm.benefits.filter((item) => item.trim()),
      status: levelForm.statusBool ? 1 : 0,
    }
    if (isEditMode.value && editingLevelId.value !== null) {
      await updateMemberLevel(editingLevelId.value, payload as UpdateMemberLevelParams)
      ElMessage.success('更新成功')
    } else {
      await createMemberLevel(payload)
      ElMessage.success('创建成功')
    }
    levelDialogVisible.value = false
    fetchLevelList()
  } finally {
    levelSubmitting.value = false
  }
}

async function toggleLevelStatus(row: MemberLevel) {
  const status = row.status === 1 ? 0 : 1
  await updateMemberLevel(row.id, { status })
  ElMessage.success(status === 1 ? '启用成功' : '禁用成功')
  fetchLevelList()
}

async function handleDeleteLevel(row: MemberLevel) {
  await ElMessageBox.confirm(`确定删除等级「${row.name}」？`, '删除确认', { type: 'warning' })
  await deleteMemberLevel(row.id)
  ElMessage.success('删除成功')
  fetchLevelList()
}

const adjustDialogVisible = ref(false)
const adjustSubmitting = ref(false)
const adjustFormRef = ref()
const adjustForm = reactive({ user_id: undefined as number | undefined, points: undefined as number | undefined, remark: '' })
const adjustRules = {
  user_id: [{ required: true, message: '请输入用户ID', trigger: 'change' }],
  points: [{ required: true, message: '请输入调整积分', trigger: 'change' }],
  remark: [{ required: true, message: '请输入调整原因', trigger: 'blur' }],
}

function openAdjustDialog(row?: MemberRow) {
  adjustForm.user_id = row?.id
  adjustForm.points = undefined
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

function resetAdjustForm() {
  adjustFormRef.value?.resetFields()
}

async function handleAdjustSubmit() {
  const valid = await adjustFormRef.value?.validate().catch(() => false)
  if (!valid) return
  adjustSubmitting.value = true
  try {
    await adjustMemberPoints({ user_id: adjustForm.user_id!, points: adjustForm.points!, remark: adjustForm.remark })
    ElMessage.success('积分调整成功')
    adjustDialogVisible.value = false
    fetchPointsLog()
    fetchMembers()
  } finally {
    adjustSubmitting.value = false
  }
}

onMounted(() => {
  fetchMembers()
  fetchLevelList()
})
</script>

<style lang="scss" scoped>
.member-center {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 22px;
    font-weight: 800;
    color: #0d1b2e;
  }

  .page-desc,
  .muted {
    color: #6b7b93;
    font-size: 13px;
  }

  .header-actions,
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .prototype-tabs {
    :deep(.el-tabs__item.is-active) {
      color: #1769ff;
      font-weight: 800;
    }
    :deep(.el-tabs__active-bar) {
      background: #1769ff;
    }
  }

  .toolbar {
    margin-bottom: 16px;
  }

  .toolbar-input {
    width: 210px;
  }

  .toolbar-select {
    width: 180px;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .table-panel,
  .level-card,
  .rule-card,
  .tag-card {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 14px;
    padding: 16px;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    background: linear-gradient(135deg, #1769ff, #20b7ff);
    color: #fff;
  }

  .user-name,
  .level-name,
  .rule-title,
  .tag-title {
    font-weight: 800;
    color: #0d1b2e;
  }

  .user-phone {
    color: #6b7b93;
    font-size: 12px;
  }

  .tag {
    margin-right: 6px;
    margin-bottom: 4px;
  }

  .level-grid,
  .rules-strip,
  .tag-board,
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .level-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .benefit-line {
    margin-top: 12px;
    color: #34445c;
    font-size: 13px;
  }

  .level-actions {
    margin-top: 12px;
  }

  .rule-value,
  .tag-count {
    margin: 8px 0 4px;
    font-size: 24px;
    line-height: 1;
    font-weight: 900;
    color: #1769ff;
  }

  .points-add {
    color: #0faa6e;
    font-weight: 800;
  }

  .points-sub {
    color: #f56c6c;
    font-weight: 800;
  }

  .profile-stat {
    padding: 14px;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    background: #f8faff;

    span {
      display: block;
      color: #6b7b93;
      font-size: 12px;
    }

    strong {
      display: block;
      margin-top: 6px;
      color: #0d1b2e;
      font-size: 20px;
    }
  }

  .benefits-editor,
  .full {
    width: 100%;
  }

  .benefit-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
}
</style>
