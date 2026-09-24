<template>
  <div class="qa-list-props">
    <el-form label-width="88px" size="small">
      <el-divider content-position="left">问答展示</el-divider>
      <el-form-item label="显示条数">
        <el-input-number
          :model-value="Number(data.limit ?? 5)"
          :min="1"
          :max="20"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { limit: v ?? 5 })"
        />
      </el-form-item>
      <el-form-item label="摘要行数">
        <el-input-number
          :model-value="Number(data.summary_lines ?? 2)"
          :min="1"
          :max="3"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { summary_lines: v ?? 2 })"
        />
      </el-form-item>
      <el-form-item label="隐藏私密">
        <el-switch
          :model-value="data.filter_private !== false"
          @change="(v: boolean) => emit('update', { filter_private: v })"
        />
        <div class="ds-hint">画布与小程序端客户端过滤私密问答</div>
      </el-form-item>
      <el-form-item label="提问入口">
        <el-switch
          :model-value="data.show_ask_entry === true"
          @change="(v: boolean) => emit('update', { show_ask_entry: v })"
        />
      </el-form-item>
      <LinkPickerField
        v-if="data.show_ask_entry"
        label="提问页"
        :model-value="data.ask_link"
        @update:model-value="(v: string) => emit('update', { ask_link: v })"
      />
      <el-form-item label="话题 Tab">
        <el-select
          :model-value="topicValues"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入话题名回车添加"
          style="width: 100%"
          @change="onTopicsChange"
        >
          <el-option v-for="t in topicValues" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">查看更多</el-divider>
      <el-form-item label="显示入口">
        <el-switch :model-value="data.show_more === true" @change="(v: boolean) => emit('update', { show_more: v })" />
      </el-form-item>
      <LinkPickerField
        v-if="data.show_more"
        label="列表页"
        :model-value="data.more_link"
        @update:model-value="(v: string) => emit('update', { more_link: v })"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import LinkPickerField from '../LinkPickerField.vue'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const topicValues = computed(() => {
  const raw = data.topic_tabs
  if (!Array.isArray(raw)) return []
  return raw.map((t: any) => String(t?.name || t || '').trim()).filter(Boolean)
})

function onTopicsChange(names: string[]) {
  emit('update', { topic_tabs: names.map((name) => ({ name })) })
}
</script>
