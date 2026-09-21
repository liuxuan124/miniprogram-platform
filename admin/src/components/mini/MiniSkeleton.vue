<template>
  <div class="mini-sk" aria-busy="true" aria-live="polite">
    <span class="sr">正在加载…</span>
    <div class="sk sk-title" />
    <div class="sk sk-sub" />

    <div v-if="kind === 'overview'" class="sk-row sk-row--3">
      <div v-for="n in 3" :key="n" class="sk sk-way" />
    </div>
    <div v-if="kind === 'overview'" class="sk-panel">
      <div class="sk sk-h2" />
      <div class="sk-row sk-row--5">
        <div v-for="n in 5" :key="n" class="sk sk-tab" />
      </div>
    </div>

    <div v-else-if="kind === 'grid'" class="sk-row sk-row--3">
      <div v-for="n in 6" :key="n" class="sk sk-tpl" />
    </div>

    <template v-else>
      <div v-for="n in 2" :key="n" class="sk-panel">
        <div class="sk sk-h2" />
        <div v-for="m in 3" :key="m" class="sk sk-line" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** overview 概览 / grid 卡片墙 / list 列表（默认） */
    kind?: 'overview' | 'grid' | 'list'
  }>(),
  { kind: 'list' },
)
</script>

<style scoped lang="scss">
.mini-sk {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.sk {
  border-radius: 8px;
  background: linear-gradient(90deg, #efe8de 25%, #f7f2ea 37%, #efe8de 63%);
  background-size: 400% 100%;
  animation: mini-sk-shimmer 1.4s ease infinite;
}

.sk-title { width: 260px; height: 30px; border-radius: 10px; }
.sk-sub { width: 420px; max-width: 100%; height: 14px; }
.sk-h2 { width: 120px; height: 18px; }
.sk-line { height: 14px; }
.sk-way { height: 78px; border-radius: 12px; }
.sk-tab { height: 120px; border-radius: 12px; }
.sk-tpl { height: 230px; border-radius: 14px; }

.sk-row {
  display: grid;
  gap: 12px;
}
.sk-row--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sk-row--5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }

.sk-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e8dfd3;
  border-radius: 14px;
}

@keyframes mini-sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .sk { animation: none; }
}

@media (max-width: 1180px) {
  .sk-row--3 { grid-template-columns: minmax(0, 1fr); }
  .sk-row--5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
