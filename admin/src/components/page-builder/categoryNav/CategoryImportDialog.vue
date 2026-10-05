<template>
  <el-dialog
    v-model="visible"
    title="一键导入商城分类"
    width="720px"
    destroy-on-close
    append-to-body
  >
    <div class="imp">
      <div class="imp__bar">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜索分类名称"
          :prefix-icon="Search"
        />
        <el-checkbox v-model="includeChildren" size="small">包含二级分类</el-checkbox>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <span class="imp__count">已选 {{ selected.size }} / {{ flatRows.length }}</span>
      </div>

      <div v-loading="loading" class="imp__body">
        <!-- 空态 -->
        <div v-if="!flatRows.length && !loading" class="imp__blank">
          <p class="imp__blank-title">没有可导入的商品分类</p>
          <p class="imp__blank-hint">先到「商品管理 › 分类」建好类目，再回到这里一键导入。</p>
        </div>

        <template v-else>
          <!-- 全选 -->
          <div class="imp__select-all">
            <el-checkbox
              :model-value="allSelected"
              :indeterminate="someSelected"
              size="small"
              @change="toggleAll"
            >
              全选
            </el-checkbox>
            <el-button size="small" text type="primary" @click="selected = new Set()">清空选择</el-button>
          </div>

          <div class="imp__list">
            <label
              v-for="row in flatRows"
              :key="row.id"
              class="imp__row"
              :class="{ 'is-on': selected.has(row.id) }"
            >
              <el-checkbox
                :model-value="selected.has(row.id)"
                size="small"
                @change="(v: any) => toggleOne(row.id, !!v)"
              />
              <span v-if="row.icon" class="imp__row-icon">
                <img :src="row.icon" alt="" />
              </span>
              <span v-else class="imp__row-icon imp__row-icon--ph">📦</span>
              <span class="imp__row-name" :style="{ paddingLeft: `${row.depth * 16}px` }">
                {{ row.depth ? '└ ' : '' }}{{ row.name }}
              </span>
              <span class="imp__row-path">{{ categoryPath(row.id) }}</span>
            </label>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="imp__foot">
        <span class="imp__foot-hint">
          导入只新增分类项，**不会覆盖**已手工配好的图标与角标；重名项按路径去重。
        </span>
        <div class="imp__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button
            size="small"
            type="primary"
            :disabled="!selected.size"
            @click="onImport"
          >
            导入 {{ selected.size }} 个
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCategoryList } from '@/api/product'
import { CATEGORY_NAV_MAX_ITEMS } from './categoryNavSchema'

/**
 * 一键导入商城分类（批量勾选同步）。
 *
 * 旧面板要一个一个点「+ 添加分类项」再手打名字和链接 ——
 * 商城已经有一份维护好的分类树，**让运营再手抄一遍是纯重复劳动**，
 * 还抄错。这里拉 `getCategoryList()` 树，按路径去重后批量补进items。
 *
 * ⚠️ 冲突策略：**只补不覆盖**。已存在的项（同 link_url）保留原图标/角标，
 *    否则一次导入就把运营精心配的 HOT 角标冲掉 —— 那是不可逆的数据损失。
 */
const props = defineProps<{
  /** 现有分类项（用于去重） */
  items: Array<{ link_url?: string }>
  /** 剩余可加数量（受 MAX_ITEMS 限制） */
  remaining: number
}>()

const emit = defineEmits<{ confirm: [ids: number[]] }>()

const visible = ref(false)
const loading = ref(false)
const keyword = ref('')
const includeChildren = ref(true)
const selected = ref<Set<number>>(new Set())
const rows = ref<Array<{ id: number; name: string; icon: string; depth: number }>>([])

function categoryPath(id: number): string {
  return `/pkg-content/product-list/product-list?categoryId=${id}`
}

