<template>
  <div class="feed-preset-picker">
    <p class="feed-preset-picker__title">版式形态</p>
    <div class="feed-preset-picker__grid">
      <button
        v-for="g in FEED_LAYOUT_GROUPS"
        :key="g.key"
        type="button"
        class="fp-card"
        :class="{ 'is-on': modelValue === g.key }"
        :aria-pressed="modelValue === g.key"
        :title="g.desc"
        @click="emit('update:modelValue', g.key)"
      >
        <!-- 线框示意图：每种版式画自己的骨架，比文字列表直观 -->
        <span class="fp-card__thumb" :class="`fp-card__thumb--${g.key}`" aria-hidden="true">
          <template v-if="g.key === 'hero'">
            <i class="fp-t fp-t--hero" /><i class="fp-t fp-t--line" /><i class="fp-t fp-t--row" />
          </template>
          <template v-else-if="g.key === 'classic'">
            <i class="fp-t fp-t--row" /><i class="fp-t fp-t--row" /><i class="fp-t fp-t--row" />
          </template>
          <template v-else-if="g.key === 'card'">
            <i class="fp-t fp-t--card" /><i class="fp-t fp-t--card" />
          </template>
          <template v-else-if="g.key === 'full'">
            <i class="fp-t fp-t--full" /><i class="fp-t fp-t--full" />
          </template>
          <template v-else-if="g.key === 'grid'">
            <i class="fp-t fp-t--half" /><i class="fp-t fp-t--half" />
            <i class="fp-t fp-t--half" /><i class="fp-t fp-t--half" />
          </template>
          <template v-else>
            <i class="fp-t fp-t--row fp-t--notext" /><i class="fp-t fp-t--row fp-t--notext" />
          </template>
        </span>
        <span class="fp-card__label">{{ g.title }}</span>
        <span v-if="modelValue === g.key" class="fp-card__tick" aria-hidden="true">✓</span>
      </button>
    </div>
    <p class="feed-preset-picker__desc">{{ currentDesc }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FEED_LAYOUT_GROUPS, type FeedLayoutPreset } from '../articleFeed/articleFeedSchema'

/**
 * 6 大版式线框选择器。
 * 运营对「杂志焦点/纯文字」这类词没有画面感，先看线框再决定。
 */
const props = defineProps<{ modelValue: FeedLayoutPreset }>()
const emit = defineEmits<{ 'update:modelValue': [value: FeedLayoutPreset] }>()

const currentDesc = computed(
  () => FEED_LAYOUT_GROUPS.find((g) => g.key === props.modelValue)?.desc || '',
)
</script>

<style scoped lang="scss">
.feed-preset-picker {
  width: 100%;
}

.feed-preset-picker__title {
  margin: 0 0 6px;
  font-size: 11px;
  color: #a89c8d;
}

.feed-preset-picker__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.fp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: stretch;
  padding: 7px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 9px;
  transition: border-color 0.16s ease, background 0.16s ease;

  &:hover {
    border-color: #d5cbbe;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.fp-card__label {
  font-size: 12px;
  color: #5c5249;
}

.fp-card.is-on .fp-card__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

.fp-card__tick {
  position: absolute;
  top: 4px;
  right: 5px;
  display: grid;
  place-items: center;
  width: 13px;
  height: 13px;
  font-size: 8px;
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-radius: 999px;
}

.feed-preset-picker__desc {
  margin: 6px 0 0;
  font-size: 11px;
  color: #a89c8d;
  line-height: 1.4;
}

/* ---------- 线框骨架 ---------- */
.fp-card__thumb {
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: 44px;
  padding: 4px;
  overflow: hidden;
  background: #f7f4ef;
  border-radius: 6px;
}

.fp-t {
  display: block;
  background: #ded5c7;
  border-radius: 2px;
}

.fp-t--hero { height: 15px; background: #d9cdb9; }
.fp-t--full { height: 19px; background: #d5c9b6; }
.fp-t--line { height: 3px; width: 100%; }
.fp-t--row { height: 9px; background: linear-gradient(90deg, #ddd2c2 40%, #eae3d8 40%); }
.fp-t--notext { height: 7px; background: linear-gradient(90deg, #e2d9cb 55%, #f0ebe2 55%); }
.fp-t--card { height: 19px; background: #e3dacb; border-radius: 3px; }
.fp-t--half { width: 48%; height: 19px; background: #e0d7c8; border-radius: 3px; }
</style>
