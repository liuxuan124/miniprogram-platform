<template>
  <div class="article-feed-props">
    <el-tabs v-model="activeTab" class="afp-tabs">
      <!-- ==================== 内容配置 ==================== -->
      <el-tab-pane label="内容" name="content">
        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">数据源与过滤</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="数据范围">
              <el-select
                :model-value="cfg.scope"
                style="width: 100%"
                @update:model-value="(v: string) => patch({ scope: v })"
              >
                <el-option v-for="o in FEED_SCOPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="cfg.scope === 'category'" label="指定分类">
              <el-select
                :model-value="cfg.category_id"
                filterable
                clearable
                placeholder="选择分类"
                style="width: 100%"
                :loading="categoryLoading"
                @update:model-value="(v: any) => patch({ category_id: v ?? '' })"
              >
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="cfg.scope === 'column'" label="指定专栏">
              <el-select
                :model-value="cfg.column_id"
                filterable
                remote
                clearable
                placeholder="搜索专栏名称"
                style="width: 100%"
                :remote-method="searchColumns"
                :loading="columnLoading"
                @update:model-value="(v: any) => patch({ column_id: v ?? '' })"
              >
                <el-option v-for="c in columns" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="默认排序">
              <el-select
                :model-value="cfg.sort"
                style="width: 100%"
                @update:model-value="(v: string) => patch({ sort: v })"
              >
                <el-option v-for="o in FEED_SORT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">手动置顶</span></div>
          <FeedPinEditor :model-value="cfg.pinned" @update:model-value="(v: PinnedArticle[]) => patch({ pinned: v })" />
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">分类导航</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="分类导航">
              <el-switch
                :model-value="cfg.show_category_tabs"
                @change="(v: boolean) => patch({ show_category_tabs: v })"
              />
              <FieldHint text="开启后列表顶部出现分类导航，点击可切换下方文章" />
            </el-form-item>

            <template v-if="cfg.show_category_tabs">
              <el-form-item label="展示形态">
                <BuilderSegmented
                  :model-value="cfg.tab_style"
                  block
                  :options="FEED_TAB_STYLE_OPTIONS"
                  @update:model-value="(v) => patch({ tab_style: v })"
                />
              </el-form-item>
              <el-form-item label="全部标签">
                <el-switch :model-value="cfg.tab_show_all" @change="(v: boolean) => patch({ tab_show_all: v })" />
                <FieldHint text="在导航首位展示「全部」，不选则直接显示各分类" />
              </el-form-item>
            </template>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">加载与分页</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="加载方式">
              <el-select
                :model-value="cfg.load_mode"
                style="width: 100%"
                @update:model-value="(v: string) => patch({ load_mode: v })"
              >
                <el-option v-for="o in FEED_LOAD_MODE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>

            <el-form-item label="单页条数">
              <el-input-number
                :model-value="cfg.page_size"
                :min="PAGE_SIZE.min"
                :max="PAGE_SIZE.max"
                controls-position="right"
                @change="(v: number | undefined) => patch({ page_size: Number(v) })"
              />
              <FieldHint text="每页加载的文章篇数" />
            </el-form-item>

            <!--
              🔴 「最大限制」与「不限」逻辑解耦（2026-10-06）
              原来是一个输入框 + 一个「不限」按钮：点「不限」把值置 0，
              但输入框里仍显示 `0`，配上「篇」单位就是 `0 篇 不限` ——
              到底是 0 篇还是不限？运营必须自己猜。
              现在：独立的「不限制篇数」勾选框表达「不限」，
              勾选时数字框禁用并显示 placeholder「不限」，底层落 0（沿用端上既有判定）。
            -->
            <el-form-item label="最大限制">
              <div class="afp-inline">
                <el-input-number
                  :model-value="maxUnlimited ? '' : cfg.max_count"
                  :min="MAX_COUNT.min"
                  :max="MAX_COUNT.max"
                  :controls="false"
                  size="small"
                  :disabled="maxUnlimited"
                  :placeholder="maxUnlimited ? '不限' : ''"
                  @change="(v: number | undefined) => onMaxCountChange(v)"
                />
                <span class="afp-inline__unit">篇</span>
                <el-checkbox
                  :model-value="maxUnlimited"
                  @update:model-value="(v: boolean) => onMaxUnlimitedChange(Boolean(v))"
                >不限制篇数</el-checkbox>
              </div>
              <FieldHint
                text="例如首页限流只展示前 20 篇；勾选「不限制篇数」则不截断"
              />
              <!-- 需求点名的联动校验：最大限制必须 ≥ 单页条数，否则首屏都填不满 -->
              <p v-if="maxCountWarning" class="afp-warn">{{ maxCountWarning }}</p>
            </el-form-item>

            <el-form-item label="触底文案">
              <el-input
                :model-value="cfg.load_more_text"
                placeholder="如：下滑加载更多文章…"
                @update:model-value="(v: string) => patch({ load_more_text: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head">
            <span class="afp-sec__title">来源标签</span>
          </div>
          <el-form label-width="76px" size="small">
            <el-form-item label="显示标签">
              <el-switch
                :model-value="cfg.show_source_tag"
                @change="(v: boolean) => patch({ show_source_tag: v })"
              />
            </el-form-item>
            <template v-if="cfg.show_source_tag">
              <el-form-item label="标签位置">
                <BuilderSegmented
                  :model-value="cfg.source_tag_position"
                  block
                  :options="SOURCE_POS_OPTIONS"
                  @update:model-value="(v) => patch({ source_tag_position: v })"
                />
              </el-form-item>
              <!--
                🔴 来源标签由「写死四个输入框」升级为**动态映射表**（2026-10-06）
                原来 SOURCE_KEYS 是硬编码常量（公众号/小红书/问答/原创），
                想加「抖音」只能改代码发版；而且每个渠道只有文案可改，没有配色。
                现在每一行 = 一个渠道（key + 展示文案 + 预设配色），可增删改。
              -->
              <div class="afp-tagmap">
                <div v-for="row in sourceTagRows" :key="row.key" class="afp-tagmap__row">
                  <el-input
                    :model-value="row.label"
                    size="small"
                    class="afp-tagmap__label"
                    placeholder="展示文案"
                    @update:model-value="(v: string) => onSourceRowChange(row.key, { label: v })"
                  />
                  <el-select
                    :model-value="row.color || ''"
                    size="small"
                    class="afp-tagmap__color"
                    placeholder="配色"
                    @update:model-value="(v: string) => onSourceRowChange(row.key, { color: v })"
                  >
                    <el-option
                      v-for="c in SOURCE_COLOR_PRESETS"
                      :key="c.value"
                      :label="c.label"
                      :value="c.value"
                    >
                      <span class="afp-tagmap__dot" :style="{ background: c.bg, color: c.fg }">Aa</span>
                      <span class="afp-tagmap__opt">{{ c.label }}</span>
                    </el-option>
                  </el-select>
                  <el-button
                    text
                    size="small"
                    type="danger"
                    aria-label="删除该渠道"
                    title="删除该渠道"
                    @click="onSourceRowRemove(row.key)"
                  >删</el-button>
                </div>

                <el-button size="small" text type="primary" @click="onSourceRowAdd">+ 添加渠道</el-button>
                <p class="afp-tagmap__tip">
                  渠道 key 决定端上从文章的哪个字段取值（如 <code>wechat_mp</code> = 公众号），
                  改 key 会导致该渠道不再命中，建议只改展示文案与配色
                </p>
              </div>
            </template>
          </el-form>
        </div>

        <!-- 数据健康度：让运营在配错筛选时第一时间看到，而不是画布一片空白 -->
        <div class="afp-health">
          <div class="afp-health__head">
            <span>数据来源</span>
            <span class="afp-health__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇已发布` }}</span>
          </div>
          <div v-if="liveItems.length" class="afp-health__chips">
            <span v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="afp-chip">
              {{ item.title }}
            </span>
          </div>
          <div v-else-if="!liveLoading" class="afp-health__empty">暂无已发布内容</div>
        </div>
      </el-tab-pane>

      <!-- ==================== 样式配置 ==================== -->
      <el-tab-pane label="样式" name="style">
        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">版式形态</span></div>
          <FeedPresetPicker :model-value="layoutPreset" @update:model-value="onPresetPick" />

          <!-- 首篇大图只在「杂志焦点」形态下有意义，其余形态隐藏避免给出无效控件 -->
          <el-form v-if="cfg.layout === 'magazine'" label-width="76px" size="small" class="afp-sec__sub">
            <el-form-item label="首篇大图">
              <el-switch :model-value="cfg.hero_first" @change="(v: boolean) => patch({ hero_first: v })" />
              <FieldHint text="关闭后首篇与其余条目同版式" />
            </el-form-item>
            <el-form-item v-if="cfg.hero_first" label="焦点来源">
              <BuilderSegmented
                :model-value="cfg.hero_source"
                block
                :options="HERO_SOURCE_OPTS"
                aria-label="首篇焦点来源"
                @update:model-value="(v) => patch({ hero_source: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">封面图</span></div>
          <el-form label-width="76px" size="small">
            <!-- 纯文字版式强制隐藏封面，这里直接说明原因而不是给一个无效开关 -->
            <div v-if="hidesCover" class="afp-note">
              当前为「纯文字」版式，封面已强制隐藏。如需封面请切换版式。
            </div>
            <el-form-item v-else label="显示封面">
              <el-switch :model-value="cfg.show_cover" @change="(v: boolean) => patch({ show_cover: v })" />
            </el-form-item>
            <template v-if="cfg.show_cover && !hidesCover">
              <!-- 封面位置只在「左图右文」类版式下有意义 -->
              <el-form-item v-if="supportsCoverPosition" label="封面位置">
                <GridSegmented
                  :model-value="cfg.cover_position"
                  :options="COVER_POSITION_OPTS"
                  aria-label="封面位置"
                  @update:model-value="(v) => patch({ cover_position: v })"
                />
                <FieldHint text="仅对单列列表 / 独立卡片 / 纯文字以外的横向图文版式生效" />
              </el-form-item>
              <el-form-item label="宽高比">
                <BuilderSegmented
                  :model-value="cfg.cover_aspect"
                  block
                  :options="FEED_COVER_ASPECT_OPTIONS"
                  @update:model-value="(v) => patch({ cover_aspect: v })"
                />
              </el-form-item>
              <el-form-item label="圆角">
                <BuilderSegmented
                  :model-value="cfg.cover_radius"
                  block
                  :options="FEED_RADIUS_OPTIONS"
                  @update:model-value="(v) => patch({ cover_radius: Number(v) })"
                />
              </el-form-item>
            </template>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">正文摘要</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="显示摘要">
              <el-switch :model-value="cfg.show_excerpt" @change="(v: boolean) => patch({ show_excerpt: v })" />
            </el-form-item>
            <el-form-item v-if="cfg.show_excerpt" label="截断行数">
              <BuilderSegmented
                :model-value="cfg.excerpt_lines"
                block
                :options="EXCERPT_LINE_OPTIONS"
                @update:model-value="(v) => patch({ excerpt_lines: Number(v) })"
              />
            </el-form-item>
            <el-form-item v-if="cfg.show_excerpt" label="摘要字色">
              <ColorPickerField
                :model-value="cfg.excerpt_color"
                label=""
                default-value="#666666"
                @update:model-value="(v: string) => patch({ excerpt_color: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">专栏 / 话题标签</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="专栏胶囊">
              <el-switch
                :model-value="cfg.show_column_tag"
                @change="(v: boolean) => patch({ show_column_tag: v })"
              />
              <FieldHint text="展示文章所属专栏 / 知识库，如《财税合规专栏》" />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head">
            <span class="afp-sec__title">互动热度</span>
            <span class="afp-sec__hint-inline">可多选</span>
          </div>
          <el-form label-width="76px" size="small">
            <el-form-item label="展示维度">
              <div class="afp-checks">
                <label
                  v-for="m in FEED_METRIC_OPTIONS"
                  :key="m.key"
                  class="afp-check"
                  :class="{ 'is-on': cfg.show_metrics.includes(m.key) }"
                >
                  <input
                    type="checkbox"
                    :checked="cfg.show_metrics.includes(m.key)"
                    @change="toggleMetric(m.key)"
                  />
                  <span>{{ m.label }}</span>
                </label>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head">
            <span class="afp-sec__title">状态角标</span>
            <span class="afp-sec__hint-inline">可多选</span>
          </div>
          <el-form label-width="76px" size="small">
            <el-form-item label="角标类型">
              <div class="afp-checks">
                <label
                  v-for="b in FEED_BADGE_OPTIONS"
                  :key="b.key"
                  class="afp-check"
                  :class="{ 'is-on': cfg.show_badges.includes(b.key) }"
                  :title="b.hint"
                >
                  <input
                    type="checkbox"
                    :checked="cfg.show_badges.includes(b.key)"
                    @change="toggleBadge(b.key)"
                  />
                  <span>{{ b.label }}</span>
                </label>
              </div>
            </el-form-item>
            <el-form-item v-if="cfg.show_badges.length" label="角标位置">
              <GridSegmented
                :model-value="cfg.badge_position"
                :options="BADGE_POSITION_OPTS"
                :cols="3"
                aria-label="角标位置"
                @update:model-value="(v) => patch({ badge_position: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">行动引导</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="阅读全文">
              <el-switch :model-value="cfg.show_cta" @change="(v: boolean) => patch({ show_cta: v })" />
            </el-form-item>
            <el-form-item v-if="cfg.show_cta" label="CTA 文案">
              <el-input
                :model-value="cfg.cta_text"
                placeholder="如：阅读全文 →"
                @update:model-value="(v: string) => patch({ cta_text: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">容器风格与排版</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="分割风格">
              <GridSegmented
                :model-value="cfg.divider_style"
                :options="DIVIDER_STYLE_OPTS"
                aria-label="容器分割风格"
                @update:model-value="(v) => patch({ divider_style: v })"
              />
              <FieldHint text="「独立卡片」需要卡片圆角与内边距；「细分割线」无卡片边框" />
            </el-form-item>
            <el-form-item v-if="cfg.divider_style === 'card'" label="卡片圆角">
              <BuilderSegmented
                :model-value="cfg.cover_radius"
                block
                :options="RADIUS_OPTIONS"
                aria-label="卡片圆角"
                @update:model-value="(v) => patch({ cover_radius: Number(v) })"
              />
            </el-form-item>
            <el-form-item label="标题字号">
              <NumSliderRow
                :model-value="cfg.title_font_size"
                :min="14"
                :max="18"
                :step="1"
                @update:model-value="(v: number) => patch({ title_font_size: v })"
              />
            </el-form-item>
            <el-form-item label="标题加粗">
              <el-switch :model-value="cfg.title_bold" @change="(v: boolean) => patch({ title_bold: v })" />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">元信息与角标</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="发布者">
              <el-switch :model-value="cfg.show_author" @change="(v: boolean) => patch({ show_author: v })" />
              <FieldHint text="在卡片上展示作者头像与名称" />
            </el-form-item>
            <el-form-item label="原创角标">
              <el-switch :model-value="cfg.show_badge" @change="(v: boolean) => patch({ show_badge: v })" />
            </el-form-item>
            <el-form-item label="发布时间">
              <el-switch :model-value="cfg.show_date" @change="(v: boolean) => patch({ show_date: v })" />
            </el-form-item>
            <el-form-item label="互动数据">
              <el-switch :model-value="cfg.show_meta" @change="(v: boolean) => patch({ show_meta: v })" />
              <FieldHint text="展示点赞数与阅读量" />
            </el-form-item>
          </el-form>
        </div>

        <div class="afp-sec">
          <div class="afp-sec__head"><span class="afp-sec__title">排版与间距</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="卡片间距">
              <NumSliderRow
                :model-value="cfg.item_gap"
                :min="ITEM_GAP.min"
                :max="ITEM_GAP.max"
                :step="ITEM_GAP.step"
                @update:model-value="(v: number) => patch({ item_gap: v })"
              />
            </el-form-item>

            <el-form-item label="卡片外边距">
              <NumSliderRow
                :model-value="cfg.card_margin"
                :min="CARD_MARGIN.min"
                :max="CARD_MARGIN.max"
                :step="CARD_MARGIN.step"
                @update:model-value="(v: number) => patch({ card_margin: v })"
              />
            </el-form-item>

            <el-form-item label="标题字号">
              <div class="afp-size">
                <BuilderSegmented
                  :model-value="cfg.title_font_size"
                  :options="TITLE_SIZE_OPTIONS"
                  aria-label="标题字号档位"
                  @update:model-value="(v) => patch({ title_font_size: Number(v) })"
                />
                <el-input-number
                  class="afp-size__num"
                  :model-value="cfg.title_font_size"
                  :min="TITLE_FONT_SIZE.min"
                  :max="TITLE_FONT_SIZE.max"
                  :controls="false"
                  size="small"
                  @change="(v: number | undefined) => patch({ title_font_size: Number(v) })"
                />
                <span class="afp-size__unit">px</span>
              </div>
            </el-form-item>

            <el-form-item label="标题加粗">
              <el-switch :model-value="cfg.title_bold" @change="(v: boolean) => patch({ title_bold: v })" />
            </el-form-item>

            <el-form-item label="辅助字号">
              <NumSliderRow
                :model-value="cfg.subtitle_font_size"
                :min="SUBTITLE_FONT_SIZE.min"
                :max="SUBTITLE_FONT_SIZE.max"
                :step="SUBTITLE_FONT_SIZE.step"
                @update:model-value="(v: number) => patch({ subtitle_font_size: v })"
              />
              <FieldHint text="作用于时间、作者、互动数据等辅助文本" />
            </el-form-item>

            <el-form-item label="辅助颜色">
              <ColorPickerField
                :model-value="cfg.subtitle_color"
                label=""
                default-value="#94a3b8"
                @update:model-value="(v: string) => patch({ subtitle_color: v })"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ComponentType, type ComponentInstance } from '@/types/page'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import ColorPickerField from '../ColorPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import FeedLayoutPicker from '../articleFeed/FeedLayoutPicker.vue'
