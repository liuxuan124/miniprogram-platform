<template>
  <div class="nav-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="每行数量">
        <el-radio-group :model-value="data.columns" @change="emit('update', { columns: $event as number })">
          <el-radio :value="3">3个</el-radio>
          <el-radio :value="4">4个</el-radio>
          <el-radio :value="5">5个</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type" @change="emit('update', { style_type: $event as string })">
          <el-radio value="icon_text">图标+文字</el-radio>
          <el-radio value="text_only">纯文字</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-divider content-position="left">导航项</el-divider>
      <div v-for="(item, i) in (data.items || [])" :key="i" class="nav-item-config">
        <div class="nav-item-header">
          <span>导航{{ i + 1 }}</span>
          <el-button type="danger" text size="small" @click="removeItem(i)">删除</el-button>
        </div>
        <el-form-item label="图标">
          <el-input v-model="item.icon" placeholder="图标URL" @change="handleItemsChange" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="item.title" placeholder="导航标题" @change="handleItemsChange" />
        </el-form-item>
        <el-form-item label="链接">
          <div class="link-row">
            <el-select v-model="item.link_type" @change="handleItemsChange" style="width: 90px">
              <el-option label="页面" value="page" />
              <el-option label="链接" value="url" />
              <el-option label="小程序" value="miniapp" />
            </el-select>
            <el-input v-model="item.link_url" placeholder="链接地址" @change="handleItemsChange" style="flex: 1" />
          </div>
        </el-form-item>
      </div>
      <el-button type="primary" text size="small" @click="addItem" style="margin-left: 70px">
        + 添加导航项
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

function handleItemsChange() {
  emit('update', { items: [...data.items] })
}

function addItem() {
  const items = [...(data.items || []), { icon: '', title: '新导航', link_type: 'page', link_url: '' }]
  emit('update', { items })
}

function removeItem(index: number) {
  const items = [...data.items]
  items.splice(index, 1)
  emit('update', { items })
}
</script>

<style lang="scss" scoped>
.nav-item-config {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  .nav-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: #606266;
    font-weight: 500;
  }
}

.link-row {
  display: flex;
  gap: 4px;
}
</style>
