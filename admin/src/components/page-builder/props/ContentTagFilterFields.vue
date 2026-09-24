<template>
  <div class="tag-filter-fields">
    <el-divider content-position="left">内容标签筛选</el-divider>
    <el-form-item label="平台维">
      <el-select
        :model-value="platformCodes"
        multiple
        collapse-tags
        clearable
        placeholder="不限"
        style="width: 100%"
        @change="(v: string[]) => emit('update', { filter_platform_codes: v?.length ? v : undefined })"
      >
        <el-option label="微信公众号" value="wechat" />
        <el-option label="小红书" value="xiaohongshu" />
        <el-option label="抖音" value="douyin" />
        <el-option label="手动录入" value="manual" />
      </el-select>
    </el-form-item>
    <el-form-item label="话题标签">
      <el-select
        :model-value="topicTags"
        multiple
        filterable
        allow-create
        default-first-option
        collapse-tags
        clearable
        placeholder="输入或选择标签名"
        style="width: 100%"
        @change="(v: string[]) => emit('update', { filter_topic_tags: v?.length ? v : undefined })"
      >
        <el-option v-for="t in topicTags" :key="t" :label="t" :value="t" />
      </el-select>
      <div class="ds-hint">与内容库标签名一致；首项会传给列表接口 tag 参数</div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const platformCodes = computed(() =>
  Array.isArray(data.filter_platform_codes) ? (data.filter_platform_codes as string[]) : [],
)
const topicTags = computed(() =>
  Array.isArray(data.filter_topic_tags) ? (data.filter_topic_tags as string[]) : [],
)
</script>
