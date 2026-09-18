<template>
  <div class="community-page" v-loading="loading">
    <div class="page-head">
      <div>
        <h2>客服与社群</h2>
        <p>在线客服入口、企微链接与分方向读者群，从小程序 join / 客服页读取。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </div>

    <el-form label-width="120px" class="form">
      <el-form-item label="客服电话">
        <el-input v-model="form.servicePhone" placeholder="与基础设置可一致，此处供社群页展示" />
      </el-form-item>
      <el-form-item label="企微客服链接">
        <el-input v-model="form.wecomUrl" placeholder="https://work.weixin.qq.com/..." />
      </el-form-item>
      <el-form-item label="在线客服说明">
        <el-input v-model="form.onlineServiceHint" type="textarea" :rows="2" placeholder="引导用户进入客服会话的文案" />
      </el-form-item>
      <el-form-item label="进群须知">
        <el-input v-model="form.joinNotice" type="textarea" :rows="3" />
      </el-form-item>
      <el-divider>读者群</el-divider>
      <div v-for="(g, i) in form.groups" :key="i" class="group-card">
        <el-form-item :label="`群 ${i + 1} 名称`">
          <el-input v-model="g.name" />
        </el-form-item>
        <el-form-item label="方向标签">
          <el-input v-model="g.direction" placeholder="如：写作 / 电商" />
        </el-form-item>
        <el-form-item label="群二维码 URL">
          <el-input v-model="g.qrcode" />
        </el-form-item>
        <el-form-item label="二维码有效期">
          <el-input v-model="g.qrExpireAt" placeholder="可选，如 2026-09-25 23:59；过期后小程序展示失效态" />
        </el-form-item>
        <el-form-item label="满员">
          <el-switch v-model="g.full" />
        </el-form-item>
        <el-button text type="danger" @click="form.groups.splice(i, 1)">删除该群</el-button>
      </div>
      <el-button type="primary" link @click="addGroup">+ 添加读者群</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { get, put } from '@/api/request'

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  servicePhone: '',
  wecomUrl: '',
  onlineServiceHint: '',
  joinNotice: '',
  groups: [] as Array<{ name: string; direction: string; qrcode: string; qrExpireAt: string; full: boolean }>,
})

function addGroup() {
  form.groups.push({ name: '', direction: '', qrcode: '', qrExpireAt: '', full: false })
}

async function load() {
  loading.value = true
  try {
    const res = await get<any>('/api/v1/admin/community/config')
    const data = (res as any)?.data ?? res ?? {}
    form.servicePhone = data.servicePhone || ''
    form.wecomUrl = data.wecomUrl || ''
    form.onlineServiceHint = data.onlineServiceHint || ''
    form.joinNotice = data.joinNotice || ''
    form.groups = Array.isArray(data.groups) ? data.groups.map((g: any) => ({
      name: g.name || '',
      direction: g.direction || '',
      qrcode: g.qrcode || g.qrCode || '',
      qrExpireAt: g.qrExpireAt || g.qr_expire_at || g.expireAt || '',
      full: Boolean(g.full),
    })) : []
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await put('/api/v1/admin/community/config', { ...form })
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
.community-page { padding: 16px; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 6px; font-size: 20px; }
.page-head p { margin: 0; color: #909399; font-size: 13px; }
.form { max-width: 720px; }
.group-card { padding: 12px 0; border-bottom: 1px dashed #ebeef5; margin-bottom: 8px; }
</style>
