<template>
  <div class="tag-filter-fields">
    <el-divider content-position="left">{{ dividerText }}</el-divider>
    <el-form-item :label="platformLabel">
      <FeedTagPillSelect
        :model-value="platformCodes"
        kind="platform"
        placeholder="搜索并选择平台标签"
        @update:model-value="(v: string[]) => patch({ filter_platform_codes: v })"
      />
    </el-form-item>
    <el-form-item label="话题标签">
      <FeedTagPillSelect
        :model-value="topicTags"
        kind="topic"
        placeholder="搜索并选择话题标签"
        @update:model-value="(v: string[]) => patch({ filter_topic_tags: v })"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FeedTagPillSelect from '../articleFeed/FeedTagPillSelect.vue'

/**
 * 内容标签筛选（平台维度 + 话题标签）。
 *
 * 🔴 本组件被 4 个面板复用（ArticleFeed / ArticleList / NoteFeed / MaterialList），
 * 改动必须对 4 个调用方都成立，故只做「共用能力增强」，不引入调用方专属行为。
 *
 * 本轮修掉的两个问题：
 *  ① label 写死成「平台维」（少一个「度」字），已补全为「平台维度」；
 *     同时给它 `min-width:0` + 省略保护，避免 flex 布局下被压回截断。
 *  ② 话题标签原本是 `allow-create` 自由输入、且**选项来源就是已选数组本身**
 *     （`v-for="t in topicTags"`）—— 等于没有选项，运营只能手打，
 *     输错空格/标点就静默查不到数据。现改为读内容库标签的可搜索多选胶囊。
 */
const { props: data, divider, platform } = defineProps<{
  props: Record<string, any>
  /** 分组标题，默认沿用旧文案「内容标签筛选」 */
  divider?: string
  /** 平台维度的字段标签，默认「平台维度」 */
  platform?: string
}>()

const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const dividerText = computed(() => divider || '内容标签筛选')
const platformLabel = computed(() => platform || '平台维度')

const platformCodes = computed<string[]>(() =>
  Array.isArray(data.filter_platform_codes) ? (data.filter_platform_codes as string[]) : [],
)
const topicTags = computed<string[]>(() =>
  Array.isArray(data.filter_topic_tags) ? (data.filter_topic_tags as string[]) : [],
)

function patch(p: Record<string, unknown>) {
  emit('update', p)
}
</script>

<style scoped lang="scss">
/* label 默认不换行且可收缩；这里给足宽度并允许正常显示完整文案 */
.tag-filter-fields :deep(.el-form-item__label) {
  min-width: 0;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}
</style>
