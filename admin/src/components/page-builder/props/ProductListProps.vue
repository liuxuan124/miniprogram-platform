<template>
  <div class="product-list-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="模块标题" />
      </el-form-item>
      <el-form-item label="列数">
        <el-radio-group :model-value="data.columns" @change="emit('update', { columns: $event as number })">
          <el-radio :value="1">单列</el-radio>
          <el-radio :value="2">双列</el-radio>
          <el-radio :value="3">三列</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示价格">
        <el-switch :model-value="data.show_price" @change="emit('update', { show_price: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示销量">
        <el-switch :model-value="data.show_sales" @change="emit('update', { show_sales: $event as boolean })" />
      </el-form-item>
      <el-form-item label="购物车">
        <el-switch :model-value="data.show_cart" @change="emit('update', { show_cart: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit"
          @change="emit('update', { limit: $event as number })"
          :min="1"
          :max="50"
          controls-position="right"
        />
      </el-form-item>

      <el-divider content-position="left" style="margin: 10px 0 6px; font-size: 12px; color: #8a94a6">数据源</el-divider>
      <el-form-item label="排序方式">
        <el-select :model-value="sortBy" @change="onSortByChange" style="width: 100%">
          <el-option label="按销量排序" value="sales" />
          <el-option label="最新上架" value="newest" />
          <el-option label="价格从低到高" value="price_asc" />
          <el-option label="价格从高到低" value="price_desc" />
        </el-select>
      </el-form-item>
      <el-alert
        type="info"
        :closable="false"
        description="商品数据自动从后台已上架商品中拉取，无需手动录入"
        style="font-size: 12px"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const sortBy = computed(() => {
  const ds = data.data_source
  if (!ds) return 'sales'
  const params = ds.params || ds.config?.params || {}
  return params.sort_by || 'sales'
})

function onSortByChange(val: string) {
  emit('update', {
    data_source: {
      type: 'product',
      params: {
        status: 'on_sale',
        sort_by: val,
        sort_order: val === 'price_asc' ? 'asc' : 'desc',
      },
    },
  })
}
</script>