import FeedPresetPicker from '../articleFeed/FeedPresetPicker.vue'
import GridSegmented from '../GridSegmented.vue'
import FeedPinEditor from '../articleFeed/FeedPinEditor.vue'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { getCategoryList, getContentList } from '@/api/content'
import { getProductList } from '@/api/product'
import {
  CARD_MARGIN,
  FEED_COVER_ASPECT_OPTIONS,
  FEED_LOAD_MODE_OPTIONS,
  FEED_RADIUS_OPTIONS,
  FEED_SCOPE_OPTIONS,
  FEED_SORT_OPTIONS,
  FEED_TAB_STYLE_OPTIONS,
  ITEM_GAP,
  MAX_COUNT,
  PAGE_SIZE,
  SOURCE_COLOR_PRESETS,
  SUBTITLE_FONT_SIZE,
  TITLE_FONT_SIZE,
  TITLE_SIZE_PRESETS,
  normalizeArticleFeedProps,
  hidesCoverInLayout,
  resolveLayoutPreset,
  FEED_PRESET_TO_LAYOUT,
  FEED_BADGE_OPTIONS,
  FEED_METRIC_OPTIONS,
  type ArticleFeedProps,
  type FeedBadgeKey,
  type FeedLayoutPreset,
  type FeedMetricKey,
  type PinnedArticle,
} from '../articleFeed/articleFeedSchema'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const activeTab = ref<'content' | 'style'>('content')

