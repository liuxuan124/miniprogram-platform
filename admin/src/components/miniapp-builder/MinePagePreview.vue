<template>
  <div class="mine-page-preview">
    <div class="preview-user-card" :class="{ 'mine-card--outline': mineAccentColors.outline }" :style="mineCardStyle">
      <div v-if="mineConfig.userProfile.showAvatar" class="user-avatar">👤</div>
      <div class="user-info">
        <strong>{{ mineConfig.loginTitle }}</strong>
        <span v-if="mineConfig.userProfile.showNickname" class="user-nickname">微信用户（昵称示例）</span>
        <span class="user-subtitle">{{ mineConfig.loginSubtitle }}</span>
        <span v-if="mineConfig.userProfile.showMemberLevel" class="user-level">
          {{ mineConfig.userProfile.memberLevelLabel }}
        </span>
      </div>
      <button v-if="mineConfig.loginButtonText" class="login-btn" type="button">{{ mineConfig.loginButtonText }}</button>
    </div>

    <div
      v-if="mineConfig.memberCardTitle"
      class="preview-member-card"
      :class="{ 'mine-card--outline': mineAccentColors.outline }"
      :style="mineMemberCardStyle"
    >
      <strong>{{ mineConfig.memberCardTitle }}</strong>
    </div>

    <div v-if="mineConfig.orderQuickAccess.showOrderTabs" class="order-tabs">
      <div
        v-for="(label, key) in mineConfig.orderQuickAccess.tabLabels"
        :key="key"
        class="order-tab-item"
      >
        <span class="order-tab-label">{{ label }}</span>
      </div>
    </div>
    <div
      v-if="mineConfig.orderQuickAccess.showAllOrdersBtn && mineConfig.orderQuickAccess.showOrderTabs"
      class="all-orders-btn"
    >
      查看全部订单
    </div>

    <div class="preview-menu-grid">
      <div v-for="item in visibleMenuItems" :key="item.id" class="preview-menu-item">
        <span class="menu-icon">{{ item.icon }}</span>
        <span class="menu-text">{{ item.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MinePageConfig, ThemeConfig } from '@/types/miniapp'

const props = defineProps<{
  mineConfig: MinePageConfig
  theme: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
}>()

const visibleMenuItems = computed(() => props.mineConfig.menuItems.filter((m) => m.enabled))

const mineAccentColors = computed(() => {
  const mc = props.mineConfig as Record<string, unknown>
  return {
    primary: (mc.themeColor as string) || props.theme.primaryColor,
    secondary: (mc.themeColorSecondary as string) || props.theme.secondaryColor,
    flat: mc.style === 'flat',
    outline: mc.style === 'outline',
  }
})

const mineCardStyle = computed(() => {
  const { primary, secondary, flat, outline } = mineAccentColors.value
  if (outline) {
    return {
      background: '#ffffff',
      border: '1.5px solid #d7dde6',
      color: '#1f2937',
      '--mine-accent': primary,
    }
  }
  return {
    background: flat ? primary : `linear-gradient(135deg, ${primary}, ${secondary})`,
    '--mine-accent': primary,
  }
})

const mineMemberCardStyle = computed(() => {
  const { primary, secondary, flat, outline } = mineAccentColors.value
  if (outline) {
    return { background: '#ffffff', border: '1.5px solid #d7dde6', color: '#1f2937' }
  }
  return {
    background: flat ? `${primary}dd` : `linear-gradient(135deg, ${primary}dd, ${secondary}dd)`,
  }
})
</script>

<style scoped lang="scss">
.mine-page-preview {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.preview-user-card {
  padding: 20px 16px;
  border-radius: 12px;
  margin: 12px 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.user-avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 24px;
  flex-shrink: 0;
}

.user-info strong {
  font-size: 14px;
  display: block;
}

.user-subtitle {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 2px;
  display: block;
}

.user-nickname {
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
  display: block;
}

.user-level {
  display: inline-block;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 8px;
  border-radius: 99px;
  margin-top: 4px;
}

.login-btn {
  margin-left: auto;
  padding: 6px 16px;
  background: #fff;
  color: var(--mine-accent, var(--theme-primary, #1769ff));
  border: none;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.preview-member-card {
  padding: 14px 16px;
  border-radius: 10px;
  margin: 12px;
  color: #fff;

  strong {
    display: block;
    font-size: 14px;
  }
}

.mine-card--outline .user-avatar {
  background: #f1f5f9;
}

.mine-card--outline .user-subtitle {
  opacity: 1;
  color: #64748b;
}

.mine-card--outline .user-level {
  background: #f1f5f9;
  color: #475569;
}

.mine-card--outline .login-btn {
  background: #fff;
  border: 1.5px solid var(--mine-accent, #334155);
  color: var(--mine-accent, #334155);
}

.order-tabs {
  display: flex;
  gap: 8px;
  margin: 0 12px 4px;
  padding-top: 4px;
}

.order-tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  background: #f8faff;
  border: 1px solid #eef0f4;
  border-radius: 8px;
}

.order-tab-label {
  font-size: 11px;
  color: #607187;
  display: block;
}

.all-orders-btn {
  text-align: center;
  font-size: 12px;
  color: #1769ff;
  padding: 8px 0;
  margin: 0 12px 8px;
}

.preview-menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px 12px;
}

.preview-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
}

.menu-icon {
  font-size: 22px;
}

.menu-text {
  font-size: 11px;
  color: #607187;
  text-align: center;
}
</style>
