<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="分类导航标题" />
    </el-form-item>
    <el-form-item label="布局">
      <el-select :model-value="data.layout || 'grid'" @change="emit('update', { layout: $event })" style="width: 100%">
        <el-option label="网格" value="grid" />
        <el-option label="横向滚动" value="scroll" />
        <el-option label="胶囊" value="pill" />
        <el-option label="列表" value="list" />
      </el-select>
    </el-form-item>
    <el-form-item label="列数">
      <el-input-number :model-value="data.columns || 4" @change="emit('update', { columns: $event })" :min="2" :max="8" controls-position="right" />
    </el-form-item>
    <el-divider content-position="left">分类项</el-divider>
    <div v-for="(item, i) in items" :key="i" style="margin-bottom: 8px; padding: 6px; background: #f8faff; border: 1px solid #e3e8f0; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #7b8798; font-size: 12px;">
        <span>分类{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveItem(i)">删除</el-button>
      </div>
      <el-form-item label="图标" label-width="50px">
        <div class="icon-field">
          <el-popover placement="bottom-start" :width="320" trigger="click">
            <template #reference>
              <button type="button" class="icon-trigger" title="点击从图标库选择">
                <img v-if="!isEmojiIcon(item.icon)" :src="item.icon" alt="" class="icon-trigger__img" />
                <span v-else>{{ item.icon || '📌' }}</span>
              </button>
            </template>
            <div class="icon-library">
              <button
                v-for="ic in iconLibrary"
                :key="ic.id"
                type="button"
                class="icon-option"
                :class="{ active: item.icon === ic.src }"
                :title="ic.label"
                @click="onUpdateItem(i, 'icon', ic.src)"
              >
                <img :src="ic.src" alt="" />
              </button>
            </div>
          </el-popover>
          <el-input :model-value="item.icon || ''" @input="onUpdateItem(i, 'icon', $event)" placeholder="点左侧选图标，或粘贴图片URL" />
        </div>
      </el-form-item>
      <el-form-item label="名称" label-width="50px">
        <el-input
          :model-value="item.title || ''"
          maxlength="6"
          show-word-limit
          @input="onUpdateItem(i, 'title', $event)"
          placeholder="分类名称（最多6字）"
        />
      </el-form-item>
      <el-form-item label="链接" label-width="50px">
        <el-input :model-value="item.link_url || ''" @input="onUpdateItem(i, 'link_url', $event)" placeholder="/pages/xxx/xxx" />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddItem" style="margin-left: 70px">+ 添加分类项</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useListEditor } from '../composables/useListEditor'
import { NAV_FLAT_ICONS } from '../navIconSet'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const iconLibrary = NAV_FLAT_ICONS

const items = computed(() => {
  const raw = data.items
  return Array.isArray(raw) ? raw : []
})

const { addItem, removeItem, updateItem } = useListEditor(items, {
  createDefault: () => ({ icon: '/images/nav-icons/cart.svg', title: '', link_url: '' }),
  maxItems: 20,
})

function onAddItem() {
  emit('update', { items: addItem() })
}

function onRemoveItem(index: number) {
  emit('update', { items: removeItem(index) })
}

function onUpdateItem(index: number, field: string, value: string) {
  emit('update', { items: updateItem(index, (item) => ({ ...item, [field]: value })) })
}

function isEmojiIcon(icon?: string): boolean {
  if (!icon) return false
  return !/^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(icon.trim())
}
</script>

<style lang="scss" scoped>
.icon-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;

  .icon-trigger {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    background: #fff;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      border-color: #1769ff;
    }
  }
}

.icon-library {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  .icon-option {
    width: 56px;
    height: 56px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    background: #f8fafc;
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;

    img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }

    &:hover {
      background: #f0f6ff;
    }

    &.active {
      border-color: #1769ff;
      background: #e8f1ff;
    }
  }
}

.icon-trigger__img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  border-radius: 6px;
}
</style>
