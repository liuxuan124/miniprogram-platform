<template>
  <div class="category-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品分类管理</span>
          <el-button type="primary" @click="handleAdd(null)">新增一级分类</el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="categoryTree"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        border
        default-expand-all
      >
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleAdd(row)">新增子分类</el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm :title="`确定删除分类「${row.name}」吗？删除后不可恢复。`" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="上级分类">
          <el-tree-select
            v-model="formData.parentId"
            :data="parentTreeOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="无（一级分类）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="分类图标">
          <div class="category-icon-field">
            <div class="icon-input-row">
              <div class="icon-preview" :class="{ empty: !formData.icon }">
                {{ formData.icon || '图' }}
              </div>
              <el-input
                v-model="formData.icon"
                clearable
                placeholder="可选：输入 emoji、图片 URL 或英文标识，如 product"
              />
            </div>
            <div class="icon-presets">
              <button
                v-for="preset in iconPresets"
                :key="preset.value"
                type="button"
                class="icon-preset"
                :class="{ active: formData.icon === preset.value }"
                @click="formData.icon = preset.value"
              >
                <span>{{ preset.value }}</span>
                {{ preset.label }}
              </button>
            </div>
            <div class="field-tip">用于后台和小程序分类展示；不需要图标时可留空。</div>
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
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api/product'
import type { ProductCategory, CreateCategoryParams, UpdateCategoryParams } from '@/types/product'

const loading = ref(false)
const submitting = ref(false)
const categoryTree = ref<ProductCategory[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const dialogTitle = computed(() => (editingId.value ? '编辑分类' : '新增分类'))

const formData = ref<{
  parentId: number | null
  name: string
  sortOrder: number
  icon: string
  status: number
}>({
  parentId: null,
  name: '',
  sortOrder: 0,
  icon: '',
  status: 1,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请输入排序值', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const iconPresets = [
  { label: '产品', value: '📦' },
  { label: '礼盒', value: '🎁' },
  { label: '服务', value: '🛠️' },
  { label: '课程', value: '🎓' },
  { label: '活动', value: '🎪' },
  { label: '精选', value: '⭐' },
]

/** 构建上级分类树选项（排除自身及子级） */
const parentTreeOptions = computed(() => {
  if (!editingId.value) return categoryTree.value
  const filterTree = (list: ProductCategory[]): ProductCategory[] => {
    return list
      .filter((item) => item.id !== editingId.value)
      .map((item) => ({
        ...item,
        children: item.children ? filterTree(item.children) : undefined,
      }))
  }
  return filterTree(categoryTree.value)
})

/** 加载分类列表 */
async function fetchCategories() {
  loading.value = true
  try {
    const res = await getCategoryList()
    const raw = (res as any).data || []
    categoryTree.value = raw.map((item: any) => normalizeCategory(item))
  } catch {
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

function normalizeCategory(raw: any): ProductCategory {
  return {
    id: Number(raw.id),
    name: raw.name || '',
    parent_id: (raw.parentId ?? raw.parent_id ?? 0) === 0 ? null : Number(raw.parentId ?? raw.parent_id),
    sort: Number(raw.sortOrder ?? raw.sort ?? 0),
    icon: raw.icon || '',
    status: Number(raw.status ?? 1),
    created_at: raw.createTime ?? raw.created_at ?? '',
    updated_at: raw.updateTime ?? raw.updated_at ?? '',
    children: Array.isArray(raw.children) ? raw.children.map((c: any) => normalizeCategory(c)) : [],
  }
}

/** 新增 */
function handleAdd(parent: ProductCategory | null) {
  editingId.value = null
  formData.value = {
    parentId: parent ? parent.id : null,
    name: '',
    sortOrder: 0,
    icon: '',
    status: 1,
  }
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: ProductCategory) {
  editingId.value = row.id
  formData.value = {
    parentId: row.parent_id,
    name: row.name,
    sortOrder: row.sort,
    icon: row.icon || '',
    status: row.status,
  }
  dialogVisible.value = true
}

/** 提交 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingId.value) {
      const params: UpdateCategoryParams = {
        name: formData.value.name,
        parent_id: formData.value.parentId,
        sort: formData.value.sortOrder,
        icon: formData.value.icon,
        status: formData.value.status,
      }
      await updateCategory(editingId.value, params)
      ElMessage.success('更新成功')
    } else {
      const params: CreateCategoryParams = {
        name: formData.value.name,
        parent_id: formData.value.parentId,
        sort: formData.value.sortOrder,
        icon: formData.value.icon,
        status: formData.value.status,
      }
      await createCategory(params)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchCategories()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

/** 删除 */
async function handleDelete(row: ProductCategory) {
  try {
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    await fetchCategories()
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.category-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-icon-field {
  width: 100%;
}

.icon-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-preview {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d8e0ec;
  border-radius: 8px;
  background: #f5f8ff;
  color: #303a4d;
  font-size: 20px;
  font-weight: 700;
}

.icon-preview.empty {
  color: #9aa6b8;
  font-size: 13px;
  font-weight: 600;
}

.icon-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.icon-preset {
  height: 32px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d8e0ec;
  border-radius: 8px;
  background: #fff;
  color: #4b5568;
  cursor: pointer;
}

.icon-preset:hover,
.icon-preset.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #1677ff;
}

.field-tip {
  margin-top: 8px;
  color: #7b8798;
  font-size: 12px;
  line-height: 1.5;
}
</style>
