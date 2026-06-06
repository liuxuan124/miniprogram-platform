<template>
  <el-dialog
    v-model="visibleProxy"
    title="分类管理"
    width="540px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="group-manager-body">
      <div class="group-add">
        <el-input
          v-model="newGroupName"
          placeholder="输入分类名称"
          maxlength="20"
          show-word-limit
          @keyup.enter="handleAdd"
        >
          <template #append>
            <el-button :icon="Plus" :loading="adding" @click="handleAdd">添加</el-button>
          </template>
        </el-input>
      </div>

      <div v-if="groups.length" class="group-list">
        <div v-for="group in groups" :key="group.id" class="group-item">
          <template v-if="editingId === group.id">
            <el-input
              v-model="editingName"
              size="small"
              maxlength="20"
              @keyup.enter="handleSaveEdit(group.id)"
              @keyup.escape="editingId = null"
            />
            <el-button type="primary" size="small" :icon="Check" @click="handleSaveEdit(group.id)">保存</el-button>
            <el-button size="small" @click="editingId = null">取消</el-button>
          </template>
          <template v-else>
            <div class="group-info">
              <span class="group-icon">📁</span>
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.count ?? 0 }} 个素材</span>
            </div>
            <div class="group-actions">
              <el-button text size="small" @click="startEdit(group)">重命名</el-button>
              <el-popconfirm title="删除该分类？分类下的素材将移至未分组" @confirm="handleDelete(group.id)">
                <template #reference>
                  <el-button text size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </div>
      </div>

      <el-empty v-else description="暂无分类，请添加" :image-size="80" />
    </div>

    <template #footer>
      <el-button @click="visibleProxy = false">完成</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Check } from '@element-plus/icons-vue'
import { createGroup, updateGroup, deleteGroup } from '@/api/asset'
import type { MaterialGroup } from '@/types/asset'

const props = defineProps<{
  visible: boolean
  groups: MaterialGroup[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  changed: []
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const newGroupName = ref('')
const adding = ref(false)
const editingId = ref<number | null>(null)
const editingName = ref('')

async function handleAdd() {
  const name = newGroupName.value.trim()
  if (!name) return
  adding.value = true
  try {
    await createGroup({ name, sortOrder: props.groups.length + 1 })
    newGroupName.value = ''
    ElMessage.success('分类已创建')
    emit('changed')
  } finally {
    adding.value = false
  }
}

function startEdit(group: MaterialGroup) {
  editingId.value = group.id
  editingName.value = group.name
}

async function handleSaveEdit(id: number) {
  const name = editingName.value.trim()
  if (!name) return
  try {
    await updateGroup(id, { name })
    editingId.value = null
    ElMessage.success('已重命名')
    emit('changed')
  } catch {
    /* ignore */
  }
}

async function handleDelete(id: number) {
  try {
    await deleteGroup(id)
    ElMessage.success('分类已删除')
    emit('changed')
  } catch {
    /* ignore */
  }
}
</script>

<style lang="scss" scoped>
.group-manager-body {
  display: grid;
  gap: 16px;
}

.group-add {
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f5;
}

.group-list {
  display: grid;
  gap: 4px;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f9fb;
  transition: background 0.15s;

  &:hover {
    background: #f0f4ff;
  }
}

.group-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.group-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.group-count {
  font-size: 12px;
  color: #999;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
