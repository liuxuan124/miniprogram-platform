<template>
  <div class="member-center">
    <div class="page-header">
      <div>
        <div class="page-title">会员运营中心</div>
        <div class="page-desc">管理会员列表、等级权益与积分调整。</div>
      </div>
      <div class="header-actions">
        <el-button icon="Refresh" @click="refreshCurrent">刷新</el-button>
        <el-button type="primary" @click="openLevelDialog()">新增等级</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="prototype-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="会员列表" name="members">
        <div class="toolbar">
          <el-input
            v-model="memberSearch.keyword"
            placeholder="搜索昵称或手机号"
            clearable
            class="toolbar-input"
            @keyup.enter="handleMemberSearch"
          />
          <el-select
            v-model="memberSearch.levelId"
            placeholder="会员等级：全部"
            clearable
            class="toolbar-select"
          >
            <el-option
              v-for="lv in enabledLevels"
              :key="lv.id"
              :label="lv.name"
              :value="lv.id"
            />
          </el-select>
          <el-button type="primary" @click="handleMemberSearch">搜索</el-button>
          <div class="toolbar-spacer" />
          <el-button type="primary" @click="activeTab = 'levels'">等级体系配置</el-button>
        </div>

        <div class="table-panel">
          <ListStateWrap
            :loading="memberLoading"
            :error="memberError"
            :empty="!memberLoading && !memberError && filteredMembers.length === 0"
            empty-text="暂无会员数据"
            empty-description="小程序用户注册后会出现在这里"
            @retry="fetchMembers"
          >
            <el-table :data="filteredMembers" stripe>
              <el-table-column label="用户信息" min-width="200">
                <template #default="{ row }">
                  <div class="user-cell">
                    <el-avatar :size="34" :src="row.avatar" class="avatar">
                      {{ (row.name || '?').charAt(0) }}
                    </el-avatar>
                    <div>
                      <div class="user-name">{{ row.name || '未设置昵称' }}</div>
                      <div class="user-phone">{{ row.phone || '未绑定手机' }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="会员等级" width="140">
                <template #default="{ row }">
                  <el-tag effect="plain" type="primary">{{ row.levelName }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="points" label="积分余额" width="110" align="center" />
              <el-table-column label="最近访问" width="170" show-overflow-tooltip>
                <template #default="{ row }">{{ row.lastVisit || '—' }}</template>
              </el-table-column>
              <el-table-column label="注册时间" width="170" show-overflow-tooltip>
                <template #default="{ row }">{{ row.createdAt || '—' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openProfile(row)">画像</el-button>
                  <el-button link type="primary" size="small" @click="openAdjustDialog(row)">调积分</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="memberPagination.page"
                v-model:page-size="memberPagination.pageSize"
                :total="memberPagination.total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @size-change="fetchMembers"
                @current-change="fetchMembers"
              />
            </div>
          </ListStateWrap>
        </div>
      </el-tab-pane>

      <el-tab-pane label="等级权益设置" name="levels">
        <div class="toolbar">
          <div class="toolbar-spacer" />
          <el-button type="primary" @click="openLevelDialog()">新增等级</el-button>
        </div>
        <ListStateWrap
          :loading="levelLoading"
          :error="levelError"
          :empty="!levelLoading && !levelError && levelList.length === 0"
          empty-text="暂无会员等级"
          empty-description="请先新增等级，例如普通会员、金卡会员"
          @retry="fetchLevelList"
        >
          <div class="level-grid">
            <div v-for="level in levelList" :key="level.id" class="level-card">
              <div class="level-head">
                <div>
                  <div class="level-name">{{ level.name }}</div>
                  <div class="muted">条件：积分 ≥ {{ level.min_points }} · 排序 {{ level.level }}</div>
                </div>
                <el-tag :type="level.status === 1 ? 'success' : 'info'" effect="plain">
                  {{ level.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </div>
              <div class="benefit-line">
              折扣：{{ formatDiscount(level.discount_rate) }}
              · 倍率：{{ level.points_rate || 1 }}x
              · 权益：{{ formatBenefits(level) }}
            </div>
              <div class="level-actions">
                <el-button link type="primary" @click="openLevelDialog(level)">配置</el-button>
                <el-button
                  link
                  :type="level.status === 1 ? 'warning' : 'success'"
                  @click="toggleLevelStatus(level)"
                >
                  {{ level.status === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button link type="danger" @click="handleDeleteLevel(level)">删除</el-button>
              </div>
            </div>
          </div>
        </ListStateWrap>
      </el-tab-pane>

      <el-tab-pane label="积分规则" name="points">
        <div class="toolbar">
          <div class="muted">配置签到、消费赠送与兑换门槛；用户流水请到「积分日志」查看。</div>
          <div class="toolbar-spacer" />
          <el-button @click="goPointsLog">查看积分日志</el-button>
          <el-button type="warning" @click="openAdjustDialog()">手动调整积分</el-button>
          <el-button type="primary" :loading="rulesSaving" @click="savePointsRules">保存规则</el-button>
        </div>

        <div class="table-panel rules-panel" v-loading="rulesLoading">
          <el-form :model="pointsRulesForm" label-width="140px" class="rules-form">
            <div class="rules-section-title">每日签到</div>
            <el-form-item label="开启签到送积分">
              <el-switch v-model="pointsRulesForm.signInEnabled" />
            </el-form-item>
            <el-form-item label="每次签到积分">
              <el-input-number v-model="pointsRulesForm.signInPoints" :min="0" :max="9999" />
              <div class="field-hint">用户每日首次签到获得的积分</div>
            </el-form-item>

            <div class="rules-section-title">消费赠送</div>
            <el-form-item label="开启消费赠送">
              <el-switch v-model="pointsRulesForm.consumeEnabled" />
            </el-form-item>
            <el-form-item label="赠送比例">
              <el-input-number v-model="pointsRulesForm.consumeRate" :min="0" :max="100" :precision="0" />
              <div class="field-hint">实付 1 元赠送多少积分（订单完成后按此计算）</div>
            </el-form-item>

            <div class="rules-section-title">积分兑换</div>
            <el-form-item label="开启积分兑换">
              <el-switch v-model="pointsRulesForm.exchangeEnabled" />
            </el-form-item>
            <el-form-item label="最低兑换门槛">
              <el-input-number v-model="pointsRulesForm.exchangeMin" :min="0" :max="999999" />
              <div class="field-hint">单次兑换至少需要多少积分</div>
            </el-form-item>
          </el-form>

          <div class="rules-preview">
            <div class="rule-card" v-for="item in pointsRulesPreview" :key="item.title">
              <div class="rule-title">{{ item.title }}</div>
              <div class="rule-value">{{ item.value }}</div>
              <div class="muted">{{ item.desc }}</div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="标签管理" name="tags">
        <div class="coming-soon">
          <div class="coming-title">标签管理暂未开放</div>
          <div class="muted">自动打标与规则配置后续接入，当前请以会员等级与积分管理为主。</div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="profileVisible"
      :title="currentMember ? `会员画像：${currentMember.name}` : '会员画像'"
      width="560px"
    >
      <template v-if="currentMember">
        <div class="profile-stats">
          <div class="profile-stat">
            <span>会员等级</span>
            <strong>{{ currentMember.levelName }}</strong>
          </div>
          <div class="profile-stat">
            <span>积分余额</span>
            <strong>{{ currentMember.points }}</strong>
          </div>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="用户 ID">{{ currentMember.id }}</el-descriptions-item>
          <el-descriptions-item label="微信昵称">{{ currentMember.name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentMember.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="最近访问">{{ currentMember.lastVisit || '—' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ currentMember.createdAt || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <el-dialog
      v-model="levelDialogVisible"
      :title="isEditMode ? '编辑会员等级' : '新增会员等级'"
      width="560px"
      @closed="resetLevelForm"
    >
      <el-form ref="levelFormRef" :model="levelForm" :rules="levelRules" label-width="100px">
        <el-form-item label="等级名称" prop="name">
          <el-input v-model="levelForm.name" placeholder="如：金卡会员" />
        </el-form-item>
        <el-form-item label="等级序号" prop="level">
          <el-input-number v-model="levelForm.level" :min="1" :max="99" />
          <div class="field-hint">数字越大等级越高，用于排序</div>
        </el-form-item>
        <el-form-item label="最低积分" prop="min_points">
          <el-input-number v-model="levelForm.min_points" :min="0" />
        </el-form-item>
        <el-form-item label="折扣率">
          <el-input-number
            v-model="levelForm.discount_rate"
            :min="0.01"
            :max="1"
            :step="0.01"
            :precision="2"
          />
          <div class="field-hint">1 = 无折扣，0.9 = 九折（勾选「会员折扣」时生效）</div>
        </el-form-item>
        <el-form-item label="固定权益">
          <div class="benefit-checks">
            <el-checkbox-group v-model="levelForm.benefits">
              <div v-for="code in benefitOptions" :key="code" class="benefit-check-row">
                <el-checkbox :value="code">{{ MemberBenefitLabels[code] }}</el-checkbox>
                <span class="field-hint">{{ MemberBenefitHints[code] }}</span>
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item v-if="levelForm.benefits.includes(MemberBenefitCode.PointsBoost)" label="积分倍率">
          <el-input-number v-model="levelForm.points_rate" :min="1" :max="10" :step="0.1" :precision="2" />
        </el-form-item>
        <el-form-item
          v-if="levelForm.benefits.includes(MemberBenefitCode.BirthdayGift)"
          label="生日券"
          required
        >
          <el-select
            v-model="levelForm.birthday_coupon_id"
            filterable
            clearable
            placeholder="选择已发布的优惠券"
            style="width: 100%"
          >
            <el-option
              v-for="c in publishedCoupons"
              :key="c.id"
              :label="`${c.name} (#${c.id})`"
              :value="c.id"
            />
          </el-select>
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
          <el-input-number
            v-model="adjustForm.user_id"
            :min="1"
            controls-position="right"
            class="full"
            :disabled="!!adjustForm.lockedUser"
          />
        </el-form-item>
        <el-form-item v-if="adjustForm.userName" label="用户">
          <span>{{ adjustForm.userName }}</span>
        </el-form-item>
        <el-form-item label="调整积分" prop="points">
          <el-input-number v-model="adjustForm.points" controls-position="right" class="full" />
          <div class="field-hint">正数增加，负数扣减</div>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListStateWrap from '@/components/ListStateWrap.vue'
import { getUserList } from '@/api/user'
import { getCouponList } from '@/api/coupon'
import { getConfigByGroupSilent, updateConfigs } from '@/api/system'
import {
  adjustMemberPoints,
  createMemberLevel,
  deleteMemberLevel,
  getMemberLevelList,
  updateMemberLevel,
} from '@/api/member'
import type {
  CreateMemberLevelParams,
  MemberLevel,
  UpdateMemberLevelParams,
} from '@/types/member'
import {
  MemberBenefitCode,
  MemberBenefitHints,
  MemberBenefitLabels,
} from '@/types/member'

interface MemberRow {
  id: number
  name: string
  phone: string
  avatar?: string
  levelId?: number
  levelName: string
  points: number
  lastVisit: string
  createdAt: string
}

const router = useRouter()
const activeTab = ref('members')
const memberLoading = ref(false)
const memberError = ref<string | null>(null)
const members = ref<MemberRow[]>([])
const levelLoading = ref(false)
const levelError = ref<string | null>(null)
const levelList = ref<MemberLevel[]>([])
const rulesLoading = ref(false)
const rulesSaving = ref(false)
const profileVisible = ref(false)
const currentMember = ref<MemberRow | null>(null)

const memberSearch = reactive({ keyword: '', levelId: undefined as number | undefined })
const memberPagination = reactive({ page: 1, pageSize: 10, total: 0 })

const pointsRulesForm = reactive({
  signInEnabled: true,
  signInPoints: 10,
  consumeEnabled: true,
  consumeRate: 1,
  exchangeEnabled: true,
  exchangeMin: 100,
})

const pointsRulesPreview = computed(() => [
  {
    title: '每日签到',
    value: pointsRulesForm.signInEnabled ? `+${pointsRulesForm.signInPoints} 分` : '已关闭',
    desc: '用户每日首次签到发放',
  },
  {
    title: '消费赠送',
    value: pointsRulesForm.consumeEnabled ? `1 元 = ${pointsRulesForm.consumeRate} 分` : '已关闭',
    desc: '按实付金额计算',
  },
  {
    title: '积分兑换',
    value: pointsRulesForm.exchangeEnabled ? `${pointsRulesForm.exchangeMin} 分起兑` : '已关闭',
    desc: '兑换优惠券或商品时校验',
  },
])

const enabledLevels = computed(() =>
  [...levelList.value]
    .filter((l) => l.status === 1)
    .sort((a, b) => a.min_points - b.min_points || a.level - b.level),
)

const filteredMembers = computed(() => {
  if (!memberSearch.levelId) return members.value
  return members.value.filter((m) => m.levelId === memberSearch.levelId)
})

function formatDiscount(rate?: number) {
  const r = Number(rate ?? 1)
  if (!Number.isFinite(r) || r >= 1) return '无折扣'
  return `${(r * 10).toFixed(1)} 折`
}

function formatBenefits(level: MemberLevel) {
  const labels = (level.benefits || [])
    .map((code) => MemberBenefitLabels[code as MemberBenefitCode] || code)
    .filter(Boolean)
  if (labels.length) return labels.join('、')
  if (level.legacy_rights?.length) return level.legacy_rights.join('、')
  return '暂无'
}

const benefitOptions = Object.values(MemberBenefitCode)
const publishedCoupons = ref<{ id: number; name: string }[]>([])

async function fetchPublishedCoupons() {
  try {
    const res: any = await getCouponList({ page: 1, page_size: 100, status: 'published' })
    const list = res.data?.list || res.data?.records || []
    publishedCoupons.value = list.map((c: any) => ({ id: Number(c.id), name: c.name }))
  } catch {
    publishedCoupons.value = []
  }
}

function resolveLevel(points: number, levelId?: number | null): { id?: number; name: string } {
  const levels = enabledLevels.value
  if (levelId) {
    const hit = levelList.value.find((l) => l.id === levelId)
    if (hit) return { id: hit.id, name: hit.name }
  }
  if (!levels.length) return { name: '普通会员' }
  let matched = levels[0]
  for (const lv of levels) {
    if (points >= lv.min_points) matched = lv
  }
  return { id: matched.id, name: matched.name }
}

function normalizeMember(row: any): MemberRow {
  const points = Number(row.points ?? 0)
  const levelId = row.levelId ?? row.level_id ?? null
  const level = resolveLevel(points, levelId)
  return {
    id: Number(row.id),
    name: row.nickname || row.name || '',
    phone: row.phone || '',
    avatar: row.avatar || undefined,
    levelId: level.id,
    levelName: level.name,
    points,
    lastVisit: row.lastVisitAt || row.last_visit_at || row.lastVisit || '',
    createdAt: row.createTime || row.created_at || row.createdAt || '',
  }
}

async function fetchMembers() {
  memberLoading.value = true
  memberError.value = null
  try {
    const keyword = memberSearch.keyword.trim()
    const params: Record<string, any> = {
      current: memberPagination.page,
      size: memberPagination.pageSize,
    }
    if (keyword) {
      if (/^\d{6,}$/.test(keyword)) params.phone = keyword
      else params.keyword = keyword
    }
    const res: any = await getUserList(params)
    const page = res.data || {}
    const rows = page.records || page.list || []
    members.value = Array.isArray(rows) ? rows.map(normalizeMember) : []
    memberPagination.total = Number(page.total || members.value.length || 0)
  } catch (err: any) {
    members.value = []
    memberPagination.total = 0
    memberError.value = err?.message || '加载会员列表失败'
  } finally {
    memberLoading.value = false
  }
}

function handleMemberSearch() {
  memberPagination.page = 1
  fetchMembers()
}

async function fetchLevelList() {
  levelLoading.value = true
  levelError.value = null
  try {
    const res = await getMemberLevelList()
    levelList.value = res.data || []
  } catch (err: any) {
    levelList.value = []
    levelError.value = err?.message || '加载等级失败'
  } finally {
    levelLoading.value = false
  }
}

async function fetchPointsRules() {
  rulesLoading.value = true
  try {
    const res: any = await getConfigByGroupSilent('member')
    const rows = Array.isArray(res?.data) ? res.data : res?.data?.configs || []
    const map = new Map<string, string>()
    ;(Array.isArray(rows) ? rows : []).forEach((item: any) => {
      const key = item.configKey || item.config_key || item.key
      const val = item.configValue ?? item.config_value ?? item.value
      if (key != null) map.set(String(key), String(val ?? ''))
    })
    pointsRulesForm.signInPoints = Number(map.get('points_sign_in') ?? 10) || 10
    pointsRulesForm.consumeRate = Number(map.get('points_consume_rate') ?? 1) || 0
    pointsRulesForm.exchangeMin = Number(map.get('points_exchange_min') ?? 100) || 0
    pointsRulesForm.signInEnabled = isTruthy(map.get('points_sign_in_enabled'), true)
    pointsRulesForm.consumeEnabled = isTruthy(map.get('points_consume_enabled'), true)
    pointsRulesForm.exchangeEnabled = isTruthy(map.get('points_exchange_enabled'), true)
  } catch {
    /* 使用默认值 */
  } finally {
    rulesLoading.value = false
  }
}

function isTruthy(raw: string | undefined, defaultValue: boolean) {
  if (raw == null || raw === '') return defaultValue
  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

async function savePointsRules() {
  rulesSaving.value = true
  try {
    await updateConfigs([
      {
        configKey: 'points_sign_in',
        configValue: String(pointsRulesForm.signInPoints ?? 0),
        configGroup: 'member',
        description: '每日签到获得积分',
      },
      {
        configKey: 'points_consume_rate',
        configValue: String(pointsRulesForm.consumeRate ?? 0),
        configGroup: 'member',
        description: '消费赠送：每实付1元赠送积分',
      },
      {
        configKey: 'points_exchange_min',
        configValue: String(pointsRulesForm.exchangeMin ?? 0),
        configGroup: 'member',
        description: '积分兑换最低门槛',
      },
      {
        configKey: 'points_sign_in_enabled',
        configValue: pointsRulesForm.signInEnabled ? '1' : '0',
        configGroup: 'member',
        description: '是否开启每日签到送积分',
      },
      {
        configKey: 'points_consume_enabled',
        configValue: pointsRulesForm.consumeEnabled ? '1' : '0',
        configGroup: 'member',
        description: '是否开启消费赠送积分',
      },
      {
        configKey: 'points_exchange_enabled',
        configValue: pointsRulesForm.exchangeEnabled ? '1' : '0',
        configGroup: 'member',
        description: '是否开启积分兑换',
      },
    ])
    ElMessage.success('积分规则已保存')
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    rulesSaving.value = false
  }
}

function goPointsLog() {
  router.push({ name: 'MemberPoints' })
}

function handleTabChange(name: string | number) {
  if (name === 'members') fetchMembers()
  if (name === 'levels') fetchLevelList()
  if (name === 'points') fetchPointsRules()
}

function refreshCurrent() {
  handleTabChange(activeTab.value)
}

function openProfile(row: MemberRow) {
  currentMember.value = row
  profileVisible.value = true
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
  discount_rate: 1,
  points_rate: 1,
  benefits: [] as string[],
  birthday_coupon_id: undefined as number | undefined,
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
  levelForm.min_points = row?.min_points ?? 0
  levelForm.discount_rate = row?.discount_rate ?? 1
  levelForm.points_rate = row?.points_rate ?? 1
  levelForm.benefits = row?.benefits ? [...row.benefits] : []
  levelForm.birthday_coupon_id = row?.birthday_coupon_id || undefined
  levelForm.statusBool = row ? row.status === 1 : true
  fetchPublishedCoupons()
  levelDialogVisible.value = true
}

function resetLevelForm() {
  levelFormRef.value?.resetFields()
  levelForm.benefits = []
  levelForm.birthday_coupon_id = undefined
  levelForm.points_rate = 1
}

async function handleLevelSubmit() {
  const valid = await levelFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (
    levelForm.benefits.includes(MemberBenefitCode.BirthdayGift) &&
    !levelForm.birthday_coupon_id
  ) {
    ElMessage.warning('生日礼包需选择绑定的优惠券')
    return
  }
  levelSubmitting.value = true
  try {
    const payload: CreateMemberLevelParams = {
      name: levelForm.name.trim(),
      level: levelForm.level,
      min_points: levelForm.min_points,
      discount_rate: levelForm.discount_rate,
      points_rate: levelForm.points_rate,
      benefits: [...levelForm.benefits],
      birthday_coupon_id: levelForm.benefits.includes(MemberBenefitCode.BirthdayGift)
        ? levelForm.birthday_coupon_id
        : null,
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
    await fetchLevelList()
    if (activeTab.value === 'members') await fetchMembers()
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    levelSubmitting.value = false
  }
}

async function toggleLevelStatus(row: MemberLevel) {
  const status = row.status === 1 ? 0 : 1
  try {
    await updateMemberLevel(row.id, {
      name: row.name,
      level: row.level,
      min_points: row.min_points,
      discount_rate: row.discount_rate,
      points_rate: row.points_rate,
      benefits: row.benefits,
      birthday_coupon_id: row.birthday_coupon_id,
      status,
    })
    ElMessage.success(status === 1 ? '启用成功' : '禁用成功')
    fetchLevelList()
  } catch (err: any) {
    ElMessage.error(err?.message || '状态更新失败')
  }
}

async function handleDeleteLevel(row: MemberLevel) {
  try {
    await ElMessageBox.confirm(`确定删除等级「${row.name}」？`, '删除确认', { type: 'warning' })
    await deleteMemberLevel(row.id)
    ElMessage.success('删除成功')
    fetchLevelList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err?.message || '删除失败')
  }
}

const adjustDialogVisible = ref(false)
const adjustSubmitting = ref(false)
const adjustFormRef = ref()
const adjustForm = reactive({
  user_id: undefined as number | undefined,
  userName: '',
  lockedUser: false,
  points: undefined as number | undefined,
  remark: '',
})
const adjustRules = {
  user_id: [{ required: true, message: '请输入用户ID', trigger: 'change' }],
  points: [{ required: true, message: '请输入调整积分', trigger: 'change' }],
  remark: [{ required: true, message: '请输入调整原因', trigger: 'blur' }],
}

function openAdjustDialog(row?: MemberRow) {
  adjustForm.user_id = row?.id
  adjustForm.userName = row ? row.name || `用户 #${row.id}` : ''
  adjustForm.lockedUser = Boolean(row)
  adjustForm.points = undefined
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

function resetAdjustForm() {
  adjustFormRef.value?.resetFields()
  adjustForm.userName = ''
  adjustForm.lockedUser = false
}

async function handleAdjustSubmit() {
  const valid = await adjustFormRef.value?.validate().catch(() => false)
  if (!valid) return
  adjustSubmitting.value = true
  try {
    await adjustMemberPoints({
      user_id: adjustForm.user_id!,
      points: adjustForm.points!,
      remark: adjustForm.remark.trim(),
    })
    ElMessage.success('积分调整成功')
    adjustDialogVisible.value = false
    fetchMembers()
  } catch (err: any) {
    ElMessage.error(err?.message || '积分调整失败')
  } finally {
    adjustSubmitting.value = false
  }
}

onMounted(async () => {
  await fetchLevelList()
  await fetchMembers()
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
  .muted,
  .field-hint {
    color: #6b7b93;
    font-size: 13px;
  }

  .field-hint {
    margin-top: 4px;
    font-size: 12px;
  }

  .header-actions,
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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
  .rule-card {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 14px;
    padding: 16px;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
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
  .coming-title {
    font-weight: 800;
    color: #0d1b2e;
  }

  .user-phone {
    color: #6b7b93;
    font-size: 12px;
  }

  .level-grid,
  .rules-strip,
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

  .rule-value {
    margin: 8px 0 4px;
    font-size: 24px;
    line-height: 1;
    font-weight: 900;
    color: #1769ff;
  }

  .rules-panel {
    padding: 20px 24px 28px;
  }

  .rules-form {
    max-width: 560px;
  }

  .rules-section-title {
    margin: 8px 0 12px;
    font-weight: 800;
    color: #0d1b2e;
    font-size: 15px;

    &:not(:first-child) {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #eef2f8;
    }
  }

  .field-hint {
    width: 100%;
    margin-top: 6px;
    color: #6b7b93;
    font-size: 12px;
    line-height: 1.4;
  }

  .rules-preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #eef2f8;
  }

  .rule-card {
    padding: 16px;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    background: #f8faff;
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

  .benefit-checks {
    width: 100%;
  }

  .benefit-check-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .benefits-editor,
  .full {
    width: 100%;
  }

  .coming-soon {
    padding: 48px 24px;
    text-align: center;
    background: #fff;
    border: 1px dashed #d8dee9;
    border-radius: 14px;
  }

  .coming-title {
    margin-bottom: 8px;
    font-size: 16px;
  }
}
</style>
