<template>
  <el-dialog
    :model-value="modelValue"
    title="从作者库选择"
    :width="640"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @open="onOpen"
  >
    <div class="bap">
      <div class="bap__bar">
        <el-input
          v-model="keyword"
          clearable
          size="default"
          placeholder="搜作者昵称 / 头衔 / 简介"
          :prefix-icon="Search"
          @input="debouncedLoad"
        />
        <el-select
          v-model="activeTag"
          clearable
          placeholder="按标签筛选"
          style="width: 180px"
          @change="load"
        >
          <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <span class="bap__count">
          已选 <b>{{ selected.length }}</b> / {{ max }}
        </span>
      </div>

      <div v-if="loading" class="bap__msg">加载中…</div>
      <div v-else-if="error" class="bap__msg bap__msg--err">
        {{ error }}
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>
      <div v-else-if="!rows.length" class="bap__msg">
        没有匹配的作者。可以先到「作者管理」建档并打好标签，再回来选。
        <el-button link type="primary" size="small" @click="openAuthorAdmin">去作者管理</el-button>
      </div>

      <div v-else class="bap__body">
        <div class="bap__list">
          <label
            v-for="a in rows"
            :key="String(a.id)"
            class="bap__item"
            :class="{
              'is-on': isPicked(a),
              'is-disabled': !isPicked(a) && selected.length >= max,
            }"
          >
            <input
              type="checkbox"
              class="bap__cb"
              :checked="isPicked(a)"
              :disabled="!isPicked(a) && selected.length >= max"
              @change="toggle(a)"
            />
            <img v-if="a.avatarUrl" class="bap__ava" :src="normalizeUploadUrl(a.avatarUrl)" alt="" />
            <span v-else class="bap__ava bap__ava--empty">{{ (a.name || '作').charAt(0) }}</span>
            <span class="bap__meta">
              <b>{{ a.name || '未命名' }}</b>
              <span class="bap__sub">{{ a.title || authorRoleLabel(a.role) }}</span>
              <span v-if="tagsOf(a).length" class="bap__tags">
                <em v-for="t in tagsOf(a)" :key="t" class="bap__tag">{{ t }}</em>
              </span>
            </span>
            <span class="bap__stat">{{ statText(a) }}</span>
          </label>
        </div>

        <div class="bap__side">
          <div class="bap__side-title">已选顺序（可拖拽调整）</div>
          <div v-if="!selected.length" class="bap__side-empty">还没选作者</div>
          <ul v-else class="bap__picked">
            <li
              v-for="(p, i) in selected"
              :key="String(p.authorId)"
              class="bap__picked-item"
              draggable="true"
              @dragstart="onDragStart(i)"
              @dragover.prevent
              @drop="onDrop(i)"
              @dragend="onDragEnd"
            >
              <span class="bap__grip" title="拖拽调整顺序">⠿</span>
              <span class="bap__picked-idx">{{ i + 1 }}</span>
              <span class="bap__picked-name">{{ p.nickname }}</span>
              <el-button link type="danger" size="small" aria-label="移除" @click="removeAt(i)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="bap__foot">
        <span class="bap__foot-note">
          确认后自动带出头像/昵称/身份，并绑定作者主页路径（无需手填）
        </span>
        <span class="bap__spacer" />
        <el-button @click="close">取消</el-button>
        <el-button type="primary" :disabled="!selected.length" @click="confirm">确认选择</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { listAuthors, authorRoleLabel, authorHomePath, type AuthorRecord } from '@/api/author'
import { normalizeUploadUrl } from '@/api/system'

/**
 * 作者库多选弹窗（V121，装修器 warm_authors 区块「手动挑选」模式用）。
 *
 * 解决的三个问题：
 *   1. 运营手打头像/昵称/身份 → 与作者库割裂，作者改资料后首页不同步。
 *      这里直接勾选作者库档案，DSL 存authorId 快照 + 展示字段。
 *   2. 手写跳转路径易 404 → 选中即用 authorHomePath() 自动绑定，
 *      作者主页路径由代码统一拼（/pkg-content/author-feed/author-feed?id=&author=）。
 *   3. 选完不知道最终顺序 → 右侧「已选顺序」支持拖拽重排，直接决定首页展示顺序。
 *
 * 限制 1~8 位：低于 1 没意义，高于 8 首页横滑会挤爆（与既有 addAuthor 上限一致）。
 */

export interface PickedAuthor {
  authorId: number
  nickname: string
  avatar: string
  /** 身份标签（头衔优先，回落身份枚举文案） */
  title: string
  /** 作者库原头衔，留作运营覆盖的「原值」提示 */
  originTitle: string
  /** 自动生成的主页路径 */
  homePath: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 已选作者（回填，支持继续追加） */
    value?: PickedAuthor[]
    max?: number
  }>(),
  { value: () => [], max: 8 },
)

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  confirm: [list: PickedAuthor[]]
}>()

const router = useRouter()
const keyword = ref('')
const activeTag = ref('')
const loading = ref(false)
const error = ref('')
const rows = ref<AuthorRecord[]>([])
/** 已选池。以 props.value 为初值，用户在这里增删排序，确认后整份交出去 */
const selected = ref<PickedAuthor[]>([])
/** 当前已选 id 集合，模板里高频查，做成 Set 避免 O(n²) */
const pickedIds = computed(() => new Set(selected.value.map((p) => Number(p.authorId))))

