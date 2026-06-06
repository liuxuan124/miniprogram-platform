<template>
  <div class="video-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="视频地址">
        <el-input :model-value="data.url" @input="emit('update', { url: $event })" placeholder="视频URL" />
      </el-form-item>
      <el-form-item label="封面图">
        <el-input :model-value="data.poster" @input="emit('update', { poster: $event })" placeholder="封面图URL" />
      </el-form-item>
      <el-form-item label="自动播放">
        <el-switch :model-value="data.autoplay" @change="emit('update', { autoplay: $event as boolean })" />
      </el-form-item>
      <el-form-item label="循环播放">
        <el-switch :model-value="data.loop" @change="emit('update', { loop: $event as boolean })" />
      </el-form-item>
      <el-form-item label="控制栏">
        <el-switch :model-value="data.controls" @change="emit('update', { controls: $event as boolean })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>