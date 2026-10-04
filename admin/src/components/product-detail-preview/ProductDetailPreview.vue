<template>
  <div class="pdp">
    <div class="pdp__bar">
      <span class="pdp__title">{{ templateMeta ? `${templateMeta.groupLabel} · ${templateMeta.label}` : '自动判断' }}</span>
      <span class="pdp__hint">{{ templateMeta ? templateMeta.intent : '按商品类型自动选 *_classic' }}</span>
    </div>
    <div class="pdp__phone">
      <div class="pdp__screen">
        <div class="pdp__statusbar"><span>9:41</span><span class="pdp__sb-r">●●●</span></div>

        <!-- 专栏 column -->
        <template v-if="group === 'column'">
          <!-- column_classic -->
          <div v-if="templateId === 'column_classic'" class="pv pv-col pv-col--classic">
            <div class="pv__cover pv__cover--lg"><span class="pv__back">‹</span><span class="pv__tag">连载中</span><span class="pv__ctitle">{{ name || '课程标题' }}</span></div>
            <div class="pv__price pv__price--cd"><b>¥{{ price || '99' }}</b><span class="pv__cd">早鸟价剩余 02 天</span></div>
            <div class="pv__teacher"><div class="pv__ava"></div><div><b>讲师名</b><span class="pv__muted">资深从业者</span></div></div>
            <div class="pv__segs"><span class="pv__seg pv__seg--on">目录</span><span class="pv__seg">评价</span><span class="pv__seg">FAQ</span></div>
            <div class="pv__ch"><div v-for="n in 4" :key="n" class="pv__ch-li"><span class="pv__ch-no">{{ n }}</span><span class="pv__ch-tx">第 {{ n }} 章 标题</span><span class="pv__ch-ico">▶</span></div></div>
            <div class="pv__cta">立即加入</div>
          </div>
          <!-- column_compact -->
          <div v-else-if="templateId === 'column_compact'" class="pv pv-col pv-col--compact">
            <div class="pv__topbar"><span class="pv__back">‹</span><span class="pv__topbar-t">课程详情</span></div>
            <div class="pv__compact-head"><div class="pv__cover pv__cover--sm"></div><div class="pv__compact-info"><b>{{ name || '课程标题' }}</b><span class="pv__price-inline">¥{{ price || '99' }} <s>¥199</s></span></div></div>
            <div class="pv__ch pv__ch--tight"><div v-for="n in 6" :key="n" class="pv__ch-li"><span class="pv__ch-no">{{ n }}</span><span class="pv__ch-tx">第 {{ n }} 章 标题</span><span class="pv__ch-ico">▶</span></div></div>
            <div class="pv__cta">立即加入</div>
          </div>
          <!-- column_story -->
          <div v-else class="pv pv-col pv-col--story">
            <div class="pv__cover pv__cover--full"><span class="pv__back">‹</span><div class="pv__story-bd"><span class="pv__ctitle warm">{{ name || '课程标题' }}</span><span class="pv__muted on-dark">向下滚动看章节</span></div></div>
            <div class="pv__story-intro"><p>这是一段课程引言，建立故事氛围，弱化营销元素。</p></div>
            <div class="pv__ch"><div v-for="n in 3" :key="n" class="pv__ch-card"><span class="pv__muted">第 {{ n }} 章</span><b>章节标题</b><span class="pv__muted">时长 12:30</span></div></div>
            <div class="pv__cta pv__cta--ghost">开始学习</div>
          </div>
        </template>

        <!-- 电子书 ebook -->
        <template v-else-if="group === 'ebook'">
          <!-- ebook_classic -->
          <div v-if="templateId === 'ebook_classic'" class="pv pv-eb pv-eb--classic">
            <div class="pv__cover pv__cover--book"><span class="pv__back">‹</span><div class="pv__book"></div></div>
            <div class="pv__eb-tt"><b class="warm">{{ name || '电子书标题' }}</b><span class="pv__muted">作者 · 12 章</span></div>
            <div class="pv__price pv__price--cd"><b>¥{{ price || '49' }}</b><span class="pv__cd">首发价剩余 02:14</span></div>
            <div class="pv__try"><div class="pv__try-h">免费试读</div><div class="pv__try-bar"><i></i></div><span class="pv__muted">已试读 3/12 章</span></div>
            <div class="pv__toc"><div v-for="n in 4" :key="n" class="pv__toc-li"><span>{{ n }}.</span><span>章节标题</span><span class="pv__muted">可试读</span></div></div>
            <div class="pv__cta">购买后继续阅读</div>
          </div>
          <!-- ebook_reader -->
          <div v-else-if="templateId === 'ebook_reader'" class="pv pv-eb pv-eb--reader">
            <div class="pv__topbar"><span class="pv__back">‹</span><span class="pv__topbar-t">{{ name || '电子书标题' }}</span></div>
            <div class="pv__reader-cover"><div class="pv__book pv__book--md"></div></div>
            <div class="pv__reader-tt"><b>{{ name || '电子书标题' }}</b><span class="pv__muted">12 章 · 约 4 小时</span></div>
            <div class="pv__price-inline">¥{{ price || '49' }}</div>
            <div class="pv__toc pv__toc--plain"><div v-for="n in 8" :key="n" class="pv__toc-li"><span>{{ n }}.</span><span>章节标题</span></div></div>
            <div class="pv__cta pv__cta--ghost">开始阅读</div>
          </div>
          <!-- ebook_showcase -->
          <div v-else class="pv pv-eb pv-eb--showcase">
            <div class="pv__cover pv__cover--center"><span class="pv__back">‹</span><div class="pv__book pv__book--lg"></div></div>
            <div class="pv__showcase-tt"><b class="warm">{{ name || '电子书标题' }}</b></div>
            <div class="pv__gain-stack"><div v-for="n in 3" :key="n" class="pv__gain-card"><b>卖点 {{ n }}</b><span class="pv__muted">一句话描述</span></div></div>
            <div class="pv__rv-wall"><div v-for="n in 2" :key="n" class="pv__rv"><div class="pv__ava pv__ava--sm"></div><div><b>读者</b><span class="pv__muted">很有收获</span></div></div></div>
            <div class="pv__cta">立即获取</div>
          </div>
        </template>

        <!-- 虚拟资料包 digital -->
        <template v-else-if="group === 'digital'">
          <!-- digital_classic -->
          <div v-if="templateId === 'digital_classic'" class="pv pv-dg pv-dg--classic">
            <div class="pv__cover pv__cover--video"><span class="pv__back">‹</span><span class="pv__play">▶</span><span class="pv__badge">视频</span></div>
            <div class="pv__eb-tt"><b class="warm">{{ name || '资料包标题' }}</b></div>
            <div class="pv__price"><b>¥{{ price || '19.9' }}</b></div>
            <div class="pv__gains"><div class="pv__gains-h">你将获得</div><div class="pv__gains-card"><div v-for="n in 3" :key="n" class="pv__gains-li">· 权益 {{ n }}</div></div></div>
            <div class="pv__notice">虚拟商品说明</div>
            <div class="pv__cta">立即购买</div>
          </div>
          <!-- digital_checklist -->
          <div v-else-if="templateId === 'digital_checklist'" class="pv pv-dg pv-dg--checklist">
            <div class="pv__cover pv__cover--sm"></div>
            <div class="pv__checklist-h"><b class="warm">{{ name || '资料包标题' }}</b><div class="pv__price-inline">¥{{ price || '19.9' }}</div></div>
            <div class="pv__checklist"><div class="pv__checklist-card"><div v-for="n in 6" :key="n" class="pv__check-li"><span class="pv__check">✓</span><span>清单项 {{ n }}</span></div></div></div>
            <div class="pv__spec-tight"><span>格式</span><b>PDF+视频</b></div>
            <div class="pv__cta">立即获取</div>
          </div>
          <!-- digital_video -->
          <div v-else class="pv pv-dg pv-dg--video">
            <div class="pv__cover pv__cover--video pv__cover--fullvideo"><span class="pv__back">‹</span><span class="pv__play pv__play--lg">▶</span><span class="pv__video-sub">卖点字幕一句话</span></div>
            <div class="pv__video-meta"><b class="warm">{{ name || '资料包标题' }}</b></div>
            <div class="pv__cta pv__cta--bottom">¥{{ price || '19.9' }} 立即购买</div>
          </div>
        </template>

        <!-- 实物 physical -->
        <template v-else>
          <!-- physical_classic -->
          <div v-if="templateId === 'physical_classic'" class="pv pv-ph pv-ph--classic">
            <div class="pv__swiper"><span class="pv__back">‹</span><div class="pv__dots"><i class="on"></i><i></i><i></i></div></div>
            <div class="pv__ph-tt"><b>{{ name || '商品标题' }}</b><span class="pv__muted">已售 128 · 库存 50</span></div>
            <div class="pv__price"><b>¥{{ price || '88' }}</b><span class="pv__price-tag">券后</span><span class="pv__price-tag">会员价 ¥78</span></div>
            <div class="pv__picks"><div class="pv__pick"><span>规格</span><b>请选择</b><i>›</i></div><div class="pv__pick"><span>优惠券</span><b>领取</b><i>›</i></div><div class="pv__pick"><span>服务</span><b>快递发货</b><i>›</i></div></div>
            <div class="pv__rich">商品详情（富文本长图）</div>
            <div class="pv__review">用户评价 4.8 分 · 128 条</div>
            <div class="pv__ph-cta"><span class="pv__cta pv__cta--ghost">加购物车</span><span class="pv__cta">立即购买</span></div>
          </div>
          <!-- physical_minimal -->
          <div v-else-if="templateId === 'physical_minimal'" class="pv pv-ph pv-ph--minimal">
            <div class="pv__cover pv__cover--single"><span class="pv__back">‹</span></div>
            <div class="pv__min-tt"><b>{{ name || '商品标题' }}</b></div>
            <div class="pv__price pv__price--xl">¥{{ price || '88' }}</div>
            <div class="pv__pick"><span>规格</span><b>请选择</b><i>›</i></div>
            <div class="pv__min-desc">短描述，无长图。</div>
            <div class="pv__cta">立即购买</div>
          </div>
          <!-- physical_story -->
          <div v-else class="pv pv-ph pv-ph--story">
            <div class="pv__cover pv__cover--full"><span class="pv__back">‹</span><div class="pv__story-bd"><span class="pv__ctitle warm">{{ name || '商品标题' }}</span><span class="pv__muted on-dark">向下滚动看故事</span></div></div>
            <div class="pv__story-intro"><p>这是商品故事引言段落。</p><p>第二段品牌背景。</p></div>
            <div class="pv__rich pv__rich--story">rich-text 长图文（产品工艺、原料溯源、用户故事）</div>
            <div class="pv__cta pv__cta--bottom">¥{{ price || '88' }} 立即购买</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { findTemplate, type ProductDetailTemplate } from '@/utils/product-templates'

