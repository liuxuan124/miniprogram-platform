<template>
  <div class="plr" :class="{ 'is-invalid': invalid }">
    <LinkPickerField
      :link-type="linkType"
      :link-url="linkUrl"
      @update:link-type="onType"
      @update:link-url="onUrl"
    />
    <!--
      清空按钮：LinkPickerField 本身只给「选」，选完回不到「无」。
      运营配错了只能一个个改类型，很容易漏 —— 这里给一个显式清空口。
    -->
    <el-tooltip :content="isEmpty ? '当前未设置' : '清空已选路径'" placement="top">
      <button
        type="button"
        class="plr__clear"
        :disabled="isEmpty"
        aria-label="清空链接"
        @click="clear"
      >
        <el-icon><CircleClose /></el-icon>
      </button>
    </el-tooltip>

    <!--
      完整路径气泡：面板宽 380px，路径常被裁成「/pa…」。
      光靠截断值运营无法确认自己选对了页面，必须能看到全路径。
    -->
    <el-tooltip
      v-if="linkUrl"
      :content="linkUrl"
      placement="top"
      :show-after="200"
      :max-width="320"
    >
      <span class="plr__full" :title="linkUrl">{{ linkUrl }}</span>
    </el-tooltip>

    <p v-if="invalid" class="plr__err">{{ invalidText }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * 星球顶栏专用的链接选择行。
 *
 * ## 为什么要这层薄封装（修的是一个真 bug）
 *
 * `LinkPickerField` 发的是**两个独立事件**：
 * ```
 * emits: { 'update:linkType': [string], 'update:linkUrl': [string] }
 * ```
 * 而星球顶栏面板原先写的是：
 * ```
 * <LinkPickerField @update="(v: {url,type}) => ..." />
 * ```
 * 事件名对不上 → **四个链接（加入/切换/续费/加群）一个都存不下来，
 * 而且不报任何错**：选择器点得动、UI 有响应，就是数据不落库。
 * 这类静默失效最难排查，运营只会以为「保存丢了」。
 *
 * 这里统一收敛成 `change({type,url})` 单事件，四处调用点不再各写一遍接法。
 * ⚠️ 改动时注意：**emit 的是两个事件名，不要改回 `@update`**。
 */
import { computed } from 'vue'
import { CircleClose } from '@element-plus/icons-vue'
import LinkPickerField from '../LinkPickerField.vue'

const props = withDefaults(
  defineProps<{
    linkType?: string
    linkUrl?: string
    /** 校验失败态：标红 + 下方错误文案 */
    invalid?: boolean
    invalidText?: string
  }>(),
  { invalidText: '请选择跳转页面' },
)

const emit = defineEmits<{
  change: [value: { type: string; url: string }]
}>()

/**
 * LinkPickerField 的两个事件是**分开**触发的：改类型不带 url，改 url 不带 type。
 * 所以不能把单个事件的载荷直接透传出去 —— 父组件会收到半截数据，
 * 另一个字段被写成 undefined。这里读当前 props 补全，天然避免「传半截」。
 */
function onType(t: string) {
  emit('change', { type: t, url: props.linkUrl || '' })
}
function onUrl(u: string) {
  emit('change', { type: props.linkType || 'page', url: u })
}
function clear() {
  emit('change', { type: props.linkType || 'page', url: '' })
}

const isEmpty = computed(() => !String(props.linkUrl || '').trim())
</script>

<style scoped>
.plr { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; width: 100%; min-width: 0; }
.plr :deep(.link-picker) { flex: 1 1 auto; min-width: 0; }

.plr__clear {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #94a3b8;
  font-size: 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.plr__clear:hover:not(:disabled) {
  color: var(--el-color-danger, #f56c6c);
  background: #fef0f0;
}
.plr__clear:disabled { opacity: 0.4; cursor: not-allowed; }

/* 完整路径：单行省略，气泡里给全量 */
.plr__full {
  flex: 1 1 100%;
  min-width: 0;
  padding: 2px 6px;
  overflow: hidden;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 5px;
}

.plr__err {
  flex: 1 1 100%;
  margin: 0;
  color: var(--el-color-danger, #f56c6c);
  font-size: 11px;
  line-height: 1.45;
}
.is-invalid :deep(.el-select__wrapper),
.is-invalid :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger, #f56c6c) inset;
}
</style>