const max = computed(() => props.max)

function isPicked(a: AuthorRecord) {
  return pickedIds.value.has(Number(a.id))
}

function tagsOf(a: AuthorRecord): string[] {
  return String(a.tags || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function statText(a: AuthorRecord) {
  const c = Number(a.contentCount || 0)
  const p = Number(a.productCount || 0)
  if (!c && !p) return ''
  return `${c} 篇 · ${p} 专栏`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await listAuthors({
      status: 1,
      keyword: keyword.value.trim() || undefined,
    })
    let list: AuthorRecord[] = Array.isArray(res?.data) ? res.data : []
    // 标签是本地筛的：后端 listAuthors 不支持按标签过滤，作者量百级无压力
    if (activeTag.value) {
      list = list.filter((a) => tagsOf(a).includes(activeTag.value))
    }
    rows.value = list
  } catch (e: any) {
    error.value = e?.message || '作者列表加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}

/** 标签下拉选项 = 当前搜索结果里出现过的所有标签去重 */
const tagOptions = computed(() => {
  const set = new Set<string>()
  rows.value.forEach((a) => tagsOf(a).forEach((t) => set.add(t)))
  return Array.from(set).sort()
})

let timer: ReturnType<typeof setTimeout> | null = null
function debouncedLoad() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 260)
}

function toPicked(a: AuthorRecord): PickedAuthor {
  const originTitle = String(a.title || authorRoleLabel(a.role) || '')
  return {
    authorId: Number(a.id),
    nickname: String(a.name || ''),
    avatar: String(a.avatarUrl || ''),
    title: originTitle,
    originTitle,
    homePath: authorHomePath(a.id, a.name),
  }
}

function toggle(a: AuthorRecord) {
  const id = Number(a.id)
  if (pickedIds.value.has(id)) {
    selected.value = selected.value.filter((p) => Number(p.authorId) !== id)
    return
  }
  if (selected.value.length >= max.value) {
    ElMessage.warning(`最多选 ${max.value} 位作者`)
    return
  }
  selected.value = [...selected.value, toPicked(a)]
}

function removeAt(i: number) {
  selected.value = selected.value.filter((_, idx) => idx !== i)
}

/* ---------- 拖拽排序（原生 draggable，不引第三方） ---------- */
const dragIndex = ref(-1)

function onDragStart(i: number) {
  dragIndex.value = i
}

function onDrop(i: number) {
  const from = dragIndex.value
  if (from < 0 || from === i) return
  const next = [...selected.value]
  const [item] = next.splice(from, 1)
  next.splice(i, 0, item)
  selected.value = next
  dragIndex.value = -1
}

function onDragEnd() {
  dragIndex.value = -1
}

/* ---------- 打开 / 关闭 ---------- */

/** 打开时用外部已选值重置已选池，避免上一轮的临时选择残留 */
function onOpen() {
  selected.value = props.value.map((p) => ({ ...p }))
  keyword.value = ''
  activeTag.value = ''
  load()
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selected.value.length) return
  emit('confirm', selected.value.map((p) => ({ ...p })))
  emit('update:modelValue', false)
}

function openAuthorAdmin() {
  emit('update:modelValue', false)
  router.push('/content/authors')
}

/** 已选作者若在作者库被删，改 tags 筛选时把失效项从下拉里剔掉 */
watch(
  () => props.value,
  (v) => {
    if (!props.modelValue) selected.value = (v || []).map((p) => ({ ...p }))
  },
)
</script>

<style scoped>
.bap__bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.bap__count {
  flex: none;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.bap__count b {
  color: var(--wb-ink, #2a1f17);
}
.bap__msg {
  padding: 28px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}
.bap__msg--err {
  color: var(--el-color-danger, #f56c6c);
}
.bap__body {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
  height: 400px;
}
.bap__list {
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
}
.bap__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  cursor: pointer;
  transition: background 0.12s;
}
.bap__item:last-child {
  border-bottom: none;
}
.bap__item:hover {
  background: #faf7f3;
}
.bap__item.is-on {
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 9%, #fff);
}
.bap__item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.bap__cb {
  flex: none;
  margin: 0;
  cursor: pointer;
}
.bap__ava {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--el-border-color, #dcdfe6);
}
.bap__ava--empty {
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #a1897a;
}
.bap__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.bap__meta b {
  font-size: 13px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bap__sub {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bap__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}
.bap__tag {
  padding: 0 5px;
  font-size: 10px;
  font-style: normal;
  line-height: 15px;
  color: #a1897a;
  background: #f7f3ec;
  border-radius: 3px;
}
.bap__stat {
  flex: none;
  font-size: 11px;
  color: #b3a595;
}
.bap__side {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.bap__side-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
}
.bap__side-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.bap__picked {
  flex: 1;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
}
.bap__picked-item {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 7px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  cursor: grab;
}
.bap__picked-item:last-child {
  border-bottom: none;
}
.bap__grip {
  flex: none;
  font-size: 13px;
  color: #c3b6a6;
}
.bap__picked-idx {
  flex: none;
  width: 16px;
  font-size: 11px;
  color: #b3a595;
  text-align: center;
}
.bap__picked-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--wb-ink, #2a1f17);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bap__foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bap__foot-note {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.bap__spacer {
  flex: 1;
}
</style>