const EXCERPT_LINE_OPTIONS = [
  { value: 1, label: '单行' },
  { value: 2, label: '2 行' },
  { value: 3, label: '3 行' },
]

const TITLE_SIZE_OPTIONS = [
  ...TITLE_SIZE_PRESETS.map((p) => ({ value: p.value, label: p.label })),
]

const SOURCE_POS_OPTIONS = [
  { value: 'title', label: '标题旁' },
  { value: 'meta', label: '日期行' },
  { value: 'cover', label: '封面上' },
]

/* ---- 本轮新增 ---- */
const RADIUS_OPTIONS = FEED_RADIUS_OPTIONS

const COVER_POSITION_OPTS = [
  { value: 'right', label: '封面居右' },
  { value: 'left', label: '封面居左' },
]

const DIVIDER_STYLE_OPTS = [
  { value: 'line', label: '细分割线' },
  { value: 'card', label: '独立卡片' },
]

const BADGE_POSITION_OPTS = [
  { value: 'title', label: '标题旁' },
  { value: 'cover', label: '封面上' },
  { value: 'meta', label: '底部行' },
]

const HERO_SOURCE_OPTS = [
  { value: 'auto', label: '自动取首篇' },
  { value: 'pinned', label: '取置顶首篇' },
  { value: 'fixed', label: '指定头条' },
]

