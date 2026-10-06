<template>
  <div class="nfp-style">

      <div class="nfp-sec">
        <div class="nfp-sec__head"><span class="nfp-sec__title">Tab 导航栏样式</span></div>
        <el-form label-width="76px" size="small">
          <el-form-item label="Tab 字号">
            <NumSliderRow
              :model-value="cfg.tab_font_size"
              :min="TAB_FONT_SIZE.min"
              :max="TAB_FONT_SIZE.max"
              :step="TAB_FONT_SIZE.step"
              @update:model-value="(v: number) => patch({ tab_font_size: v })"
            />
          </el-form-item>
          <el-form-item label="选中高亮">
            <GridSegmented
              :model-value="cfg.tab_active_style"
              :options="TAB_ACTIVE_OPTS"
              :cols="3"
              aria-label="选中高亮形态"
              @update:model-value="(v) => patch({ tab_active_style: v })"
            />
          </el-form-item>
          <el-form-item label="激活主色">
            <ColorPickerField
              :model-value="cfg.tab_active_color"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空则跟随站点主题色"
              @update:model-value="(v: string) => patch({ tab_active_color: v })"
            />
            <el-button size="small" text @click="patch({ tab_active_color: '' })">跟随主题色</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- ============ 导航区背景（2026-10-06 新增） ============
           此前整片导航区与两层底色全部硬编码在渲染器里，
           截图里「包住两层导航的白底」换主题时只能改代码。 -->
      <div class="nfp-sec">
        <div class="nfp-sec__head"><span class="nfp-sec__title">导航区背景</span></div>
        <el-form label-width="76px" size="small">
          <el-form-item label="导航底色">
            <ColorPickerField
              :model-value="cfg.nav_bg"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空 = 透明（跟随页面背景）"
              @update:model-value="(v: string) => patch({ nav_bg: v })"
            />
            <el-button size="small" text @click="patch({ nav_bg: '' })">透明</el-button>
          </el-form-item>
          <el-form-item label="导航圆角">
            <NumSliderRow
              :model-value="cfg.nav_radius"
              :min="NAV_RADIUS.min"
              :max="NAV_RADIUS.max"
              :step="NAV_RADIUS.step"
              unit="px"
              @update:model-value="(v: number) => patch({ nav_radius: v })"
            />
            <FieldHint text="0 = 直角；配了底色时圆角才看得出效果" />
          </el-form-item>
        </el-form>
      </div>

      <!-- ============ 首层导航（全部/笔记/长文/好物） ============ -->
      <div class="nfp-sec">
        <div class="nfp-sec__head">
          <span class="nfp-sec__title">首层导航</span>
          <span class="nfp-sec__hint">内容类型切换</span>
        </div>
        <el-form label-width="76px" size="small">
          <el-form-item label="底色">
            <ColorPickerField
              :model-value="cfg.tab_bar_bg"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空 = 透明"
              @update:model-value="(v: string) => patch({ tab_bar_bg: v })"
            />
            <el-button size="small" text @click="patch({ tab_bar_bg: '' })">透明</el-button>
          </el-form-item>
          <el-form-item label="分割线">
            <ColorPickerField
              :model-value="cfg.tab_divider_color"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空 = 不画分割线"
              @update:model-value="(v: string) => patch({ tab_divider_color: v })"
            />
            <el-button size="small" text @click="patch({ tab_divider_color: '' })">去掉</el-button>
          </el-form-item>
          <el-form-item label="未选文字">
            <ColorPickerField
              :model-value="cfg.tab_text_color"
              label=""
              :predefine="BRAND_PALETTE"
              hint="选中的颜色用上面的「激活主色」"
              @update:model-value="(v: string) => patch({ tab_text_color: v })"
            />
          </el-form-item>
          <!-- 🔴 2026-10-06 新增：指示器颜色（此前写死 #ec2f55 红条） -->
          <el-form-item label="指示器色">
            <ColorPickerField
              :model-value="cfg.tab_indicator_color"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空 = 跟随上面的激活主色"
              @update:model-value="(v: string) => patch({ tab_indicator_color: v })"
            />
            <el-button size="small" text @click="patch({ tab_indicator_color: '' })">跟随激活色</el-button>
          </el-form-item>
          <!-- 🔴 2026-10-06 新增：搜索图标显隐 + 颜色（此前 #c6cbd6 写死） -->
          <el-form-item label="搜索图标">
            <!-- ⚠️ 缺省必须是 false（Schema 的 show_search 缺省就是 false）。
                 写成 `!== false` 会让「未配置」在面板显示成「开」，
                 但渲染器按 false 不画图标 → 面板与画布对不上。 -->
            <el-switch
              :model-value="cfg.show_search === true"
              @change="(v: boolean) => patch({ show_search: v })"
            />
            <ColorPickerField
              v-if="cfg.show_search === true"
              :model-value="cfg.search_icon_color"
              label=""
              :predefine="BRAND_PALETTE"
              hint="留空 = 跟随未选文字色"
              @update:model-value="(v: string) => patch({ search_icon_color: v })"
            />
          </el-form-item>
          <el-form-item label="字间距">
            <NumSliderRow
              :model-value="cfg.tab_gap"
              :min="TAB_GAP.min"
              :max="TAB_GAP.max"
              :step="TAB_GAP.step"
              unit="px"
              @update:model-value="(v: number) => patch({ tab_gap: v })"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- ============ 卡片阴影（2026-10-06 新增） ============
           4 档预设；仅选「自定义」才展开 5 列参数，避免平时占大块版面。
           ⚠️ 缺省是「柔和」而非「无」—— 改前渲染器本来就写了
           0 2px 8px rgba(15,18,25,.06)，那正是柔和档；回落「无」会让老页面集体丢阴影。 -->
      <div class="nfp-sec">
        <div class="nfp-sec__head">
          <span class="nfp-sec__title">卡片阴影</span>
          <span class="nfp-sec__hint">影响笔记卡片外框</span>
        </div>
        <el-form label-width="76px" size="small">
          <el-form-item label="阴影">
            <el-radio-group
              :model-value="cfg.card_shadow"
              size="small"
              @update:model-value="(v: any) => patch({ card_shadow: v })"
            >
              <el-radio-button value="none">无</el-radio-button>
              <el-radio-button value="light">柔和</el-radio-button>
              <el-radio-button value="normal">弥散</el-radio-button>
              <el-radio-button value="custom">自定义</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <!-- 🔴 只有「自定义」才展开 5 列；其余档位不需要参数 -->
          <template v-if="cfg.card_shadow === 'custom'">
            <el-form-item label="水平 X">
              <NumSliderRow
                :model-value="cfg.card_shadow_custom.x"
                :min="SHADOW_XY.min"
                :max="SHADOW_XY.max"
                :step="SHADOW_XY.step"
                unit="px"
                @update:model-value="(v: number) => patchShadow('x', v)"
              />
            </el-form-item>
            <el-form-item label="垂直 Y">
              <NumSliderRow
                :model-value="cfg.card_shadow_custom.y"
                :min="SHADOW_XY.min"
                :max="SHADOW_XY.max"
                :step="SHADOW_XY.step"
                unit="px"
                @update:model-value="(v: number) => patchShadow('y', v)"
              />
            </el-form-item>
            <el-form-item label="模糊">
              <NumSliderRow
                :model-value="cfg.card_shadow_custom.blur"
                :min="SHADOW_BLUR.min"
                :max="SHADOW_BLUR.max"
                :step="SHADOW_BLUR.step"
                unit="px"
                @update:model-value="(v: number) => patchShadow('blur', v)"
              />
            </el-form-item>
            <el-form-item label="扩散">
              <NumSliderRow
                :model-value="cfg.card_shadow_custom.spread"
                :min="SHADOW_SPREAD.min"
                :max="SHADOW_SPREAD.max"
                :step="SHADOW_SPREAD.step"
                unit="px"
                @update:model-value="(v: number) => patchShadow('spread', v)"
              />
            </el-form-item>
            <el-form-item label="阴影色">
              <ColorPickerField
                :model-value="cfg.card_shadow_custom.color"
                label=""
                :predefine="BRAND_PALETTE"
                @update:model-value="(v: string) => patchShadow('color', v)"
              />
            </el-form-item>
          </template>
        </el-form>
      </div>

      <!-- ============ 次层分类胶囊（亚马逊/TikTok…） ============ -->
      <div class="nfp-sec">
        <div class="nfp-sec__head">
          <span class="nfp-sec__title">分类标题</span>
          <span class="nfp-sec__hint">第二行平台分类</span>
        </div>
        <el-form label-width="76px" size="small">
          <el-form-item label="字号">
            <NumSliderRow
              :model-value="cfg.sub_tab_font_size"
              :min="SUB_TAB_FONT.min"
              :max="SUB_TAB_FONT.max"
              :step="SUB_TAB_FONT.step"
              unit="px"
              @update:model-value="(v: number) => patch({ sub_tab_font_size: v })"
            />
          </el-form-item>
          <el-form-item label="常态底色">
            <ColorPickerField
              :model-value="cfg.sub_tab_bg"
              label=""
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ sub_tab_bg: v })"
            />
          </el-form-item>
          <el-form-item label="常态文字">
            <ColorPickerField
              :model-value="cfg.sub_tab_text_color"
              label=""
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ sub_tab_text_color: v })"
            />
          </el-form-item>
          <el-form-item label="选中底色">
            <ColorPickerField
              :model-value="cfg.sub_tab_active_bg"
              label=""
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ sub_tab_active_bg: v })"
            />
          </el-form-item>
          <el-form-item label="选中文字">
            <ColorPickerField
              :model-value="cfg.sub_tab_active_color"
              label=""
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ sub_tab_active_color: v })"
            />
          </el-form-item>
          <el-form-item label="胶囊圆角">
            <NumSliderRow
              :model-value="cfg.sub_tab_radius"
              :min="SUB_TAB_RADIUS.min"
              :max="SUB_TAB_RADIUS.max"
              :step="SUB_TAB_RADIUS.step"
              unit="px"
              @update:model-value="(v: number) => patch({ sub_tab_radius: v })"
            />
            <FieldHint text="999 = 全圆胶囊；0 = 直角矩形" />
          </el-form-item>
          <el-form-item label="内边距">
            <NumSliderRow
              :model-value="cfg.sub_tab_padding_x"
              :min="SUB_TAB_PADDING.min"
              :max="SUB_TAB_PADDING.max"
              :step="SUB_TAB_PADDING.step"
              unit="px"
              @update:model-value="(v: number) => patch({ sub_tab_padding_x: v })"
            />
            <FieldHint text="文字左右留白，决定胶囊宽度" />
          </el-form-item>
          <el-form-item label="胶囊间距">
            <NumSliderRow
              :model-value="cfg.sub_tab_gap"
              :min="SUB_TAB_GAP_RANGE.min"
              :max="SUB_TAB_GAP_RANGE.max"
              :step="SUB_TAB_GAP_RANGE.step"
              unit="px"
              @update:model-value="(v: number) => patch({ sub_tab_gap: v })"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="nfp-sec">
        <div class="nfp-sec__head"><span class="nfp-sec__title">卡片间距与容器</span></div>
        <el-form label-width="76px" size="small">
          <el-form-item label="卡片间距">
            <NumSliderRow
              :model-value="cfg.item_gap"
              :min="ITEM_GAP.min"
              :max="ITEM_GAP.max"
              :step="ITEM_GAP.step"
              @update:model-value="(v: number) => patch({ item_gap: v })"
            />
            <FieldHint text="两列之间的缝隙，小红书标准 8~10px" />
          </el-form-item>
          <el-form-item label="卡片圆角">
            <NumSliderRow
              :model-value="cfg.item_border_radius"
              :min="ITEM_RADIUS.min"
              :max="ITEM_RADIUS.max"
              :step="ITEM_RADIUS.step"
              @update:model-value="(v: number) => patch({ item_border_radius: v })"
            />
          </el-form-item>
          <el-form-item label="左右边距">
            <NumSliderRow
              :model-value="cfg.page_gutter"
              :min="PAGE_GUTTER.min"
              :max="PAGE_GUTTER.max"
              :step="PAGE_GUTTER.step"
              @update:model-value="(v: number) => patch({ page_gutter: v })"
            />
            <FieldHint text="0 = 贴边，16 = 最大留白" />
          </el-form-item>
          <el-form-item label="卡片底色">
            <ColorPickerField
              :model-value="cfg.card_bg"
              label=""
              default-value="#ffffff"
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ card_bg: v })"
            />
          </el-form-item>
          <el-form-item label="列表底色">
            <ColorPickerField
              :model-value="cfg.background_color"
              label=""
              default-value="#f7f7f7"
              :predefine="['#f7f7f7', '#ffffff', '#fff5eb', '#f0f5ff', '#fdf6ec', '#1f1f1f']"
              @update:model-value="(v: string) => patch({ background_color: v })"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="nfp-sec">
        <div class="nfp-sec__head"><span class="nfp-sec__title">卡片文本排版</span></div>
        <el-form label-width="76px" size="small">
          <el-form-item label="标题字号">
            <NumSliderRow
              :model-value="cfg.title_size"
              :min="TITLE_SIZE.min"
              :max="TITLE_SIZE.max"
              :step="TITLE_SIZE.step"
              @update:model-value="(v: number) => patch({ title_size: v })"
            />
            <FieldHint :text="`${TITLE_SIZE.min}~${TITLE_SIZE.max}px，与真机所见一致（此前填 32 实际只有约 16px）`" />
          </el-form-item>
          <el-form-item label="标题行数">
            <GridSegmented
              :model-value="cfg.title_lines"
              :options="TITLE_LINES_OPTS"
              :cols="3"
              aria-label="标题行数限制"
              @update:model-value="(v) => patch({ title_lines: Number(v) })"
            />
          </el-form-item>
          <el-form-item label="正文字色">
            <ColorPickerField
              :model-value="cfg.text_color"
              label=""
              default-value="#333333"
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ text_color: v })"
            />
          </el-form-item>
          <el-form-item label="辅助字色">
            <ColorPickerField
              :model-value="cfg.meta_color"
              label=""
              default-value="#7b8798"
              :predefine="BRAND_PALETTE"
              @update:model-value="(v: string) => patch({ meta_color: v })"
            />
          </el-form-item>
        </el-form>
      </div>

      <SourceTagFields :props="props" @update="(v) => patch(v)" />
  </div>
