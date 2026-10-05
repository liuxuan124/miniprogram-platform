<template>
  <div class="rt-page">
    <div class="rt-head">
      <div>
        <h1 class="rt-h1">角色标签</h1>
        <div class="rt-sub">
          角色身份 = 打了这里的标签的人。标签可自由增删改，运营随时加「特邀讲师」这类新角色；
          给用户打上后，用户列表、装修器作者选择器都会按角色筛出来。
        </div>
      </div>
      <div class="rt-actions">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" @click="openForm()">
          <el-icon><Plus /></el-icon>新建角色
        </el-button>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="角色标签会同步影响小程序端的能力判断（如「作者」决定是否展示作者档案入口），改显示名不会影响逻辑，改角色代码会。"
      style="margin-bottom: 12px"
    />

    <div v-if="error" class="rt-empty">
      {{ error }}
      <el-button size="small" @click="load">重试</el-button>
    </div>
    <div v-else-if="!rows.length" class="rt-empty">还没有角色标签，点右上角「新建角色」开始配置</div>
    <div v-else class="rt-grid">
      <article v-for="t in rows" :key="t.id" class="rt-card">
        <div class="rt-card__top">
          <span class="rt-dot" :style="{ background: t.color || '#C08E6E' }" />
          <span class="rt-name">{{ t.name }}</span>
          <code v-if="t.roleCode" class="rt-code">{{ t.roleCode }}</code>
          <el-tag v-if="t.status === 0" size="small" type="info">停用</el-tag>
          <span class="rt-count" :title="`已挂 ${t.userCount} 人`">{{ t.userCount }} 人</span>
        </div>
        <div class="rt-desc">{{ t.description || '（无说明）' }}</div>
        <div class="rt-card__ops">
          <el-button link type="primary" size="small" @click="openForm(t)">编辑</el-button>
          <el-button link type="primary" size="small" @click="goUsers(t)">
            查看成员
          </el-button>
          <el-popconfirm
            width="240"
            title="删除后，该标签在所有用户身上会一并移除，确认？"
            confirm-button-text="确认删除"
            confirm-button-type="danger"
            @confirm="remove(t)"
          >
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </article>
    </div>

    <!-- 新建 / 编辑 -->
    <el-dialog v-model="formOpen" :title="editingId ? '编辑角色' : '新建角色'" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="角色名" prop="name">
          <el-input v-model="form.name" maxlength="32" show-word-limit placeholder="如：主理人 / 特邀讲师" />
        </el-form-item>
        <el-form-item label="角色代码">
          <el-input
            v-model="form.roleCode"
            maxlength="32"
            :disabled="!!editingId"
            placeholder="英文小写下划线，如 host"
          />
          <div class="rt-hint">
            端上按代码判断能力，创建后不可改。留空表示这个角色只用于后台标记。
          </div>
        </el-form-item>
        <el-form-item label="标签色">
          <el-color-picker v-model="form.color" />
          <span class="rt-hint" style="margin-left: 10px">在用户列表与作者卡片上以这个颜色显示</span>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" />
          <span class="rt-hint">越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listRoleTags,
  createRoleTag,
  updateRoleTag,
  deleteRoleTag,
  type RoleTag,
  type RoleTagForm,
} from '@/api/roleTag'

const router = useRouter()
const rows = ref<RoleTag[]>([])
const loading = ref(false)
const error = ref('')
const formOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<RoleTagForm>({
  name: '',
  color: '#C08E6E',
  roleCode: '',
  description: '',
  sortOrder: 100,
  status: 1,
})

const rules: FormRules = {
  name: [
    { required: true, message: '请填角色名', trigger: 'blur' },
    { max: 32, message: '最长 32 个字符', trigger: 'blur' },
  ],
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await listRoleTags()
    const d = res?.data ?? res
    rows.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    // 迁移未执行时列还不存在，这里给可操作提示而不是空白页
    error.value = e?.message || '角色标签加载失败（若提示字段不存在，说明 V114 迁移还没跑）'
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openForm(t?: RoleTag) {
  editingId.value = t?.id ?? null
  Object.assign(form, {
    name: t?.name || '',
    color: t?.color || '#C08E6E',
    roleCode: t?.roleCode || '',
    description: t?.description || '',
    sortOrder: t?.sortOrder ?? 100,
    status: t?.status ?? 1,
  })
  formOpen.value = true
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload: RoleTagForm = {
      ...form,
      roleCode: (form.roleCode || '').trim(),
    }
    if (editingId.value) await updateRoleTag(editingId.value, payload)
    else await createRoleTag(payload)
    ElMessage.success('已保存')
    formOpen.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(t: RoleTag) {
  try {
    await deleteRoleTag(t.id)
    ElMessage.success(`已删除「${t.name}」`)
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

/** 跳到用户列表并带上角色筛选条件（配合用户管理页读取 query.roleTagId） */
function goUsers(t: RoleTag) {
  router.push({ path: '/member/users', query: { roleTab: '1', roleTagId: String(t.id) } })
}

onMounted(load)
</script>

<style scoped>
.rt-page {
  padding: 20px 24px 40px;
}
.rt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.rt-h1 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
}
.rt-sub {
  max-width: 720px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted, #94a3b8);
}
.rt-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.rt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.rt-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 10px;
}
.rt-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rt-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rt-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
}
.rt-code {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  background: #f6f8fb;
  border-radius: 4px;
}
.rt-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.rt-desc {
  min-height: 36px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #94a3b8);
}
.rt-card__ops {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--wb-line, #e5eaf3);
}
.rt-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #94a3b8);
}
.rt-empty {
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}
</style>
