<template>
  <div class="file-library-page">
    <header class="page-header">
      <div>
        <h1>文件库</h1>
        <p class="sub">独立管理资料文件与阅读/下载权限，可关联到动态附件</p>
      </div>
      <div class="actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openEdit()">上传文件</el-button>
      </div>
    </header>

    <el-card shadow="never" class="filter-card">
      <el-form inline @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="文件名" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" clearable placeholder="全部" style="width: 140px">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="groupId" clearable placeholder="全部" style="width: 160px">
            <el-option label="未分组" :value="-1" />
            <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="records" stripe>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="fileType" label="类型" width="80" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="qualityTier" label="质量" width="90">
          <template #default="{ row }">{{ row.qualityTier === 'premium' ? '精品' : '普通' }}</template>
        </el-table-column>
        <el-table-column prop="readMode" label="阅读权限" width="110" />
        <el-table-column prop="downloadAudience" label="下载范围" width="110" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row.id)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="current"
          v-model:page-size="size"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { deleteFile, getFileGroups, getFileList, type FileGroupItem, type FileItemRecord } from '@/api/files'

const router = useRouter()
const loading = ref(false)
const records = ref<FileItemRecord[]>([])
const groups = ref<FileGroupItem[]>([])
const keyword = ref('')
const status = ref('')
const groupId = ref<number | undefined>()
const current = ref(1)
const size = ref(10)
const total = ref(0)

function formatSize(size?: number) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function loadGroups() {
  const res = await getFileGroups()
  groups.value = (res as any).data || []
}

async function loadList() {
  loading.value = true
  try {
    const res = await getFileList({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
      groupId: groupId.value,
      current: current.value,
      size: size.value,
    })
    const data = (res as any).data || {}
    records.value = data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function openEdit(id?: number) {
  router.push(id ? `/content/files/edit?id=${id}` : '/content/files/edit')
}

async function handleDelete(row: FileItemRecord) {
  await ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' })
  await deleteFile(row.id)
  ElMessage.success('已删除')
  loadList()
}

onMounted(async () => {
  await loadGroups()
  await loadList()
})
</script>

<style scoped>
.file-library-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-header h1 { margin: 0 0 4px; font-size: 20px; }
.sub { margin: 0; color: #909399; font-size: 13px; }
.actions { display: flex; gap: 8px; }
.filter-card { margin-bottom: 12px; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
