<template>
  <div class="rich-text-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="内容">
        <el-input
          :model-value="data.content"
          @input="emit('update', { content: $event })"
          type="textarea"
          :rows="8"
          placeholder="请输入HTML内容"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>