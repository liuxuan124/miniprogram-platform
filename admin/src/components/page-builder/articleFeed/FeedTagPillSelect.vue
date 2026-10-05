<template>
  <div class="tag-pill-select">
    <!-- 已选标签：Badge + 一键移除 -->
    <div v-if="selected.length" class="tag-pill-select__picked">
      <span v-for="tag in selected" :key="tag" class="tag-pill">
        <span class="tag-pill__name">{{ tag }}</span>
        <button type="button" class="tag-pill__x" :aria-label="`移除 ${tag}`" @click="removeTag(tag)">
          <el-icon><Close /></el-icon>
        </button>
      </span>
    </div>

    <el-select
      :model-value="[]"
      multiple
      filterable
      collapse-tags
      clearable
      :placeholder="placeholder"
      :loading="loading"
      :disabled="disabled"
      class="tag-pill-select__input"
      @visible-change="onVisible"
      @change="onPick"
    >
      <el-option
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      >
        <span class="tag-opt">
          <span class="tag-opt__name">{{ opt.label }}</span>
          <span v-if="opt.count != null" class="tag-opt__count">{{ opt.count }} 篇</span>
        </span>
      </el-option>
    </el-select>

    <p v-if="!loading && loaded && !options.length" class="tag-pill-select__none">
      内容库里还没有{{ kindText }}，请先到「内容管理 → 标签」里创建
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { getTagList } from '@/api/content'
import type { ContentTag } from '@/types/content'

/**
 * 动态标签胶囊选择器。
 *
 * 🔴 为什么必须换掉原来的「allow-create 自由输入」：
 *   旧实现 `ContentTagFilterFields` 的选项来自 `topicTags` 自身 ——
 *   **选项列表 = 已选列表**，等于没有选项，运营只能手打。
 *   于是「平台维 度」「Amazon、TikTok」这类手误（空格/全半角/中英标点）
 *   会静默存进 DSL，接口查不到 → 组件空数据，且**界面上看不出哪里错了**。
 *   现在直接读内容库标签（`/content-tags`），选项与内容库严格一致，打错的可能性从源头消除。
 *
 * 兼容性：仍然写入同名字段 `filter_topic_tags` / `filter_platform_codes`，
 * 值的形态仍是「标签名字符串数组」，端上消费方式不变。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    /** platform=平台维度 / topic=话题标签 */
    kind?: 'platform' | 'topic'
    placeholder?: string
    disabled?: boolean
  }>(),
  { kind: 'topic', placeholder: '搜索并选择标签', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const loading = ref(false)
const loaded = ref(false)
const remoteOptions = ref<ContentTag[]>([])

const kindText = computed(() => (props.kind === 'platform' ? '平台标签' : '话题标签'))

const selected = computed<string[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

/**
 * 选项来源：
 *   platform → tag_kind='platform'（有 platform_code 时用 code 作为值）
 *   topic    → tag_kind='topic'
 * 另外把「已选但不在库里的」也补进选项并标注，
 * 否则历史脏数据在面板上会「看不见自己配了什么」，运营会去重复添加。
 */
const options = computed(() => {
  const base = remoteOptions.value.map((t) => {
    const value = props.kind === 'platform' && t.platform_code ? t.platform_code : t.name
    return { value, label: t.name, count: t.content_count }
  })
  const known = new Set(base.map((o) => o.value))
  const knownByName = new Set(base.map((o) => o.label))
  const orphan = selected.value
    .filter((v) => !known.has(v) && !knownByName.has(v))
    .map((v) => ({ value: v, label: `${v}（库中已无）`, count: null as number | null }))
  return [...base, ...orphan]
})

async function loadOptions() {
  loading.value = true
  try {
    const res = await getTagList({ keyword: undefined })
    const list = (res as any)?.data?.records || (res as any)?.data?.list || (Array.isArray(res as any) ? res : [])
    const all: ContentTag[] = Array.isArray(list) ? list : []
    remoteOptions.value = props.kind === 'platform'
      ? all.filter((t) => t.tag_kind === 'platform' || !!t.platform_code)
      : all.filter((t) => t.tag_kind === 'topic' || (t.tag_kind !== 'platform' && !t.platform_code))
    loaded.value = true
  } catch {
    remoteOptions.value = []
    ElMessage.warning('读取内容标签失败')
  } finally {
    loading.value = false
  }
}

function onVisible(v: boolean) {
  // 首次展开才拉取，避免一进面板就打接口
  if (v && !loaded.value) void loadOptions()
}

function onPick(values: string[]) {
  if (!Array.isArray(values) || !values.length) return
  // el-select 是多选「追加」语义，这里与已选合并去重
  const merged = Array.from(new Set([...selected.value, ...values]))
  emit('update:modelValue', merged)
}

function removeTag(tag: string) {
  emit('update:modelValue', selected.value.filter((t) => t !== tag))
}
</script>

<style scoped lang="scss">
.tag-pill-select {
  width: 100%;
  min-width: 0;
}

.tag-pill-select__picked {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.tag-pill {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  max-width: 100%;
  padding: 2px 4px 2px 8px;
  background: #fdf6f1;
  border: 1px solid #efdccb;
  border-radius: 999px;
}

/* 标签名过长时省略而不是撑破容器（flex 子项默认 min-width:auto 会顶宽布局） */
.tag-pill__name {
  max-width: 140px;
  overflow: hidden;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-pill__x {
  display: grid;
  place-items: center;
  flex: none;
  width: 14px;
  height: 14px;
  padding: 0;
  color: #c0a893;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 999px;

  &:hover {
    color: #c0392b;
    background: rgba(192, 57, 43, 0.08);
  }
}

.tag-pill-select__input {
  width: 100%;
}

.tag-pill-select__none {
  margin: 5px 0 0;
  font-size: 11px;
  color: #a89c8d;
  line-height: 1.4;
}

.tag-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.tag-opt__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-opt__count {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}
</style>
