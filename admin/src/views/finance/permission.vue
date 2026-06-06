<template>
  <div class="permission-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__info">
        <h2 class="page-header__title">财务权限</h2>
        <p class="page-header__desc">财务数据访问权限的分级控制与管理</p>
      </div>
    </div>

    <!-- 主内容区 -->
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <!-- ==================== 权限分配 ==================== -->
        <el-tab-pane label="权限分配" name="permission">
          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="toolbar__filters">
              <el-select
                v-model="filterRoleId"
                placeholder="筛选角色"
                clearable
                style="width: 160px"
                @change="handlePermissionSearch"
              >
                <el-option
                  v-for="role in roleList"
                  :key="role.id"
                  :label="role.name"
                  :value="role.id"
                />
              </el-select>
              <el-select
                v-model="filterDataRange"
                placeholder="数据范围"
                clearable
                style="width: 140px"
                @change="handlePermissionSearch"
              >
                <el-option label="仅本人" value="self" />
                <el-option label="本部门" value="department" />
                <el-option label="全部" value="all" />
              </el-select>
            </div>
            <el-button type="primary" icon="Plus" @click="handleAssignPermission">分配权限</el-button>
          </div>

          <!-- 权限表格 -->
          <el-table
            v-loading="permissionLoading"
            :data="permissionList"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="username" label="用户名" width="120" align="center" />
            <el-table-column prop="realName" label="姓名" width="100" align="center" />
            <el-table-column label="角色" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="getRoleTagType(row.role.level)" effect="dark" size="small">
                  {{ row.role.name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="权限范围" min-width="240">
              <template #default="{ row }">
                <el-tag
                  v-for="(s, idx) in row.scope"
                  :key="idx"
                  size="small"
                  style="margin: 2px"
                >
                  {{ getScopeLabel(s) }}
                </el-tag>
                <span v-if="!row.scope?.length">-</span>
              </template>
            </el-table-column>
            <el-table-column label="数据范围" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getDataRangeTagType(row.dataRange)" size="small">
                  {{ getDataRangeLabel(row.dataRange) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="分配时间" width="170" align="center">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleEditPermission(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleRemovePermission(row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="permissionPagination.page"
              v-model:page-size="permissionPagination.pageSize"
              :total="permissionPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="fetchPermissionList"
              @current-change="fetchPermissionList"
            />
          </div>
        </el-tab-pane>

        <!-- ==================== 角色管理 ==================== -->
        <el-tab-pane label="角色管理" name="role">
          <div class="toolbar">
            <span></span>
            <el-button type="primary" icon="Plus" @click="handleCreateRole">新建角色</el-button>
          </div>

          <el-row :gutter="16">
            <el-col
              v-for="role in roleList"
              :key="role.id"
              :xs="24"
              :sm="12"
              :md="8"
            >
              <el-card shadow="hover" class="role-card">
                <div class="role-card__header">
                  <span class="role-card__name">{{ role.name }}</span>
                  <el-tag :type="getRoleTagType(role.level)" size="small" effect="dark">
                    {{ PermissionLevelLabels[role.level] }}
                  </el-tag>
                </div>
                <p class="role-card__desc">{{ role.description || '暂无描述' }}</p>
                <div class="role-card__permissions">
                  <el-tag
                    v-for="(p, idx) in role.permissions"
                    :key="idx"
                    size="small"
                    type="info"
                    style="margin: 2px"
                  >
                    {{ getScopeLabel(p) }}
                  </el-tag>
                </div>
                <div class="role-card__footer">
                  <span class="role-card__count">成员：{{ role.memberCount }} 人</span>
                  <div class="role-card__actions">
                    <el-button link type="primary" size="small" @click="handleEditRole(role)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="handleDeleteRole(role)">删除</el-button>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ==================== 分配/编辑权限弹窗 ==================== -->
    <el-dialog
      v-model="permissionDialogVisible"
      :title="isEditPermission ? '编辑权限' : '分配权限'"
      width="580px"
      destroy-on-close
      @close="resetPermissionForm"
    >
      <el-form
        ref="permissionFormRef"
        :model="permissionForm"
        :rules="permissionFormRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="用户" prop="userId">
          <el-select
            v-model="permissionForm.userId"
            placeholder="搜索用户"
            filterable
            style="width: 100%"
            :disabled="isEditPermission"
          >
            <el-option
              v-for="u in userList"
              :key="u.id"
              :label="`${u.realName}（${u.username}）`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色" prop="roleId">
          <el-select
            v-model="permissionForm.roleId"
            placeholder="选择角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in roleList"
              :key="role.id"
              :label="`${role.name}（${PermissionLevelLabels[role.level]}）`"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="权限范围" prop="scope">
          <el-checkbox-group v-model="permissionForm.scope">
            <el-checkbox
              v-for="opt in scopeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="数据范围" prop="dataRange">
          <el-radio-group v-model="permissionForm.dataRange">
            <el-radio value="self">仅本人</el-radio>
            <el-radio value="department">本部门</el-radio>
            <el-radio value="all">全部</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="permissionSubmitLoading" @click="handlePermissionSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新建/编辑角色弹窗 ==================== -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="isEditRole ? '编辑角色' : '新建角色'"
      width="580px"
      destroy-on-close
      @close="resetRoleForm"
    >
      <el-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleFormRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>

        <el-form-item label="权限级别" prop="level">
          <el-select v-model="roleForm.level" placeholder="选择权限级别" style="width: 100%">
            <el-option
              v-for="opt in levelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>

        <el-form-item label="权限列表" prop="permissions">
          <el-checkbox-group v-model="roleForm.permissions">
            <el-checkbox
              v-for="opt in scopeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleSubmitLoading" @click="handleRoleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getFinanceRoles,
  saveFinanceRole,
  deleteFinanceRole,
  getFinancePermissions,
  assignPermission,
  updatePermission,
  removePermission,
} from '@/api/finance'
import type {
  FinanceRole,
  FinancePermission,
  PermissionAssignParams,
  PermissionLevel,
} from '@/types/finance'
import { PermissionLevelLabels } from '@/types/finance'

// ==================== 常量 ====================

/** 权限范围选项 */
const scopeOptions = [
  { value: 'income_view', label: '收支查看' },
  { value: 'income_edit', label: '收支编辑' },
  { value: 'report_view', label: '报表查看' },
  { value: 'report_export', label: '报表导出' },
  { value: 'budget_manage', label: '预算管理' },
  { value: 'invoice_manage', label: '发票管理' },
  { value: 'tax_calc', label: '税务计算' },
  { value: 'permission_manage', label: '权限管理' },
]

/** 权限级别选项 */
const levelOptions: { value: PermissionLevel; label: string }[] = [
  { value: 'viewer', label: '查看者 — 仅可查看数据' },
  { value: 'editor', label: '编辑者 — 可查看和编辑数据' },
  { value: 'approver', label: '审批者 — 可审批财务流程' },
  { value: 'admin', label: '管理员 — 拥有全部权限' },
]

/** 权限范围值到标签映射 */
const scopeLabelMap: Record<string, string> = Object.fromEntries(
  scopeOptions.map((o) => [o.value, o.label])
)

/** 数据范围标签映射 */
const dataRangeLabelMap: Record<string, string> = {
  self: '仅本人',
  department: '本部门',
  all: '全部',
}

// ==================== Tab 状态 ====================

const activeTab = ref('permission')

// ==================== 角色数据 ====================

const roleList = ref<FinanceRole[]>([])

async function fetchRoleList() {
  try {
    const res = await getFinanceRoles()
    roleList.value = res.data || []
  } catch {
    roleList.value = []
  }
}

// ==================== 权限分配 ====================

const permissionLoading = ref(false)
const permissionList = ref<FinancePermission[]>([])
const filterRoleId = ref<number | undefined>()
const filterDataRange = ref<string | undefined>()
const permissionPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

async function fetchPermissionList() {
  permissionLoading.value = true
  try {
    const res = await getFinancePermissions({
      roleId: filterRoleId.value,
    })
    let list: FinancePermission[] = res.data || []
    // 前端筛选数据范围
    if (filterDataRange.value) {
      list = list.filter((p) => p.dataRange === filterDataRange.value)
    }
    permissionPagination.total = list.length
    const start = (permissionPagination.page - 1) * permissionPagination.pageSize
    permissionList.value = list.slice(start, start + permissionPagination.pageSize)
  } catch {
    permissionList.value = []
    permissionPagination.total = 0
  } finally {
    permissionLoading.value = false
  }
}

function handlePermissionSearch() {
  permissionPagination.page = 1
  fetchPermissionList()
}

// ==================== 分配/编辑权限弹窗 ====================

const permissionDialogVisible = ref(false)
const isEditPermission = ref(false)
const editPermissionId = ref<number>(0)
const permissionSubmitLoading = ref(false)
const permissionFormRef = ref<FormInstance>()

/** 模拟用户列表（实际应从用户接口获取） */
const userList = ref<{ id: number; username: string; realName: string }[]>([])

const permissionForm = reactive<PermissionAssignParams>({
  userId: undefined as unknown as number,
  roleId: undefined as unknown as number,
  scope: [],
  dataRange: 'self',
})

const permissionFormRules: FormRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
  scope: [
    {
      type: 'array',
      required: true,
      message: '请至少选择一项权限范围',
      trigger: 'change',
    },
  ],
  dataRange: [{ required: true, message: '请选择数据范围', trigger: 'change' }],
}

function handleAssignPermission() {
  isEditPermission.value = false
  editPermissionId.value = 0
  permissionDialogVisible.value = true
}

function handleEditPermission(row: FinancePermission) {
  isEditPermission.value = true
  editPermissionId.value = row.id
  permissionForm.userId = row.userId
  permissionForm.roleId = row.role.id
  permissionForm.scope = [...row.scope]
  permissionForm.dataRange = row.dataRange
  permissionDialogVisible.value = true
}

async function handleRemovePermission(row: FinancePermission) {
  await ElMessageBox.confirm(
    `确定移除用户「${row.realName}」的财务权限？`,
    '移除确认',
    { type: 'warning' }
  )
  await removePermission(row.id)
  ElMessage.success('移除成功')
  fetchPermissionList()
  fetchRoleList()
}

function resetPermissionForm() {
  permissionForm.userId = undefined as unknown as number
  permissionForm.roleId = undefined as unknown as number
  permissionForm.scope = []
  permissionForm.dataRange = 'self'
  permissionFormRef.value?.resetFields()
}

async function handlePermissionSubmit() {
  const valid = await permissionFormRef.value?.validate().catch(() => false)
  if (!valid) return

  permissionSubmitLoading.value = true
  try {
    if (isEditPermission.value) {
      await updatePermission(editPermissionId.value, { ...permissionForm })
      ElMessage.success('更新成功')
    } else {
      await assignPermission({ ...permissionForm })
      ElMessage.success('分配成功')
    }
    permissionDialogVisible.value = false
    fetchPermissionList()
    fetchRoleList()
  } finally {
    permissionSubmitLoading.value = false
  }
}

// ==================== 角色管理弹窗 ====================

const roleDialogVisible = ref(false)
const isEditRole = ref(false)
const editRoleId = ref<number>(0)
const roleSubmitLoading = ref(false)
const roleFormRef = ref<FormInstance>()

const roleForm = reactive({
  name: '',
  level: '' as PermissionLevel | '',
  description: '',
  permissions: [] as string[],
})

const roleFormRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择权限级别', trigger: 'change' }],
  permissions: [
    {
      type: 'array',
      required: true,
      message: '请至少选择一项权限',
      trigger: 'change',
    },
  ],
}

function handleCreateRole() {
  isEditRole.value = false
  editRoleId.value = 0
  roleDialogVisible.value = true
}

function handleEditRole(role: FinanceRole) {
  isEditRole.value = true
  editRoleId.value = role.id
  roleForm.name = role.name
  roleForm.level = role.level
  roleForm.description = role.description || ''
  roleForm.permissions = [...role.permissions]
  roleDialogVisible.value = true
}

async function handleDeleteRole(role: FinanceRole) {
  if (role.memberCount > 0) {
    ElMessage.warning(`角色「${role.name}」下还有 ${role.memberCount} 位成员，无法删除`)
    return
  }
  await ElMessageBox.confirm(
    `确定删除角色「${role.name}」？此操作不可恢复`,
    '删除确认',
    { type: 'warning' }
  )
  await deleteFinanceRole(role.id)
  ElMessage.success('删除成功')
  fetchRoleList()
}

function resetRoleForm() {
  roleForm.name = ''
  roleForm.level = ''
  roleForm.description = ''
  roleForm.permissions = []
  roleFormRef.value?.resetFields()
}

async function handleRoleSubmit() {
  const valid = await roleFormRef.value?.validate().catch(() => false)
  if (!valid) return

  roleSubmitLoading.value = true
  try {
    const data = {
      name: roleForm.name,
      level: roleForm.level as PermissionLevel,
      description: roleForm.description,
      permissions: roleForm.permissions,
    }
    if (isEditRole.value) {
      await saveFinanceRole({ ...data, id: editRoleId.value })
      ElMessage.success('更新成功')
    } else {
      await saveFinanceRole(data)
      ElMessage.success('创建成功')
    }
    roleDialogVisible.value = false
    fetchRoleList()
  } finally {
    roleSubmitLoading.value = false
  }
}

// ==================== 辅助函数 ====================

function getRoleTagType(level: PermissionLevel): string {
  const map: Record<PermissionLevel, string> = {
    viewer: 'info',
    editor: 'primary',
    approver: 'warning',
    admin: 'danger',
  }
  return map[level] || 'info'
}

function getDataRangeTagType(dataRange: string): string {
  const map: Record<string, string> = {
    self: 'info',
    department: 'warning',
    all: 'danger',
  }
  return map[dataRange] || 'info'
}

function getDataRangeLabel(dataRange: string): string {
  return dataRangeLabelMap[dataRange] || dataRange
}

function getScopeLabel(scope: string): string {
  return scopeLabelMap[scope] || scope
}

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

// ==================== 初始化 ====================

onMounted(() => {
  fetchRoleList()
  fetchPermissionList()
})
</script>

<style lang="scss" scoped>
.permission-page {
  .page-header {
    margin-bottom: 16px;

    &__title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }

    &__desc {
      margin: 4px 0 0;
      font-size: 13px;
      color: #909399;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    &__filters {
      display: flex;
      gap: 12px;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .role-card {
    margin-bottom: 16px;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    &__name {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    &__desc {
      margin: 0 0 12px;
      font-size: 13px;
      color: #909399;
      line-height: 1.5;
    }

    &__permissions {
      margin-bottom: 12px;
      min-height: 28px;
    }

    &__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #ebeef5;
      padding-top: 12px;
    }

    &__count {
      font-size: 13px;
      color: #606266;
    }

    &__actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
