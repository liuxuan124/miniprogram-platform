<template>
  <div class="source-tag-fields">
    <el-divider content-position="left">来源标签</el-divider>
    <el-form-item label="显示标签">
      <el-switch
        :model-value="data.show_source_tag === true"
        @change="(v: boolean) => emit('update', { show_source_tag: v })"
      />
      <div class="ds-hint">旧页面默认关闭；开启后按内容来源展示小标签</div>
    </el-form-item>
    <template v-if="data.show_source_tag === true">
      <el-form-item label="标签位置">
        <el-radio-group
          :model-value="data.source_tag_position || 'meta'"
          @change="(v: string) => emit('update', { source_tag_position: v })"
        >
          <el-radio-button value="title">标题旁</el-radio-button>
          <el-radio-button value="meta">日期行</el-radio-button>
          <el-radio-button value="cover">封面上</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="筛选来源">
        <el-select
          :model-value="filterValue"
          multiple
          collapse-tags
          clearable
          placeholder="不限（展示全部）"
          style="width: 100%"
          @change="onFilterChange"
        >
          <el-option label="微信公众号" value="wechat_mp" />
          <el-option label="小红书" value="xiaohongshu" />
          <el-option label="问答" value="qa" />
          <el-option label="原创" value="original" />
        </el-select>
        <div class="ds-hint">
          只影响本组件展示。已在客户端筛选，会自动多取一些再按此条件过滤。
        </div>
        <div v-if="filterValue.length && availableCount != null" class="ds-hint ds-hint--warn">
          <template v-if="availableCount === 0">
            当前筛选下没有匹配内容，画布会显示空态。建议放宽来源或改用「内容分类」。
          </template>
          <template v-else-if="shortfall">
            筛选后只剩 {{ availableCount }} 篇，配置 {{ limitValue }} 篇拉不满 —— 画布只显示 {{ availableCount }} 篇。
          </template>
          <template v-else>筛选后可用 {{ availableCount }} 篇，足够填满 {{ limitValue }} 篇。</template>
        </div>
      </el-form-item>
      <el-form-item label="公众号文案">
        <el-input
          :model-value="labelOf('wechat_mp')"
          :placeholder="`默认：${SOURCE_TAG_DEFAULTS.wechat_mp}`"
          @update:model-value="(v: string) => patchLabel('wechat_mp', v)"
        />
      </el-form-item>
      <el-form-item label="小红书文案">
        <el-input
          :model-value="labelOf('xiaohongshu')"
          :placeholder="`默认：${SOURCE_TAG_DEFAULTS.xiaohongshu}`"
          @update:model-value="(v: string) => patchLabel('xiaohongshu', v)"
        />
      </el-form-item>
      <el-form-item label="问答文案">
        <el-input
          :model-value="labelOf('qa')"
          :placeholder="`默认：${SOURCE_TAG_DEFAULTS.qa}`"
          @update:model-value="(v: string) => patchLabel('qa', v)"
        />
      </el-form-item>
      <el-form-item label="原创文案">
        <el-input
          :model-value="labelOf('original')"
          :placeholder="`默认：${SOURCE_TAG_DEFAULTS.original}`"
          @update:model-value="(v: string) => patchLabel('original', v)"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  SOURCE_TAG_DEFAULTS,
  filterBySourceKeys,
  type SourceTagKey,
} from '@/utils/dsl-source-tag'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { ComponentType } from '@/types/page'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const filterValue = computed(() => {
  const raw = data.source_filter
  return Array.isArray(raw) ? raw : []
})

/**
 * 筛选后实际能出几篇 —— 让「拉不满」在面板里就看得见，而不是等画布空白才发现。
 *
 * ⚠️ useEditorLiveItems 的第二个参数是 `isPreview`（返回 true 就**跳过**请求），
 * 这里必须传 false，否则永远拿不到数据。
 * ⚠️ 它内部的 watch 依赖里**没有** source_filter，所以筛选变化后要自己 watch 触发 refresh。
 */
const limitValue = computed(() => Math.max(Number(data.limit || 6), 1))

const liveProbe = computed<ComponentInstance>(() => ({
  id: 'props-source-tag-probe',
  type: ComponentType.ArticleList,
  props: data,
}))

const { items: probeItems, loading: probeLoading, refresh: refreshProbe } =
  useEditorLiveItems(
    () => liveProbe.value,
    () => false,
  )

const availableCount = computed(() => {
  if (!filterValue.value.length) return null
  if (probeLoading.value) return null
  // 拉取量已按余量放大，这里直接数命中数即可
  return filterBySourceKeys(
    probeItems.value as Record<string, unknown>[],
    filterValue.value,
  ).length
})

const shortfall = computed(
  () => availableCount.value != null && availableCount.value < limitValue.value,
)

watch(filterValue, () => refreshProbe(), { deep: true })

function labelOf(key: SourceTagKey) {
  const map = data.source_labels || {}
  return map[key] || ''
}

function patchLabel(key: SourceTagKey, value: string) {
  const map = { ...(data.source_labels || {}), [key]: value }
  emit('update', { source_labels: map })
}

function onFilterChange(v: string[]) {
  emit('update', { source_filter: v && v.length ? v : undefined })
}
</script>

<style scoped lang="scss">
.ds-hint--warn {
  padding: 5px 7px;
  color: #9a5b12;
  line-height: 1.45;
  background: #fdf6ec;
  border: 1px solid #f0dfc4;
  border-radius: 6px;
}
</style>
