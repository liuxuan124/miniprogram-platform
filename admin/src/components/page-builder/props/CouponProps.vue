<template>
  <div class="coupon-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="emit('update', { title: $event })" placeholder="领券中心" />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group
          :model-value="data.style_type || 'horizontal'"
          @change="(v: string) => emit('update', { style_type: v })"
        >
          <el-radio-button value="horizontal">横向</el-radio-button>
          <el-radio-button value="vertical">纵向</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit ?? 3"
          :min="1"
          :max="10"
          controls-position="right"
          @change="(v: number) => emit('update', { limit: v })"
        />
      </el-form-item>
      <el-form-item label="按钮文案">
        <el-input
          :model-value="data.button_text || '领取'"
          @input="emit('update', { button_text: $event })"
          placeholder="领取"
        />
      </el-form-item>
      <el-form-item label="标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 15"
          :min="10"
          :max="28"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="内容字号">
        <el-input-number
          :model-value="data.subtitle_font_size ?? 12"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { subtitle_font_size: v })"
        />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">数据源</el-divider>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="自动展示已发布且在有效期内的优惠券"
        description="在「优惠券」中创建并发布后，首页组件与领券中心会同步展示"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped>
.field-divider {
  margin: 8px 0 12px;
}
</style>
