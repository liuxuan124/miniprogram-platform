<template>
  <div
    class="mpt"
    :class="[`mpt--${size}`, { 'mpt--iframe': !!src }]"
    :style="{ '--mpt-accent': accentColor }"
    :title="title || undefined"
  >
    <div class="mpt__bezel">
      <div class="mpt__notch" />
      <div class="mpt__screen">
        <iframe
          v-if="src"
          class="mpt__iframe"
          :src="src"
          :title="title || '预览'"
          loading="lazy"
          tabindex="-1"
        />
        <template v-else>
          <div class="mpt__hero">{{ displayLayers[0] || title || '首页' }}</div>
          <div
            v-for="(layer, i) in displayLayers.slice(1)"
            :key="i"
            class="mpt__block"
            :class="`mpt__block--${i % 3}`"
          >
            {{ layer }}
          </div>
          <div v-if="displayLayers.length < 2" class="mpt__block mpt__block--0" />
          <div v-if="displayLayers.length < 3" class="mpt__block mpt__block--1 short" />
          <div class="mpt__cta" />
        </template>
      </div>
      <div class="mpt__home" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    title?: string
    accent?: string
    layers?: string[]
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)

const ACCENTS = ['#b4430f', '#1d6bb8', '#1f7a4d', '#8f5400', '#6b4c9a', '#a33b5c']

function hashHue(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

const accentColor = computed(() => {
  if (props.accent) return props.accent
  return hashHue(props.title || (props.layers || []).join('|') || 'page')
})

const displayLayers = computed(() => {
  const raw = (props.layers || []).map((s) => String(s || '').trim()).filter(Boolean)
  if (raw.length) return raw.slice(0, 3)
  if (props.title) return [props.title]
  return ['首页']
})
</script>

<style scoped lang="scss">
.mpt {
  --mpt-w: 52px;
  --mpt-h: 90px;
  --mpt-r: 8px;
  --mpt-pad: 3px;
  --mpt-accent: #b4430f;
  width: var(--mpt-w);
  height: var(--mpt-h);
  flex-shrink: 0;
  position: relative;

  &--sm {
    --mpt-w: 42px;
    --mpt-h: 72px;
    --mpt-r: 6px;
    --mpt-pad: 2px;
  }
  &--md {
    --mpt-w: 52px;
    --mpt-h: 90px;
  }
  &--lg {
    --mpt-w: 96px;
    --mpt-h: 168px;
    --mpt-r: 14px;
    --mpt-pad: 5px;
  }
}

.mpt__bezel {
  width: 100%;
  height: 100%;
  border-radius: var(--mpt-r);
  background: linear-gradient(160deg, #3a2f26, #1a1410);
  padding: var(--mpt-pad);
  box-shadow: 0 4px 12px rgba(44, 36, 28, 0.18);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.mpt__notch {
  width: 38%;
  height: 4px;
  margin: 1px auto 2px;
  border-radius: 999px;
  background: #0d0a08;
  flex-shrink: 0;
}
.mpt--lg .mpt__notch { height: 7px; margin-bottom: 4px; }

.mpt__screen {
  flex: 1;
  min-height: 0;
  border-radius: calc(var(--mpt-r) - 2px);
  background: #f6f2ec;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 3px 3px;
}

.mpt__iframe {
  position: absolute;
  inset: 0;
  width: 375px;
  height: 812px;
  border: 0;
  pointer-events: none;
  transform-origin: top left;
  /* md 52px ≈ 0.128；lg 96px ≈ 0.24 — 用容器宽近似 */
  transform: scale(0.13);
  background: #fff;
}
.mpt--sm .mpt__iframe { transform: scale(0.105); }
.mpt--lg .mpt__iframe { transform: scale(0.24); }

.mpt__hero {
  background: var(--mpt-accent);
  color: #fff;
  font-size: 7px;
  font-weight: 650;
  line-height: 1.2;
  padding: 5px 4px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.mpt--lg .mpt__hero { font-size: 11px; padding: 10px 8px; }

.mpt__block {
  background: #fff;
  border: 1px solid #e8dfd3;
  border-radius: 3px;
  min-height: 10px;
  flex: 1;
  font-size: 6px;
  color: #7a6e64;
  padding: 3px;
  overflow: hidden;
  &.short { flex: 0.55; min-height: 6px; }
  &--0 { background: linear-gradient(90deg, #fff8f0, #fff); }
  &--1 { background: #fff; }
  &--2 { background: #faf6f1; }
}
.mpt--lg .mpt__block { font-size: 9px; padding: 6px; min-height: 18px; }

.mpt__cta {
  height: 8px;
  border-radius: 3px;
  background: var(--mpt-accent);
  opacity: 0.85;
  flex-shrink: 0;
  margin-top: 1px;
}
.mpt--lg .mpt__cta { height: 14px; }

.mpt__home {
  width: 28%;
  height: 2px;
  margin: 3px auto 1px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}
.mpt--lg .mpt__home { height: 3px; margin-top: 5px; }
</style>
