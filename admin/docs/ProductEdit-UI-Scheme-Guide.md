# 商品编辑页面 UI/UX 重设计方案 - Agent执行指南

> **用途**: 供其他AI Agent读取并执行页面优化
> **目标文件**: `admin/src/views/product/edit.vue`
> **当前状态**: 方案A已实施完成（含增强功能），本文件包含3套可选方案

---

## 📋 快速开始

### 方案选择

| 方案 | 状态 | 适用场景 | 推荐度 |
|------|------|---------|--------|
| **A: 现代简约风格** | ✅ 已完成 | 通用场景、熟练用户 | ⭐⭐⭐⭐⭐ |
| **B: 卡片式模块化** | 📝 待实现 | 复杂商品、个性化需求 | ⭐⭐⭐⭐ |
| **C: 渐进式步骤引导** | 📝 待实现 | 新手用户、移动端优先 | ⭐⭐⭐⭐ |

### 如何使用本文档

1. **阅读当前状态** → 了解已完成的工作
2. **选择实施方案** → 根据需求选择B或C
3. **按步骤执行** → 遵循具体的代码修改指令
4. **验证效果** → 检查响应式和交互功能

---

## ✅ 当前实现状态：方案A (现代简约风格)

### 已完成的改动

**文件位置**: `admin/src/views/product/edit.vue` 第703-1505行

#### 改动清单：

1. **✅ 删除重复样式**
   - 移除了第1208-1525行的第二套样式定义
   - 统一为单一CSS变量系统

