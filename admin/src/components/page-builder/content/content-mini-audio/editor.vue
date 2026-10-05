<template>
  <div
    class="wk-card wk-audio"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：不会真实播放</span>

    <span
      v-if="p.showCover"
      class="wk-audio__cover"
      :style="p.cover ? coverStyle : undefined"
    >
      <img v-if="p.cover" :src="p.cover" alt="" />
      <span v-else class="wk-audio__cover-icon">♪</span>
    </span>

    <button
      type="button"
      class="wk-audio__play"
      :class="{ 'wk-audio__play--peek': peek || playing }"
      :style="{ background: accent }"
      @click.stop="togglePlay($event)"
    >
      <span class="wk-audio__play-icon">{{ playing ? '❙❙' : '▶' }}</span>
    </button>

    <div class="wk-audio__main">
      <div class="wk-audio__title">{{ p.title || '音频标题' }}</div>
      <div class="wk-audio__track" @click.stop="seek($event)">
        <div class="wk-audio__bar">
          <div class="wk-audio__played" :style="{ width: percent + '%', background: accent }" />
          <div class="wk-audio__thumb" :style="{ left: percent + '%', borderColor: accent }" />
        </div>
      </div>
    </div>

    <span class="wk-audio__time">{{ fmt(current) }} / {{ fmt(total) }}</span>

    <button
      v-if="p.showSpeed"
      type="button"
      class="wk-audio__speed"
      :style="{ color: accent, borderColor: accent }"
      @click.stop="cycleSpeed($event)"
    >
      {{ speed }}x
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { contentMiniAudioDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'audio-action': [payload: Record<string, unknown>]
}>()

const { safe: p, guard, editing, bg, accent } = useWarmKit({
  defaults: contentMiniAudioDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
})

/** 倍速档位：兼容数组与逗号字符串两种写法 */
const speedList = computed(() => {
  const raw = p.value.speeds
  const arr = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((s) => s.trim())
  const list = arr
    .map((s: any) => Number(typeof s === 'object' && s ? s.speed : s))
    .filter((n: number) => Number.isFinite(n) && n > 0)
  return list.length ? list : [1]
})

const speed = ref(1)

watch(
  () => [p.value.defaultSpeed, speedList.value.join(',')] as const,
  () => {
    const want = Number(p.value.defaultSpeed)
    speed.value = speedList.value.indexOf(want) >= 0 ? want : speedList.value[0]
  },
  { immediate: true },
)

const total = computed(() => {
  const n = Math.floor(Number(p.value.duration))
  return Number.isFinite(n) && n > 0 ? n : 0
})

const current = ref(0)

watch(total, (t) => {
  if (current.value > t) current.value = 0
})

const percent = computed(() => {
  if (total.value <= 0) return 0
  return Math.min(100, Math.max(0, (current.value / total.value) * 100))
})

/** 真实播放态（仅runtime 会切换） */
const playing = ref(false)

/** 编辑态下的高亮反馈，不触发真实播放 */
const peek = ref(false)

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const coverStyle = computed(() => ({
  backgroundImage: `url(${p.value.cover})`,
}))

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function seek(e: Event) {
  const el = e.currentTarget as HTMLElement | null
  const box = el?.getBoundingClientRect()
  const x = (e as MouseEvent).clientX
  if (!box || !box.width || !Number.isFinite(x)) {
    if (editing.value) guard(e)
    return
  }
  const ratio = Math.min(1, Math.max(0, (x - box.left) / box.width))
  const target = Math.round(ratio * total.value)
  if (editing.value) {
    peek.value = true
    guard(e)
  } else {
    current.value = target
  }
  emit('audio-action', { action: 'seek', position: target, speed: speed.value })
}

function togglePlay(e: Event) {
  if (editing.value) {
    peek.value = !peek.value
    guard(e)
    emit('audio-action', { action: 'toggle', playing: peek.value, speed: speed.value })
    return
  }
  if (total.value > 0 && current.value >= total.value) current.value = 0
  playing.value = !playing.value
  emit('audio-action', { action: 'toggle', playing: playing.value, speed: speed.value })
}

function cycleSpeed(e: Event) {
  if (editing.value) guard(e)
  const list = speedList.value
  const i = list.indexOf(speed.value)
  speed.value = list[(i + 1) % list.length]
  emit('audio-action', { action: 'speed', speed: speed.value })
}
</script>

<style scoped>
.wk-audio {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
}
.wk-audio__cover {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #F5E6D4 center/cover no-repeat;
}
.wk-audio__cover-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  font-size: 15px;
  color: #B45309;
  background: #F5E6D4;
}
.wk-audio__play {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}
.wk-audio__play--peek {
  box-shadow: 0 0 0 4px rgba(194, 65, 12, 0.16);
}
.wk-audio__play-icon {
  font-size: 11px;
  line-height: 1;
  color: #FFFDF9;
}
.wk-audio__main {
  flex: 1 1 auto;
  min-width: 0;
}
.wk-audio__title {
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  color: #57534E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wk-audio__track {
  margin-top: 5px;
  padding: 4px 0;
  cursor: pointer;
}
.wk-audio__bar {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: #F5E6D4;
}
.wk-audio__played {
  height: 100%;
  border-radius: 999px;
}
.wk-audio__thumb {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  border: 2px solid #C2410C;
  background: #FFFDF9;
  transform: translateY(-50%);
}
.wk-audio__time {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1.5;
  color: #78716C;
  white-space: nowrap;
}
.wk-audio__speed {
  flex-shrink: 0;
  min-width: 38px;
  padding: 3px 8px;
  border: 1px solid #C2410C;
  border-radius: 999px;
  background: none;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
}
.wk-guard .wk-audio__play,
.wk-guard .wk-audio__track,
.wk-guard .wk-audio__speed {
  cursor: default;
}
</style>
