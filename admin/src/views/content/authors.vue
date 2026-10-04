<template>
  <div class="authors-page">
    <div class="page-header">
      <div>
        <div class="page-title">作者管理</div>
        <div class="page-desc">
          维护作者档案库（昵称 / 头像 / 身份 / 简介）。发布内容时下拉选择作者，自动带出头像和身份；
          小程序渲染仍读内容原有的作者三字段，由后端按档案回填。
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate">+ 新建作者</el-button>
      </div>
    </div>

    <div class="toolbar">
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" @change="reload">
        <el-option label="启用" :value="1" />
        <el-option label="停用" :value="0" />
      </el-select>
      <span class="count-tip">共 {{ rows.length }} 位作者</span>
    </div>

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column label="作者" min-width="220">
        <template #default="{ row }">
          <div class="author-cell">
            <img v-if="previewUrl(row.avatarUrl)" :src="previewUrl(row.avatarUrl)" class="avatar-thumb" alt="" />
            <span v-else class="avatar-placeholder">{{ (row.name || '?').charAt(0) }}</span>
            <div class="author-meta">
              <div class="author-name">{{ row.name || '未命名' }}</div>
              <div class="author-title">{{ row.title || '—' }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="身份" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="roleTagType(row.role)">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="intro" label="简介" min-width="220" show-overflow-tooltip />
      <el-table-column prop="contact" label="联系方式" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.contact || '—' }}</template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联内容" width="150">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="viewContents(row)">
            内容 {{ row.contentCount ?? 0 }}
          </el-link>
          <el-divider direction="vertical" />
          <el-link type="primary" :underline="false" @click="viewProducts(row)">
            商品/专栏 {{ row.productCount ?? 0 }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" size="small" @click="viewContents(row)">查看内容</el-button>
          <el-button link type="primary" size="small" :loading="linkingId === row.id" @click="linkHistory(row)">关联内容</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'success'" size="small" @click="toggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建/编辑对话框 -->
    <el-dialog v-model="dialogOpen" :title="editingId ? '编辑作者' : '新建作者'" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="昵称" prop="name">
          <el-input v-model="form.name" maxlength="64" placeholder="作者昵称（发布时显示）" />
        </el-form-item>
        <el-form-item label="头像">
          <div class="avatar-uploader">
            <label class="avatar-circle" :class="{ 'is-uploading': avatarUploading }">
              <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" alt="" />
              <span v-else class="avatar-empty">+</span>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="avatarUploading" @change="onUploadAvatar" />
            </label>
            <div class="avatar-ops">
              <div class="avatar-ops-btns">
                <label class="upload-btn">
                  {{ avatarUploading ? '上传中…' : '本地上传' }}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="avatarUploading" @change="onUploadAvatar" />
                </label>
                <el-button size="small" @click="assetPickerVisible = true">素材库</el-button>
                <el-button v-if="avatarPreview" text type="danger" size="small" @click="form.avatarUrl = ''">清除</el-button>
              </div>
              <div class="avatar-hint">支持 jpg / png / webp，建议 400×400 以上正方形；点头像也可直接上传</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="身份" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="主理人" value="owner" />
            <el-option label="编辑" value="editor" />
            <el-option label="投稿人" value="contributor" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="头衔">
          <el-input v-model="form.title" maxlength="64" placeholder="如：主理人、特约作者、栏目主编" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="3" maxlength="512" show-word-limit placeholder="一句话介绍" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.contact" maxlength="128" placeholder="微信号 / 邮箱（仅后台可见）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" />
          <span class="field-hint">越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <AssetPickerDialog v-model="assetPickerVisible" @select="onPickAsset" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { normalizeUploadUrl } from '@/api/system'
import {
  listAuthors,
  saveAuthor,
  deleteAuthor,
  linkContents,
  type AuthorRecord,
  type AuthorRole,
} from '@/api/author'

const loading = ref(false)
const saving = ref(false)
const linkingId = ref<number | null>(null)
const rows = ref<AuthorRecord[]>([])
const statusFilter = ref<number | undefined>(undefined)
const router = useRouter()

/** 跳内容管理列表并按该作者预置筛选 */
function viewContents(row: AuthorRecord) {
  router.push({ path: '/content/articles', query: { authorId: String(row.id ?? '') } })
}
/** 跳商品管理列表并按该作者预置筛选（专栏/付费内容归属） */
function viewProducts(row: AuthorRecord) {
  router.push({ path: '/commerce/products', query: { authorId: String(row.id ?? '') } })
}

const dialogOpen = ref(false)
const editingId = ref(0)
const formRef = ref<FormInstance>()
const assetPickerVisible = ref(false)
const avatarUploading = ref(false)

const form = reactive({
  name: '',
  avatarUrl: '',
  role: 'editor' as AuthorRole,
  title: '',
  intro: '',
  contact: '',
  sortOrder: 0,
  status: 1,
})

const rules: FormRules = {
  name: [{ required: true, message: '请填写作者昵称', trigger: 'blur' }],
  role: [{ required: true, message: '请选择身份', trigger: 'change' }],
}

const ROLE_LABELS: Record<string, string> = {
  owner: '主理人',
  editor: '编辑',
  contributor: '投稿人',
  user: '用户',
}

function roleLabel(r?: string) {
  return ROLE_LABELS[r || ''] || r || '—'
}

function roleTagType(r?: string): 'warning' | 'success' | 'info' | 'primary' {
  if (r === 'owner') return 'warning'
  if (r === 'contributor') return 'success'
  if (r === 'user') return 'info'
  return 'primary'
}

function previewUrl(url?: string): string {
  return url ? normalizeUploadUrl(url) : ''
}

const avatarPreview = computed(() => previewUrl(form.avatarUrl))

async function load() {
  loading.value = true
  try {
    const res: any = await listAuthors(statusFilter.value)
    rows.value = Array.isArray(res?.data) ? res.data : []
  } catch (e: any) {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function reload() {
  load()
}

function resetForm() {
  Object.assign(form, {
    name: '',
    avatarUrl: '',
    role: 'editor',
    title: '',
    intro: '',
    contact: '',
    sortOrder: 0,
    status: 1,
  })
  editingId.value = 0
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(row: AuthorRecord) {
  resetForm()
  editingId.value = Number(row.id || 0)
  Object.assign(form, {
    name: row.name || '',
    avatarUrl: row.avatarUrl || '',
    role: (row.role as AuthorRole) || 'editor',
    title: row.title || '',
    intro: row.intro || '',
    contact: row.contact || '',
    sortOrder: row.sortOrder ?? 0,
    status: row.status ?? 1,
  })
  dialogOpen.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload: Partial<AuthorRecord> = {
        name: form.name.trim(),
        avatarUrl: form.avatarUrl?.trim() || undefined,
        role: form.role,
        title: form.title?.trim() || undefined,
        intro: form.intro?.trim() || undefined,
        contact: form.contact?.trim() || undefined,
        sortOrder: form.sortOrder ?? 0,
        status: form.status,
      }
      if (editingId.value) payload.id = editingId.value
      await saveAuthor(payload)
      ElMessage.success(editingId.value ? '已更新' : '已创建')
      dialogOpen.value = false
      await load()
    } catch {
      // 拦截器已提示
    } finally {
      saving.value = false
    }
  })
}

async function toggleStatus(row: AuthorRecord) {
  const next = row.status === 1 ? 0 : 1
  try {
    await saveAuthor({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      role: row.role,
      title: row.title,
      intro: row.intro,
      contact: row.contact,
      sortOrder: row.sortOrder,
      status: next,
    })
    row.status = next
    ElMessage.success(next === 1 ? '已启用' : '已停用')
  } catch {
    // ignore
  }
}

async function remove(row: AuthorRecord) {
  try {
    await ElMessageBox.confirm(
      `删除作者「${row.name || ''}」？被内容引用时后端会拒绝删除。`,
      '删除作者',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteAuthor(Number(row.id))
    ElMessage.success('已删除')
    await load()
  } catch {
    // 后端会返回"被 N 篇内容引用"的具体原因，拦截器已弹
  }
}

async function linkHistory(row: AuthorRecord) {
  try {
    await ElMessageBox.confirm(
      `把历史所有「作者名 = ${row.name || ''}」且未关联档案的内容，一键关联到该作者档案？\n关联后小程序作者卡片将自动展示完整档案（头衔+简介），空缺的头像/身份也会回填。`,
      '批量关联历史内容',
      { type: 'info', confirmButtonText: '关联', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  linkingId.value = Number(row.id)
  try {
    const res: any = await linkContents(Number(row.id))
    const count = typeof res?.data === 'number' ? res.data : 0
    if (count > 0) {
      ElMessage.success(`已关联 ${count} 篇历史内容`)
    } else {
      ElMessage.info('没有未关联的匹配内容（所有同名内容已关联或无匹配）')
    }
  } catch {
    // 拦截器已提示
  } finally {
    linkingId.value = null
  }
}

function onPickAsset(url: string) {
  form.avatarUrl = normalizeUploadUrl(url)
}

async function onUploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { default: axios } = await import('axios')
    const token = localStorage.getItem('mp_admin_token') || ''
    const res = await axios.post('/api/v1/admin/assets/upload', fd, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const url = res?.data?.data?.url || res?.data?.url
    if (url) {
      form.avatarUrl = normalizeUploadUrl(url)
      ElMessage.success('头像已上传')
    } else {
      ElMessage.error('上传返回数据异常')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.authors-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
.page-title { font-size: 18px; font-weight: 600; color: #002FA7; }
.page-desc { margin-top: 4px; color: #909399; font-size: 13px; max-width: 640px; line-height: 1.5; }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.count-tip { color: #909399; font-size: 13px; }
.author-cell { display: flex; align-items: center; gap: 10px; }
.avatar-thumb { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: #f0f0f0; display: inline-flex; align-items: center; justify-content: center; color: #909399; font-size: 16px; flex-shrink: 0; }
.author-meta { min-width: 0; }
.author-name { font-weight: 500; font-size: 14px; }
.author-title { color: #909399; font-size: 12px; margin-top: 2px; }
.avatar-uploader { display: flex; align-items: center; gap: 16px; width: 100%; }
.avatar-circle { width: 64px; height: 64px; border-radius: 50%; border: 1px dashed #dcdfe6; background: #fafafa; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; flex-shrink: 0; transition: border-color 0.2s; }
.avatar-circle:hover { border-color: #C08E6E; }
.avatar-circle.is-uploading { opacity: 0.6; cursor: wait; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-empty { color: #909399; font-size: 26px; font-weight: 300; line-height: 1; }
.avatar-ops { min-width: 0; }
.avatar-ops-btns { display: flex; gap: 8px; align-items: center; }
.avatar-hint { color: #909399; font-size: 12px; margin-top: 6px; line-height: 1.4; }
.upload-btn { display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; color: #606266; cursor: pointer; background: #fff; }
.upload-btn:hover { border-color: #C08E6E; color: #C08E6E; }
.field-hint { margin-left: 8px; color: #909399; font-size: 12px; }
</style>