2. **✅ 建立Design Token系统**
```css
:root {
  --primary-color: #4f46e5;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

3. **✅ 优化布局结构**
   - 左右分栏: `1fr + 360px`
   - 工具栏粘性定位 + 毛玻璃效果
   - 卡片统一圆角和阴影

4. **✅ 响应式断点**
```
≥1600px: 大屏优化
1366px: 标准笔记本
≤1024px: iPad横屏(单列)
≤768px: 手机横屏
≤480px: 手机竖屏
```

5. **✅ 交互动效**
   - 全局过渡: `cubic-bezier(0.4, 0, 0.2, 1)`
   - Hover上浮效果
   - 聚焦发光边框

### 当前样式特点

- **主色调**: Indigo (#4F46E5)
- **间距系统**: 8px基准网格
- **圆角规范**: 6px/10px/16px三级
- **阴影层次**: sm/md/lg三级
- **字体系统**: 系统默认栈

---

## 🚀 方案A增强功能（已实施）

> **实施日期**: 2026-05-23
> **实施内容**: 在方案A基础上，添加文档中"通用增强功能"章节的全部功能

### 增强功能1: 自动保存草稿

**改动前**: 用户编辑表单时无任何自动保存机制，意外关闭页面将丢失所有数据。

**改动后**:
- 表单数据变化后 5 秒自动保存到 `localStorage`
- 新增模式下自动恢复上次未保存的草稿（24小时有效）
- 保存成功后自动清除草稿
- 仅恢复与当前商品匹配的草稿（按 `productId` 区分）

**具体实现**:
- `saveDraft()`: 将 formData + specNames 序列化存入 localStorage
- `restoreDraft()`: 页面加载时尝试恢复草稿，超过24小时自动过期
- `clearDraft()`: 提交成功后清除草稿
- `autoSaveDraft`: 基于 debounce 的5秒防抖自动保存
- `hasUnsavedChanges`: 追踪未保存状态
- `isRestoringDraft`: 防止恢复草稿时触发自动保存

**设计理由**:
- 使用 localStorage 而非 API 调用，避免网络请求开销
- 24小时过期机制防止陈旧草稿干扰
- productId 匹配确保不同商品间草稿不串扰

### 增强功能2: 图片压缩上传

**改动前**: 图片原样上传，大尺寸图片消耗带宽和存储空间。

**改动后**:
- 上传前自动压缩：宽度超过 1200px 的图片等比缩放
- JPEG 质量压缩至 85%
- 如果压缩后反而更大，自动回退使用原文件
- 主图和商品图上传均经过压缩

**具体实现**:
- `compressImage(file, maxWidth=1200, quality=0.85)`: Canvas 缩放 + JPEG 质量压缩
- 集成到 `handleMainImageUpload` 和 `handleGalleryImageUpload`

**设计理由**:
- 1200px 宽度上限兼顾清晰度和文件大小
- 85% JPEG 质量在视觉和体积间取得平衡
- 自动回退机制确保不会因压缩反而增大文件

### 增强功能3: 表单快捷键

**改动前**: 只能通过鼠标点击按钮操作。

**改动后**:
- `Ctrl/Cmd + S`: 快速保存商品
- `Esc`: 关闭素材选择弹窗
- 全局注册，页面卸载时自动清理

**设计理由**:
- Ctrl+S 是用户最直觉的保存快捷键
- Esc 关闭弹窗符合通用交互习惯
- onUnmounted 清理防止内存泄漏

### 增强功能4: 未保存更改保护

**改动前**: 用户意外离开页面无任何提示，数据直接丢失。

**改动后**:
- 工具栏显示"● 未保存"脉冲动画徽章
- 显示最近自动保存时间（如"已自动保存 14:30"）
- 浏览器关闭/刷新前弹出确认对话框（`beforeunload`）
- 路由跳转前弹出 Element Plus 确认对话框（`onBeforeRouteLeave`）

**具体实现**:
- `hasUnsavedChanges` ref 追踪状态
- `.unsaved-badge` CSS 带脉冲动画
- `.autosave-hint` 显示保存时间
- `handleBeforeUnload`: 浏览器原生离开提示
- `onBeforeRouteLeave`: Vue Router 导航守卫

**设计理由**:
- 视觉徽章让用户始终感知保存状态
- 双重保护（浏览器级 + 路由级）确保不遗漏
- 脉冲动画吸引注意力但不干扰操作

### 增强功能5: 无障碍与焦点增强

**改动前**: 缺少键盘焦点可见性，无 ARIA 标注，无跳过导航。

**改动后**:
- 添加 `focus-visible` 样式：按钮、输入框、单选框键盘聚焦时显示 2px 主题色轮廓
- 添加 `role="banner"`, `role="main"`, `role="complementary"` 语义标注
- 添加 `aria-label` 到侧边栏
- 添加"跳到表单内容"跳过导航链接（Tab 键可见）
- 表单添加 `id="product-form"` 锚点

**设计理由**:
- WCAG AA 合规性要求键盘焦点可见
- 语义化 role 帮助屏幕阅读器理解页面结构
- 跳过导航链接让键盘用户快速到达主要内容

### 改动前后对比总结

| 维度 | 改动前 | 改动后 |
|------|--------|--------|
| 数据安全 | 意外关闭丢失全部数据 | 自动保存草稿 + 离开确认 |
| 图片上传 | 原图直传，大文件慢 | 自动压缩，节省带宽 |
| 操作效率 | 仅鼠标操作 | Ctrl+S 保存 + Esc 关闭 |
| 状态感知 | 无保存状态提示 | 脉冲徽章 + 自动保存时间 |
| 无障碍 | 无焦点样式、无语义标注 | focus-visible + ARIA + 跳过导航 |
| 路由保护 | 无 | 双重离开确认（浏览器 + 路由） |

---

## 🃏 方案B：卡片式模块化设计（待实施）

### 设计理念

将表单拆分为独立的功能卡片，支持折叠/展开/拖拽排序，使用彩色编码区分模块类型。

### 实施步骤

#### Step 1: 创建可折叠卡片组件

**新建文件**: `admin/src/components/CollapsibleCard.vue`

```vue
<template>
  <div 
    class="collapsible-card" 
    :class="{ 
      collapsed: !isExpanded,
      [`type-${colorType}`]: true 
    }"
  >
    <div class="card-header" @click="toggle">
      <div class="color-bar"></div>
      <span class="step-badge" v-if="step">{{ step }}</span>
      <h3>{{ title }}</h3>
      <p class="description" v-if="description">{{ description }}</p>
      <el-button 
        :icon="isExpanded ? 'Minus' : 'Plus'" 
        circle 
        size="small"
        class="toggle-btn"
      />
    </div>
    <transition name="collapse">
      <div class="card-body" v-show="isExpanded">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  step: { type: [String, Number], default: '' },
  colorType: { 
    type: String, 
    default: 'blue',
    validator: (value) => ['blue', 'purple', 'green', 'orange'].includes(value)
  },
  defaultExpanded: { type: Boolean, default: true }
})

