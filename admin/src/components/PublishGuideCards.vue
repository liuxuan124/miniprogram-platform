<template>
  <section class="guide">
    <h2 class="guide-title">{{ title }}</h2>
    <div class="guide-grid">
      <article
        v-for="(card, idx) in cards"
        :key="card.head"
        class="guide-card"
        :class="{ 'guide-card--active': card.active }"
      >
        <div class="guide-num" aria-hidden="true">{{ idx + 1 }}</div>
        <div class="guide-body">
          <h3 class="guide-head">{{ card.head }}</h3>
          <p v-html="card.body" />
          <el-button size="small" :type="card.active ? 'primary' : 'default'" :plain="card.active" @click="$emit('action', card.action)">
            {{ card.cta }}
          </el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
export type GuideAction = 'pages' | 'save' | 'history'

withDefaults(defineProps<{
  title?: string
  cards: Array<{
    head: string
    body: string
    cta: string
    action: GuideAction
    active?: boolean
  }>
}>(), { title: '你想做什么？' })

defineEmits<{ action: [key: GuideAction] }>()
</script>

<style scoped>
.guide {
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.guide-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}
.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.guide-card {
  display: flex;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}
.guide-card--active {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.guide-num {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.guide-head {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}
.guide-body p {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