</template>

<script setup lang="ts">
/**
 * 笔记瀑布流的**专属样式面板**（2026-10-06 从 NoteFeedProps.vue 抽出）。
 *
 * 🔴 为什么要抽：笔记流之前**没注册进 PropsPanel 的 `stylePanelMap`**，
 * 于是它走的是通用样式面板（容器与可见性 / 卡片与列表 / 配色）。
 * 我上一轮把两层导航底色 / 分类标题样式加在 NoteFeedProps 的「样式」tab 里，
 * 但那个 tab 只在组件被注册为专属面板时才会出现 ——
 * 结果**配置写了却永远看不到**（用户反馈「还是没有看到调整的地方」）。
 *
 * 契约（与 stylePanelMap 调用方式一致）：props = 组件 props，@update = 局部 patch。
 */
import { computed } from 'vue'
import NumSliderRow from './NumSliderRow.vue'
import GridSegmented from '../GridSegmented.vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
import SourceTagFields from './SourceTagFields.vue'
import {
  BRAND_PALETTE,
  ITEM_GAP,
  ITEM_RADIUS,
  NAV_RADIUS,
  PAGE_GUTTER,
  SUB_TAB_FONT,
  SUB_TAB_GAP_RANGE,
  SUB_TAB_PADDING,
  SUB_TAB_RADIUS,
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_SPREAD,
  SHADOW_XY,
  TAB_ACTIVE_OPTS,
  TAB_FONT_SIZE,
  TAB_GAP,
  TITLE_LINES_OPTS,
  TITLE_SIZE,
  normalizeNoteFeedProps,
} from '../noteFeed/noteFeedSchema'

