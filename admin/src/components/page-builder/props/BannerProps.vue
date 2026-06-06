<template>
  <div class="banner-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="自动播放">
        <el-switch :model-value="data.autoplay" @change="emit('update', { autoplay: $event as boolean })" />
      </el-form-item>
      <el-form-item label="间隔时间">
        <el-input-number
          :model-value="data.interval"
          @change="emit('update', { interval: $event as number })"
          :min="1000"
          :max="10000"
          :step="500"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="指示点">
        <el-switch :model-value="data.indicator_dots" @change="emit('update', { indicator_dots: $event as boolean })" />
      </el-form-item>
      <el-form-item label="圆角">
        <el-input-number
          :model-value="data.border_radius"
          @change="emit('update', { border_radius: $event as number })"
          :min="0"
          :max="30"
          controls-position="right"
        />
      </el-form-item>
      <el-divider content-position="left">轮播图片</el-divider>
      <div v-for="(img, i) in (data.images || [])" :key="i" class="banner-item">
        <el-form-item :label="`图片${i + 1}`">
          <div class="banner-item-form">
            <el-input
              v-model="img.image"
              placeholder="图片URL"
              @change="handleImagesChange"
            />
            <el-input
              v-model="img.title"
              placeholder="标题（可选）"
              @change="handleImagesChange"
              style="margin-top: 4px"
            />
            <div class="link-row">
              <el-select v-model="img.link_type" @change="handleImagesChange" style="width: 90px">
                <el-option label="页面" value="page" />
                <el-option label="链接" value="url" />
                <el-option label="小程序" value="miniapp" />
              </el-select>
              <el-input
                v-model="img.link_url"
                placeholder="链接地址"
                @change="handleImagesChange"
                style="flex: 1"
              />
            </div>
            <el-button
              type="danger"
              text
              size="small"
              @click="removeImage(i)"
              style="margin-top: 4px"
            >
              删除此图
            </el-button>
          </div>
        </el-form-item>
      </div>
      <el-button type="primary" text size="small" @click="addImage" style="margin-left: 70px">
        + 添加图片
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

function handleImagesChange() {
  emit('update', { images: [...data.images] })
}

function addImage() {
  const images = [...(data.images || []), { image: '', title: '', link_type: 'page', link_url: '' }]
  emit('update', { images })
}

function removeImage(index: number) {
  const images = [...data.images]
  images.splice(index, 1)
  emit('update', { images })
}
</script>

<style lang="scss" scoped>
.banner-item-form {
  width: 100%;

  .link-row {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }
}
</style>
