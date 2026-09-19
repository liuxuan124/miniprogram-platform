<template>
  <div class="marketing-container">
    <div class="page-header">
      <div class="ph">
        <div class="pt">优惠管理</div>
        <div class="ps">当前可用：优惠券创建、发放与核销统计。签到/积分兑换等入口已隐藏，待能力就绪再开放。</div>
      </div>
    </div>

    <coupon-manager />
  </div>
</template>

<script setup lang="ts">
import CouponManager from './coupon.vue'
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
}
</style>
