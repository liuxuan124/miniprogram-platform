<template>
  <div class="divider-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="线型">
        <el-select :model-value="data.style_type" @change="emit('update', { style_type: $event as string })" style="width: 100%">
          <el-option label="实线" value="solid" />
          <el-option label="虚线" value="dashed" />
          <el-option label="点线" value="dotted" />
        </el-select>
      </el-form-item>
      <el-form-item label="颜色">
        <el-color-picker :model-value="data.color" @change="emit('update', { color: $event as string })" />
      </el-form-item>
      <el-form-item label="间距">
        <el-input-number
          :model-value="data.margin"
          @change="emit('update', { margin: $event as number })"
          :min="0"
          :max="60"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>