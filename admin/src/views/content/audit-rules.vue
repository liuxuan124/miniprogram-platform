<template>
  <div class="rules-page">
    <div class="page-header">
      <div>
        <div class="page-title">审核规则</div>
        <div class="page-desc">敏感词与机器拦截说明，命中后进入「机器拦截」Tab。</div>
      </div>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
    <el-form label-width="120px" class="form">
      <el-form-item label="启用机器拦截">
        <el-switch v-model="form.autoBlockEnabled" />
      </el-form-item>
      <el-form-item label="敏感词列表">
        <el-input
          v-model="form.sensitiveWords"
          type="textarea"
          :rows="6"
          placeholder="逗号或换行分隔，如：赌博,色情"
        />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="form.note" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { get, put } from '@/api/request'

const saving = ref(false)
const form = reactive({
  sensitiveWords: '',
  autoBlockEnabled: true,
  note: '',
})

async function load() {
  const res = await get<any>('/api/v1/admin/audit/rules')
  const data = (res as any)?.data ?? res ?? {}
  form.sensitiveWords = data.sensitiveWords || ''
  form.autoBlockEnabled = data.autoBlockEnabled !== false
  form.note = data.note || ''
}

async function save() {
  saving.value = true
  try {
    await put('/api/v1/admin/audit/rules', { ...form })
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.rules-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 18px; font-weight: 600; }
.page-desc { margin-top: 4px; color: #909399; font-size: 13px; }
.form { max-width: 640px; }
</style>
