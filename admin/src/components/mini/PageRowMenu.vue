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
        <el-dropdown-item command="rename">重命名</el-dropdown-item>
        <el-dropdown-item command="copy">复制页面</el-dropdown-item>
        <el-dropdown-item
          v-if="!isNav && !archived"
          command="set-nav"
        >
          设为底部导航入口
        </el-dropdown-item>
        <el-dropdown-item v-else-if="isNav" disabled>
          已是底部导航入口
        </el-dropdown-item>
        <el-dropdown-item command="copy-path">复制路径</el-dropdown-item>
        <el-dropdown-item v-if="canOffline" command="offline" divided>下线</el-dropdown-item>
        <el-dropdown-item
          v-if="!archived && !isNav"
          command="archive"
          :divided="!canOffline"
        >
          归档
        </el-dropdown-item>
        <el-dropdown-item
          v-if="canDelete"
          command="delete"
          :divided="!canOffline && (archived || isNav)"
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
  /** 已在底部导航中 */
  isNav?: boolean
  canOffline?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  (e: 'command', cmd: string, row: PageRecord): void
}>()
</script>
