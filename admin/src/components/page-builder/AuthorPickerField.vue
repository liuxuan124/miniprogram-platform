<template>
  <div class="author-picker">
    <el-popover
      v-model:visible="popVisible"
      placement="bottom-start"
      :width="340"
      trigger="click"
    >
      <template #reference>
        <button
          type="button"
          class="author-picker__btn"
          :class="{ 'is-linked': !!modelValue }"
          title="从作者档案库挑一位，自动带出头像/名称/身份"
        >
          <el-icon><User /></el-icon>
        </button>
      </template>

      <div class="ap">
        <div class="ap__head">
          <span>从作者库选择</span>
          <el-button link type="primary" size="small" @click="openAuthorAdmin">
            去作者管理
          </el-button>
        </div>

        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜作者昵称 / 头衔"
          :prefix-icon="Search"
          @input="debouncedLoad"
        />

        <div v-if="loading" class="ap__msg">加载中…</div>
        <div v-else-if="error" class="ap__msg ap__msg--err">
          {{ error }}
          <el-button link type="primary" size="small" @click="load">重试</el-button>
        </div>
        <div v-else-if="!rows.length" class="ap__msg">
          没有匹配的作者。可以先到「作者管理」建档，再回来直接选。
        </div>
        <ul v-else class="ap__list">
          <li
            v-for="a in rows"
            :key="String(a.id)"
            class="ap__item"
            :class="{ 'is-on': modelValue === a.id }"
            @click="pick(a)"
          >
            <img v-if="a.avatarUrl" class="ap__ava" :src="normalizeUploadUrl(a.avatarUrl)" alt="" />
            <span v-else class="ap__ava ap__ava--empty">{{ (a.name || '作').charAt(0) }}</span>
            <span class="ap__meta">
              <b>{{ a.name || '未命名' }}</b>
              <span class="ap__sub">{{ a.title || roleLabel(a.role) }}</span>
            </span>
            <el-icon v-if="modelValue === a.id" class="ap__ok"><Select /></el-icon>
          </li>
        </ul>

        <div v-if="modelValue" class="ap__foot">
          <el-button size="small" text @click="clear">解除关联</el-button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Select, User } from '@element-plus/icons-vue'
import { listAuthors, type AuthorRecord } from '@/api/author'
import { normalizeUploadUrl } from '@/api/system'

/**
 * 作者库选择器（装修器右侧属性面板用）。
 *
 * 解决的问题：运营在装修器里配「品牌作者列表」时，原来只能一行行手打
 * 头像 + 名称 + 身份，想用已有作者就得先去「作者管理」复制粘贴。
 * 这里直接接 /api/v1/admin/authors 搜索并回填。
 *
 * 只回填展示字段（头像/名称/身份），不动 authorId ——
 * DSL 里存的是快照，改作者库不会意外改掉已发布页面的展示。
 */
const props = defineProps<{ modelValue?: number | null }>()
const emit = defineEmits<{
  /** 选中作者；传 null 表示解除关联 */
  select: [payload: { authorId: number; name: string; role: string; avatarUrl: string; title: string } | null]
}>()

const router = useRouter()
const popVisible = ref(false)
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const rows = ref<AuthorRecord[]>([])

const ROLE_LABELS: Record<string, string> = {
  owner: '主理人',
  host: '星球主理人',
  editor: '编辑',
  contributor: '投稿人',
  operator: '运营',
  user: '用户',
}

function roleLabel(r?: string) {
  return ROLE_LABELS[r || ''] || r || '—'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await listAuthors({ status: 1, keyword: keyword.value || undefined })
    rows.value = Array.isArray(res?.data) ? res.data : []
  } catch (e: any) {
    error.value = e?.message || '作者列表加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
function debouncedLoad() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 260)
}

function pick(a: AuthorRecord) {
  emit('select', {
    authorId: Number(a.id),
    name: String(a.name || ''),
    // 身份优先用头衔（更贴近展示），没有再回落枚举标签
    role: String(a.title || roleLabel(a.role)),
    avatarUrl: String(a.avatarUrl || ''),
    title: String(a.title || ''),
  })
  popVisible.value = false
}

function clear() {
  emit('select', null)
  popVisible.value = false
}

function openAuthorAdmin() {
  popVisible.value = false
  router.push('/content/authors')
}

// 打开弹层时才拉数据，避免装修器一进页面就多打一个请求
watch(popVisible, (v) => {
  if (v && !rows.value.length) load()
})

onMounted(() => {
  /* 静默预热一条，弹层打开就是有内容的 */
  load()
})
</script>

<style scoped>
.author-picker {
  display: inline-flex;
  flex: none;
}
.author-picker__btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 14px;
  color: var(--text-muted, #94a3b8);
  background: #fff;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.author-picker__btn:hover {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
}
.author-picker__btn.is-linked {
  color: var(--el-color-primary, #c08e6e);
  border-color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 12%, #fff);
}
.ap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ap__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
}
.ap__msg {
  padding: 14px 4px;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted, #94a3b8);
}
.ap__msg--err {
  color: var(--el-color-danger, #f56c6c);
}
.ap__list {
  max-height: 260px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.ap__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}
.ap__item:hover {
  background: #f6f8fb;
}
.ap__item.is-on {
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
}
.ap__ava {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 1px solid var(--el-border-color, #dcdfe6);
}
.ap__ava--empty {
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #a1897a;
}
.ap__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.ap__meta b {
  font-size: 13px;
  font-weight: 500;
  color: var(--wb-ink, #2a1f17);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap__sub {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap__ok {
  flex: none;
  font-size: 14px;
  color: var(--el-color-primary, #c08e6e);
}
.ap__foot {
  padding-top: 4px;
  border-top: 1px dashed var(--el-border-color, #dcdfe6);
}
</style>
