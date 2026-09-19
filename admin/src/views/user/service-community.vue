<template>
  <div class="community-page" v-loading="loading">
    <div class="page-head">
      <div>
        <h2>客服与社群</h2>
        <p>在线客服入口、企微链接与分方向读者群；下方可看各群状态。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
    <el-form label-width="120px" class="form">
      <el-form-item label="客服电话"><el-input v-model="form.servicePhone" /></el-form-item>
      <el-form-item label="企微客服链接"><el-input v-model="form.wecomUrl" placeholder="https://work.weixin.qq.com/..." /></el-form-item>
      <el-form-item label="在线客服说明"><el-input v-model="form.onlineServiceHint" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="进群须知"><el-input v-model="form.joinNotice" type="textarea" :rows="3" /></el-form-item>
    </el-form>
    <el-divider>读者群列表</el-divider>
    <el-table :data="form.groups" empty-text="暂无读者群，点击下方添加">
      <el-table-column label="名称" min-width="120"><template #default="{ row }"><el-input v-model="row.name" size="small" /></template></el-table-column>
      <el-table-column label="方向" width="120"><template #default="{ row }"><el-input v-model="row.direction" size="small" /></template></el-table-column>
      <el-table-column label="二维码 URL" min-width="180"><template #default="{ row }"><el-input v-model="row.qrcode" size="small" /></template></el-table-column>
      <el-table-column label="有效期" width="170"><template #default="{ row }"><el-input v-model="row.qrExpireAt" size="small" placeholder="2026-09-25 23:59" /></template></el-table-column>
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="groupStatus(row).type" size="small">{{ groupStatus(row).label }}</el-tag></template></el-table-column>
      <el-table-column label="满员" width="80" align="center"><template #default="{ row }"><el-switch v-model="row.full" size="small" /></template></el-table-column>
      <el-table-column label="操作" width="80"><template #default="{ $index }"><el-button link type="danger" @click="form.groups.splice($index, 1)">删除</el-button></template></el-table-column>
    </el-table>
    <el-button type="primary" link style="margin-top:12px" @click="addGroup">+ 添加读者群</el-button>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { get, put } from '@/api/request'
type GroupRow = { name: string; direction: string; qrcode: string; qrExpireAt: string; full: boolean }
const loading = ref(false)
const saving = ref(false)
const form = reactive({ servicePhone: '', wecomUrl: '', onlineServiceHint: '', joinNotice: '', groups: [] as GroupRow[] })
function addGroup() { form.groups.push({ name: '', direction: '', qrcode: '', qrExpireAt: '', full: false }) }
function groupStatus(g: GroupRow): { label: string; type: 'success' | 'warning' | 'info' | 'danger' } {
  if (g.full) return { label: '已满员', type: 'warning' }
  if (g.qrExpireAt) {
    const t = Date.parse(g.qrExpireAt.replace(/-/g, '/'))
    if (!Number.isNaN(t) && t < Date.now()) return { label: '二维码过期', type: 'danger' }
  }
  if (!g.qrcode) return { label: '缺二维码', type: 'info' }
  return { label: '可加入', type: 'success' }
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
      name: g.name || '', direction: g.direction || '', qrcode: g.qrcode || g.qrCode || '',
      qrExpireAt: g.qrExpireAt || g.qr_expire_at || g.expireAt || '', full: Boolean(g.full),
    })) : []
  } finally { loading.value = false }
}
async function save() {
  saving.value = true
  try { await put('/api/v1/admin/community/config', { ...form }); ElMessage.success('已保存') }
  catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  finally { saving.value = false }
}
onMounted(load)
</script>
<style scoped>
.community-page { padding: 16px; }
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 6px; font-size: 20px; }
.page-head p { margin: 0; color: #909399; font-size: 13px; }
.form { max-width: 720px; }
</style>
