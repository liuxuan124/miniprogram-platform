<template>
  <div
    class="prototype-canvas"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
  >
    <div class="phone">
      <div class="phone-notch">
        <div class="phone-speaker"></div>
      </div>
      <div class="phone-screen">
        <div class="mini-top">
          <span>{{ pageStore.pageConfig.name || '未命名页面' }}</span>
        </div>
        <div
          class="mini-content"
          :style="{ backgroundColor: pageStore.pageConfig.background_color || '#f6f8fb' }"
        >
          <ComponentItem
            v-for="(comp, index) in pageStore.components"
            :key="comp.id"
            :component="comp"
            :index="index"
            :selected="comp.id === pageStore.selectedComponentId"
            @select="pageStore.selectComponent(comp.id)"
            @delete="pageStore.removeComponent(comp.id)"
            @copy="pageStore.duplicateComponent(comp.id)"
            @move-up="handleMoveUp(index)"
            @move-down="handleMoveDown(index)"
          />
          <div v-if="pageStore.components.length === 0" class="empty-canvas" @click="pageStore.selectComponent(null)">
            <div class="empty-title">空白页面</div>
            <div class="empty-desc">从左侧组件库拖入组件开始装修</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageStore } from '@/stores/page'
import { ComponentType } from '@/types/page'
import ComponentItem from './ComponentItem.vue'

const pageStore = usePageStore()

function handleDragOver(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData('componentType') as ComponentType
  if (type) {
    pageStore.addComponent(type)
  }
}

function handleMoveUp(index: number) {
  if (index > 0) {
    pageStore.moveComponent(index, index - 1)
  }
}

function handleMoveDown(index: number) {
  if (index < pageStore.components.length - 1) {
    pageStore.moveComponent(index, index + 1)
  }
}
</script>

<style lang="scss" scoped>
.prototype-canvas {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 14px 0 28px;
}

.phone {
  width: 334px;
  overflow: hidden;
  background: #fff;
  border-radius: 36px;
  box-shadow:
    0 0 0 9px #111827,
    0 28px 60px rgba(0, 0, 0, 0.3);
}

.phone-notch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  background: #111827;
}

.phone-speaker {
  width: 76px;
  height: 5px;
  background: #000;
  border-radius: 99px;
  opacity: 0.55;
}

.phone-screen {
  height: 610px;
  overflow: hidden;
  background: #f6f8fb;
}

.mini-top {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  color: #172033;
  font-size: 14px;
  font-weight: 800;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
}

.mini-content {
  display: flex;
  flex-direction: column;
  height: 566px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 0;
  }
}

.empty-canvas {
  margin: 20px;
  padding: 34px 18px;
  color: #7b8798;
  font-size: 12px;
  text-align: center;
  background: #fff;
  border: 1px dashed #cfd8e6;
  border-radius: 12px;
  cursor: default;
}

.empty-title {
  margin-bottom: 6px;
  color: #172033;
  font-size: 15px;
  font-weight: 800;
}

.empty-desc {
  color: #8a94a6;
  font-size: 12px;
}
</style>
