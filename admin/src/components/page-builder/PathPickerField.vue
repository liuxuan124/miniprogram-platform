<template>
  <div class="path-picker">
    <el-input
      :model-value="modelValue"
      :placeholder="placeholder"
      :title="modelValue || placeholder"
      class="path-picker__input"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <el-popover
      v-model:visible="popVisible"
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="path-picker__pop"
    >
      <template #reference>
        <button
          type="button"
          class="path-picker__btn"
          :class="{ 'is-set': !!modelValue }"
          :aria-label="modelValue ? '已设置路径，点击可重新选择' : '选择链接'"
          title="从页面 / 商品 / 内容中挑选，避免手写路径"
        >
          <el-icon><Link /></el-icon>
        </button>
      </template>

      <div class="pp-body">
        <div class="pp-body__title">
          <span>选择跳转目标</span>
          <el-button size="small" text :disabled="!modelValue" @click="clearAll">清除</el-button>
        </div>
        <LinkPickerField
          :link-type="innerType"
          :link-url="modelValue || ''"
          @update:link-type="onType"
          @update:link-url="onPick"
        />
        <div class="pp-body__now">
          当前：<span class="pp-body__now-val">{{ modelValue || '未设置（走默认逻辑）' }}</span>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'
import LinkPickerField from './LinkPickerField.vue'

/**
 * 窄侧栏专用的路径输入控件 = 文本框 + 右侧「🔗」弹层选择器。
 *
 * 为什么不直接摆 LinkPickerField：
 * LinkPickerField 是「类型下拉 + 目标下拉」并排的宽控件（≥260px），
 * 塞进 300px 左右的属性面板会把文本框压到放不下一个路径片段。
 * 所以这里退化成「可手打的输入框 + 按需弹出的选择器」：
 * 运营既能从微页面/商品/内容里挑（不手敲路由），也保留手写兜底。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    /** 弹层里默认高亮的链接类型 */
    defaultType?: string
  }>(),
  { modelValue: '', placeholder: '/pkg-content/... 或 /pages/...', defaultType: 'page' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const popVisible = ref(false)
const innerType = ref(props.defaultType)

function onType(v: string) {
  innerType.value = v
}

function onPick(v: string) {
  emit('update:modelValue', v)
  if (v) popVisible.value = false
}

function clearAll() {
  emit('update:modelValue', '')
  popVisible.value = false
  ElMessage.info('已清除路径，将走组件默认逻辑')
}
</script>

<style scoped>
.path-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
}
.path-picker__input {
  flex: 1;
  min-width: 0;
}
.path-picker__btn {
  display: grid;
  place-items: center;
  flex: none;
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
.path-picker__btn:hover {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
}
/* 已配路径时给一点主色，提示「这一项不是空的」 */
.path-picker__btn.is-set {
  color: var(--el-color-primary, #c08e6e);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #fff);
}
.pp-body__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
}
.pp-body__now {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted, #94a3b8);
  word-break: break-all;
}
.pp-body__now-val {
  color: var(--wb-ink, #2a1f17);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
