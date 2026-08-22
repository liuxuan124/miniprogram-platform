<template>
  <el-dialog v-model="visible" title="从文件库选择" width="860px" destroy-on-close @open="onOpen">
    <div class="picker-toolbar">
      <el-input v-model="keyword" placeholder="搜索文件名" clearable style="width: 220px" @keyup.enter="loadList" />
      <el-button type="primary" @click="loadList">搜索</el-button>
    </div>
    <el-table v-loading="loading" :data="records" height="360" @row-dblclick="selectRow">
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="fileType" label="类型" width="80" />
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ formatSize(row.size) }}</template>
      </el-table-column>
      <el-table-column prop="readMode" label="阅读" width="90" />
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
          <el-button link type="primary" @click="selectRow(row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getFileList, type FileItemRecord } from '@/api/files'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; select: [FileItemRecord] }>()

const visible = ref(false)
const loading = ref(false)
const keyword = ref('')
const records = ref<FileItemRecord[]>([])

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
  },
  { immediate: true },
)

watch(visible, (v) => emit('update:modelValue', v))

function formatSize(size?: number) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function loadList() {
  loading.value = true
  try {
    const res = await getFileList({ keyword: keyword.value || undefined, status: 'published', current: 1, size: 50 })
    records.value = ((res as any).data?.records || []) as FileItemRecord[]
  } finally {
    loading.value = false
  }
}

function onOpen() {
  loadList()
}

function selectRow(row: FileItemRecord) {
  emit('select', row)
  visible.value = false
}
</script>

<style scoped>
.picker-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
