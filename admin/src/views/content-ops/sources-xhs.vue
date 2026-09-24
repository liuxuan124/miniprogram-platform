<template>
  <div class="sources-page">
    <el-card shadow="never">
      <template #header>小红书粘贴导入</template>
      <el-input v-model="pasteText" type="textarea" :rows="8" placeholder="粘贴分享文案" />
      <el-input v-model="originalUrl" placeholder="原文链接（可选）" style="margin-top: 12px" />
      <el-input v-model="imageUrlsText" type="textarea" :rows="3" placeholder="图片 URL，每行一条（需先上传到 CDN）" style="margin-top: 12px" />
      <el-button type="primary" :loading="loading" style="margin-top: 16px" @click="importPaste">导入为笔记草稿</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { post } from '@/api/request'

const router = useRouter()
const pasteText = ref('')
const originalUrl = ref('')
const imageUrlsText = ref('')
const loading = ref(false)

async function importPaste() {
  if (!pasteText.value.trim()) {
    ElMessage.warning('请粘贴文案')
    return
  }
  const imageUrls = imageUrlsText.value.split('\n').map((s) => s.trim()).filter(Boolean)
  loading.value = true
  try {
    const res = await post('/api/v1/admin/content-import/xiaohongshu/paste', {
      pasteText: pasteText.value,
      originalUrl: originalUrl.value,
      imageUrls,
    })
    const id = (res as any).data?.id
    ElMessage.success('已创建草稿')
    if (id) router.push({ path: '/content/write', query: { id: String(id), type: 'note' } })
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally {
    loading.value = false
  }
}
</script>
