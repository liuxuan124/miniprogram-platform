<template>
  <div class="pf">
    <div class="pf__segs">
      <span
        v-for="(seg, i) in segs"
        :key="seg.key || i"
        class="pf__seg"
        :class="{ on: i === 0 }"
      >{{ seg.label }}</span>
    </div>
    <div v-for="(item, idx) in previewItems" :key="idx" class="pf__card" :class="{ top: item.top }">
      <div class="pf__hh">
        <span class="pf__av">{{ item.authorInitial }}</span>
        <div>
          <div class="pf__nm">
            {{ item.author }}
            <span v-if="item.tagGold" class="tag gold">{{ item.tagGold }}</span>
            <span v-if="item.tag" class="tag">{{ item.tag }}</span>
          </div>
          <div class="pf__tm">{{ item.time }}</div>
        </div>
      </div>
      <div class="pf__ct">{{ item.content }}</div>
      <div v-if="item.answer" class="pf__q">
        <div class="pf__qlb">星主已回答</div>
        {{ item.answer }}
      </div>
      <div v-if="item.file" class="pf__file">📄 {{ item.file.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
defineEmits<{ 'preview-action': [payload: any] }>()
const props = computed(() => p.component.props || {})
const segs = computed(() => (Array.isArray(props.value.segs) ? props.value.segs : [
  { key: 'all', label: '全部' },
  { key: 'official', label: '官方更新' },
  { key: 'essence', label: '精华 ⭐️' },
]))
const previewItems = computed(() => ([
  {
    top: true,
    author: '墨白',
    authorInitial: '墨',
    tagGold: '置顶',
    tag: '星主',
    time: '2 小时前 · 官方发布',
    content: '【9 月共读】本月我们读《认知盈余》。读完在评论区交一份 300 字笔记…',
    file: { name: '9月共读·领读提纲.pdf' },
  },
  {
    author: '十一',
    authorInitial: '十',
    tag: '读者提问',
    time: '4 小时前 · 杭州',
    content: '知识付费定价 99 和 199 差别有多大？',
    answer: '差别不在转化率，在你后面还想不想卖第二个产品…',
  },
]))
</script>

<style scoped>
.pf { padding: 4px 0 8px; }
.pf__segs { display: flex; gap: 6px; overflow: auto; padding: 8px 12px; }
.pf__seg {
  flex: none; padding: 5px 10px; border-radius: 99px; font-size: 11px; font-weight: 650;
  background: #fffaf3; border: 1px solid rgba(120,72,40,.12); color: #6b5443;
}
.pf__seg.on { background: linear-gradient(135deg,#ea580c,#c2410c); color: #fff; border-color: transparent; }
.pf__card {
  margin: 0 12px 8px; border-radius: 14px; background: #fff; padding: 10px 12px;
  border: 1px solid rgba(120,72,40,.08);
}
.pf__card.top { background: linear-gradient(150deg,#fff7ec,#fffaf3); border-color: #f0d3ad; }
.pf__hh { display: flex; gap: 8px; align-items: center; }
.pf__av {
  width: 28px; height: 28px; border-radius: 50%; background: #fbe6d4; color: #c2410c;
  display: grid; place-items: center; font-size: 12px; font-weight: 700;
}
.pf__nm { font-size: 12px; font-weight: 720; display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.pf__tm { font-size: 10px; color: #a1897a; margin-top: 2px; }
.tag {
  font-size: 10px; padding: 1px 6px; border-radius: 99px; background: #fbe6d4; color: #c2410c; font-weight: 700;
}
.tag.gold { background: linear-gradient(135deg,#f6d9a8,#efc27a); color: #8a4b12; }
.pf__ct { margin-top: 8px; font-size: 12px; line-height: 1.6; color: #3a2a1c; }
.pf__q {
  margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: #f8ecdd; font-size: 11px; line-height: 1.55;
}
.pf__qlb { font-size: 10px; color: #d97706; font-weight: 750; margin-bottom: 4px; }
.pf__file {
  margin-top: 8px; font-size: 11px; padding: 8px; border-radius: 10px; border: 1px dashed #e3c9a8; background: #fffdf9;
}
</style>