const isExpanded = ref(props.defaultExpanded)

function toggle() {
  isExpanded.value = !isExpanded.value
}

defineExpose({ isExpanded, toggle })
</script>

<style scoped>
.collapsible-card {
  border-radius: var(--radius-lg, 12px);
  background: white;
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.08));
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--border-default, #e5e7eb);
}

.collapsible-card:hover {
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.12));
}

/* 彩色顶边 */
.type-blue .color-bar { background: #3b82f6; }
.type-purple .color-bar { background: #8b5cf6; }
.type-green .color-bar { background: #10b981; }
.type-orange .color-bar { background: #f59e0b; }

.color-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background 0.2s ease;
}

.card-header:hover {
  background: #f9fafb;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.type-blue .step-badge { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.type-purple .step-badge { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.type-green .step-badge { background: linear-gradient(135deg, #10b981, #059669); }
.type-orange .step-badge { background: linear-gradient(135deg, #f59e0b, #d97706); }

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  flex: 1;
}

.description {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.toggle-btn {
  flex-shrink: 0;
}

.card-body {
  padding: 20px;
  border-top: 1px solid #f3f4f6;
  background: #fafbfc;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapsed .card-body {
  display: none;
}
</style>
```

#### Step 2: 创建浮动预览组件

**新建文件**: `admin/src/components/FloatingPreview.vue`

```vue
<template>
  <teleport to="body">
    <transition name="drawer">
      <div v-if="visible" class="preview-drawer-overlay" @click.self="$emit('close')">
        <div 
          class="preview-drawer" 
          :style="{ width: drawerWidth + 'px' }"
        >
          <div class="drawer-header">
            <h3>商品预览</h3>
            <el-button :icon="Close" circle size="small" @click="$emit('close')" />
          </div>
          
          <div class="drawer-body">
            <div class="preview-cover">
              <el-image v-if="product.main_image" :src="product.main_image" fit="cover" />
              <div v-else class="empty-preview">暂无图片</div>
            </div>
            
            <div class="preview-content">
              <el-tag size="small">{{ productTypeLabel }}</el-tag>
              <h4>{{ product.name || '未命名商品' }}</h4>
              <p>{{ product.description || '暂无简介' }}</p>
              
              <div class="price-row">
                <span class="price">¥ {{ previewPrice }}</span>
                <span class="stock">库存 {{ previewStock }}</span>
              </div>
              
              <div class="completion-section">
                <h5>发布完成度</h5>
                <el-progress :percentage="completionPercent" />
                <div class="check-list">
                  <div 
                    v-for="item in completionItems" 
                    :key="item.label"
                    class="check-item"
                    :class="{ done: item.done }"
                  >
                    <span class="dot"></span>
                    {{ item.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 拖拽调整宽度 -->
          <div 
            class="resize-handle" 
            @mousedown="startResize"
          ></div>
        </div>
      </div>
    </transition>
    
    <!-- FAB按钮 -->
    <transition name="fab">
      <button 
        v-if="!visible"
        class="fab-button"
        @click="$emit('update:visible', true)"
        title="查看预览"
      >
        <el-icon :size="24"><View /></el-icon>
      </button>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Close, View } from '@element-plus/icons-vue'

const props = defineProps({
  visible: Boolean,
  product: { type: Object, required: true },
  completionPercent: { type: Number, default: 0 },
  completionItems: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'update:visible'])

const drawerWidth = ref(380)
const isResizing = ref(false)

const previewPrice = computed(() => {
  const prices = props.product.skus?.map(s => s.price).filter(p => p > 0) || []
  return prices.length > 0 ? Math.min(...prices).toFixed(2) : '0.00'
})

const previewStock = computed(() => {
  return props.product.skus?.reduce((sum, sku) => sum + (sku.stock || 0), 0) || 0
})

const productTypeLabel = computed(() => {
  const types = { physical: '实物商品', digital: '数字商品', service: '服务商品' }
  return types[props.product.productType] || '实物商品'
})

function startResize(e) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = drawerWidth.value
  
  function onMouseMove(e) {
    const diff = startX - e.clientX
    drawerWidth.value = Math.max(300, Math.min(600, startWidth - diff))
  }
  
  function onMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.preview-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.preview-drawer {
  height: 100vh;
  background: white;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: width 0.15s ease;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.preview-cover {
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 16px;
}

.empty-preview {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.preview-content h4 {
  margin: 12px 0 8px;
  font-size: 17px;
  font-weight: 700;
}

.preview-content p {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 16px;
}

.price {
  font-size: 24px;
  font-weight: 800;
  color: #ef4444;
}

.stock {
  font-size: 13px;
  color: #6b7280;
}

.completion-section h5 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.check-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.check-item.done {
  color: #10b981;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1d5db;
}

.check-item.done .dot {
  background: #10b981;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: #3b82f6;
}

/* FAB按钮 */
.fab-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: white;
  box-shadow: 0 4px 16px rgba(20, 184, 166, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.5);
}

.fab-button:active {
  transform: scale(0.95);
}

/* 动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .preview-drawer,
.drawer-leave-to .preview-drawer {
  transform: translateX(100%);
}

.fab-enter-active,
.fab-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0);
}
</style>
```

#### Step 3: 重构edit.vue主文件

**修改文件**: `admin/src/views/product/edit.vue`

**Template部分替换**:

```vue
<template>
  <div class="product-edit-page scheme-b">
    <div class="edit-shell">
      <!-- 工具栏保持不变 -->
      <header class="page-toolbar">
        <!-- ... 保持原有工具栏代码 ... -->
      </header>

      <el-form ... >
        <!-- 改为单列卡片布局 -->
        <main class="cards-container">
          <!-- 卡片1: 基础信息 -->
          <CollapsibleCard
            title="基础信息"
            description="决定商品在列表、详情和订单里的基础展示"
            step="01"
            color-type="blue"
            :default-expanded="true"
          >
            <div class="form-grid-b">
              <!-- 原有表单内容 -->
              <el-form-item label="商品名称" prop="name">...</el-form-item>
              <el-form-item label="商品分类" prop="category_id">...</el-form-item>
              <!-- ... 其他字段 ... -->
            </div>
          </CollapsibleCard>

          <!-- 卡片2: 图片素材 -->
          <CollapsibleCard
            title="图片素材"
            description="主图影响转化率，建议使用清晰产品图"
            step="02"
            color-type="purple"
          >
            <!-- 原有图片上传区域 -->
          </CollapsibleCard>

          <!-- 卡片3: 内容描述 -->
          <CollapsibleCard
            title="内容描述"
            description="简介负责快速说明卖点，详情用于小程序详情页"
            step="03"
            color-type="green"
          >
            <!-- 原有内容区域 -->
          </CollapsibleCard>

          <!-- 卡片4: SKU管理 -->
          <CollapsibleCard
            title="SKU管理"
            step="04"
            color-type="orange"
          >
            <!-- 原有SKU表格 -->
          </CollapsibleCard>
        </main>
      </el-form>

      <!-- 浮动预览 -->
      <FloatingPreview
        v-model:visible="showPreview"
        :product="formData"
        :completion-percent="completionPercent"
        :completion-items="completionItems"
      />
    </div>
  </div>
</template>
```

**Script部分添加**:

```javascript
import CollapsibleCard from '@/components/CollapsibleCard.vue'
import FloatingPreview from '@/components/FloatingPreview.vue'

const showPreview = ref(false)
```

**Style部分替换为**:

```css
/* 方案B: 卡片式模块化设计 */
.scheme-b {
  /* Teal主题色 */
  --primary-color: #14b8a6;
  --primary-hover: #0d9488;
  --primary-light: #ccfbf1;
  
  /* 单列布局 */
  .cards-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .form-grid-b {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    gap: 16px 20px;
  }
  
  /* 其他样式继承方案A的变量系统 */
}
```

---

## 🚶 方案C：渐进式步骤引导（待实施）

### 设计理念

采用向导式多步骤流程，每次只显示一个步骤的内容，降低认知负荷。

### 实施步骤

#### Step 1: 创建步骤条组件

**新建文件**: `admin/src/components/StepWizard.vue`

```vue
<template>
  <div class="step-wizard">
    <!-- 步骤条 -->
    <div class="wizard-steps">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="wizard-step"
        :class="{
          active: index === currentStep,
          completed: index < currentStep,
          disabled: index > currentStep
        }"
        @click="goToStep(index)"
      >
        <div class="step-circle">
          <el-icon v-if="index < currentStep"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-info">
          <span class="step-title">{{ step.title }}</span>
          <span class="step-desc" v-if="step.description">{{ step.description }}</span>
        </div>
        
        <!-- 连接线 -->
        <div 
          v-if="index < steps.length - 1" 
          class="step-line"
          :class="{ completed: index < currentStep }"
        ></div>
      </div>
    </div>

    <!-- 进度指示器 -->
    <div class="progress-indicator">
      <span class="progress-text">进度: {{ progressPercent }}%</span>
      <el-progress 
        :percentage="progressPercent" 
        :stroke-width="8"
        :show-text="false"
        color="#14b8a6"
      />
    </div>

    <!-- 步骤内容区 -->
    <div class="wizard-content">
      <component 
        :is="steps[currentStep].component"
        v-model="modelValue"
        ref="stepRef"
        @validate="onStepValidate"
      />
    </div>

    <!-- 底部操作栏 -->
    <div class="wizard-footer">
      <el-button 
        v-if="currentStep > 0"
        @click="prevStep"
        size="large"
      >
        ← 上一步
      </el-button>
      
      <div class="footer-spacer"></div>
      
      <el-button 
        v-if="currentStep < steps.length - 1"
        type="primary"
        @click="nextStep"
        size="large"
        :loading="validating"
      >
        下一步 →
      </el-button>
      
      <el-button 
        v-else
        type="success"
        @click="submitAll"
        size="large"
        :loading="submitting"
      >
        ✓ 保存发布
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Check } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  steps: { 
    type: Array, 
    required: true,
    validator: (value) => value.every(step => 
      step.title && step.component
    )
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const currentStep = ref(0)
const stepRef = ref(null)
const validating = ref(false)
const submitting = ref(false)

const progressPercent = computed(() => {
  return Math.round(((currentStep.value + 1) / props.steps.length) * 100)
})

async function nextStep() {
  validating.value = true
  try {
    // 验证当前步骤
    if (stepRef.value?.validate) {
      const valid = await stepRef.value.validate()
      if (!valid) return
    }
    
    currentStep.value++
  } finally {
    validating.value = false
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function goToStep(index) {
  // 只允许跳转到已完成的步骤或下一步
  if (index <= currentStep.value) {
    currentStep.value = index
  }
}

function onStepValidate(isValid) {
  // 处理子组件验证事件
}

async function submitAll() {
  submitting.value = true
  try {
    // 最终提交
    emit('submit', props.modelValue)
  } finally {
    submitting.value = false
  }
}

// 键盘导航
function handleKeydown(e) {
  if (e.key === 'ArrowLeft' && currentStep.value > 0) {
    prevStep()
  } else if (e.key === 'ArrowRight' && currentStep.value < props.steps.length - 1) {
    nextStep()
  } else if (e.key === 'Enter') {
    if (currentStep.value < props.steps.length - 1) {
      nextStep()
    } else {
      submitAll()
    }
  }
}

// 挂载键盘监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.step-wizard {
  max-width: 1000px;
  margin: 0 auto;
}

.wizard-steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.wizard-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.wizard-step.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.wizard-step:not(.disabled):hover {
  transform: translateY(-2px);
}

.step-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  background: #e5e7eb;
  color: #6b7280;
  border: 3px solid transparent;
}

.wizard-step.active .step-circle {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: white;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
  transform: scale(1.1);
}

.wizard-step.completed .step-circle {
  background: #10b981;
  color: white;
}

.step-info {
  text-align: center;
}

.step-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.step-desc {
  display: block;
  font-size: 12px;
  color: #6b7280;
}

.step-line {
  position: absolute;
  top: 22px;
  left: calc(50% + 30px);
  width: calc(100% - 60px);
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  transition: background 0.3s ease;
}

.step-line.completed {
  background: linear-gradient(to right, #10b981, #14b8a6);
}

.progress-indicator {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: #f0fdfa;
  border-radius: 12px;
  border: 1px solid #ccfbf1;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #0d9488;
  margin-right: 12px;
}

.wizard-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  min-height: 400px;
}

.wizard-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
  position: sticky;
  bottom: 16px;
}

.footer-spacer {
  flex: 1;
}

.wizard-footer .el-button {
  min-width: 120px;
  height: 44px;
  font-size: 15px;
}
</style>
```

#### Step 2: 创建各步骤组件

**Step 1: 基础信息**

**新建文件**: `admin/src/views/product/steps/StepBasic.vue`

```vue
<template>
  <div class="step-basic">
    <h3 class="step-title">填写商品基本信息</h3>
    <p class="step-hint">这些信息会显示在商品列表、详情页和订单中</p>
    
    <el-form 
      :model="localData" 
      :rules="rules" 
      label-position="top"
      ref="formRef"
    >
      <el-form-item label="商品名称" prop="name">
        <el-input 
          v-model="localData.name" 
          placeholder="例如：药食同源甄选礼盒"
          maxlength="100" 
          show-word-limit 
          size="large"
        />
      </el-form-item>

      <el-form-item label="商品分类" prop="category_id">
        <el-tree-select
          v-model="localData.category_id"
          :data="categories"
          style="width: 100%"
          placeholder="选择商品所属分类"
          size="large"
        />
      </el-form-item>

      <el-form-item label="商品类型">
        <el-radio-group v-model="localData.productType" class="type-group">
          <el-radio value="physical">
            <strong>实物商品</strong><br/>
            <span>需要库存、发货物流</span>
          </el-radio>
          <el-radio value="digital">
            <strong>数字商品</strong><br/>
            <span>资料、权益、兑换码</span>
          </el-radio>
          <el-radio value="service">
            <strong>服务商品</strong><br/>
            <span>预约、咨询服务</span>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="排序权重">
            <el-input-number 
              v-model="localData.sort" 
              :min="0" 
              :max="9999"
              style="width: 100%"
              size="large"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getCategoryList } from '@/api/product'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue', 'validate'])

const formRef = ref(null)
const categories = ref([])

const localData = ref({ ...props.modelValue })

const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { max: 100, message: '名称不能超过100字', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ]
}

watch(localData, (val) => {
  emit('update:modelValue', val)
}, { deep: true })

watch(() => props.modelValue, (val) => {
  localData.value = { ...val }
}, { deep: true })

async function validate() {
  try {
    await formRef.value?.validate()
    emit('validate', true)
    return true
  } catch {
    emit('validate', false)
    return false
  }
}

defineExpose({ validate })

onMounted(async () => {
  try {
    const res = await getCategoryList()
    categories.value = res.data || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
})
</script>

<style scoped>
.step-basic {
  max-width: 700px;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.step-hint {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 32px;
}

.type-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.type-group :deep(.el-radio) {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  margin: 0;
  transition: all 0.25s ease;
}

.type-group :deep(.el-radio:hover) {
  border-color: #14b8a6;
  background: #f0fdfa;
}

.type-group :deep(.el-radio.is-checked) {
  border-color: #14b8a6;
  background: #f0fdfa;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

.type-group :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  white-space: normal;
}

.type-group strong {
  font-size: 15px;
  color: #111827;
}

.type-group span {
  font-size: 12px;
  color: #6b7280;
}
</style>
```

**其他步骤组件类似结构...**

#### Step 3: 集成到edit.vue

```vue
<template>
  <div class="product-edit-page scheme-c">
    <header class="page-toolbar">
      <!-- 工具栏 -->
    </header>

    <StepWizard
      v-model="formData"
      :steps="wizardSteps"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import StepWizard from '@/components/StepWizard.vue'
import StepBasic from './steps/StepBasic.vue'
import StepImages from './steps/StepImages.vue'
import StepContent from './steps/StepContent.vue'
import StepSku from './steps/StepSku.vue'

const wizardSteps = [
  {
    title: '基础信息',
    description: '名称、分类、类型',
    component: StepBasic
  },
  {
    title: '图片素材',
    description: '主图与轮播图',
    component: StepImages
  },
  {
    title: '内容描述',
    description: '简介与详情',
    component: StepContent
  },
  {
    title: 'SKU配置',
    description: '规格与库存',
    component: StepSku
  }
]
</script>
```

---

## 🔧 通用增强功能（所有方案适用）

### 功能1: 自动保存草稿

**添加到edit.vue的script中**:

```javascript
// 自动保存草稿
import { debounce } from 'lodash-es'

const hasUnsavedChanges = ref(false)

watch(formData, () => {
  hasUnsavedChanges.value = true
}, { deep: true })

const autoSaveDraft = debounce(async () => {
  if (!hasUnsavedChanges.value) return
  
  try {
    // 调用草稿保存API
    await saveDraftApi(formData)
    ElMessage.success('草稿已自动保存')
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('自动保存失败:', error)
  }
}, 5000)

// 监听变化触发自动保存
watch(formData, autoSaveDraft, { deep: true })

// 页面关闭前提示
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
})
```

### 功能2: 图片压缩上传

```javascript
async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// 使用示例
async function handleImageUpload(file) {
  const compressedFile = await compressImage(file)
  const url = await uploadFile(compressedFile)
  return url
}
```

### 功能3: 表单快捷键

```javascript
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

function handleGlobalKeydown(e) {
  // Ctrl+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSubmit()
  }
  
  // Esc 关闭弹窗
  if (e.key === 'Escape') {
    // 关闭所有打开的dialog
  }
}
```

---

## 📊 测试检查清单

### 视觉测试

- [ ] Chrome/Edge/Firefox/Safari 最新版正常显示
- [ ] 1366px/1440px/1920px 分辨率布局正确
- [ ] iPad Pro/Mobile设备适配良好
- [ ] 无横向滚动条
- [ ] 图片加载无变形

### 功能测试

- [ ] 所有表单字段可正常输入
- [ ] 图片上传（本地/URL/素材库）三路通畅
- [ ] SKU增删改查操作正常
- [ ] 表单验证规则生效
- [ ] 保存/提交功能正常
- [ ] 返回列表功能正常
- [ ] 自动保存草稿功能正常

### 响应式测试

- [ ] ≥1600px: 大屏侧栏宽度合适
- [ ] 1366px: 标准布局无溢出
- [ ] ≤1024px: 单列布局切换流畅
- [ ] ≤768px: 移动端触控友好
- [ ] ≤480px: 小屏手机可用

### 性能测试

- [ ] 首屏渲染时间 < 2秒
- [ ] 无内存泄漏（DevTools Memory面板）
- [ ] 动画帧率稳定 60fps
- [ ] 图片懒加载生效

### 无障碍测试

- [ ] 键盘Tab键可遍历所有交互元素
- [ ] Focus状态视觉明显
- [ ] 色彩对比度符合WCAG AA标准
- [ ] Screen reader可朗读关键信息

---

## 🚀 执行建议

### 推荐实施顺序

1. **立即可用** ✅
   - 当前方案A已经生效
   - 可直接体验新UI

2. **短期优化** (1-2天)
   - 添加自动保存草稿
   - 图片压缩功能
   - 快捷键支持

3. **中期迭代** (3-5天)
   - 选择方案B或C进行重构
   - A/B测试收集数据
   - 根据反馈调整细节

4. **长期规划** (持续)
   - 用户行为数据分析
   - 定期设计评审
   - 组件库沉淀

### 注意事项

⚠️ **备份原文件**
```bash
cp edit.vue edit.vue.backup.$(date +%Y%m%d)
```

⚠️ **渐进式迁移**
- 不要一次性修改所有内容
- 每完成一个功能点就测试
- 使用Git分支管理不同方案

⚠️ **兼容性检查**
- Element Plus版本兼容性
- 浏览器兼容性列表
- 移动端特殊处理

---

## 📞 技术支持

如遇到问题，请检查：

1. **CSS变量是否生效** - 打开DevTools查看计算样式
2. **组件导入路径** - 确认@/别名配置正确
3. **Element Plus版本** - 确保API兼容性
4. **控制台错误** - 检查是否有编译或运行时错误

---

**📅 文档更新时间**: 2026-05-23  
**👤 维护者**: AI Design System  
**🔄 版本**: v1.0 (Agent Execution Guide)
