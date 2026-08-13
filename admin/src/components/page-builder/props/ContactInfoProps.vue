<template>
  <div class="contact-info-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="emit('update', { title: $event })" placeholder="联系我们" />
      </el-form-item>
      <el-form-item label="电话">
        <el-input :model-value="data.phone || ''" @input="emit('update', { phone: $event })" placeholder="400-888-0000" />
      </el-form-item>
      <el-form-item label="地址">
        <el-input :model-value="data.address || ''" @input="emit('update', { address: $event })" placeholder="公司地址" />
      </el-form-item>
      <el-form-item label="营业时间">
        <el-input
          :model-value="data.service_time || ''"
          @input="emit('update', { service_time: $event })"
          placeholder="周一至周五 9:00-18:00"
        />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">显示与排版</el-divider>
      <el-form-item label="排列方式">
        <el-radio-group :model-value="data.layout || 'list'" @change="(v: string) => emit('update', { layout: v })">
          <el-radio-button value="list">竖排</el-radio-button>
          <el-radio-button value="row">横排</el-radio-button>
          <el-radio-button value="grid">两列</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="卡片样式">
        <el-radio-group :model-value="data.style || 'card'" @change="(v: string) => emit('update', { style: v })">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="minimal">极简</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="文字对齐">
        <el-radio-group :model-value="data.align || 'left'" @change="(v: string) => emit('update', { align: v })">
          <el-radio-button value="left">左</el-radio-button>
          <el-radio-button value="center">中</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示图标">
        <el-switch :model-value="data.show_icons !== false" @change="(v: boolean) => emit('update', { show_icons: v })" />
      </el-form-item>
      <el-form-item label="显示电话">
        <el-switch :model-value="data.show_phone !== false" @change="(v: boolean) => emit('update', { show_phone: v })" />
      </el-form-item>
      <el-form-item label="显示地址">
        <el-switch :model-value="data.show_address !== false" @change="(v: boolean) => emit('update', { show_address: v })" />
      </el-form-item>
      <el-form-item label="显示时间">
        <el-switch :model-value="data.show_service_time !== false" @change="(v: boolean) => emit('update', { show_service_time: v })" />
      </el-form-item>

      <TitleFontSizeFields
        :data="data"
        subtitle-label="内容字号"
        :title-default="14"
        :subtitle-default="12"
        @update="(v) => emit('update', v)"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped>
.field-divider {
  margin: 8px 0 12px;
}
</style>
