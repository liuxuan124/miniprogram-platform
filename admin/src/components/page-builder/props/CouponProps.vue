<template>
  <div class="coupon-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="模块标题" />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type" @change="emit('update', { style_type: $event as string })">
          <el-radio value="horizontal">横向</el-radio>
          <el-radio value="vertical">纵向</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit"
          @change="emit('update', { limit: $event as number })"
          :min="1"
          :max="10"
          controls-position="right"
        />
      </el-form-item>

      <el-divider content-position="left" style="margin: 10px 0 6px; font-size: 12px; color: #8a94a6">数据源</el-divider>
      <el-alert
        type="info"
        :closable="false"
        description="自动展示后台已发布且当前可领取的优惠券，在「营销 → 优惠券」中管理"
        style="font-size: 12px"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
