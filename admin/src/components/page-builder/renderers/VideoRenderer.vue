<template>
  <div class="render-video" :style="videoStyle">
    <!-- 预览模式下点击播放，渲染真实播放器 -->
    <template v-if="playing">
      <video
        ref="playerRef"
        :src="videoSrc"
        class="video-player"
        controls
        autoplay
        playsinline
        :loop="component.props.loop === true"
        @error="handlePlayError"
        @waiting="buffering = true"
        @canplay="buffering = false"
        @playing="buffering = false"
      />
      <div v-if="buffering" class="video-loading">视频加载中…</div>
    </template>
    <template v-else>
      <template v-if="posterUrl">
        <img :src="posterUrl" alt="" class="video-cover" />
      </template>
      <template v-else-if="videoSrc">
        <!-- 无封面时用视频首帧当封面 -->
        <video :src="`${videoSrc}#t=0.1`" class="video-cover" preload="metadata" muted playsinline />
      </template>
      <div
        class="video-overlay"
        :class="{ 'video-overlay--clickable': videoSrc }"
        @click="handlePlayClick"
      >
        <el-icon :size="40" color="#ffffff"><VideoPlay /></el-icon>
        <span v-if="!posterUrl && !videoSrc" class="video-title">{{ component.props.title || '视频播放器' }}</span>
        <span class="video-btn">{{ component.props.button_text || '点击播放' }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const playing = ref(false)
const buffering = ref(false)
const playerRef = ref<HTMLVideoElement>()

function handlePlayClick() {
  if (!videoSrc.value) {
    ElMessage.warning('请先在「内容与数据」中设置视频地址')
    return
  }
  playing.value = true
  buffering.value = true
  // 在用户点击手势内显式调用 play()，避免浏览器自动播放策略拦截
  void nextTick(() => {
    playerRef.value?.play().catch(() => {
      /* 自动播放被拦截时保留 controls，用户可手动点击原生播放按钮 */
    })
  })
}

function handlePlayError() {
  playing.value = false
  ElMessage.error('视频加载失败，请检查视频地址是否有效')
}

// 切换视频源时重置播放状态
watch(() => props.component.props?.src, () => {
  playing.value = false
})

const videoSrc = computed(() =>
  normalizeUploadUrl(props.component.props?.src || props.component.props?.url || ''),
)
const posterUrl = computed(() => normalizeUploadUrl(props.component.props?.poster || ''))

const videoStyle = computed<Record<string, string>>(() => {
  // 样式面板里设置过圆角（含 0）时以其为准，未设置时才用组件默认值
  const styleRadius = props.component.style?.border_radius
  const radius = styleRadius === undefined || styleRadius === null
    ? Number(props.component.props?.border_radius ?? 8)
    : Number(styleRadius)
  const style: Record<string, string> = { borderRadius: `${radius}px` }
  // 背景色跟随样式面板（在视频未铺满/加载前的区域可见）
  if (props.component.style?.background_color) {
    style.background = props.component.style.background_color
  }
  return style
})
</script>

<style lang="scss" scoped>
.render-video {
  position: relative;
  height: 180px;
  background: #000;
  overflow: hidden;

  .video-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .video-player {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #000;
  }

  .video-loading {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    pointer-events: none;
    z-index: 2;
  }

  .video-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.18);
    z-index: 1;

    &.video-overlay--clickable {
      cursor: pointer;
    }
  }

  .video-title {
    color: #c0c4cc;
  }

  .video-btn {
    padding: 4px 10px;
    color: #fff;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.45);
    border-radius: 999px;
  }
}
</style>
