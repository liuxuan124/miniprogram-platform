<template>
  <header class="page-header" :class="{ 'page-header--with-status': !!status || !!$slots.status }">
    <!--
      🔴 2026-10-06 去掉本组件自带的面包屑。
      原因：布局层 `layout/Header.vue` 已经基于 route.matched 提供全站统一面包屑
      （标题取自路由 meta），页面里再来一份就成了「小程序 / 固定页 · 登录 / 小程序 / 页面管理 / 登录页配置」
      这种两级重复，反而看不清自己在哪。

      面包屑是「全局定位」，由布局层唯一负责；
      本组件只管「页内操作区」，两者不重叠。
    -->

    <div class="page-header__bar">
      <div class="page-header__main">
        <div v-if="kicker" class="page-header__kicker">{{ kicker }}</div>
        <div class="page-header__title-row">
          <h1 class="page-header__title">{{ title }}</h1>
          <slot name="title-extra" />
        </div>
        <p v-if="description" class="page-header__desc">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <!--
      保存状态：五态统一（正在保存 / 已保存草稿 / 保存失败 / 有未保存修改 / 待发布）。
      🔴 放在头部、紧邻主操作 —— 用户第一眼就要知道「我改的东西存没存、生没生效」。
    -->
    <div v-if="status || $slots.status" class="page-header__status">
      <slot name="status">
        <SaveStateBar v-if="status" :state="status" @retry="emit('retry')" />
      </slot>
    </div>

    <!-- 详细规则折叠：首屏只留操作，规则点开再看（原来每页都挂一大段说明） -->
    <details v-if="$slots.help" class="page-header__help">
      <summary class="page-header__help-t">
        <el-icon :size="13"><InfoFilled /></el-icon>
        {{ helpTitle || '规则说明与常见问题' }}
      </summary>
      <div class="page-header__help-body">
        <slot name="help" />
      </div>
    </details>
  </header>
</template>

<script setup lang="ts">
/**
 * 统一页面头部
 *
 * 2026-10-06 之前的状态：普通配置页（/mini/*）用的是各自手写的
 * `.head-row` + `.h1` + `.sub`，而固定页（我的/登录）用的是 PageHeader，
 * 两套框架、两套标题字号、两套按钮间距 —— 视觉不一致且都在重复写
 * 「保存草稿 / 发布配置 / 上线到小程序」的长说明。
 *
 * 现在统一到这个组件：
 *  - 面包屑（回答「我在哪个模块、怎么回去」）
 *  - 标题 + 简短说明 + 主要操作（固定布局）
 *  - 保存状态五态（紧邻操作，位置固定）
 *  - 详细规则收进 <details>，默认折叠
 */
import SaveStateBar, { type SaveState } from './SaveStateBar.vue'

// 面包屑已移除（统一由 layout/Header.vue 提供），故没有默认值的 prop，
// 不需要 withDefaults 包装。
defineProps<{
  title: string
  kicker?: string
  description?: string
  /** 保存状态；不传则不显示该区域 */
  status?: SaveState
  /** 折叠区标题 */
  helpTitle?: string
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.page-header__crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: var(--font-caption);
  line-height: 1.4;
}

/* 标题 / 说明 / 操作：固定布局，说明可换行、操作不换行 */
.page-header__bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header__main {
  min-width: 0;
  flex: 1;
}

.page-header__kicker {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: var(--font-caption);
  line-height: 1.4;
}

.page-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-header__title {
  margin: 0;
  color: var(--text);
  font-size: var(--font-h1);
  font-weight: 700;
  line-height: 1.3;
}

/* 🔴 正文可读性：说明文字用 --font-body 且行高放宽，
   原来各处 .sub 用 12px 小字，长句读起来费力 */
.page-header__desc {
  margin: 6px 0 0;
  max-width: 720px;
  color: var(--text-secondary);
  font-size: var(--font-body);
  line-height: 1.6;
}

.page-header__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-header__status {
  padding-top: 2px;
}

/* 折叠帮助区：默认收起，首屏只留操作 */
.page-header__help {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}

.page-header__help-t {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--font-caption);
  list-style: none;
  user-select: none;

  &::-webkit-details-marker { display: none; }

  &:hover { color: var(--brand, #b4430f); }
}

.page-header__help-body {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: var(--font-body);
  line-height: 1.7;
}

@media (max-width: 1100px) {
  .page-header__bar { flex-direction: column; }
  .page-header__actions { flex-wrap: wrap; }
}
</style>
