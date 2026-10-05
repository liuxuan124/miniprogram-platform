<template>
  <el-dialog
    :model-value="modelValue"
    class="mini-wb-overlay"
    :title="titleText"
    width="540px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="vd">
      <p class="vd__tip faint">
        回滚会把选中版本的内容复制为一份<strong>新草稿</strong>，再到装修器点「发布配置」才会在小程序端生效。
      </p>
      <div v-if="!loading && !rows.length" class="muted vd__empty">暂无版本记录</div>
      <ul v-else class="vd__list">
        <li
          v-for="r in rows"
          :key="r.version"
          class="vd__row"
          :class="{ 'vd__row--cur': r.version === currentVersion }"
        >
          <div class="vd__main">
            <b>v{{ r.version }}</b>
            <span class="tag" :class="statusClass(r.status)">{{ r.statusDesc }}</span>
            <span v-if="r.version === currentVersion" class="tag t-live">线上</span>
          </div>
          <div class="vd__meta faint">
            {{ r.time || '—' }}
            <template v-if="r.componentCount != null"> · 组件 {{ r.componentCount }}</template>
          </div>
          <el-button
            link
            type="primary"
            :disabled="rolling || r.version === currentVersion"
            @click="onRollback(r)"
          >
            {{ r.version === currentVersion ? '当前线上' : '回滚到此版本' }}
          </el-button>
        </li>
      </ul>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button class="mw-btn-primary" type="primary" @click="openFullVersionPage">
        打开完整版本页
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVersionList, rollbackVersion } from '@/api/page'
import type { PageRecord } from '@/types/page'

const props = defineProps<{
  modelValue: boolean
  page: PageRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'rolled-back': []
}>()

type Row = {
  version: number
  status: number
  statusDesc: string
  time: string
  componentCount: number | null
}

const router = useRouter()
const loading = ref(false)
const rolling = ref(false)
const rows = ref<Row[]>([])

const titleText = computed(() => `版本记录 · ${props.page?.name || '页面'}`)

const currentVersion = computed(() => {
  const p = props.page as any
  const v = p?.currentVersion ?? p?.current_version ?? p?.version
  return Number(v ?? 0) || 0
})

/** DSL 里的组件数：content 可能是 JSON 字符串或已解析对象 */
function countComponents(raw: unknown): number | null {
  try {
    let obj: any = raw
    if (typeof raw === 'string') obj = JSON.parse(raw)
    const comps = obj?.components ?? obj?.dsl?.components
    return Array.isArray(comps) ? comps.length : null
  } catch {
    return null
  }
}

function statusDescOf(v: any) {
  if (v?.statusDesc) return String(v.statusDesc)
  const s = Number(v?.status ?? -1)
  if (s === 1) return '已发布'
  if (s === 2) return '已回滚'
  return '草稿'
}

async function fetchRows() {
  const id = Number(props.page?.id)
  if (!id) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const res = await getVersionList(id)
    const data = (res as any)?.data as unknown
    const rawList: any[] = Array.isArray(data)
      ? data
      : ((data as any)?.records || (data as any)?.list || (data as any)?.items || [])
    rows.value = rawList
      .map((v: any) => ({
        version: Number(v.version ?? 0),
        status: Number(v.status ?? -1),
        statusDesc: statusDescOf(v),
        time: String(v.createTime || v.created_at || v.create_time || v.publishedAt || '').slice(0, 16),
        componentCount: countComponents(v.dslContent ?? v.dsl ?? v.content),
      }))
      .filter((r) => r.version > 0)
      .sort((a, b) => b.version - a.version)
  } catch (e: any) {
    ElMessage.error(e?.message || '加载版本记录失败')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function statusClass(status: number) {
  if (status === 1) return 't-live'
  if (status === 2) return 't-draft'
  return 't-pending'
}

async function onRollback(r: Row) {
  const id = Number(props.page?.id)
  try {
    await ElMessageBox.confirm(
      `将「${props.page?.name || ''}」回滚到 v${r.version}？该版本内容会成为新草稿。`,
      '回滚版本',
      { type: 'warning' },
    )
  } catch {
    return
  }
  rolling.value = true
  try {
    await rollbackVersion(id, r.version)
    ElMessage.success(`已回滚到 v${r.version}，请到装修器发布`)
    emit('rolled-back')
    await fetchRows()
  } catch (e: any) {
    ElMessage.error(e?.message || '回滚失败')
  } finally {
    rolling.value = false
  }
}

function openFullVersionPage() {
  const id = Number(props.page?.id)
  if (!id) return
  emit('update:modelValue', false)
  const { href } = router.resolve(`/page-builder/version/${id}`)
  window.open(href, '_blank', 'noopener,noreferrer')
}

watch(
  () => [props.modelValue, props.page?.id] as const,
  ([open]) => {
    if (open) void fetchRows()
    else rows.value = []
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.vd {
  min-height: 120px;
}
.vd__tip {
  margin: 0 0 12px;
  line-height: 1.6;
}
.vd__empty {
  padding: 24px 0;
  text-align: center;
}
.vd__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 380px;
  overflow: auto;
}
.vd__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid var(--wb-line, #e8dfd2);
  border-radius: 10px;
  background: #fffdf9;
  &--cur {
    border-color: #cbe3d3;
    background: #f4faf6;
  }
}
.vd__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 168px;
}
.vd__meta {
  flex: 1;
  min-width: 0;
}
:deep(.el-button.is-link) {
  padding-left: 0;
  padding-right: 0;
}
</style>
