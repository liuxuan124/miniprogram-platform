<template>
  <svg
    class="mini-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="path"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 小程序工作台线性图标（描边 1.8px，与原型同源）。
 * 统一替换 emoji / 字符图标：emoji 在 Windows 上会渲染成彩色字形，且大小与颜色不可控。
 */
const PATHS: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  page: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  tab: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16h18M9 16v4M15 16v4"/>',
  doc: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
  wechat: '<path d="M9 5c-4 0-7 2.6-7 5.8 0 1.8 1 3.4 2.5 4.5L4 18l3-1.5c.6.2 1.3.3 2 .3"/><path d="M15 9c3.9 0 7 2.5 7 5.5 0 1.5-.8 2.9-2 3.9l.5 2.1-2.6-1.3c-.9.3-1.9.4-2.9.4-3.9 0-7-2.5-7-5.5S11.1 9 15 9z"/>',
  bell: '<path d="M18 16V11a6 6 0 0 0-12 0v5l-2 3h16z"/><path d="M10 22h4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  send: '<path d="M4 12l16-7-7 16-2-6z"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
  video: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  star: '<path d="M12 3l2.5 6.5L21 11l-5 4.2L17.5 22 12 18.5 6.5 22 8 15.2 3 11l6.5-1.5z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  lib: '<path d="M4 4h6v16H4zM14 4h6v16h-6z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 5-3 7-8 7z"/><path d="M12 14c0-3-2.5-5.5-7-5.5 0 4 2.5 5.5 7 5.5z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  merge: '<path d="M6 3v6a6 6 0 0 0 6 6h6"/><path d="M6 21v-6"/><path d="M15 12l3 3-3 3"/>',
  gift: '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-2-4-6-4-6-1s6 1 6 1zM12 8c2-4 6-4 6-1s-6 1-6 1z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
}

export type MiniIconName = keyof typeof PATHS

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
  }>(),
  { size: 16 },
)

const path = computed(() => PATHS[props.name] || '')
</script>

<style scoped>
.mini-icon {
  display: block;
  flex-shrink: 0;
}
</style>
