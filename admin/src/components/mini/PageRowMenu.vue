<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    popper-class="mini-wb-overlay mini-row-menu"
    @command="(cmd: string) => emit('command', cmd, row)"
  >
    <button type="button" class="iconbtn" aria-label="更多操作" aria-haspopup="menu">
      <MiniIcon name="more" :size="16" />
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="preview">预览</el-dropdown-item>
        <el-dropdown-item command="copy">复制页面</el-dropdown-item>
        <el-dropdown-item command="set-nav" :disabled="archived">
          设为底部导航入口
          <span v-if="archived" class="mini-row-menu__why">归档页不能设为入口</span>
        </el-dropdown-item>
        <el-dropdown-item command="copy-path">复制路径</el-dropdown-item>
        <el-dropdown-item v-if="canOffline" command="offline" divided>下线</el-dropdown-item>
        <el-dropdown-item
          v-if="canDelete"
          command="delete"
          :divided="!canOffline"
          class="is-danger"
        >
          删除
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import MiniIcon from '@/components/mini/MiniIcon.vue'
import type { PageRecord } from '@/types/page'

/**
 * 页面行「更多」菜单。
 * 走 el-dropdown 而非自绘绝对定位面板：自带键盘可达、翻转避让、点击外部关闭。
 */
defineProps<{
  row: PageRecord
  archived?: boolean
  canOffline?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  (e: 'command', cmd: string, row: PageRecord): void
}>()
</script>
