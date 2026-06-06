<template>
  <div class="float-button-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="图标">
        <el-select :model-value="data.icon" @change="emit('update', { icon: $event as string })" style="width: 100%">
          <el-option label="客服" value="service" />
          <el-option label="购物车" value="cart" />
          <el-option label="首页" value="home" />
          <el-option label="返回顶部" value="top" />
        </el-select>
      </el-form-item>
      <el-form-item label="链接类型">
        <el-select :model-value="data.link_type" @change="emit('update', { link_type: $event as string })" style="width: 100%">
          <el-option label="页面" value="page" />
          <el-option label="链接" value="url" />
          <el-option label="小程序" value="miniapp" />
        </el-select>
      </el-form-item>
      <el-form-item label="链接地址">
        <el-input :model-value="data.link_url" @input="emit('update', { link_url: $event })" placeholder="链接地址" />
      </el-form-item>
      <el-form-item label="位置">
        <el-select :model-value="data.position" @change="emit('update', { position: $event as string })" style="width: 100%">
          <el-option label="右下" value="right_bottom" />
          <el-option label="左下" value="left_bottom" />
          <el-option label="右中" value="right_middle" />
        </el-select>
      </el-form-item>
      <el-form-item label="X偏移">
        <el-input-number
          :model-value="data.offset_x"
          @change="emit('update', { offset_x: $event as number })"
          :min="0"
          :max="100"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="Y偏移">
        <el-input-number
          :model-value="data.offset_y"
          @change="emit('update', { offset_y: $event as number })"
          :min="0"
          :max="500"
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