<template>
  <div class="marketing-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="ph">
        <div class="pt">营销管理</div>
        <div class="ps">优惠券、签到、积分兑换、邀请好友、限时活动。</div>
      </div>
    </div>

    <!-- 营销功能卡片网格 -->
    <div class="marketing-grid">
      <div
        v-for="item in marketingCards"
        :key="item.key"
        class="marketing-card"
        @click="handleCardClick(item)"
      >
        <div class="card-icon">{{ item.icon }}</div>
        <div class="card-title">{{ item.title }}</div>
        <div class="card-stat">{{ item.stat }}</div>
        <div class="card-sub">{{ item.sub }}</div>
        <el-button size="small" type="primary" round class="card-btn" @click.stop="handleCardClick(item)">
          管理
        </el-button>
      </div>
    </div>

    <!-- 优惠券管理 -->
    <coupon-manager />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import CouponManager from './coupon.vue'

interface MarketingCard {
  icon: string
  title: string
  stat: string
  sub: string
  key: string
}

const marketingCards: MarketingCard[] = [
  { icon: '🎟️', title: '优惠券', stat: '3种有效券', sub: '已发1700张', key: 'coupon' },
  { icon: '📅', title: '每日签到', stat: '今日134人', sub: '本月活跃286', key: 'signin' },
  { icon: '🔄', title: '积分兑换', stat: '8个兑换项', sub: '本月45次', key: 'points' },
  { icon: '👫', title: '邀请好友', stat: '进行中', sub: '本月新增23', key: 'invite' },
  { icon: '⏰', title: '限时活动', stat: '进行中2个', sub: '待开始1个', key: 'flash' },
  { icon: '🏷️', title: '会员折扣', stat: '全场95折', sub: '会员专属', key: 'member' },
]

function handleCardClick(item: MarketingCard) {
  if (item.key === 'coupon') {
    // 优惠券在当前页面下方，滚动过去
    const el = document.querySelector('.coupon-container')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } else {
    ElMessage.success(`进入${item.title}管理`)
  }
}
</script>

<style lang="scss" scoped>
.marketing-container {
  .page-header {
    margin-bottom: 20px;

    .ph {
      .pt {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 3px;
      }
      .ps {
        color: #909399;
        font-size: 13px;
      }
    }
  }

  .marketing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  .marketing-card {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 14px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 2px 12px rgba(15, 22, 40, 0.07);

    &:hover {
      box-shadow: 0 8px 32px rgba(15, 22, 40, 0.13);
      transform: translateY(-1px);
    }

    .card-icon {
      font-size: 28px;
      margin-bottom: 8px;
    }

    .card-title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .card-stat {
      font-size: 17px;
      font-weight: 800;
      color: #1769ff;
      margin-bottom: 4px;
    }

    .card-sub {
      font-size: 12px;
      color: #909399;
      margin-bottom: 12px;
    }

    .card-btn {
      margin-top: 0;
    }
  }
}
</style>