function flatten(list: any[], depth = 0, out: Array<{ id: number; name: string; icon: string; depth: number }> = []) {
  for (const c of list) {
    const id = Number(c?.id)
    if (!Number.isFinite(id)) continue
    out.push({ id, name: String(c?.name || `分类 ${id}`), icon: String(c?.icon || ''), depth })
    if (includeChildren.value && Array.isArray(c?.children) && depth < 1) {
      flatten(c.children, depth + 1, out)
    }
  }
  return out
}

const flatRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter((r) => r.name.toLowerCase().includes(kw))
})

const allSelected = computed(
  () => flatRows.value.length > 0 && flatRows.value.every((r) => selected.value.has(r.id)),
)
const someSelected = computed(
  () => !allSelected.value && flatRows.value.some((r) => selected.value.has(r.id)),
)

async function load() {
  loading.value = true
  try {
    const res: any = await getCategoryList()
    const data = res?.data
    const list = Array.isArray(data) ? data : (data?.records || data?.list || [])
    rows.value = flatten(Array.isArray(list) ? list : [])
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function open() {
  selected.value = new Set()
  keyword.value = ''
  visible.value = true
  void load()
}

defineExpose({ open })

function toggleOne(id: number, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(id)
  else next.delete(id)
  selected.value = next
}

function toggleAll(on: boolean) {
  const next = new Set(selected.value)
  for (const r of flatRows.value) {
    if (on) next.add(r.id)
    else next.delete(r.id)
  }
  selected.value = next
}

/** 已有项的路径集合（去重用） */
function existingPaths(): Set<string> {
  const s = new Set<string>()
  for (const it of props.items || []) {
    const p = (it?.link_url || '').trim()
    if (p) s.add(p)
  }
  return s
}

function onImport() {
  const exists = existingPaths()
  const picked = rows.value.filter((r) => selected.value.has(r.id))
  // 去重：同一个分类路径已存在就跳过，不覆盖运营已配的图标/角标
  const fresh = picked.filter((r) => !exists.has(categoryPath(r.id)))
  const skipped = picked.length - fresh.length

  if (!fresh.length) {
    ElMessage.warning('选中的分类都已经在列表里了，无需重复导入')
    return
  }

  const room = props.remaining
  if (room <= 0) {
    ElMessage.warning(`分类项已达上限 ${CATEGORY_NAV_MAX_ITEMS} 个`)
    return
  }

  const finalList = fresh.slice(0, room)
  const overflow = fresh.length - finalList.length
  emit('confirm', finalList.map((r) => r.id))
  visible.value = false

  const notes: string[] = [`已导入 ${finalList.length} 个`]
  if (skipped) notes.push(`跳过 ${skipped} 个已存在`)
  if (overflow) notes.push(`超出上限未导入 ${overflow} 个`)
  ElMessage.success(notes.join('，'))
}
</script>

<style lang="scss" scoped>
.imp__bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.imp__bar :deep(.el-input) {
  max-width: 220px;
}

.imp__count {
  font-size: 11.5px;
  color: #a89c8d;
}

.imp__body {
  min-height: 300px;
  max-height: 420px;
  overflow-y: auto;
  background: #fcfbf9;
  border: 1px solid #eee7dd;
  border-radius: 8px;
}

.imp__select-all {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: #f7f3ec;
  border-bottom: 1px solid #eee7dd;
}

.imp__list {
  padding: 4px 6px 8px;
}

.imp__row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 7px;

  &:hover {
    background: #f5efe8;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
  }
}

.imp__row-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  overflow: hidden;
  background: #f1ede6;
  border-radius: 6px;

  img {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
}

.imp__row-icon--ph {
  font-size: 12px;
}

.imp__row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.imp__row-path {
  flex: none;
  max-width: 210px;
  overflow: hidden;
  font-size: 10.5px;
  color: #b3a596;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.imp__blank {
  padding: 46px 10px;
  text-align: center;
}

.imp__blank-title {
  margin: 0;
  font-size: 13px;
  color: #5c5249;
}

.imp__blank-hint {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #a89c8d;
}

.imp__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.imp__foot-hint {
  font-size: 11.5px;
  color: #a89c8d;
}

.imp__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
