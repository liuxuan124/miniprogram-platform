<template>
  <el-form label-width="88px" size="small">
    <el-alert
      :title="isHome
        ? '点左侧「暖阁首页模板」会展开成问候条、作者、精选等可组合区块，再按需增删排序。真机首页还会读系统「暖阁首页配置」。'
        : '对应小程序原生业务页（发现/星球/商城/我的）：底栏打开后走固定版式与真实数据，这里主要改页面标题。'"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    />
    <template v-if="isHome">
      <el-form-item label="出品标题">
        <el-input :model-value="data.authors_title" placeholder="暖阁出品" @input="emit('update', { authors_title: $event })" />
      </el-form-item>
      <el-form-item label="专栏标题">
        <el-input :model-value="data.columns_title" placeholder="精品专栏" @input="emit('update', { columns_title: $event })" />
      </el-form-item>
      <el-form-item label="星球标题">
        <el-input :model-value="data.planet_title" placeholder="我的星球" @input="emit('update', { planet_title: $event })" />
      </el-form-item>
    </template>
    <el-form-item v-else label="页面标题">
      <el-input :model-value="data.title" placeholder="页面标题" @input="emit('update', { title: $event })" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const isHome = computed(() => Object.prototype.hasOwnProperty.call(data || {}, 'authors_title')
  || Object.prototype.hasOwnProperty.call(data || {}, 'columns_title'))
</script>
