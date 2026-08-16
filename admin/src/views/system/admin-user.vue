<template>
  <div class="admin-user-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <h2>管理员账号</h2>
            <p class="header-desc">管理系统后台账号、分配角色与权限</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreate">
              <el-icon><Plus /></el-icon>
              <span>新建管理员</span>
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="账号/姓名/手机号" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="全部角色" clearable style="width: 160px">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="username" label="登录账号" min-width="120" />
        <el-table-column prop="realName" label="真实姓名" min-width="100" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="角色" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="displayRoleName(row)" :type="row.roleCode === 'super_admin' ? 'danger' : 'primary'" size="small">
              {{ displayRoleName(row) }}
            </el-tag>
            <span v-else class="empty-text">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" min-width="160">
          <template #default="{ row }">
            <span>{{ row.lastLoginAt || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="row.roleCode === 'super_admin' || row.id === currentUserId"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.page_size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" placeholder="登录账号" :disabled="isEdit" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="初始密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="8-32位，建议含字母数字" />
        </el-form-item>
        <el-form-item v-else label="重置密码">
          <el-input v-model="form.password" type="password" show-password placeholder="留空则不修改密码" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" inline-prompt />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getAdminUserList,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getRoleList,
} from '@/api/admin-user'
import type { AdminUserRecord, AdminUserPayload, RoleRecord } from '@/api/admin-user'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const currentUserId = computed(() => (userStore.userInfo as any)?.id)

const loading = ref(false)
const tableData = ref<AdminUserRecord[]>([])
const roles = ref<RoleRecord[]>([])

const searchForm = reactive({
  keyword: '',
  roleId: undefined as number | undefined,
  status: undefined as number | undefined,
})

const pagination = reactive({
  page: 1,
  page_size: 10,
  total: 0,
})

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const isEdit = ref(false)
const editingId = ref<number>(0)

const dialogTitle = computed(() => (isEdit.value ? '编辑管理员' : '新建管理员'))

const form = reactive<AdminUserPayload & { status: number }>({
  username: '',
  password: '',
  realName: '',
  phone: '',
  roleId: undefined,
  status: 1,
})

const rules = computed<FormRules>(() => ({
  username: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { max: 64, message: '账号最长 64 字符', trigger: 'blur' },
  ],
  password: isEdit.value
    ? [{ min: 8, max: 32, message: '密码长度 8-32 位', trigger: 'blur' }]
    : [
        { required: true, message: '请输入初始密码', trigger: 'blur' },
        { min: 8, max: 32, message: '密码长度 8-32 位', trigger: 'blur' },
        {
          validator: (_r, v: string, cb) => {
            if (!v) return cb()
            if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return cb(new Error('建议含字母和数字'))
            cb()
          },
          trigger: 'blur',
        },
      ],
  realName: [{ max: 64, message: '姓名最长 64 字符', trigger: 'blur' }],
  phone: [{ max: 20, message: '手机号最长 20 字符', trigger: 'blur' }],
}))

function displayRoleName(row: { roleName?: string; roleCode?: string }) {
  if (row.roleCode === 'super_admin') return '超级管理员'
  const name = String(row.roleName || '')
  if (!name) return ''
  if (/[^\u0000-\u00ff]/.test(name)) return name
  try {
    const fixed = decodeURIComponent(escape(name))
    if (/[^\u0000-\u00ff]/.test(fixed)) return fixed
  } catch {
    // ignore
  }
  return name
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getAdminUserList({
      page: pagination.page,
      page_size: pagination.page_size,
      keyword: searchForm.keyword || undefined,
      roleId: searchForm.roleId,
      status: searchForm.status,
    })
    const data: any = res.data
    tableData.value = data?.items || data?.records || []
    pagination.total = data?.total || 0
  } catch {
    ElMessage.error('获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  try {
    const res = await getRoleList()
    roles.value = res.data || []
  } catch {
    /* ignore */
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.roleId = undefined
  searchForm.status = undefined
  pagination.page = 1
  fetchList()
}

function resetForm() {
  form.username = ''
  form.password = ''
  form.realName = ''
  form.phone = ''
  form.roleId = undefined
  form.status = 1
  formRef.value?.clearValidate()
}

function openCreate() {
  isEdit.value = false
  editingId.value = 0
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: AdminUserRecord) {
  isEdit.value = true
  editingId.value = row.id
  form.username = row.username
  form.password = ''
  form.realName = row.realName || ''
  form.phone = row.phone || ''
  form.roleId = row.roleId
  form.status = row.status
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload: AdminUserPayload = {
      username: form.username,
      realName: form.realName || undefined,
      phone: form.phone || undefined,
      roleId: form.roleId,
      status: form.status,
    }
    if (form.password) payload.password = form.password
    if (isEdit.value) {
      await updateAdminUser(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createAdminUser(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: AdminUserRecord) {
  try {
    await ElMessageBox.confirm(
      `确定删除管理员「${row.realName || row.username}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' },
    )
    await deleteAdminUser(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(() => {
  fetchRoles()
  fetchList()
})
</script>

<style lang="scss" scoped>
.admin-user-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;

    .header-left {
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
      .header-desc {
        margin: 4px 0 0;
        font-size: 13px;
        color: #909399;
      }
    }
  }

  .search-form {
    margin-bottom: 16px;
  }

  .empty-text {
    color: #c0c4cc;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
