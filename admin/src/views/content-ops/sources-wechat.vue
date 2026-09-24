<template>
  <div class="sources-page">
    <el-card shadow="never">
      <template #header>公众号内容同步</template>
      <p class="hint">默认以草稿方式增量导入（定时任务每 2 小时）。全量同步走下方按钮，进度见导入任务。</p>
      <el-button type="primary" :loading="syncing" @click="syncDraft">立即增量同步（草稿）</el-button>
      <el-button :loading="syncingPub" @click="syncPublished">同步已发布图文</el-button>
      <el-alert v-if="lastMsg" :title="lastMsg" type="info" show-icon style="margin-top: 16px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { post } from '@/api/request'

const syncing = ref(false)
const syncingPub = ref(false)
const lastMsg = ref('')

async function syncDraft() {
  syncing.value = true
  try {
    const res = await post('/api/v1/admin/wechat/official-account/sync-published', { publish: false })
    lastMsg.value = JSON.stringify((res as any).data || res)
    ElMessage.success('已触发同步')
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function syncPublished() {
  syncingPub.value = true
  try {
    await post('/api/v1/admin/wechat/official-account/sync-published', { publish: true })
    ElMessage.success('已提交同步任务')
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingPub.value = false
  }
}
</script>

<style scoped>
.hint { color: #666; font-size: 13px; margin-bottom: 12px; }
</style>
