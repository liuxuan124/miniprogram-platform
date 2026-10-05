<template>
  <div
    class="wk-card wk-members"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：横滑不会真实滚动</span>

    <div v-if="p.title" class="wk-members__head">
      <span class="wk-title">{{ p.title }}</span>
      <span class="wk-members__count">{{ visible.length }} 位活跃</span>
    </div>

    <div v-if="!visible.length" class="wk-members__empty">{{ p.emptyText }}</div>

    <div v-else class="wk-members__track">
      <div
        v-for="(m, i) in visible"
        :key="m.id || i"
        class="wk-members__cell"
      >
        <div class="wk-members__avatar" :style="avatarStyle(m.avatar)">
          <img v-if="m.avatar" :src="m.avatar" alt="" />
          <span v-else class="wk-members__initial">{{ initial(m.name) }}</span>
          <span
            v-if="m.role"
            class="wk-members__tag"
            :style="{ background: m.tagColor || '#B45309' }"
          >
            {{ m.role }}
          </span>
        </div>
        <div v-if="p.showName" class="wk-members__name">{{ m.name || '星友' }}</div>
      </div>

      <div
        v-if="p.showMoreBubble"
        class="wk-members__cell wk-members__cell--more"
      >
        <div class="wk-members__more" :style="moreStyle">
          <span class="wk-members__plus">+{{ moreText }}</span>
          <span class="wk-members__more-label">更多成员</span>
        </div>
        <div v-if="p.showName" class="wk-members__name">等你来</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { planetMembersStripDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, items, guard, editing, bg, accent } = useWarmKit({
  defaults: planetMembersStripDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
  itemKey: 'members',
  limitKey: 'maxVisible',
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const visible = computed(() => items.value.slice(0, Math.max(1, Math.floor(p.value.maxVisible || 6))))

const moreStyle = computed(() => ({
  borderColor: accent.value || '#C2410C',
  color: accent.value || '#C2410C',
}))

const moreText = computed(() => {
  const v = Number(p.value.moreCount)
  if (!Number.isFinite(v)) return '0'
  return v >= 10000 ? `${(v / 10000).toFixed(1)}w` : String(v)
})

function initial(name: any) {
  return String(name || '星').slice(0, 1)
}

function avatarStyle(src: any) {
  if (!src) return {}
  return { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
}
</script>

<style scoped>
.wk-members {
  position: relative;
  padding: 14px 0 12px;
}
.wk-members__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 14px;
  margin-bottom: 12px;
}
.wk-members__count {
  font-size: 11px;
  color: #78716C;
}
.wk-members__track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 4px 14px 10px;
}
.wk-members__track::-webkit-scrollbar {
  display: none;
}
.wk-members__cell {
  flex: 0 0 62%;
  scroll-snap-align: start;
  min-width: 0;
}
.wk-members__avatar {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFAF3;
  border: 2px solid #F5E6D4;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
  background-size: cover;
  background-position: center;
}
.wk-members__avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.wk-members__initial {
  font-size: 30px;
  font-weight: 600;
  color: #C2410C;
  background: #FDE8D8;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wk-members__tag {
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.6;
  color: #FFFDF9;
  white-space: nowrap;
}
.wk-members__name {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #57534E;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wk-members__more {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: 1px dashed #C2410C;
  background: #FFFAF3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.wk-members__plus {
  font-size: 22px;
  font-weight: 600;
}
.wk-members__more-label {
  font-size: 11px;
  color: #78716C;
}
.wk-members__empty {
  margin: 0 14px;
  padding: 26px 0;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  color: #78716C;
  background: #FFFAF3;
}
</style>