const SOURCE_KEYS = ['wechat_mp', 'xiaohongshu', 'qa', 'original'] as const
const SOURCE_LABEL_MAP: Record<string, string> = {
  wechat_mp: '公众号',
  xiaohongshu: '小红书',
  qa: '问答',
  original: '原创',
}

/** 归一化后的配置：面板展示与写入都以它为准（越界值在此已被夹紧） */
const cfg = computed<ArticleFeedProps>(() => normalizeArticleFeedProps(data))

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/* ---- 最大限制 / 不限制篇数（2026-10-06 解耦） ---- */

/** 勾选态优先读显式字段；老页面没这个字段时从 max_count=0 推导 */
const maxUnlimited = computed(() => cfg.value.max_unlimited === true)

function onMaxUnlimitedChange(next: boolean) {
  if (next) {
    // 勾选不限 → 数字框禁用，底层落 0（端上「0 = 不限」的判定不动）
    patch({ max_unlimited: true, max_count: 0 })
    return
  }
  // 取消勾选 → 给一个有意义的默认值，别留 0（那还是等于不限）
  const fallback = Math.max(Number(cfg.value.page_size || 10), MAX_COUNT.min)
  patch({ max_unlimited: false, max_count: fallback })
}

function onMaxCountChange(v: number | undefined) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    // 输入框被清空/填 0 → 视为「不限」，并同步勾选态（避免两边说法不一致）
    patch({ max_count: 0, max_unlimited: true })
    return
  }
  patch({ max_count: Math.round(n), max_unlimited: false })
}

