<template>
  <el-card class="commerce-redirect" shadow="never">
    <el-result
      icon="info"
      title="商品管理已迁移"
      sub-title="当前模块已统一使用真实接口商品管理页。"
    >
      <template #extra>
        <el-button type="primary" @click="router.replace('/commerce/product')">进入商品管理</el-button>
      </template>
    </el-result>
  </el-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.commerce-redirect {
  min-height: 360px;
}
</style>