const props = defineProps<{
  /** 已解析的模板 ID（空 = 自动判断，按 productType 推断） */
  templateId: string
  /** 商品名（预览用真实数据） */
  name?: string
  /** 售价 */
  price?: string | number
}>()

const templateMeta = computed<ProductDetailTemplate | null>(() => findTemplate(props.templateId))
const group = computed(() => templateMeta.value?.group || 'physical')
</script>

<style scoped lang="scss">
.pdp {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pdp__bar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  background: #f8f5f0;
  border: 1px solid #ecd9c8;
  border-radius: 8px;
}

.pdp__title {
  color: #6b4a2b;
  font-size: 12px;
  font-weight: 600;
}

.pdp__hint {
  color: #9a8775;
  font-size: 11px;
  line-height: 1.4;
}

.pdp__phone {
  align-self: center;
  width: 280px;
  padding: 8px;
  background: #1f1f1f;
  border-radius: 22px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.pdp__screen {
  position: relative;
  height: 460px;
  overflow-y: auto;
  background: #fff;
  border-radius: 14px;
}

.pdp__statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 18px;
  padding: 0 10px;
  color: #999;
  font-size: 10px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.pdp__sb-r {
  font-size: 8px;
  letter-spacing: 1px;
}

/* 通用预览元素 */
.pv {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.pv__back {
  position: absolute;
  top: 22px;
  left: 8px;
  z-index: 2;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
}

.pv__cover {
  position: relative;
  background: linear-gradient(135deg, #d9c4ae, #c08e6e);
}

.pv__cover--lg {
  height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
}

.pv__cover--sm {
  height: 70px;
  width: 70px;
  border-radius: 6px;
  flex-shrink: 0;
}

.pv__cover--full,
.pv__cover--fullvideo {
  height: 220px;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  background: linear-gradient(160deg, #6b4a2b, #3c2818);
}

.pv__cover--book {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv__cover--center {
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv__cover--single {
  height: 200px;
}

.pv__cover--video {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv__tag {
  display: inline-block;
  width: fit-content;
  padding: 2px 8px;
  margin-bottom: 4px;
  color: #fff;
  font-size: 10px;
  background: rgba(192, 142, 110, 0.85);
  border-radius: 10px;
}

.pv__ctitle {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.warm {
  color: #c08e6e;
}

.pv__story-bd {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pv__muted {
  color: #9a8775;
  font-size: 11px;
}

.pv__muted.on-dark {
  color: rgba(255, 255, 255, 0.75);
}

.pv__price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 12px;
  color: #c08e6e;
  font-size: 13px;
}

.pv__price b {
  font-size: 18px;
}

.pv__price--cd {
  align-items: center;
  justify-content: space-between;
  background: #fdf6ec;
}

.pv__cd {
  color: #b45309;
  font-size: 10px;
}

.pv__price-inline {
  color: #c08e6e;
  font-size: 14px;
  font-weight: 600;
}

.pv__price-inline s {
  color: #bbb;
  font-size: 11px;
  font-weight: 400;
}

.pv__price--xl {
  padding: 6px 12px;
  font-size: 22px;
}

.pv__price-tag {
  padding: 1px 6px;
  color: #fff;
  font-size: 9px;
  background: #c08e6e;
  border-radius: 8px;
}

.pv__teacher {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #f5f0ea;
}

.pv__ava {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e9d9c8;
  flex-shrink: 0;
}

.pv__ava--sm {
  width: 18px;
  height: 18px;
}

.pv__teacher b,
.pv__compact-info b {
  font-size: 12px;
}

.pv__segs {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f0ea;
}

.pv__seg {
  color: #9a8775;
  font-size: 12px;
}

.pv__seg--on {
  color: #c08e6e;
  font-weight: 600;
  border-bottom: 2px solid #c08e6e;
  padding-bottom: 4px;
}

.pv__ch {
  padding: 6px 12px;
}

.pv__ch--tight {
  padding: 4px 12px;
}

.pv__ch-li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f5f0ea;
}

.pv__ch-no {
  color: #bbb;
  font-size: 11px;
}

.pv__ch-tx {
  flex: 1;
  font-size: 12px;
}

.pv__ch-ico {
  color: #c08e6e;
  font-size: 11px;
}

.pv__ch-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  margin: 4px 0;
  background: #faf6f1;
  border-radius: 8px;
}

.pv__cta {
  margin-top: auto;
  padding: 10px;
  text-align: center;
  color: #fff;
  font-size: 13px;
  background: #c08e6e;
}

.pv__cta--ghost {
  color: #c08e6e;
  background: #fff;
  border: 1px solid #c08e6e;
}

.pv__cta--bottom {
  position: sticky;
  bottom: 0;
}

.pv__topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.pv__topbar-t {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
}

.pv__compact-head {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
}

.pv__compact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.pv__story-intro {
  padding: 10px 12px;
  color: #5a4a3a;
  font-size: 11px;
  line-height: 1.6;
}

.pv__book {
  width: 56px;
  height: 78px;
  background: #c08e6e;
  border-radius: 3px;
  box-shadow: 2px 2px 0 #a06b4a;
}

.pv__book--md {
  width: 70px;
  height: 96px;
}

.pv__book--lg {
  width: 90px;
  height: 124px;
  box-shadow: 3px 3px 0 #a06b4a;
}

.pv__eb-tt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
}

.pv__eb-tt b {
  font-size: 13px;
}

.pv__try {
  padding: 8px 12px;
  background: #faf6f1;
}

.pv__try-h {
  color: #6b4a2b;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.pv__try-bar {
  height: 4px;
  background: #ecd9c8;
  border-radius: 2px;
  overflow: hidden;
}

.pv__try-bar i {
  display: block;
  width: 25%;
  height: 100%;
  background: #c08e6e;
}

.pv__toc {
  padding: 6px 12px;
}

.pv__toc--plain {
  border-top: 1px solid #f5f0ea;
}

.pv__toc-li {
  display: flex;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid #f5f0ea;
  font-size: 11px;
}

.pv__toc-li span:first-child {
  color: #bbb;
}

.pv__toc-li span:nth-child(2) {
  flex: 1;
}

.pv__toc-li .pv__muted {
  font-size: 10px;
}

.pv__reader-cover {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

.pv__reader-tt {
  text-align: center;
  padding: 4px 12px;
}

.pv__reader-tt b {
  font-size: 13px;
}

.pv__showcase-tt {
  text-align: center;
  padding: 8px 12px;
  font-size: 13px;
}

.pv__gain-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 12px;
}

.pv__gain-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: #faf6f1;
  border-radius: 6px;
}

.pv__gain-card b {
  font-size: 11px;
  color: #6b4a2b;
}

.pv__rv-wall {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}

.pv__rv {
  display: flex;
  gap: 6px;
  align-items: center;
}

.pv__rv b {
  font-size: 11px;
}

.pv__gains {
  padding: 6px 12px;
}

.pv__gains-h {
  color: #6b4a2b;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.pv__gains-card {
  background: #faf6f1;
  border-radius: 6px;
  padding: 6px 8px;
}

.pv__gains-li {
  color: #5a4a3a;
  font-size: 11px;
  padding: 2px 0;
}

.pv__notice {
  margin: 6px 12px;
  padding: 4px 8px;
  color: #9a8775;
  font-size: 10px;
  background: #faf6f1;
  border-radius: 4px;
}

.pv__checklist-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 4px;
}

.pv__checklist {
  padding: 4px 12px;
}

.pv__checklist-card {
  background: #faf6f1;
  border-radius: 8px;
  padding: 8px;
}

.pv__check-li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 11px;
}

.pv__check {
  color: #c08e6e;
  font-weight: 600;
}

.pv__spec-tight {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 11px;
  color: #9a8775;
  border-top: 1px solid #f5f0ea;
}

.pv__video-meta {
  padding: 8px 12px;
}

.pv__video-meta b {
  font-size: 13px;
}

.pv__play {
  color: #fff;
  font-size: 24px;
}

.pv__play--lg {
  font-size: 36px;
}

.pv__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 1px 6px;
  color: #fff;
  font-size: 9px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.pv__video-sub {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  color: #fff;
  font-size: 11px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.pv__swiper {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #e9d9c8, #c08e6e);
}

.pv__dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.pv__dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.pv__dots i.on {
  background: #fff;
}

.pv__ph-tt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
}

.pv__ph-tt b {
  font-size: 13px;
}

.pv__picks {
  padding: 4px 12px;
  border-top: 1px solid #f5f0ea;
}

.pv__pick {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f5f0ea;
  font-size: 11px;
}

.pv__pick span {
  color: #9a8775;
  width: 40px;
}

.pv__pick b {
  flex: 1;
  color: #5a4a3a;
  font-weight: 400;
}

.pv__pick i {
  color: #ccc;
}

.pv__rich {
  margin: 6px 12px;
  padding: 20px 8px;
  text-align: center;
  color: #bbb;
  font-size: 10px;
  background: #faf6f1;
  border-radius: 4px;
}

.pv__rich--story {
  padding: 40px 8px;
}

.pv__review {
  padding: 8px 12px;
  color: #9a8775;
  font-size: 11px;
  border-top: 1px solid #f5f0ea;
}

.pv__ph-cta {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding: 8px 10px;
}

.pv__ph-cta .pv__cta {
  flex: 1;
  margin-top: 0;
  padding: 8px;
}

.pv__min-tt {
  padding: 10px 12px 4px;
  font-size: 14px;
}

.pv__min-desc {
  padding: 6px 12px;
  color: #9a8775;
  font-size: 11px;
}
</style>
