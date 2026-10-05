<template>
  <div class="pin-editor">
    <div class="pin-editor__head">
      <span class="pin-editor__label">手动置顶</span>
      <span class="pin-editor__count" :class="{ 'is-full': list.length >= PIN_MAX_LIMIT }">
        {{ list.length }} / {{ PIN_MAX_LIMIT }}
      </span>
    </div>

    <el-empty
      v-if="!list.length"
      :image-size="52"
      description="未置顶任何文章"
      class="pin-editor__blank"
    >
      <el-button type="primary" size="small" @click="pickerVisible = true">+ 添加置顶文章</el-button>
    </el-empty>

    <draggable
      v-else
      v-model="listProxy"
      item-key="id"
      handle=".pin-row__grip"
      :animation="160"
      ghost-class="pin-row--ghost"
      class="pin-editor__list"
    >
      <template #item="{ element, index }">
        <div class="pin-row">
          <span class="pin-row__grip" title="拖拽调整置顶优先级" aria-label="拖拽排序">
            <el-icon><Rank /></el-icon>
          </span>
          <span class="pin-row__no">{{ index + 1 }}</span>
          <div class="pin-row__thumb">
            <img v-if="element.cover" :src="element.cover" alt="" />
            <span v-else class="pin-row__ph">📄</span>
          </div>
          <span class="pin-row__title" :title="element.title || `#${element.id}`">
            {{ element.title || `文章 #${element.id}` }}
          </span>
          <button type="button" class="pin-row__x" title="取消置顶" @click="removeAt(index)">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </template>
    </draggable>

    <el-button
      v-if="list.length && list.length < PIN_MAX_LIMIT"
      type="primary"
      text
      size="small"
      class="pin-editor__add"
      @click="pickerVisible = true"
    >
      + 添加置顶文章
    </el-button>
    <p v-else-if="list.length >= PIN_MAX_LIMIT" class="pin-editor__tip">
      最多置顶 {{ PIN_MAX_LIMIT }} 篇。置顶的文章按此顺序优先展示。
    </p>

    <!-- 选文章弹窗 -->
    <el-dialog
      v-model="pickerVisible"
      title="选择置顶文章"
      width="560px"
      append-to-body
      @open="loadCandidates"
    >
      <el-input
        v-model="keyword"
        size="small"
        clearable
        placeholder="搜索标题"
        class="pin-picker__search"
      />
      <div v-if="loading" class="pin-picker__state">读取中…</div>
      <div v-else-if="!candidates.length" class="pin-picker__state">没有匹配的已发布文章</div>
      <div v-else class="pin-picker__list">
        <label
          v-for="item in candidates"
          :key="item.id"
          class="pin-picker__item"
          :class="{ 'is-picked': pickedIds.has(String(item.id)) }"
        >
          <input
            type="checkbox"
            :checked="pickedIds.has(String(item.id))"
            :disabled="!pickedIds.has(String(item.id)) && atLimit"
            @change="toggle(item)"
          />
          <div class="pin-picker__thumb">
            <img v-if="item.cover" :src="item.cover" alt="" />
            <span v-else>📄</span>
          </div>
          <span class="pin-picker__title">{{ item.title }}</span>
          <span class="pin-picker__date">{{ item.date }}</span>
        </label>
      </div>
      <template #footer>
        <el-button size="small" @click="pickerVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { ElMessage } from 'element-plus'
import { Rank, Close } from '@element-plus/icons-vue'
import { getContentList } from '@/api/content'
import { PIN_MAX_LIMIT, type PinnedArticle } from './articleFeedSchema'

const props = defineProps<{ modelValue: PinnedArticle[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: PinnedArticle[]] }>()

const pickerVisible = ref(false)
const keyword = ref('')
const loading = ref(false)

interface Candidate {
  id: number
  title: string
  cover: string
  date: string
}

const candidates = ref<Candidate[]>([])