/**
 * 联动校验（需求点名）：最大限制必须 ≥ 单页条数。
 * 小于的话首屏都填不满，运营会以为「配了没生效」。
 */
const maxCountWarning = computed(() => {
  if (maxUnlimited.value) return ''
  const max = Number(cfg.value.max_count || 0)
  const size = Number(cfg.value.page_size || 0)
  if (max > 0 && size > 0 && max < size) {
    return `最大限制（${max}）小于单页条数（${size}），首屏将加载不满`
  }
  return ''
})

/* ---- 6 大版式（preset ↔ 既有 layout 双向映射） ---- */
const layoutPreset = computed<FeedLayoutPreset>(() => resolveLayoutPreset(cfg.value.layout))

function onPresetPick(preset: FeedLayoutPreset) {
  patch({ layout: FEED_PRESET_TO_LAYOUT[preset] })
}

/** 纯文字版式强制隐藏封面 */
const hidesCover = computed(() => hidesCoverInLayout(cfg.value.layout))

/** 只有横向图文版式才有「封面居左/居右」的意义 */
const supportsCoverPosition = computed(() => {
  const l = cfg.value.layout
  return l === 'list' || l === 'card' || l === 'compact'
})

function toggleMetric(key: FeedMetricKey) {
  const cur = cfg.value.show_metrics
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
  patch({ show_metrics: next })
}

