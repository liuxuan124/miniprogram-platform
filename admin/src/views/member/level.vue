<template>
  <div class="member-level-container">
    <!-- 操作区 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>会员等级管理</span>
          <div style="display: flex; gap: 8px">
            <el-button type="primary" icon="Plus" @click="handleCreate">新增等级</el-button>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="levelList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="level" label="等级" width="80" align="center" sortable>
          <template #default="{ row }">
            <el-tag :type="getLevelTagType(row.level)" effect="dark" size="small">
              Lv.{{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="等级名称" min-width="120">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 6px">
              <el-icon v-if="row.icon" :size="18"><component :is="row.icon" /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="积分区间" width="180" align="center">
          <template #default="{ row }">
            {{ row.min_points }} ~ {{ row.max_points === -1 ? '无上限' : row.max_points }}
          </template>
        </el-table-column>
        <el-table-column prop="points_rate" label="积分倍率" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.points_rate }}x</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="discount_rate" label="折扣率" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="small">{{ (row.discount_rate * 10).toFixed(1) }}折</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权益" min-width="200">
          <template #default="{ row }">
            <template v-if="row.benefits && row.benefits.length > 0">
              <el-tag
                v-for="(b, idx) in row.benefits"
                :key="idx"
                size="small"
                type="success"
                style="margin: 2px"
              >
                {{ b }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="member_count" label="会员数" width="90" align="center">
          <template #default="{ row }">
            {{ row.member_count ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="(val: boolean) => handleToggleStatus(row, val)"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑会员等级' : '新增会员等级'"
      width="640px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="等级名称" prop="name">
              <el-input v-model="formData.name" placeholder="如：银卡会员" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级序号" prop="level">
              <el-input-number v-model="formData.level" :min="1" :max="100" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最低积分" prop="min_points">
              <el-input-number v-model="formData.min_points" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最高积分" prop="max_points">
              <el-input-number v-model="formData.max_points" :min="-1" controls-position="right" style="width: 100%" />
              <div class="form-tip">-1 表示无上限</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="积分倍率" prop="points_rate">
              <el-input-number v-model="formData.points_rate" :min="1" :max="10" :step="0.1" :precision="1" controls-position="right" style="width: 100%" />
              <div class="form-tip">如 1.5 表示获取积分 ×1.5</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="折扣率" prop="discount_rate">
              <el-input-number v-model="formData.discount_rate" :min="0.01" :max="1" :step="0.01" :precision="2" controls-position="right" style="width: 100%" />
              <div class="form-tip">如 0.95 表示 95 折</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="等级图标" prop="icon">
          <el-input v-model="formData.icon" placeholder="Element Plus 图标名称，如：Star" />
        </el-form-item>

        <el-form-item label="权益配置" prop="benefits">
          <div class="benefits-editor">
            <div v-for="(_, idx) in formData.benefits" :key="idx" class="benefit-item">
              <el-input v-model="formData.benefits![idx]" placeholder="权益描述" style="flex: 1" />
              <el-button link type="danger" @click="removeBenefit(idx)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link icon="Plus" @click="addBenefit">添加权益</el-button>
          </div>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getMemberLevelList,
  createMemberLevel,
  updateMemberLevel,
  deleteMemberLevel,
} from '@/api/member'
import type { MemberLevel, CreateMemberLevelParams } from '@/types/member'

/** 列表数据 */
const levelList = ref<MemberLevel[]>([])
const loading = ref(false)

/** 弹窗 */
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

/** 表单数据 */
const formData = reactive<CreateMemberLevelParams & { status: number }>({
  name: '',
  level: 1,
  icon: '',
  min_points: 0,
  max_points: -1,
  points_rate: 1,
  discount_rate: 1,
  benefits: [],
  status: 1,
})

/** 表单校验规则 */
const formRules: FormRules = {
  name: [{ required: true, message: '请输入等级名称', trigger: 'blur' }],
  level: [{ required: true, message: '请输入等级序号', trigger: 'blur' }],
  min_points: [{ required: true, message: '请输入最低积分', trigger: 'blur' }],
  points_rate: [{ required: true, message: '请输入积分倍率', trigger: 'blur' }],
  discount_rate: [{ required: true, message: '请输入折扣率', trigger: 'blur' }],
}

/** 等级标签颜色 */
function getLevelTagType(level: number): string {
  if (level >= 5) return 'danger'
  if (level >= 3) return 'warning'
  return ''
}

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    const res = await getMemberLevelList()
    levelList.value = (res.data || []).sort((a: MemberLevel, b: MemberLevel) => a.level - b.level)
  } catch {
    levelList.value = []
  } finally {
    loading.value = false
  }
}

/** 新增 */
function handleCreate() {
  isEdit.value = false
  editId.value = 0
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: MemberLevel) {
  isEdit.value = true
  editId.value = row.id
  formData.name = row.name
  formData.level = row.level
  formData.icon = row.icon || ''
  formData.min_points = row.min_points
  formData.max_points = row.max_points
  formData.points_rate = row.points_rate
  formData.discount_rate = row.discount_rate
  formData.benefits = row.benefits ? [...row.benefits] : []
  formData.status = row.status
  dialogVisible.value = true
}

/** 切换状态 */
async function handleToggleStatus(row: MemberLevel, val: boolean) {
  const status = val ? 1 : 0
  const label = val ? '启用' : '禁用'
  await ElMessageBox.confirm(`确定${label}等级「${row.name}」？`, '操作确认')
  await updateMemberLevel(row.id, { status })
  ElMessage.success(`${label}成功`)
  fetchList()
}

/** 删除 */
async function handleDelete(row: MemberLevel) {
  await ElMessageBox.confirm(`确定删除等级「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deleteMemberLevel(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/** 添加权益项 */
function addBenefit() {
  formData.benefits = formData.benefits || []
  formData.benefits.push('')
}

/** 移除权益项 */
function removeBenefit(idx: number) {
  formData.benefits?.splice(idx, 1)
}

/** 重置表单 */
function resetForm() {
  formData.name = ''
  formData.level = 1
  formData.icon = ''
  formData.min_points = 0
  formData.max_points = -1
  formData.points_rate = 1
  formData.discount_rate = 1
  formData.benefits = []
  formData.status = 1
  formRef.value?.resetFields()
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const data = {
      ...formData,
      benefits: formData.benefits?.filter((b) => b.trim() !== '') || [],
    }
    if (isEdit.value) {
      await updateMemberLevel(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createMemberLevel(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.member-level-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    margin-top: 4px;
  }

  .benefits-editor {
    width: 100%;

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
  }
}
</style>
