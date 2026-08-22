<template>
  <div class="comment-page">
    <div class="page-header">
      <div>
        <div class="page-title">评论审核</div>
        <div class="page-desc">新评论默认隐藏，审核通过后小程序端才可见。</div>
      </div>
    </div>

    <div class="toolbar">
      <el-input v-model="contentId" class="toolbar-input" placeholder="内容 ID（可选）" clearable />
      <el-select v-model="status" class="toolbar-select" placeholder="状态" clearable>
        <el-option label="待审/隐藏" :value="0" />
        <el-option label="已公开" :value="1" />
      </el-select>
      <el-button type="primary" @click="load">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="contentId" label="内容ID" width="100" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="content" label="评论" min-width="240" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '公开' : '待审' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="时间" width="180" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 1" link type="primary" @click="setStatus(row.id, 1)">通过</el-button>
          <el-button v-if="row.status === 1" link @click="setStatus(row.id, 0)">隐藏</el-button>
          <el-button link type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        layout="total, prev, pager, next"
        :total="total"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteComment,
  listContentComments,
  updateCommentStatus,
  type ContentCommentItem,
} from '@/api/content'

const loading = ref(false)
const rows = ref<ContentCommentItem[]>([])
const contentId = ref('')
const status = ref<number | undefined>(0)
const current = ref(1)
const size = ref(20)
const total = ref(0)

async function load() {
  loading.value = true
  try {
    const res = await listContentComments({
      contentId: contentId.value ? Number(contentId.value) : undefined,
      status: status.value,
      current: current.value,
      size: size.value,
    })
    const data = (res as any).data || {}
    rows.value = data.records || data.list || []
    total.value = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

async function setStatus(id: number, next: number) {
  await updateCommentStatus(id, next)
  ElMessage.success(next === 1 ? '已公开' : '已隐藏')
  await load()
}

async function remove(id: number) {
  await ElMessageBox.confirm('确认删除该评论？', '提示', { type: 'warning' })
  await deleteComment(id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.comment-page { padding: 16px 20px; }
.page-header { margin-bottom: 16px; }
.page-title { font-size: 18px; font-weight: 600; }
.page-desc { color: var(--el-text-color-secondary); margin-top: 4px; font-size: 13px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.toolbar-input { width: 180px; }
.toolbar-select { width: 140px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
