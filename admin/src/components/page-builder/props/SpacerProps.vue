<template>
  <div class="spacer-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="高度">
        <el-input-number
          :model-value="data.height"
          @change="emit('update', { height: $event as number })"
          :min="5"
          :max="200"
          :step="5"
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