<template>
  <div class="ops-page">
    <PageHeader
      kicker="运营中心 / 私域引流"
      title="私域引流"
      description="微信群活码轮换：一个群可挂多张码，按顺序取第一张「启用且未过期」的；满员或到期后自动切下一张，运营只需按序补码。"
    >
      <template #actions>
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" @click="openCreate()">新建活码</el-button>
      </template>
    </PageHeader>

    <el-alert type="info" :closable="false" show-icon class="contract-alert">
      <template #title>
        活码标识必须与装修器「加入群聊」组件里每个群的<strong>活码标识</strong>一致
      </template>
      <div class="contract-alert__body">
        小程序端取码规则：<code>活码标识</code> 填了的群 → 请求接口拿当前有效码；未填、或该群暂无有效码 → 回落使用装修器里内联的二维码图片。
        因此<strong>老页面不填标识也能正常显示</strong>，填了才开始享受自动轮换。
      </div>
    </el-alert>

    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__k">群数</div>
        <div class="stat-card__v">{{ groups.length }}</div>
        <div class="stat-card__d">已配置活码的群</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__k">活码总数</div>
        <div class="stat-card__v">{{ rows.length }}</div>
        <div class="stat-card__d">{{ activeCount }} 张生效中</div>
      </div>
      <div class="stat-card" :class="{ 'is-warn': soonCount > 0 }">
        <div class="stat-card__k">即将过期</div>
        <div class="stat-card__v">{{ soonCount }}</div>
        <div class="stat-card__d">2 天内到期，建议提前补码</div>
      </div>
      <div class="stat-card" :class="{ 'is-danger': riskyCount > 0 }">
        <div class="stat-card__k">需处理</div>
        <div class="stat-card__v">{{ riskyCount }}</div>
        <div class="stat-card__d">群无可用码 / 码已过期</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel__head">
        <div>
          <strong>活码列表</strong>
          <span class="panel__sub">按群分组 · 组内按轮换顺序排列</span>
        </div>
        <el-button size="small" @click="load">重新加载</el-button>
      </div>

      <ListStateWrap
        :loading="loading"
        :error="error"
        :empty="!loading && !error && groups.length === 0"
        empty-text="还没有配置任何活码"
        empty-description="新建第一张活码，并把「活码标识」填到装修器「加入群聊」组件对应群的设置里"
        :skeleton-rows="6"
        @retry="load"
      >
        <div v-for="g in groups" :key="g.key" class="group-block">
          <header class="group-block__head">
            <div class="group-block__title">
              <MiniIcon name="chat" :size="15" />
              <span>{{ g.name }}</span>
              <code class="group-block__key">{{ g.key }}</code>
              <el-tag v-if="!g.activeId" size="small" type="danger">无生效码</el-tag>
            </div>
            <div class="group-block__actions">
              <el-button size="small" @click="openCreate(g.key, g.name)">为该群新增活码</el-button>
            </div>
          </header>

          <el-table :data="g.list" size="small" table-layout="fixed">
            <el-table-column label="顺序" width="70" align="center">
              <template #default="{ row }">
                <span class="order-cell">
                  <b>{{ row.sortOrder ?? 0 }}</b>
                  <span class="order-cell__ops">
                    <el-button link size="small" :disabled="isFirst(g, row)" @click="move(g, row, -1)">↑</el-button>
                    <el-button link size="small" :disabled="isLast(g, row)" @click="move(g, row, 1)">↓</el-button>
                  </span>
                </span>
              </template>
            </el-table-column>

            <el-table-column label="二维码" width="104" align="center">
              <template #default="{ row }">
                <div class="qr-thumb">
                  <img v-if="imgUrl(row.qrcodeUrl)" :src="imgUrl(row.qrcodeUrl)" alt="" />
                  <MiniIcon v-else name="qr" :size="20" />
                </div>
              </template>
            </el-table-column>

            <el-table-column label="当前状态" width="130">
              <template #default="{ row }">
                <el-tag v-if="row.id === g.activeId" size="small" type="success">生效中</el-tag>
                <el-tag v-else-if="row.status === 0" size="small" type="info">已停用</el-tag>
                <el-tag v-else size="small" type="warning">备用</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="有效期" min-width="180">
              <template #default="{ row }">
                <span v-if="!row.validUntil" class="muted">长期有效</span>
                <span v-else>
                  {{ fmtDate(row.validUntil) }}
                  <el-tag :type="expiryTagType(row.validUntil)" size="small" effect="plain" class="expiry-tag">
                    {{ expiryText(row.validUntil) }}
                  </el-tag>
                </span>
              </template>
            </el-table-column>

            <el-table-column label="群名称" min-width="130" show-overflow-tooltip>
              <template #default="{ row }">
                <span :class="{ muted: !row.groupName }">{{ row.groupName || '未填' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="190" align="right">
              <template #default="{ row }">
                <el-button link size="small" @click="openEdit(row)">编辑</el-button>
                <el-button link size="small" @click="toggleStatus(row)">
                  {{ row.status === 0 ? '启用' : '停用' }}
                </el-button>
                <el-button link size="small" type="danger" @click="remove(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </ListStateWrap>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑活码' : '新建活码'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form label-width="96px" size="default">
        <el-form-item label="活码标识" required>
          <el-input
            v-model="form.groupKey"
            maxlength="64"
            :disabled="!!form.id || lockedKey"
            placeholder="如 reader-1，需与装修器里该群的活码标识一致"
          />
          <div class="form-hint">
            同一标识下的多张码构成一个轮换序列。标识一旦创建不建议再改，否则装修器侧对不上。
          </div>
        </el-form-item>

        <el-form-item label="群名称">
          <el-input v-model="form.groupName" maxlength="128" placeholder="仅用于后台辨认，如「暖阁读者群①」" />
        </el-form-item>

        <el-form-item label="二维码" required>
          <div class="qr-field">
            <div class="qr-field__preview">
              <img v-if="imgUrl(form.qrcodeUrl)" :src="imgUrl(form.qrcodeUrl)" alt="" />
              <div v-else class="qr-field__ph"><MiniIcon name="qr" :size="22" /></div>
            </div>
            <div class="qr-field__main">
              <el-input v-model="form.qrcodeUrl" placeholder="二维码图片 URL" />
              <div class="qr-field__ops">
                <AssetPickerButton label="从素材库选图" @select="(url: string) => (form.qrcodeUrl = url)" />
                <span class="form-hint form-hint--inline">图片请先在「素材管理」上传入库，再在这里引用。</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="有效期至">
          <el-date-picker
            v-model="form.validUntil"
            type="datetime"
            placeholder="留空表示长期有效"
            value-format="YYYY-MM-DDTHH:mm:ss"
            clearable
            style="width: 100%"
          />
          <div class="form-hint">微信群码通常 7 天失效，按实际失效日期填写；到期后定时任务会自动停用并切到下一张。</div>
        </el-form-item>

        <el-form-item label="轮换顺序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
          <span class="form-hint form-hint--inline">数字越小越优先；取码时按此升序取第一张有效码。</span>
        </el-form-item>

        <el-form-item label="启用">
          <el-switch v-model="form.statusBool" />
          <span class="form-hint form-hint--inline">停用的码不参与轮换。</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ListStateWrap from '@/components/ListStateWrap.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { normalizeUploadUrl } from '@/api/system'
import {
  listGroupQrcodes,
  saveGroupQrcode,
  deleteGroupQrcode,
  type GroupQrcode,
} from '@/api/groupQrcode'

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const rows = ref<GroupQrcode[]>([])

const dialogVisible = ref(false)
const lockedKey = ref('')

const form = reactive({
  id: undefined as number | undefined,
  groupKey: '',
  groupName: '',
  qrcodeUrl: '',
  validUntil: '' as string,
  sortOrder: 0,
  statusBool: true,
})

/** ---------- 日期：后端 LocalDateTime 可能是 ISO 也可能是空格格式，两种都要吃 ---------- */
function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 归一化为 el-date-picker value-format 要求的 `YYYY-MM-DDTHH:mm:ss` */
function toIsoLocal(v?: string | null): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.replace(' ', 'T').slice(0, 19)
  const d = new Date(s.replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`
}

function parseDate(v?: string | null): Date | null {
  const iso = toIsoLocal(v)
  if (!iso) return null
  const d = new Date(iso.replace(/-/g, '/').replace('T', ' '))
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtDate(v?: string | null) {
  const iso = toIsoLocal(v)
  return iso ? iso.replace('T', ' ') : '—'
}

function expiryOf(v?: string | null) {
  const d = parseDate(v)
  if (!d) return { days: null as number | null, text: '长期有效', type: 'info' as const }
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return { days, text: '已过期', type: 'danger' as const }
  if (days === 0) return { days, text: '今天到期', type: 'warning' as const }
  if (days <= 2) return { days, text: `还剩 ${days} 天`, type: 'warning' as const }
  return { days, text: `还剩 ${days} 天`, type: 'success' as const }
}

function expiryText(v?: string | null) {
  return expiryOf(v).text
}

function expiryTagType(v?: string | null) {
  return expiryOf(v).type
}

/** 该码此刻是否可用（启用且未过期） */
function isUsable(row: GroupQrcode) {
  if (row.status === 0) return false
  const d = parseDate(row.validUntil)
  return !d || d.getTime() > Date.now()
}

/** ---------- 按群分组 ---------- */
const groups = computed(() => {
  const map = new Map<string, GroupQrcode[]>()
  for (const r of rows.value) {
    const key = String(r.groupKey || '').trim() || '（未填标识）'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const first = sorted.find(isUsable)
    return {
      key,
      name: sorted.find((r) => r.groupName)?.groupName || key,
      list: sorted,
      activeId: first?.id as number | undefined,
    }
  })
})

const counts = computed(() => {
  let active = 0
  let soon = 0
  for (const r of rows.value) {
    if (isUsable(r)) active++
    const d = expiryOf(r.validUntil).days
    if (d !== null && d >= 0 && d <= 2) soon++
  }
  return { active, soon }
})

const activeCount = computed(() => counts.value.active)
const soonCount = computed(() => counts.value.soon)
/** 需处理 = 有群没有生效码，或存在已过期但还挂着的码 */
const riskyCount = computed(() => {
  const noActive = groups.value.filter((g) => !g.activeId).length
  const expired = rows.value.filter((r) => {
    const d = expiryOf(r.validUntil).days
    return d !== null && d < 0
  }).length
  return noActive + expired
})

function imgUrl(url?: string) {
  return url ? normalizeUploadUrl(String(url)) : ''
}

function isFirst(g: { list: GroupQrcode[] }, row: GroupQrcode) {
  return g.list[0]?.id === row.id
}

function isLast(g: { list: GroupQrcode[] }, row: GroupQrcode) {
  return g.list[g.list.length - 1]?.id === row.id
}

/** ---------- 数据 ---------- */
async function load() {
  loading.value = true
  error.value = null
  try {
    const res: any = await listGroupQrcodes()
    const list = res?.data ?? res
    rows.value = Array.isArray(list) ? list : []
  } catch (e: any) {
    error.value = e?.message || '活码接口暂不可用'
    rows.value = []
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.id = undefined
  form.groupKey = ''
  form.groupName = ''
  form.qrcodeUrl = ''
  form.validUntil = ''
  form.sortOrder = 0
  form.statusBool = true
}

function openCreate(groupKey?: string, groupName?: string) {
  resetForm()
  lockedKey.value = groupKey || ''
  if (groupKey) form.groupKey = groupKey
  if (groupName && groupName !== groupKey) form.groupName = groupName
  // 新增到已有群时，默认排到该群末尾
  if (groupKey) {
    const same = rows.value.filter((r) => r.groupKey === groupKey)
    form.sortOrder = same.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), -1) + 1
  }
  dialogVisible.value = true
}

function openEdit(row: GroupQrcode) {
  resetForm()
  lockedKey.value = ''
  form.id = row.id
  form.groupKey = row.groupKey || ''
  form.groupName = row.groupName || ''
  form.qrcodeUrl = row.qrcodeUrl || ''
  form.validUntil = toIsoLocal(row.validUntil)
  form.sortOrder = row.sortOrder ?? 0
  form.statusBool = row.status !== 0
  dialogVisible.value = true
}

async function submit() {
  if (!form.groupKey.trim()) {
    ElMessage.warning('活码标识不能为空')
    return
  }
  if (!form.qrcodeUrl.trim()) {
    ElMessage.warning('请先选择或填写二维码图片')
    return
  }
  saving.value = true
  try {
    await saveGroupQrcode({
      id: form.id,
      groupKey: form.groupKey.trim(),
      groupName: form.groupName.trim(),
      qrcodeUrl: form.qrcodeUrl.trim(),
      validUntil: form.validUntil ? form.validUntil : null,
      sortOrder: form.sortOrder,
      status: form.statusBool ? 1 : 0,
    })
    ElMessage.success(form.id ? '已保存' : '已新增')
    dialogVisible.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: GroupQrcode) {
  try {
    await saveGroupQrcode({ ...row, status: row.status === 0 ? 1 : 0 })
    ElMessage.success(row.status === 0 ? '已启用' : '已停用')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

/** 与相邻码交换 sortOrder */
async function move(g: { list: GroupQrcode[] }, row: GroupQrcode, dir: -1 | 1) {
  const idx = g.list.findIndex((r) => r.id === row.id)
  const target = g.list[idx + dir]
  if (!target) return
  const a = row.sortOrder ?? idx
  const b = target.sortOrder ?? idx + dir
  try {
    await saveGroupQrcode({ ...row, sortOrder: b })
    await saveGroupQrcode({ ...target, sortOrder: a })
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '调整顺序失败')
  }
}

async function remove(row: GroupQrcode) {
  try {
    await ElMessageBox.confirm(
      `删除「${row.groupName || row.groupKey}」的这张二维码？删除后该群会自动落到下一张码。`,
      '确认删除',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteGroupQrcode(row.id as number)
    ElMessage.success('已删除')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ops-page {
  padding: 4px 4px 24px;
  background: transparent;
}

.contract-alert {
  margin-bottom: 14px;

  code {
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.06);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px;
  }

  &__body {
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--text-secondary, #666);
  }
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.stat-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);

  &__k {
    font-size: 12px;
    color: var(--text-muted);
  }

  &__v {
    margin-top: 4px;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
  }

  &__d {
    margin-top: 2px;
    font-size: 11.5px;
    color: var(--text-muted);
  }

  &.is-warn .stat-card__v {
    color: #b45309;
  }

  &.is-danger .stat-card__v {
    color: #b91c1c;
  }
}

.panel {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;

    strong {
      font-size: 14px;
    }
  }

  &__sub {
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }
}

.group-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: var(--radius) var(--radius) 0 0;
    background: var(--bg-subtle, rgba(0, 0, 0, 0.02));
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 500;
  }

  &__key {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.06);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    font-weight: 400;
    color: var(--text-muted);
  }
}

.order-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &__ops {
    display: inline-flex;
    flex-direction: column;

    :deep(.el-button) {
      height: 12px;
      padding: 0;
      font-size: 10px;
      line-height: 1;
    }
  }
}

.qr-thumb {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  color: var(--text-muted);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.expiry-tag {
  margin-left: 6px;
}

.muted {
  color: var(--text-muted);
}

.qr-field {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;

  &__preview {
    flex: none;
    width: 72px;
    height: 72px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__ph {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--text-muted);
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__ops {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }
}

.form-hint {
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-muted);

  &--inline {
    margin-top: 0;
  }
}

@media (max-width: 1100px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