function toggleBadge(key: FeedBadgeKey) {
  const cur = cfg.value.show_badges
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
  // 旧字段 show_badge 同步，保证未升级的端上仍能识别「原创」角标
  patch({ show_badges: next, show_badge: next.length > 0 })
}

/* ---- 来源标签动态映射表（2026-10-06） ---- */

const sourceTagRows = computed(() => cfg.value.source_tag_map || [])

/**
 * 改一行 → 同时写 map 与 legacy source_labels。
 * 🔴 两个字段必须同写：已发布的小程序端只读 source_labels，
 * 只写 map 的话后台看得到、真机仍是旧文案（典型「配了没生效」）。
 */
function commitSourceRows(rows: Array<{ key: string; label: string; color?: string }>) {
  const labels: Record<string, string> = {}
  rows.forEach((r) => {
    if (r.key) labels[r.key] = r.label
  })
  patch({ source_tag_map: rows, source_labels: labels })
}

function onSourceRowChange(key: string, partial: { label?: string; color?: string }) {
  commitSourceRows(
    sourceTagRows.value.map((r) =>
      r.key === key
        ? {
            key: r.key,
            label: partial.label ?? r.label,
            color: partial.color ?? r.color,
          }
        : r,
    ),
  )
}

function onSourceRowAdd() {
  // 新渠道默认给一个不冲突的占位 key，运营改文案即可用；
  // key 决定端上取哪个字段，占位 key 不会命中任何数据（等于「先加行再填 key」）
  let n = sourceTagRows.value.length + 1
  let key = `custom_${n}`
  const exists = new Set(sourceTagRows.value.map((r) => r.key))
  while (exists.has(key)) {
    n += 1
    key = `custom_${n}`
  }
  commitSourceRows([...sourceTagRows.value, { key, label: '新渠道', color: 'gray' }])
}