/** 已置顶列表（缺省空数组，避免 v-model 拿到 undefined） */
const list = computed<PinnedArticle[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const listProxy = computed<PinnedArticle[]>({
  get: () => list.value,
  set: (next) => emit('update:modelValue', next),
})

/** 已选中的候选 id（用于弹窗里回显勾选态） */
const pickedIds = computed(() => new Set(list.value.map((p) => String(p.id))))

/** 弹窗里的暂存选择，确认后才写回 */
const staged = ref<Record<string, Candidate>>({})
const atLimit = computed(() => Object.keys(staged.value).length >= PIN_MAX_LIMIT)

async function loadCandidates() {
  loading.value = true
  keyword.value = ''
  // 用现有已置顶补齐暂存，回显勾选
  staged.value = {}
  try {
    const res = await getContentList({ current: 1, size: 50, status: 'published', keyword: undefined } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    candidates.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      title: String(r.title || `文章 ${r.id}`),
      cover: String(r.cover || r.coverUrl || r.image || ''),
      date: String(r.publishedAt || r.publishTime || r.publish_time || '').slice(0, 10),
    }))
  } catch {
    candidates.value = []
    ElMessage.warning('读取文章列表失败')
  } finally {
    loading.value = false
  }
}

function toggle(item: Candidate) {
  const key = String(item.id)
  if (pickedIds.value.has(key)) {
    // 已置顶的取消勾选 = 直接移除
    removeById(key)
    return
  }
  if (atLimit.value) {
    ElMessage.warning(`最多置顶 ${PIN_MAX_LIMIT} 篇`)
    return
  }
  staged.value = { ...staged.value, [key]: item }
}

function removeById(id: string) {
  emit('update:modelValue', list.value.filter((p) => String(p.id) !== id))
}

function removeAt(index: number) {
  const next = [...list.value]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function confirm() {
  const additions = Object.values(staged.value).map<PinnedArticle>((c) => ({
    id: c.id,
    title: c.title,
    cover: c.cover || undefined,
  }))
  if (additions.length) {
    const merged = [...list.value, ...additions].slice(0, PIN_MAX_LIMIT)
    emit('update:modelValue', merged)
  }
  pickerVisible.value = false
  staged.value = {}
}
</script>

<style scoped lang="scss">
.pin-editor {
  width: 100%;
}

.pin-editor__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.pin-editor__label {
  font-size: 12px;
  color: #6b5b4e;
}

.pin-editor__count {
  font-size: 11px;
  color: #a89c8d;

  &.is-full {
    color: var(--el-color-primary, #c08e6e);
    font-weight: 600;
  }
}

.pin-editor__blank {
  padding: 10px 0;

  :deep(.el-empty__description) {
    margin-top: 2px;
  }
}

.pin-editor__list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pin-editor__add {
  margin-top: 4px;
  margin-left: 0 !important;
}

.pin-editor__tip {
  margin: 6px 0 0;
  font-size: 11px;
  color: #a89c8d;
}

.pin-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 5px 6px;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;
}

.pin-row--ghost {
  opacity: 0.45;
  background: #f3ede4;
}

.pin-row__grip {
  display: grid;
  place-items: center;
  width: 14px;
  color: #b3a596;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.pin-row__no {
  display: grid;
  place-items: center;
  flex: none;
  width: 15px;
  height: 15px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-radius: 999px;
}

.pin-row__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  overflow: hidden;
  background: #f1ede6;
  border-radius: 5px;
  font-size: 13px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pin-row__title {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pin-row__x {
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 18px;
  color: #b3a596;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:hover {
    color: #c0392b;
    background: #fdeeec;
  }
}

/* ---------- 弹窗内 ---------- */
.pin-picker__search {
  margin-bottom: 8px;
}

.pin-picker__state {
  padding: 20px 0;
  font-size: 12px;
  color: #a89c8d;
  text-align: center;
}

.pin-picker__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 340px;
  overflow-y: auto;
}

.pin-picker__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border: 1px solid #eef1f5;
  border-radius: 7px;

  &:hover {
    background: #faf8f5;
  }

  &.is-picked {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.pin-picker__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  overflow: hidden;
  background: #f1ede6;
  border-radius: 5px;
  font-size: 14px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pin-picker__title {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pin-picker__date {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}
</style>
