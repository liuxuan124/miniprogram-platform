<template>
  <el-button size="small" :disabled="disabled" @click="visible = true">
    {{ label }}
  </el-button>
  <AssetPickerDialog v-model="visible" @select="onSelect" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AssetPickerDialog from './AssetPickerDialog.vue'

/**
 * 「素材库」选择按钮。
 * 口径：所有图片先入素材库，各处再引用。本组件只负责把素材库里已有的图回填到调用方字段，
 * 不做上传（上传由各处的「本地上传」负责，上传成功后后端已自动登记进素材库）。
 */
withDefaults(defineProps<{ disabled?: boolean; label?: string }>(), {
  disabled: false,
  label: '素材库',
})

const emit = defineEmits<{ select: [url: string] }>()

const visible = ref(false)

function onSelect(url: string) {
  if (!url) return
  emit('select', url)
  ElMessage.success('已引用素材库图片')
}
</script>