function onSourceRowRemove(key: string) {
  commitSourceRows(sourceTagRows.value.filter((r) => r.key !== key))
}

function patchSourceLabel(key: string, value: string) {
  patch({ source_labels: { ...cfg.value.source_labels, [key]: value } })
}

/* ---------------- 数据健康度 ---------------- */
const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-article-feed',
  type: ComponentType.ArticleFeed,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

/* ---------------- 分类 / 专栏下拉 ---------------- */
const categories = ref<Array<{ id: number; name: string }>>([])
const categoryLoading = ref(false)
const columns = ref<Array<{ id: number; name: string }>>([])
const columnLoading = ref(false)

async function loadCategories() {
  if (cfg.value.scope !== 'category') return
  categoryLoading.value = true
  try {
    const res = await getCategoryList({ status: 'enabled' } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    categories.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || '未命名'),
    }))
  } catch {
    categories.value = []
  } finally {
    categoryLoading.value = false
  }
}

async function searchColumns(query: string) {
  columnLoading.value = true
  try {
    const res = await getProductList({
      current: 1,
      size: 30,
      keyword: query || undefined,
      productType: 'column',
    } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    columns.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || `专栏 ${r.id}`),
    }))
  } catch {
    columns.value = []
  } finally {
    columnLoading.value = false
  }
}

onMounted(() => {
  void loadCategories()
  void searchColumns('')
})
</script>

<style lang="scss" scoped>
.afp-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.afp-sec {
  margin-bottom: 16px;
}

.afp-sec__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.afp-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

.afp-inline {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.afp-inline__unit {
  flex: none;
  font-size: 11px;
  color: #94a3b8;
}

.afp-size {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.afp-size__num {
  width: 58px;
  flex: none;
}

.afp-size__unit {
  flex: none;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.afp-size__num .el-input__inner) {
  padding-right: 4px;
  padding-left: 8px;
  text-align: right;
}

/* ---------- 数据健康度 ---------- */
.afp-health {
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.afp-health__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.afp-health__count {
  font-weight: 500;
  color: var(--color-primary);
}

.afp-health__chips {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.afp-chip {
  /* min-width:0 + 省略，避免长标题把卡片撑破（flex 子项默认 min-width:auto） */
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

.afp-health__empty {
  font-size: 11px;
  color: #7b8798;
}

/* ---------- 多选开关组（互动维度 / 状态角标） ---------- */
.afp-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.afp-check {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  color: #5a6478;
  cursor: pointer;
  background: #f6f8fb;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.afp-check input {
  margin: 0;
  cursor: pointer;
}

.afp-check:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #f3f0ea);
}

.afp-check.is-on {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary) 40%, #fff);
}

.afp-sec__hint-inline {
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 版式形态下的从属表单 ---------- */
.afp-sec__sub {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed #e8e2d9;
}

/* ---------- 纯文字版式的封面说明 ---------- */
.afp-note {
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 11px;
  color: #8a7a68;
  line-height: 1.5;
  background: #fbf7f1;
  border: 1px solid #efe6da;
  border-radius: 8px;
}

/* ---------------- 来源标签动态映射表 + 校验警告（2026-10-06） ---------------- */

/* 联动校验警告：琥珀色一行字，不做成 alert 以免占高 */
.afp-warn {
  margin: 3px 0 0;
  color: #b45309;
  font-size: 11px;
  line-height: 1.4;
}

.afp-tagmap { display: flex; flex-direction: column; gap: 5px; }

.afp-tagmap__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 26px;
  gap: 5px;
  align-items: center;
}

.afp-tagmap__label { min-width: 0; }
.afp-tagmap__color { min-width: 0; }

/* 配色下拉里的色样 */
.afp-tagmap__dot {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 16px;
  margin-right: 6px;
  font-size: 10px;
  border-radius: 4px;
  vertical-align: middle;
}
.afp-tagmap__opt { vertical-align: middle; }

.afp-tagmap__tip {
  margin: 1px 0 0;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.45;
}
.afp-tagmap__tip code {
  padding: 0 3px;
  color: #64748b;
  font-size: 10.5px;
  background: #f1f5f9;
  border-radius: 3px;
}

</style>
