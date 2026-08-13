<template>
  <el-form label-width="80px" size="small">
    <el-form-item label="左侧文案">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="公告" />
    </el-form-item>
    <el-form-item label="滚动开关">
      <el-switch :model-value="data.scrollable !== false" @change="(v: boolean) => emit('update', { scrollable: v })" />
    </el-form-item>
    <el-form-item label="滚动方向">
      <el-radio-group :model-value="data.direction || 'horizontal'" @change="(v: string) => emit('update', { direction: v })">
        <el-radio-button value="horizontal">水平</el-radio-button>
        <el-radio-button value="vertical">垂直</el-radio-button>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="data.scrollable !== false" label="滚动速度">
      <el-slider
        :model-value="Number(data.speed ?? 50)"
        :min="20"
        :max="120"
        show-input
        :show-input-controls="false"
        @change="(v: number) => emit('update', { speed: v })"
      />
      <div class="hint">数值越大滚得越快（约 px/s）</div>
    </el-form-item>
    <el-form-item v-if="(data.direction || 'horizontal') === 'vertical'" label="切换间隔">
      <el-input-number
        :model-value="data.duration ?? 3000"
        :min="1000"
        :max="10000"
        :step="500"
        controls-position="right"
        @change="(v: number) => emit('update', { duration: v })"
      />
      <div class="hint">毫秒，垂直轮播每条停留时间</div>
    </el-form-item>

    <el-divider content-position="left" class="field-divider">外观</el-divider>
    <el-form-item label="喇叭图标">
      <el-switch :model-value="data.show_icon !== false" @change="(v: boolean) => emit('update', { show_icon: v })" />
    </el-form-item>
    <el-form-item label="右侧箭头">
      <el-switch :model-value="!!data.show_more" @change="(v: boolean) => emit('update', { show_more: v })" />
    </el-form-item>
    <el-form-item label="关闭按钮">
      <el-switch :model-value="!!data.closable" @change="(v: boolean) => emit('update', { closable: v })" />
    </el-form-item>
    <el-form-item label="文字颜色">
      <el-color-picker :model-value="data.text_color || '#9a3412'" @change="(v: string) => emit('update', { text_color: v })" />
    </el-form-item>
    <el-form-item label="背景颜色">
      <el-color-picker :model-value="data.background_color || '#fff7ed'" @change="(v: string) => emit('update', { background_color: v })" />
    </el-form-item>
    <el-form-item label="文字大小">
      <el-input-number
        :model-value="data.font_size ?? 12"
        :min="10"
        :max="20"
        controls-position="right"
        @change="(v: number) => emit('update', { font_size: v })"
      />
    </el-form-item>
    <el-form-item label="跳转链接">
      <el-input :model-value="data.link_url || ''" @input="emit('update', { link_url: $event })" placeholder="/pages/xxx 或 https://" />
    </el-form-item>

    <el-divider content-position="left" class="field-divider">公告条目</el-divider>
    <div v-for="(item, i) in items" :key="i" class="notice-row">
      <el-input :model-value="item" @input="onItemInput(i, $event)" placeholder="公告内容" />
      <el-button type="danger" text size="small" @click="removeItem(i)">删除</el-button>
    </div>
    <el-button type="primary" text size="small" @click="addItem">+ 添加公告</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useListEditor } from '../composables/useListEditor'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const items = computed(() => {
  const raw = data.items
  return Array.isArray(raw) ? raw : []
})

const { addItem: add, removeItem: remove, updateItem: update } = useListEditor(items, {
  createDefault: () => '',
  maxItems: 20,
})

function addItem() {
  emit('update', { items: add() })
}

function removeItem(index: number) {
  emit('update', { items: remove(index) })
}

function onItemInput(index: number, value: string) {
  emit('update', { items: update(index, () => value) })
}
</script>

<style scoped>
.field-divider {
  margin: 10px 0 6px;
  font-size: 12px;
  color: #8a94a6;
}

.hint {
  width: 100%;
  margin-top: 2px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}

.notice-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
}

:deep(.el-slider) {
  width: 100%;
  padding-right: 4px;
}
</style>
