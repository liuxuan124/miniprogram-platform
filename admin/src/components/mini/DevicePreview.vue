<template>
  <component
    :is="frameOnly ? 'div' : 'aside'"
    class="device-preview"
    :class="{ 'device-preview--frame-only': frameOnly }"
  >
    <template v-if="!frameOnly">
      <div class="device-preview__head">
        <div class="device-preview__head-row">
          <b class="device-preview__title">效果预览</b>
          <div v-if="previewUrlLive && showModeSwitch" class="device-preview__modes" role="tablist">
            <button
              type="button"
              role="tab"
              class="mode-btn"
              :class="{ on: previewMode === 'draft' }"
              :aria-selected="previewMode === 'draft'"
              @click="previewMode = 'draft'"
            >
              草稿
            </button>
            <button
              type="button"
              role="tab"
              class="mode-btn"
              :class="{ on: previewMode === 'live' }"
              :aria-selected="previewMode === 'live'"
              @click="previewMode = 'live'"
            >
              线上
            </button>
          </div>
        </div>
        <p v-if="hint" class="device-preview__hint faint">{{ hint }}</p>
      </div>
    </template>

    <div class="device-preview__body">
      <DevicePreviewFrame
        :src="activePreviewUrl"
        title="小程序预览"
        :iframe-key="activeIframeKey"
      />
    </div>

    <button
      v-if="!frameOnly"
      type="button"
      class="btn sm device-preview__qr"
      @click="$emit('scan')"
    >
      <MiniIcon name="qr" :size="15" />
      扫码在手机上看
    </button>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import DevicePreviewFrame from '@/components/mini/DevicePreviewFrame.vue'

const props = withDefaults(
  defineProps<{
    previewUrl: string
    /** 传入时可切换草稿/线上预览 */
    previewUrlLive?: string
    hint?: string
    iframeKey?: string
    frameOnly?: boolean
    /** 首次打开时展示的配置口径；概览无未同步改动时应直接展示线上。 */
    initialMode?: 'draft' | 'live'
    /** 草稿与线上一致（无待同步改动）时传 false 隐藏切换器，避免误导 */
    showModeSwitch?: boolean
  }>(),
  {
    hint: '',
    iframeKey: 'preview',
    frameOnly: false,
    initialMode: 'draft',
    showModeSwitch: true,
  },
)

const previewMode = ref<'draft' | 'live'>(props.initialMode)

watch(
  () => [props.initialMode, props.previewUrlLive] as const,
  ([mode, liveUrl]) => {
    previewMode.value = mode === 'live' && liveUrl ? 'live' : 'draft'
  },
  { immediate: true },
)

const activePreviewUrl = computed(() =>
  previewMode.value === 'live' && props.previewUrlLive
    ? props.previewUrlLive
    : props.previewUrl,
)

const activeIframeKey = computed(() =>
  `${props.iframeKey}-${previewMode.value}`,
)

defineEmits<{
  scan: []
}>()
</script>

<style scoped lang="scss">
.device-preview {
  position: sticky;
  top: calc(var(--mini-layout-header-h, 60px) + 16px);
  align-self: start;
  width: 100%;
  max-width: 320px;
  box-sizing: border-box;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.device-preview--frame-only {
  position: static;
  max-width: none;
  padding: 0;
  border: 0;
  background: transparent;
  gap: 0;
}

.device-preview__head {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-preview__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.device-preview__modes {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.mode-btn {
  border: 0;
  background: transparent;
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--mute);
}

.mode-btn.on {
  background: var(--soft);
  color: var(--text);
  font-weight: 600;
}

.device-preview__title {
  white-space: nowrap;
  font-size: 15px;
}

.device-preview__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  text-align: left;
}

.device-preview__body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.device-preview__qr {
  width: 100%;
  justify-content: center;
}

@media (max-width: 899px) {
  .device-preview:not(.device-preview--frame-only) {
    position: static;
    max-width: none;
  }
}
</style>
