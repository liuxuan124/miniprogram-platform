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
      <el-divider content-position="left">间距</el-divider>
      <el-form-item label="上留白">
        <el-input-number
          :model-value="Number(data.padding_top ?? 14)"
          :min="0"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { padding_top: v ?? 14 })"
        />
        <div class="icon-hint" style="margin-top:4px">单位 px</div>
      </el-form-item>
      <el-form-item label="下留白">
        <el-input-number
          :model-value="Number(data.padding_bottom ?? 10)"
          :min="0"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { padding_bottom: v ?? 10 })"
        />
        <div class="icon-hint" style="margin-top:4px">单位 px</div>
      </el-form-item>
      <el-divider content-position="left">外框</el-divider>
      <el-form-item label="显示外框">
        <el-switch
          :model-value="data.show_frame !== false"
          @change="(v: boolean) => emit('update', { show_frame: v })"
        />
      </el-form-item>
      <template v-if="data.show_frame !== false">
        <el-form-item label="外框圆角">
          <el-input-number
            :model-value="Number(data.frame_radius ?? 16)"
            :min="0"
            :max="40"
            controls-position="right"
            @change="(v: number | undefined) => emit('update', { frame_radius: v ?? 16 })"
          />
          <div class="icon-hint" style="margin-top:4px">单位 px，白底卡片圆角</div>
        </el-form-item>
        <el-form-item label="外框底色">
          <el-color-picker
            :model-value="data.frame_bg || '#ffffff'"
            @change="(v: string | null) => emit('update', { frame_bg: v || '#ffffff' })"
          />
        </el-form-item>
      </template>
      <el-divider content-position="left">导航项（拖拽可排序）</el-divider>
      <draggable
        class="nav-list"
        :model-value="sortableItems"
        item-key="_key"
        handle=".drag-handle"
        :animation="180"
        @update:model-value="onReorder"
      >
        <template #item="{ element: item, index: i }">
          <div class="nav-item-config">
            <div class="nav-item-header">
              <div class="nav-item-header__left">
                <span class="drag-handle" title="拖动调整顺序">⠿</span>
                <span>导航{{ i + 1 }}</span>
              </div>
              <div class="nav-item-header__actions">
                <el-button text size="small" :disabled="i === 0" @click="moveItem(i, i - 1)">上移</el-button>
                <el-button text size="small" :disabled="i >= sortableItems.length - 1" @click="moveItem(i, i + 1)">下移</el-button>
                <el-button type="danger" text size="small" @click="removeItem(i)">删除</el-button>
              </div>
            </div>
            <el-form-item v-if="data.style_type !== 'text_only'" label="图标">
              <div class="icon-field">
                <el-popover placement="bottom-start" :width="320" trigger="click">
                  <template #reference>
                    <button type="button" class="icon-trigger" title="点击选择图标">
                      <img
                        v-if="isImageIcon(item.icon)"
                        :src="item.icon"
                        alt=""
                        class="icon-trigger__img"
                      />
                      <span v-else>{{ item.icon || '📌' }}</span>
                    </button>
                  </template>
                  <div class="icon-library">
                    <button
                      v-for="ic in iconLibrary"
                      :key="ic.id"
                      type="button"
                      class="icon-option icon-option--flat"
                      :class="{ active: item.icon === ic.src }"
                      :title="ic.label"
                      @click="setIcon(i, ic.src)"
                    >
                      <img :src="`${ic.src}?t=20260819e`" alt="" />
                    </button>
                  </div>
                  <div class="icon-library__tip">扁平色块图标，无黑边描边</div>
                </el-popover>
                <span class="icon-hint">点击左侧图标库选择</span>
              </div>
            </el-form-item>
            <el-form-item label="标题">
              <el-input
                :model-value="item.title"
                placeholder="导航标题"
                @input="(v: string) => updateField(i, 'title', v)"
              />
            </el-form-item>
            <el-form-item label="链接">
              <div class="link-row">
                <el-select
                  :model-value="item.link_type || 'page'"
                  style="width: 90px"
                  @change="(v: string) => updateField(i, 'link_type', v)"
                >
                  <el-option label="页面" value="page" />
                  <el-option label="链接" value="url" />
                  <el-option label="小程序" value="miniapp" />
                </el-select>
                <el-input
                  :model-value="item.link_url"
                  placeholder="链接地址"
                  style="flex: 1"
                  @input="(v: string) => updateField(i, 'link_url', v)"
                />
              </div>
            </el-form-item>
          </div>
        </template>
      </draggable>
      <el-button type="primary" text size="small" @click="addItem" style="margin-left: 70px">
        + 添加导航项
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import { NAV_FLAT_ICONS } from '../navIconSet'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

/** 扁平 SVG 图标库（无黑描边） */
const iconLibrary = NAV_FLAT_ICONS

const sortableItems = computed(() =>
  (Array.isArray(data.items) ? data.items : []).map((item: any, index: number) => ({
    ...item,
    _key: String(item._key || `nav-fallback-${index}`),
  })),
)

function isImageIcon(icon?: string): boolean {
  if (!icon) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(String(icon).trim())
}

function stripKeys(list: any[]) {
  // 保留 _key 便于下次拖拽稳定；小程序端会忽略该字段
  return list.map((item) => {
    const { _key, ...rest } = item
    return { ...rest, _key: _key || `nav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }
  })
}

function onReorder(next: any[]) {
  emit('update', { items: stripKeys(next) })
}

function moveItem(from: number, to: number) {
  const items = stripKeys([...(data.items || [])])
  if (to < 0 || to >= items.length || from === to) return
  const [row] = items.splice(from, 1)
  items.splice(to, 0, row)
  emit('update', { items })
}

function updateField(index: number, field: string, value: string) {
  const items = stripKeys([...(data.items || [])])
  if (!items[index]) return
  items[index] = { ...items[index], [field]: value }
  emit('update', { items })
}

function setIcon(index: number, emoji: string) {
  updateField(index, 'icon', emoji)
}

function addItem() {
  const items = stripKeys([...(data.items || [])])
  items.push({
    _key: `nav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    icon: '📌',
    title: '新导航',
    link_type: 'page',
    link_url: '',
  })
  emit('update', { items })
}

function removeItem(index: number) {
  const items = stripKeys([...(data.items || [])])
  items.splice(index, 1)
  emit('update', { items })
}
</script>

<style lang="scss" scoped>
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nav-item-config {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;

  .nav-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: #606266;
    font-weight: 500;
  }

  .nav-item-header__left {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .nav-item-header__actions {
    display: inline-flex;
    align-items: center;
    gap: 0;
  }
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  color: #94a3b8;
  cursor: grab;
  user-select: none;
  letter-spacing: -1px;

  &:active {
    cursor: grabbing;
  }
}

.link-row {
  display: flex;
  gap: 4px;
}

.icon-field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.icon-trigger {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #f8faff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: #1769ff;
    background: #eef4ff;
  }

  &__img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
}

.icon-hint {
  color: #7b8798;
  font-size: 12px;
}

.icon-library {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.icon-option {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f1f5f9;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  overflow: visible;
  box-sizing: border-box;

  &--flat img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }

  &:hover,
  &.active {
    border-color: #1769ff;
    background: #eef4ff;
  }
}

.icon-trigger__img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 8px;
}

.icon-library__tip {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
}
</style>