const { props } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

/** 归一化后的配置（两层导航字段的 fallback = 渲染器原硬编码，老页面零变化） */
const cfg = computed(() => normalizeNoteFeedProps(props.props))

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/**
 * 阴影子字段 patch。
 * 🔴 `updateComponentProps` 是**浅合并**，嵌套对象必须**整对象回写** ——
 * 直接 emit { card_shadow_custom: { x: 1 } } 会把 y/blur/spread/color 全丢掉。
 */
function patchShadow(key: string, value: unknown) {
  emit('update', {
    card_shadow_custom: { ...cfg.value.card_shadow_custom, [key]: value },
  })
}
</script>

<style scoped lang="scss">

.nfp-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.nfp-sec {
  margin-bottom: 16px;
}

.nfp-sec__head {
  margin-bottom: 6px;
}

.nfp-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

.nfp-sec__hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: #a89c8d;
  line-height: 1.5;
}

.nfp-card {
  padding: 10px;
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.nfp-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.nfp-card__count {
  font-weight: 500;
  color: var(--color-primary);
}

.nfp-chips {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nfp-chip {
  min-width: 0;
  padding: 4px 8px;
  overflow: hidden;
  font-size: 11px;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.nfp-empty {
  font-size: 11px;
  color: #7b8798;
}

/* ---------- 页签卡片 ---------- */
.type-tabs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.type-tabs__item {
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 9px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.type-tabs__item.is-open {
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 42%, #fff);
  box-shadow: 0 1px 6px rgb(42 31 23 / 6%);
}

.type-tabs__head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px 5px 4px;
}

.type-tabs__grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 24px;
  color: #c3b8a8;
  border-radius: 5px;
  cursor: grab;
  user-select: none;
}

.type-tabs__grip:active { cursor: grabbing; }

.type-tabs__toggle {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
  padding: 3px 0;
  text-align: left;
  font-family: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.type-tabs__name {
  flex: none;
  max-width: 45%;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tabs__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  color: var(--wb-faint, #7a6a5c);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tabs__caret {
  flex-shrink: 0;
  font-size: 12px;
  color: #b3a596;
  transition: transform 0.2s ease;
}

.type-tabs__caret.is-open {
  color: var(--el-color-primary, #c08e6e);
  transform: rotate(180deg);
}

.type-tabs__del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #c2c9d6;
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.type-tabs__del:hover {
  color: #ec2f55;
  background: #fdeef2;
}

.type-tabs__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 2px 12px;
  margin: 0 8px;
  border-top: 1px dashed var(--wb-line, #e8dfd3);
}

.type-tabs__row {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.type-tabs__key {
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--wb-mute, #6b5b4e);
  white-space: nowrap;
}

.type-tabs__ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1;
  color: #5a6478;
  cursor: pointer;
  background: #f6f8fb;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.chip:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #f3f0ea);
}

.chip--on,
.chip--on:hover {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary) 40%, #fff);
}

.type-tabs__add {
  align-self: flex-start;
}

/* 分组副标：说明这一组是管哪一层导航 */
.nfp-sec__hint {
  margin-left: 6px;
  color: #a8b3c4;
  font-size: 11px;
  font-weight: 400;
}
</style>
