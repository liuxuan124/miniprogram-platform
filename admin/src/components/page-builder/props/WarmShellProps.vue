<template>
  <el-form label-width="88px" size="small">
    <el-alert
      :title="isHome
        ? '这是「套用暖阁首页默认模板」入口，不是内部积木。点左侧组件会展开成问候条、作者、精选、专栏、星球、信息流，然后可继续增删排序。'
        : '固定业务模板入口：底栏打开后仍走原生暖阁版式（列表/筛选/个人数据），只改页面标题。'"
      type="warning"
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
