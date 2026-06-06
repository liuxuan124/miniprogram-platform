<template>
  <div class="category-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>内容分类管理</span>
          <div class="header-actions">
            <el-button type="primary" icon="Plus" @click="handleAdd(null)">新增顶级分类</el-button>
            <el-button icon="Sort" @click="toggleExpandAll">
              {{ isExpandAll ? '全部折叠' : '全部展开' }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 树形表格 -->
      <el-table
        v-loading="loading"
        :data="categoryTree"
        row-key="id"
        border
        stripe
        :default-expand-all="isExpandAll"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        style="width: 100%"
      >
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="icon" label="图标" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getStatusTagType(row.status)"
              size="small"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" align="center" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleAdd(row)">
              <el-icon><Plus /></el-icon>新增子分类
            </el-button>
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
      :title="dialogType === 'create' ? '新增分类' : '编辑分类'"
      width="480px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="上级分类">
          <el-tree-select
            v-model="formData.parentId"
            :data="parentTreeOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="无上级分类（顶级分类）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入分类名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="formData.icon" placeholder="Element Plus 图标名称，如 Folder" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" controls-position="right" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api/content'
import type { ContentCategory } from '@/types/content'

/** 列表数据 */
const categoryTree = ref<ContentCategory[]>([])
const loading = ref(false)
const isExpandAll = ref(true)

/** 弹窗 */
const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const formData = reactive({
  name: '',
  parentId: null as number | null,
  sortOrder: 0,
  icon: '',
  status: 1,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

/** 父级分类树形选项（排除当前编辑项及其子项） */
const parentTreeOptions = computed(() => {
  if (dialogType.value === 'edit' && editingId.value) {
    return filterCategoryTree(categoryTree.value, editingId.value)
  }
  return categoryTree.value
})

/** 过滤掉指定 id 的分类及其所有子分类（编辑时不能选自己及子项作为父级） */
function filterCategoryTree(tree: ContentCategory[], excludeId: number): ContentCategory[] {
  return tree
    .filter((item) => item.id !== excludeId)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        return { ...item, children: filterCategoryTree(item.children, excludeId) }
      }
      return item
    })
}

/** 获取状态标签 */
function getStatusLabel(status: string | number): string {
  const code = Number(status)
  return code === 1 ? '启用' : '禁用'
}

/** 获取状态标签类型 */
function getStatusTagType(status: string | number): string {
  const code = Number(status)
  return code === 1 ? 'success' : 'info'
}

/** 切换全部展开/折叠 */
function toggleExpandAll() {
  isExpandAll.value = !isExpandAll.value
}

/** 获取分类列表 */
async function fetchList() {
  loading.value = true
  try {
    const res = await getCategoryList()
    categoryTree.value = res.data || []
  } catch {
    categoryTree.value = []
  } finally {
    loading.value = false
  }
}

/** 新增分类 */
function handleAdd(row: ContentCategory | null) {
  dialogType.value = 'create'
  editingId.value = null
  formData.name = ''
  formData.parentId = row?.id ?? null
  formData.sortOrder = 0
  formData.icon = ''
  formData.status = 1
  dialogVisible.value = true
}

/** 编辑分类 */
function handleEdit(row: ContentCategory) {
  dialogType.value = 'edit'
  editingId.value = row.id
  formData.name = row.name
  formData.parentId = (row as any).parentId ?? (row as any).parent_id ?? null
  formData.sortOrder = (row as any).sortOrder ?? (row as any).sort ?? 0
  formData.icon = row.icon || ''
  formData.status = Number((row as any).status ?? 1)
  dialogVisible.value = true
}

/** 删除分类 */
async function handleDelete(row: ContentCategory) {
  const hasChildren = row.children && row.children.length > 0
  const msg = hasChildren
    ? `分类「${row.name}」下存在子分类，确定删除？此操作不可恢复`
    : `确定删除分类「${row.name}」？此操作不可恢复`

  await ElMessageBox.confirm(msg, '删除确认', { type: 'warning' })
  await deleteCategory(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/** 提交表单 */
async function handleSubmit() {
  const form = formRef.value
  if (!form) return
  await form.validate()
  submitLoading.value = true
  try {
    if (dialogType.value === 'create') {
      await createCategory(formData)
      ElMessage.success('创建成功')
    } else if (editingId.value) {
      await updateCategory(editingId.value, formData)
      ElMessage.success('更新成功')
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
.category-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
