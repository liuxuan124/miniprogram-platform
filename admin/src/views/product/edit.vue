<template>
  <div class="product-editor-page">
    <div class="product-editor-wrap">
      <header class="page-header">
        <div class="page-title-wrap">
          <el-button class="back-icon-btn" :icon="Back" circle aria-label="返回" @click="goBack" />
          <div>
            <div class="page-breadcrumb">商城管理 / 商品管理</div>
            <h1>{{ isEdit ? '编辑商品' : '新增商品' }}</h1>
          </div>
        </div>
        <div class="page-actions">
          <span v-if="hasUnsavedChanges" class="draft-pill">未保存</span>
          <span v-if="lastAutoSaveTime" class="autosave-text">自动保存 {{ formatTime(lastAutoSaveTime) }}</span>
          <el-button class="ghost-btn" @click="goBack">返回列表</el-button>
        </div>
      </header>

      <el-form
        id="product-form"
        ref="formRef"
        class="editor-form"
        :model="formData"
        :rules="formRules"
        label-position="top"
        v-loading="pageLoading"
      >
        <nav class="anchor-nav" aria-label="商品编辑分区导航">
          <div class="anchor-nav__progress" :style="{ width: `${completionPercent}%` }" />
          <button
            v-for="step in stepItems"
            :key="step.key"
            type="button"
            class="anchor-nav__item"
            :class="{ active: currentStepKey === step.key }"
            :aria-current="currentStepKey === step.key ? 'true' : undefined"
            @click="scrollToStep(step.target, step.key)"
          >
            <span class="anchor-nav__idx">{{ step.no }}</span>
            <span class="anchor-nav__label">{{ step.label }}</span>
            <span v-if="step.done" class="anchor-nav__done" aria-hidden="true">✓</span>
          </button>
        </nav>

        <div class="editor-layout">
          <main class="editor-main">
            <section id="section-basic" class="section-card">
              <div class="section-head">
                <div>
                  <h2>基础信息</h2>
                  <p>决定商品在列表、详情和订单中的基础展示。</p>
                </div>
              </div>

              <div class="basic-form-grid">
                <el-form-item id="field-name" label="商品名称" prop="name" class="span-all">
                  <el-input v-model="formData.name" placeholder="例如：药食同源甄选礼盒" maxlength="100" show-word-limit />
                </el-form-item>

                <div class="meta-row span-all">
                  <el-form-item id="field-category" label="商品分类" prop="category_id">
                    <el-tree-select
                      v-model="formData.category_id"
                      :data="categoryOptions"
                      :props="{ label: 'name', value: 'id', children: 'children' }"
                      placeholder="选择分类"
                      check-strictly
                      style="width: 100%"
                    />
                  </el-form-item>

                  <el-form-item label="排序">
                    <el-input-number v-model="formData.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
                  </el-form-item>

                  <el-form-item label="关联作者" class="meta-row__author">
                    <template #label>
                      关联作者
                      <FieldHint text="关联后可在作者档案里按作者查/管这个商品（含付费专栏）。仅后台管理用，不影响小程序渲染。" />
                    </template>
                    <el-select
                      v-model="formData.author_id"
                      placeholder="不关联"
                      clearable
                      filterable
                      style="width: 100%"
                    >
                      <el-option
                        v-for="a in authorOptions"
                        :key="a.id"
                        :label="a.name || '未命名'"
                        :value="a.id"
                      />
                    </el-select>
                  </el-form-item>
                </div>

                <el-form-item id="field-shape" prop="productShape" class="span-all">
                  <template #label>
                    商品形态
                    <FieldHint text="决定履约与库存口径，全局只能选一个：实物需要物流与库存；数字线上交付、不校验库存；服务是到店/履约型；会员套餐开通付费档订购。" />
                  </template>
                  <div v-if="!formData.category_id" class="form-tip">请先选择商品分类，再选择商品形态</div>
                  <div v-else-if="!formShapeOptions.length" class="form-tip">当前分类未配置允许类型，请先在分类管理中设置</div>
                  <div v-else class="pick-grid">
                    <button
                      v-for="t in formShapeOptions"
                      :key="t.value"
                      type="button"
                      class="pick-card"
                      :class="{ active: formData.productShape === t.value }"
                      :disabled="!allowedTypeValues.includes(t.value)"
                      :aria-pressed="formData.productShape === t.value"
                      @click="setProductShape(t.value)"
                    >
                      <span class="pick-card__icon">{{ t.icon }}</span>
                      <span class="pick-card__body">
                        <span class="pick-card__title">{{ t.label }}</span>
                        <span class="pick-card__hint">{{ t.hint }}</span>
                      </span>
                      <span class="pick-card__check" aria-hidden="true" />
                    </button>
                  </div>
                </el-form-item>

                <el-form-item v-if="showCarrierField" prop="productTypes" class="span-all">
                  <template #label>
                    内容载体
                    <FieldHint text="只描述「交付什么」，可多选；不影响「怎么交付」（那由下方交付方式决定）。" />
                  </template>
                  <div v-if="!carrierOptions.length" class="form-tip">当前分类未配置载体细分类</div>
                  <div v-else class="pick-grid">
                    <button
                      v-for="t in carrierOptions"
                      :key="t.value"
                      type="button"
                      class="pick-card pick-card--compact"
                      :class="{ active: carrierTypes.includes(t.value) }"
                      :aria-pressed="carrierTypes.includes(t.value)"
                      @click="toggleCarrier(t.value)"
                    >
                      <span class="pick-card__icon">{{ t.icon }}</span>
                      <span class="pick-card__body">
                        <span class="pick-card__title">{{ t.label }}</span>
                      </span>
                      <span class="pick-card__check" aria-hidden="true" />
                    </button>
                  </div>
                </el-form-item>

                <el-form-item v-if="typeConflictHint" class="span-all">
                  <div class="conflict-hint">
                    <el-icon><WarningFilled /></el-icon>
                    <span>{{ typeConflictHint }}</span>
                  </div>
                </el-form-item>

                <div class="meta-row meta-row--2 span-all">
                  <el-form-item label="详情模板">
                    <template #label>
                      详情模板
                      <FieldHint :text="`留空 = 按商品类型自动选经典版；选指定模板则覆盖自动分流。当前生效：${resolvedDetailTemplateLabel}。手机效果见右侧「详情预览」。`" />
                    </template>
                    <el-select
                      v-model="formData.detail_template"
                      placeholder="自动判断（按商品类型）"
                      clearable
                      style="width: 100%"
                    >
                      <el-option-group v-for="g in PRODUCT_DETAIL_TEMPLATE_GROUPS" :key="g.group" :label="g.label">
                        <el-option
                          v-for="t in PRODUCT_DETAIL_TEMPLATES.filter((x) => x.group === g.group)"
                          :key="t.id"
                          :label="t.label"
                          :value="t.id"
                        />
                      </el-option-group>
                    </el-select>
                  </el-form-item>

                  <el-form-item label="退款政策">
                    <template #label>
                      退款政策
                      <FieldHint text="仅作端上展示与售后口径参考，实际退款仍走订单流程人工判定。" />
                    </template>
                    <el-select v-model="formData.refundPolicy" style="width: 100%">
                      <el-option label="不支持退款" value="none" />
                      <el-option label="阅读前可退" value="before_read" />
                      <el-option label="七天无理由" value="seven_days" />
                    </el-select>
                  </el-form-item>
                </div>

                <template v-if="canAutoFulfill">
                  <el-form-item id="field-delivery-mode" class="span-all">
                    <template #label>
                      交付方式
                      <FieldHint :text="deliveryModeHint" />
                    </template>
                    <div class="pick-grid">
                      <button
                        v-for="opt in deliveryModeOptions"
                        :key="opt.value"
                        type="button"
                        class="pick-card"
                        :class="{ active: formData.deliveryMode === opt.value }"
                        :aria-pressed="formData.deliveryMode === opt.value"
                        @click="formData.deliveryMode = opt.value"
                      >
                        <span class="pick-card__body">
                          <span class="pick-card__title">{{ opt.label }}</span>
                          <span class="pick-card__hint">{{ opt.hint }}</span>
                        </span>
                        <span class="pick-card__check" aria-hidden="true" />
                      </button>
                    </div>
                  </el-form-item>

                  <el-form-item class="span-all">
                    <template #label>
                      自动发货
                      <FieldHint text="开启后支付成功即自动履约，并把「发货内容」推给用户。人工履约模式下不生效。" />
                    </template>
                    <el-switch
                      v-model="formData.autoFulfill"
                      :active-value="1"
                      :inactive-value="0"
                      :disabled="formData.deliveryMode === 'manual'"
                    />
                    <div v-if="formData.autoFulfill === 1" class="form-inline-note">
                      支付成功即自动交付，无需人工介入。
                    </div>
                    <div v-else-if="formData.deliveryMode === 'manual'" class="form-inline-note">
                      人工履约：付款后需人工发送兑换指引，系统不会自动发货。
                    </div>
                  </el-form-item>

                  <el-form-item v-if="formData.autoFulfill === 1" id="field-fulfill" label="发货内容" class="span-all">
                    <el-input
                      v-model="formData.fulfillContent"
                      type="textarea"
                      :rows="4"
                      placeholder="直出链接 / 卡密 / 兑换码 / 权限开通结果等，支付成功后原样展示给用户"
                    />
                    <div v-if="fulfillConflict" class="conflict-hint conflict-hint--danger">
                      <el-icon><WarningFilled /></el-icon>
                      <span>
                        {{ fulfillConflict }}
                        <el-button class="link-fix-btn" type="primary" link @click="fixFulfillConflict">一键改为人工履约</el-button>
                      </span>
                    </div>
                    <div v-else class="form-tip">
                      这里的内容会被当成「已交付」直接推给用户，请只写用户能立刻拿到的东西（链接、卡密、密码、权限结果）。
                    </div>
                  </el-form-item>
                </template>

                <el-form-item v-if="formData.deliveryMode === 'manual'" class="span-all">
                  <div class="guide-card-note">
                    <el-icon><InfoFilled /></el-icon>
                    <div>
                      <b>支付成功页会展示《开通指引卡片》，状态文案为「已生成开通凭证」</b>，不会显示成「已自动发货」。
                      上面这段「发货内容」会作为指引正文原样推给用户，请写清：加什么、发什么给谁、多久能好、找谁兜底。
                    </div>
                  </div>
                </el-form-item>

                <el-form-item v-if="showPreviewChapters" label="试读章数">
                  <template #label>
                    试读章数
                    <FieldHint text="电子书 / 专栏的免费试读章节数，0 表示不开放试读。" />
                  </template>
                  <el-input-number v-model="formData.previewChapters" :min="0" :max="999" controls-position="right" />
                </el-form-item>
              </div>
            </section>

            <section id="section-assets" class="section-card asset-card">
              <div class="section-head">
                <div>
                  <h2>素材媒体</h2>
                  <p>图片统一放在一个池子里：第 1 张自动是主图（列表封面 + 分享卡片），拖拽可排序，卡片菜单可改主图或删除。</p>
                </div>
              </div>

              <div class="basic-form-grid">
                <el-form-item label="图片池" prop="main_image" class="span-all">
                  <div class="media-pool">
                    <div class="media-grid">
                      <div
                        v-for="(img, idx) in formData.images"
                        :key="`${img}-${idx}`"
                        class="media-cell"
                        :class="{ 'is-main': idx === 0 }"
                        draggable="true"
                        @dragstart="handleGalleryDragStart(idx)"
                        @dragover.prevent
                        @drop="handleGalleryDrop(idx)"
                        @dragend="handleGalleryDragEnd"
                      >
                        <el-image :src="img" fit="cover" />
                        <span v-if="idx === 0" class="media-cell__badge">主图 / 封面</span>
                        <span v-else class="media-cell__index">{{ idx + 1 }}</span>

                        <div class="media-cell__mask" />
                        <div class="media-cell__actions">
                          <el-dropdown trigger="click" @command="onMediaCommand($event, idx)">
                            <el-button class="media-cell__menu" circle size="small" text aria-label="图片操作">
                              <el-icon><MoreFilled /></el-icon>
                            </el-button>
                            <template #dropdown>
                              <el-dropdown-menu>
                                <el-dropdown-item
                                  command="main"
                                  :disabled="idx === 0"
                                >
                                  设为主图
                                </el-dropdown-item>
                                <el-dropdown-item command="copy">复制链接</el-dropdown-item>
                                <el-dropdown-item command="remove" divided>从池中删除</el-dropdown-item>
                              </el-dropdown-menu>
                            </template>
                          </el-dropdown>
                        </div>
                        <span v-if="draggingImageIndex === idx" class="media-cell__dragging">移动中</span>
                      </div>

                      <button type="button" class="media-add-tile" @click="openAssetPicker('gallery')">
                        <el-icon><Plus /></el-icon>
                        <span>添加图片</span>
                        <small>{{ formData.images.length }}/9</small>
                      </button>
                    </div>

                    <div class="media-hint" :class="{ 'media-hint--error': !formData.images.length }">
                      <template v-if="!formData.images.length">
                        <el-icon><WarningFilled /></el-icon>
                        <span>图片池为空。<b>未设置主图无法「保存并上架」</b>，只能先存草稿。</span>
                      </template>
                      <template v-else>
                        <el-icon><InfoFilled /></el-icon>
                        <span>第 1 张为主图，建议 1:1 正方形、800×800 以上。上传非正方形图会弹出 1:1 裁切；通过 URL 粘贴的外链会自动转存到自有存储，避免源站防盗链导致挂图 403。</span>
                      </template>
                    </div>

                    <div class="image-action-row">
                      <el-button class="ghost-btn" :icon="Picture" @click="openAssetPicker('gallery')">从素材库批量选</el-button>
                      <el-button class="ghost-btn" :icon="Scissor" @click="reorderByMainImage">
                        裁切首图
                      </el-button>
                    </div>

                    <button type="button" class="fold-link" @click="showGalleryUrlInput = !showGalleryUrlInput">
                      {{ showGalleryUrlInput ? '收起 URL 输入' : '通过 URL 添加（服务端转存）' }}
                    </button>
                    <el-input
                      v-if="showGalleryUrlInput"
                      v-model="newImageUrl"
                      placeholder="粘贴图片 URL，回车转存并加入池子"
                      @keyup.enter="addImage"
                    >
                      <template #append>
                        <el-button :loading="transferringUrl" @click="addImage">转存添加</el-button>
                      </template>
                    </el-input>
                  </div>
                </el-form-item>

                <el-divider class="asset-divider">
                  <span class="asset-divider__t">
                    宣传视频（选填）
                    <FieldHint text="支持 MP4，≤50MB，≤60 秒，比例 3:4 或 1:1。上传前会读视频元信息逐项校验：非 MP4、超 50MB、时长超 60 秒、比例非 3:4/1:1 都会被直接拦下。比例不合规时按提示用剪映裁成竖版再传。留空视频封面时默认回退为商品主图。" />
                  </span>
                </el-divider>

                <!--
                  视频与封面改左右双栏紧凑卡片。
                  ⚠️ 原来两块是上下堆叠的独立 el-form-item：视频区内嵌了一整个原生 <video> 播放器
                  （3:4 竖版、限高 360px），下面还缀着 meta 行、按钮行、两行 form-tip 说明；
                  封面区又是完整的一行（132x176 缩略图 + 操作按钮 + 说明）。合计吃掉近 600px。
                  现在合并成 1:1 双栏 Grid，缩略图只做 120x160 的静态帧 + 播放角标，
                  真机播放挪到点开的 Modal 里 —— 校验看的是比例和时长，不需要全尺寸播放器常驻。
                -->
                <div class="video-media-grid">
                  <!-- 左栏：视频文件 -->
                  <div class="media-card" :class="{ 'is-empty': !formData.video_url }">
                    <div class="media-card__title">
                      <span>视频文件</span>
                      <span v-if="formData.video_url" class="tag tag--success">合规</span>
                    </div>

                    <div class="media-card__body">
                      <button
                        type="button"
                        class="media-thumb"
                        :class="{ 'is-empty': !formData.video_url }"
                        :disabled="!formData.video_url"
                        @click="openVideoPreview"
                        @mouseenter="previewVideoOn"
                        @mouseleave="previewVideoOff"
                      >
                        <template v-if="formData.video_url">
                          <video
                            ref="thumbVideoRef"
                            class="media-thumb__video"
                            :src="formData.video_url"
                            :poster="effectiveVideoPoster"
                            preload="metadata"
                            playsinline
                            muted
                            loop
                            @loadedmetadata="onVideoMeta"
                          />
                          <span class="media-thumb__play"><el-icon><VideoPlay /></el-icon></span>
                          <span v-if="videoDurationText" class="media-thumb__dur">{{ videoDurationText }}</span>
                        </template>
                        <span v-else class="media-thumb__placeholder">
                          <el-icon><VideoPlay /></el-icon>
                          <small>未上传</small>
                        </span>
                      </button>

                      <div class="media-card__ops">
                        <template v-if="formData.video_url">
                          <div class="media-card__tags">
                            <span class="tag tag--info">{{ videoSizeLabel }}</span>
                            <span v-if="videoRatioLabel" class="tag">{{ videoRatioLabel }}</span>
                          </div>
                          <!-- 🔴 口径统一：所有上传动作都先跳素材库，需要新素材时在素材库里从本地上传 -->
                          <div class="media-card__btns">
                            <el-button class="ghost-btn" size="small" :icon="Picture" @click="openAssetPicker('video')">更换视频</el-button>
                            <el-button class="ghost-btn" size="small" type="danger" plain :icon="Delete" @click="confirmClearVideo">移除</el-button>
                          </div>
                          <p class="media-card__tip">≤50MB · ≤60s · 3:4 或 1:1</p>
                        </template>
                        <template v-else>
                          <p class="media-card__tip media-card__tip--lead">上传一段产品宣传视频，放在详情页首屏第 0 位。</p>
                          <div class="media-card__btns">
                            <el-button class="primary-btn" type="primary" size="small" :icon="Picture" @click="openAssetPicker('video')">
                              从素材库选视频
                            </el-button>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- 右栏：视频封面 -->
                  <div class="media-card" :class="{ 'is-disabled': !formData.video_url }">
                    <div class="media-card__title">
                      <span>视频封面</span>
                      <span v-if="formData.video_url" class="tag" :class="formData.video_poster_url ? 'tag--warn' : ''">
                        {{ formData.video_poster_url ? '自定义封面' : '默认主图' }}
                      </span>
                    </div>

                    <div class="media-card__body">
                      <div class="media-thumb media-thumb--static">
                        <el-image v-if="effectiveVideoPoster" :src="effectiveVideoPoster" fit="cover" />
                        <span v-else class="media-thumb__placeholder"><small>未设置</small></span>
                      </div>

                      <div class="media-card__ops">
                        <template v-if="formData.video_url">
                          <div class="media-card__btns">
                            <el-button
                              class="ghost-btn"
                              size="small"
                              :icon="VideoPlay"
                              :loading="extractingPoster"
                              @click="extractVideoPoster"
                            >
                              {{ formData.video_poster_url ? '重新截取' : '从视频截取一帧' }}
                            </el-button>
                            <el-button class="ghost-btn" size="small" :icon="Picture" @click="openAssetPicker('poster')">上传封面</el-button>
                          </div>
                          <button
                            v-if="formData.video_poster_url"
                            type="button"
                            class="media-card__link"
                            @click="formData.video_poster_url = ''"
                          >
                            恢复使用商品主图
                          </button>
                          <p class="media-card__tip">固定 3:4 竖版，与视频同比例</p>
                        </template>
                        <p v-else class="media-card__tip media-card__tip--lead">上传视频后可设置封面；未设置时自动回退商品主图。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="section-content" class="section-card">
              <div class="section-head">
                <div>
                  <h2>内容描述</h2>
                  <p>简介用于快速导购，详情用于承接转化和售后说明。</p>
                </div>
              </div>

              <div class="content-form-grid">
                <el-form-item label="商品简介">
                  <el-input
                    v-model="formData.description"
                    type="textarea"
                    :rows="4"
                    placeholder="用一两句话写清楚核心卖点，方便用户快速判断。"
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="商品详情">
                  <div class="detail-template-toolbar">
                    <span class="detail-template-toolbar__label">高转化模板</span>
                    <el-button
                      v-for="tpl in detailTemplates"
                      :key="tpl.key"
                      class="ghost-btn tpl-chip-btn"
                      size="small"
                      @click="applyDetailTemplate(tpl.key)"
                    >
                      {{ tpl.label }}
                    </el-button>
                    <span class="detail-template-toolbar__hint">点击插入到详情末尾</span>
                  </div>
                  <PageRichTextEditor v-model="formData.content" seamless-images class="product-rich-editor" />
                  <div class="form-tip">支持图片、文字混排；连续插图会无缝拼接，适合淘宝式详情长图。</div>
                </el-form-item>
              </div>
            </section>

            <section id="section-sku" class="section-card">
              <div class="section-head">
                <div>
                  <h2>价格与售卖</h2>
                  <p>数字资料包通常只需一个售价；实物多规格才需要建 SKU 表。</p>
                </div>
              </div>

              <!--
                规格模式用 Segmented 卡片而非 header 右上角的小开关。
                ⚠️ 原来开关孤零零挂在标题右侧，和下面的售价输入框没有任何视觉关联，
                运营根本不知道「切了它会影响下面哪一屏」。现在把它放在分区正文顶部，
                紧贴它所控制的字段。
              -->
              <div class="sku-mode-seg" role="tablist" aria-label="规格模式">
                <button
                  type="button"
                  role="tab"
                  class="sku-mode-seg__item"
                  :class="{ active: skuSimpleMode }"
                  :aria-selected="skuSimpleMode"
                  @click="setSkuMode(true)"
                >
                  <span class="sku-mode-seg__title">一口价（单规格）</span>
                  <span class="sku-mode-seg__hint">一个价格一个名额，数字商品首选</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="sku-mode-seg__item"
                  :class="{ active: !skuSimpleMode }"
                  :aria-selected="!skuSimpleMode"
                  @click="setSkuMode(false)"
                >
                  <span class="sku-mode-seg__title">多规格（SKU 矩阵）</span>
                  <span class="sku-mode-seg__hint">按颜色 / 套餐等维度拆多个可售单元</span>
                </button>
              </div>

              <!-- 一口价模式：数字 / 会员类单规格 -->
              <div v-if="skuSimpleMode" class="simple-price-grid">
                <el-form-item label="划线价">
                  <el-input-number
                    v-model="simpleOriginalPriceModel"
                    :min="0"
                    :precision="2"
                    :step="1"
                    controls-position="right"
                  />
                  <div class="form-tip">选填。用于展示「已省 ¥X」；填 0 或留空则不展示原价。</div>
                </el-form-item>

                <el-form-item id="field-price">
                  <template #label>
                    <span class="field-label">
                      售价
                      <!-- 折扣角标必须挂在 label 上：放 tip 里会掉队折行、基线也跟输入框错位 -->
                      <span v-if="simpleDiscountPercent > 0" class="discount-flag">相当于 {{ simpleDiscountPercent }} 折</span>
                    </span>
                  </template>
                  <el-input-number
                    v-model="simplePriceModel"
                    :min="0"
                    :precision="2"
                    :step="1"
                    controls-position="right"
                  />
                  <div class="form-tip">必填。列表页与详情页展示的即为该价格。</div>
                </el-form-item>

                <el-form-item id="field-quota">
                  <template #label>
                    <span class="field-label">
                      {{ simpleQuotaLabel }}
                      <FieldHint :text="isDigitalOnly ? '数字商品不限量时填 0 或留空；填大于 0 则作为总名额限制，超出后端会拒绝继续下单。' : '可售库存，填 0 表示暂不可售。'" />
                    </span>
                  </template>
                  <el-input-number
                    v-model="simpleStockModel"
                    :min="0"
                    :max="999999"
                    placeholder="留空或填 0 表示不限量"
                    controls-position="right"
                  />
                </el-form-item>

                <el-form-item>
                  <template #label>
                    <span class="field-label">
                      SKU 编码
                      <FieldHint text="选填，用于 ERP / 财务对账。留空保存时会按规则自动生成唯一货号；只有接了外部系统才需要手填。" />
                    </span>
                  </template>
                  <el-input v-model="simpleSkuCodeModel" placeholder="留空自动生成" />
                </el-form-item>
              </div>

              <!-- 多规格模式：SKU 表格 -->
              <template v-else>
              <el-form-item label="规格名称">
                <div class="spec-tag-editor">
                  <el-tag
                    v-for="spec in visibleSpecNames"
                    :key="spec.index"
                    closable
                    effect="plain"
                    @close="removeSpecName(spec.index)"
                  >
                    {{ spec.name }}
                  </el-tag>
                  <el-input
                    v-model="newSpecName"
                    class="spec-tag-input"
                    placeholder="输入规格名后回车，如颜色"
                    @keyup.enter="addSpecTag"
                  />
                  <el-button class="ghost-btn" :icon="Plus" @click="addSpecTag">添加规格</el-button>
                </div>
              </el-form-item>

              <el-form-item label="SKU 列表">
                <div class="sku-table-wrap">
                  <el-table :data="formData.skus" border class="sku-table">
                    <el-table-column
                      v-for="spec in visibleSpecNames"
                      :key="spec.index"
                      :label="spec.name"
                      min-width="140"
                    >
                      <template #default="{ row }">
                        <el-input v-model="row.specs[spec.index].value" placeholder="规格值" size="small" />
                      </template>
                    </el-table-column>
                    <el-table-column label="销售价" min-width="138">
                      <template #default="{ row }">
                        <el-input v-model.number="row.price" class="money-input" type="number" min="0" size="small">
                          <template #prefix>¥</template>
                        </el-input>
                      </template>
                    </el-table-column>
                    <el-table-column label="原价" min-width="138">
                      <template #default="{ row }">
                        <el-input v-model.number="row.original_price" class="money-input" type="number" min="0" size="small">
                          <template #prefix>¥</template>
                        </el-input>
                      </template>
                    </el-table-column>
                    <el-table-column label="库存" min-width="118">
                      <template #default="{ row }">
                        <span v-if="isDigitalOnly" class="unlimited-stock">无限</span>
                        <el-input-number v-else v-model="row.stock" :min="0" size="small" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column label="SKU 编码" min-width="160">
                      <template #default="{ row }">
                        <el-input v-model="row.sku_code" placeholder="自动生成" size="small" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="72" fixed="right" align="center">
                      <template #default="{ $index }">
                        <el-button class="delete-icon-btn" :icon="Delete" circle text aria-label="删除该 SKU" @click="removeSku($index)" />
                      </template>
                    </el-table-column>
                    <template #empty>
                      <div class="sku-empty">
                        <div class="empty-icon">SKU</div>
                        <strong>还没有 SKU</strong>
                        <span>至少添加一行，填写价格和库存后才能发布。</span>
                        <el-button class="primary-btn" type="primary" :icon="Plus" @click="addSku">添加第一行 SKU</el-button>
                      </div>
                    </template>
                  </el-table>
                  <button type="button" class="add-row-btn" @click="addSku">
                    <el-icon><Plus /></el-icon>
                    添加一行 SKU
                  </button>
                </div>
              </el-form-item>
              </template>
            </section>

            <section id="section-marketing" class="section-card">
              <div class="section-head">
                <div>
                  <h2>会员与商业化</h2>
                  <p>把单品成交沉淀成会员与社群资产：会员阶梯价、买赠权益、星球导流。</p>
                </div>
              </div>

              <div class="basic-form-grid">
                <el-form-item class="span-all">
                  <template #label>
                    会员定价
                    <FieldHint text="决定这个商品对有效会员的价格策略，可三选一。每张卡片下方自带该策略的适用说明；切换到「VIP 专享价」时会按售价自动给一个 9 折默认值。" />
                  </template>
                  <div class="pick-grid">
                    <button
                      v-for="opt in vipPricingOptions"
                      :key="opt.value"
                      type="button"
                      class="pick-card"
                      :class="{ active: vipPricingType === opt.value }"
                      :aria-pressed="vipPricingType === opt.value"
                      @click="vipPricingType = opt.value"
                    >
                      <span class="pick-card__body">
                        <span class="pick-card__title">{{ opt.label }}</span>
                        <!--
                          策略说明内嵌在卡片里，不再另开一块深灰「当前策略」框。
                          ⚠️ 原先那块的文案跟选项卡的 hint 是同一句话，等于把同一信息
                          在一屏里说了两遍，还用更重的视觉权重去说次要信息。
                        -->
                        <span class="pick-card__hint">{{ opt.hint }}</span>
                      </span>
                      <span class="pick-card__check" aria-hidden="true" />
                    </button>
                  </div>
                </el-form-item>

                <el-form-item v-if="vipPricingType === 'fixed_vip_price'" label="VIP 专享价" class="span-all">
                  <div class="member-price-row">
                    <el-input-number
                      v-model="formData.memberPrice"
                      :min="0"
                      :precision="2"
                      :step="1"
                      controls-position="right"
                    />
                    <div class="discount-presets">
                      <button
                        v-for="d in discountPresets"
                        :key="d.rate"
                        type="button"
                        class="preset-chip"
                        :disabled="basePrice <= 0"
                        @click="applyDiscount(d.rate)"
                      >
                        {{ d.label }}
                      </button>
                    </div>
                  </div>
                  <div class="form-tip">
                    <template v-if="basePrice > 0">
                      当前售价 ¥{{ basePrice }}，{{ memberPriceLabel }}。仅有效付费会员可按此价成交。
                    </template>
                    <template v-else>先在上方填写售价，才能计算会员折扣。</template>
                  </div>
                </el-form-item>

                <el-form-item v-else-if="vipPricingType === 'vip_free'" class="span-all">
                  <div class="strategy-inline-note">
                    <el-icon><InfoFilled /></el-icon>
                    <span>仅有效付费会员可 <b>0 元</b>领取，非会员仍按原价购买 —— 适合把知识库做成会员权益的沉淀玩法。</span>
                  </div>
                </el-form-item>

                <template v-if="isMembershipProduct">
                  <div class="short-grid">
                  <el-form-item label="会员天数">
                    <el-input-number v-model="formData.membershipDays" :min="0" :max="3650" controls-position="right" />
                    <div class="form-tip">0 = 终身；支付成功后按绑定的付费档写入订购记录。</div>
                  </el-form-item>
                  <el-form-item label="付费档位" required>
                    <el-select
                      v-model="formData.membershipPlanId"
                      placeholder="选择付费档（按平台/星球分组）"
                      filterable
                      clearable
                      style="width: 100%; max-width: 260px"
                    >
                      <el-option-group
                        v-for="group in membershipPlanGroups"
                        :key="group.label"
                        :label="group.label"
                      >
                        <el-option
                          v-for="p in group.options"
                          :key="p.id"
                          :label="p.label"
                          :value="p.id"
                        />
                      </el-option-group>
                    </el-select>
                    <div class="form-tip">必选。平台档开平台权益；星球档仅开通对应星球。</div>
                  </el-form-item>
                  <el-form-item label="成长等级(旧)">
                    <el-select v-model="formData.membershipLevelId" placeholder="可选，兼容旧数据" clearable style="width: 280px">
                      <el-option v-for="lv in memberLevels" :key="lv.id" :label="lv.name" :value="lv.id" />
                    </el-select>
                    <div class="form-tip">不再作为付费门禁；建议逐步改绑上方付费档。</div>
                  </el-form-item>
                </div>
                </template>

                <div class="short-grid">
                <el-form-item label="买赠 · 赠送会员天数">
                  <el-input-number
                    v-model="formData.giftMembershipDays"
                    :min="0"
                    :max="3650"
                    :disabled="isMembershipProduct"
                    controls-position="right"
                  />
                  <div class="form-tip">
                    支付成功后额外赠送的会员天数（与商品自身会员期叠加）。0 = 不赠送。
                    <template v-if="isMembershipProduct">本商品自身即会员套餐，此项已禁用。</template>
                  </div>
                </el-form-item>

                <el-form-item class="span-all">
                  <template #label>
                    <span class="field-label">
                      买赠 · 支付成功后赠送
                    </span>
                  </template>
                  <!-- 内联开关：默认不勾选，避免「两个下拉/数字框一直挂着但多半用不上」 -->
                  <div class="gift-switch-row">
                    <el-checkbox
                      :model-value="giftPlanetArmed"
                      :disabled="!planetGiftOptions.length"
                      @update:model-value="toggleGiftPlanet(Boolean($event))"
                    >
                      支付成功后赠送星球社区
                    </el-checkbox>
                    <span v-if="!planetGiftOptions.length" class="gift-empty-hint">
                      暂无可关联星球
                      <el-button class="link-fix-btn" type="primary" link @click="goPlanetConfig">
                        前往配置星球 &gt;
                      </el-button>
                    </span>
                  </div>

                  <div v-if="giftPlanetArmed && planetGiftOptions.length" class="short-grid gift-grid">
                    <el-form-item>
                      <template #label>
                        <span class="field-label">
                          选择赠送星球
                          <FieldHint text="购买后自动把用户加入该星球社区，形成「买单品 → 沉淀高净值会员」闭环。" />
                        </span>
                      </template>
                      <el-select
                        v-model="formData.giftPlanetId"
                        placeholder="选择星球"
                        clearable
                        filterable
                        style="width: 100%"
                        @change="onGiftPlanetChange"
                      >
                        <el-option
                          v-for="p in planetGiftOptions"
                          :key="p.id"
                          :label="p.label"
                          :value="p.id"
                        />
                      </el-select>
                    </el-form-item>

                    <el-form-item>
                      <template #label>
                        <span class="field-label">
                          赠送有效时长
                          <FieldHint text="星球内容门禁按订购期限判定，所以必须填天数；填 0 等于不给期限，用户进不去受限内容。" />
                        </span>
                      </template>
                      <div class="gift-row">
                        <el-input-number
                          v-model="formData.giftPlanetDays"
                          :min="0"
                          :max="3650"
                          :disabled="!formData.giftPlanetId"
                          controls-position="right"
                        />
                        <span class="gift-row__unit">天</span>
                      </div>
                    </el-form-item>
                  </div>
                </el-form-item>
                </div>
              </div>
            </section>
          </main>

          <aside class="editor-aside">
            <!-- 待办自检清单：完成度数字与「还差几项」只在底栏出现一次，这里不再重复 -->
            <section v-if="completionPercent < 100" class="side-card">
              <div class="side-card-head">
                <div class="side-card-title">发布助手</div>
                <span class="side-card-head__meta">点任意一项可直达字段</span>
              </div>
              <ul class="side-meter__todos">
                <li v-for="item in incompleteItems" :key="item.label" :class="{ blocking: item.blocking }">
                  <button type="button" @click="focusTodo(item)">
                    <span class="side-todo__dot" aria-hidden="true" />
                    <span class="side-todo__label">{{ item.label }}</span>
                    <span class="side-todo__go">前往修复</span>
                  </button>
                </li>
              </ul>
            </section>

            <!-- 100% 后收缩为一条微型标签，把纵向空间还给其它卡片 -->
            <div v-else class="side-card side-card--done">
              <el-icon><CircleCheckFilled /></el-icon>
              <span>全部检查项通过，可直接上架</span>
            </div>

            <section class="side-card">
              <div class="side-card-title">封面预览</div>
              <div class="cover-preview">
                <div class="cover-preview__thumb">
                  <el-image v-if="formData.main_image" :src="formData.main_image" fit="cover" />
                  <div v-else class="cover-preview__empty">未上传主图</div>
                </div>
                <div class="cover-preview__meta">
                  <div class="cover-preview__name">{{ formData.name || '商品名称' }}</div>
                  <div class="cover-preview__price">
                    <span class="cover-preview__yen">¥</span>{{ previewPrice }}
                    <s v-if="previewOriginalPrice">¥{{ previewOriginalPrice }}</s>
                  </div>
                  <div class="cover-preview__tags">
                    <span v-for="t in formData.productTypes" :key="t" class="mini-tag">{{ typeLabel(t) }}</span>
                    <span v-if="formData.memberFree === 1" class="mini-tag mini-tag--vip">会员免费</span>
                    <span v-else-if="formData.memberPrice" class="mini-tag mini-tag--vip">会员 ¥{{ formData.memberPrice }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="side-card">
              <div class="side-card-head">
                <div class="side-card-title">详情预览</div>
                <span class="side-card-head__meta">{{ resolvedDetailTemplateLabel }}</span>
              </div>
              <!--
                骨架缩略卡：不再内嵌微型手机壳。
                ⚠️ 原来塞了一个 280px 宽的手机外壳进 ~300px 的右栏，内部文字只有 6-7px，
                看得见形状看不清内容，既没有校验价值、又要占掉半屏高度（已实测缩到 225px 仍偏矮）。
                现在只放 140px 的图文骨架示意，校验靠下方按钮打开的 1:1 真机抽屉。
              -->
              <div class="detail-skeleton" aria-hidden="true">
                <div class="detail-skeleton__cover" />
                <div class="detail-skeleton__lines">
                  <span class="detail-skeleton__line w70" />
                  <span class="detail-skeleton__line w45" />
                  <span class="detail-skeleton__line w90" />
                  <span class="detail-skeleton__line w60" />
                </div>
              </div>
              <button type="button" class="detail-preview-btn" @click="devicePreviewVisible = true">
                <el-icon><View /></el-icon>
                查看真机全屏预览
              </button>
            </section>

            <section class="side-card">
              <div class="side-card-head">
                <div class="side-card-title">售卖状态与排期</div>
                <span class="side-card-head__meta">当前：{{ statusText }}</span>
              </div>
              <!--
                三态单选取代「当前状态只读文字 + 一个孤立日期框」。
                ⚠️ 原来「留空则手动上架」这个 placeholder 有歧义：留空到底是「立即上架」
                还是「保持草稿」？运营不敢点。现在选「定时上架」才展开日期选择器。
              -->
              <div class="sell-mode-seg" role="radiogroup" aria-label="售卖状态">
                <button
                  type="button"
                  role="radio"
                  class="sell-mode-seg__item"
                  :class="{ active: sellMode === 'now' }"
                  :aria-checked="sellMode === 'now'"
                  @click="setSellMode('now')"
                >
                  立即上架
                </button>
                <button
                  type="button"
                  role="radio"
                  class="sell-mode-seg__item"
                  :class="{ active: sellMode === 'scheduled' }"
                  :aria-checked="sellMode === 'scheduled'"
                  @click="setSellMode('scheduled')"
                >
                  定时上架
                </button>
                <button
                  type="button"
                  role="radio"
                  class="sell-mode-seg__item"
                  :class="{ active: sellMode === 'off' }"
                  :aria-checked="sellMode === 'off'"
                  @click="setSellMode('off')"
                >
                  下架归档
                </button>
              </div>

              <div v-if="sellMode === 'scheduled'" class="sell-schedule">
                <el-date-picker
                  v-model="formData.publishAt"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择上架时间"
                  style="width: 100%"
                />
                <div class="form-tip">到点后小程序端自动可购买；改时间不影响已上架的商品。</div>
              </div>
              <div v-else-if="sellMode === 'off'" class="form-inline-note">
                保存后商品变为「已下架」：端上看不到，也无法下单。历史订单不受影响。
              </div>
              <div v-else class="form-inline-note">
                保存即上架，立刻出现在列表页与小程序端。
              </div>
            </section>
          </aside>
        </div>

      </el-form>
    </div>

    <!-- 固定吸底操作栏：脱离侧边栏通栏，任何滚动位置都能一键提交 -->
    <div class="action-dock">
      <div class="action-dock__inner">
        <div class="action-dock__status">
          <!-- 轻量状态总控：完成度环 + 保存时间；「还差哪几项」全部交给右侧发布助手，不在这里镜像 -->
          <span class="dock-meter" :class="{ done: completionPercent === 100 }">
            <i :style="{ '--progress': `${completionPercent}%` }" />
            <b>{{ completionPercent }}%</b>
          </span>
          <span v-if="hasUnsavedChanges" class="draft-pill">未保存</span>
          <span v-else-if="lastAutoSaveTime" class="footer-autosave">
            <el-icon><Clock /></el-icon>{{ formatTime(lastAutoSaveTime) }} 自动保存
          </span>
        </div>

        <div class="action-dock__actions">
          <el-button class="ghost-btn" @click="goBack">取消</el-button>
          <el-button class="ghost-btn" :icon="View" @click="openPreview">预览</el-button>
          <el-button class="outline-btn" :loading="submitting" @click="handleSubmit(false)">
            {{ isEdit ? '保存草稿' : '存为草稿' }}
          </el-button>
          <!--
            ⚠️ 阻断项存在时**不置灰**：置灰等于「点不动但不知道为什么」。
            改成可点击 → 走拦截弹窗，给「自动修复」或「强制继续」两条出路（见 promptPublishBlock）。
          -->
          <el-button
            class="primary-btn"
            type="primary"
            :loading="submitting"
            @click="handlePublishClick"
          >
            保存并上架
          </el-button>
        </div>
      </div>
    </div>

    <!-- 视频全屏预览：缩略图常驻只占 120x160，真正要看画面时才点开 -->
    <el-dialog
      v-model="videoPreviewVisible"
      :title="`宣传视频预览${videoDurationText ? ' · ' + videoDurationText : ''}`"
      width="420px"
      append-to-body
      align-center
      class="video-preview-dialog"
    >
      <div class="video-preview-dialog__stage" :style="videoSlotStyle">
        <video
          class="video-slot__player"
          :src="formData.video_url"
          :poster="effectiveVideoPoster"
          controls
          autoplay
          preload="metadata"
          playsinline
        />
      </div>
      <p class="video-preview-dialog__tip">
        {{ videoSizeLabel }}<template v-if="videoRatioLabel"> · {{ videoRatioLabel }}</template> · 端上详情页首屏第 0 项
      </p>
    </el-dialog>

<AssetPickerDialog
      v-model="assetPickerVisible"
      :multiple="assetPickerTarget === 'gallery'"
      :media-type="assetPickerTarget === 'video' ? 'video' : 'image'"
      @select="handleAssetSelected"
      @select-many="handleAssetSelectedMany"
    />

    <ImageCropperDialog
      v-model="cropVisible"
      :src="cropSourceUrl"
      @cropped="onCropped"
    />

    <!-- 真机全屏预览：抽屉比弹窗更贴近 1:1 手机手感，且可滚动整条详情画布 -->
    <el-drawer
      v-model="devicePreviewVisible"
      :size="420"
      append-to-body
      :with-header="true"
      class="device-preview-drawer"
    >
      <template #header>
        <div class="device-preview-drawer__head">
          <b>真机全屏预览</b>
          <span>{{ resolvedDetailTemplateLabel }} · 1:1 渲染，可滚动查看完整画布</span>
        </div>
      </template>
      <div class="device-preview-drawer__body">
        <ProductDetailPreview
          :template-id="resolvedDetailTemplate"
          :name="formData.name"
          :price="previewPrice"
        />
      </div>
    </el-drawer>

    <el-dialog
      v-model="previewVisible"
      title="商品预览"
      width="400px"
      append-to-body
      destroy-on-close
      class="product-preview-dialog"
      align-center
    >
      <div class="preview-phone">
        <div class="preview-notch" />
        <div class="preview-scroll">
          <!-- 轮播：宣传视频（第 0 项）+ 图片 -->
          <div class="pv-gallery">
            <el-carousel
              v-if="previewImages.length"
              height="280px"
              :interval="3500"
              indicator-position="inside"
              arrow="hover"
            >
              <el-carousel-item v-if="formData.video_url">
                <div class="pv-gallery__video">
                  <video
                    class="pv-gallery__video-el"
                    :src="formData.video_url"
                    :poster="formData.main_image"
                    controls
                    preload="metadata"
                    playsinline
                  />
                  <span class="pv-gallery__video-tag">宣传视频</span>
                </div>
              </el-carousel-item>
              <el-carousel-item v-for="(img, idx) in previewImages" :key="`${img}-${idx}`">
                <img :src="img" alt="" />
              </el-carousel-item>
            </el-carousel>
            <div v-else-if="!formData.video_url" class="pv-gallery-empty">暂无主图 / 轮播图</div>
            <div v-if="previewImages.length" class="pv-gallery-count">
              {{ (formData.video_url ? 1 : 0) + previewImages.length }} 张
            </div>
          </div>

          <!-- 价格标题区 -->
          <div class="pv-header">
            <div class="pv-price-row">
              <span class="pv-yen">¥</span>
              <span class="pv-price">{{ previewPrice }}</span>
              <span v-if="previewOriginalPrice" class="pv-origin">¥{{ previewOriginalPrice }}</span>
            </div>
            <div class="pv-name">{{ formData.name || '商品名称' }}</div>
            <div class="pv-meta-row">
              <span>已售 —</span>
              <span>库存 {{ previewStockLabel }}</span>
              <span v-for="t in formData.productTypes" :key="t">{{ typeLabel(t) }}</span>
            </div>
            <div v-if="formData.description" class="pv-desc">{{ formData.description }}</div>
          </div>

          <!-- 规格 / 优惠 / 服务（淘宝式入口行） -->
          <div class="pv-picks">
            <div class="pv-pick">
              <span class="k">规格</span>
              <span class="v">{{ previewSkuLabel }}</span>
              <span class="ar">›</span>
            </div>
            <div class="pv-pick">
              <span class="k">优惠券</span>
              <span class="v">满减可用</span>
              <span class="ar">›</span>
            </div>
            <div class="pv-pick">
              <span class="k">服务</span>
              <span class="v">{{ previewServiceLabel }}</span>
              <span class="ar">›</span>
            </div>
          </div>

          <!-- 评价入口 -->
          <div class="pv-review">
            <div>
              <div class="pv-review-t">用户评价</div>
              <div class="pv-review-s">暂无评价 · 上架后展示</div>
            </div>
            <span class="ar">全部 ›</span>
          </div>

          <!-- 图文详情 -->
          <div class="pv-detail-card">
            <div class="pv-section-title">{{ previewDetailTitle }}</div>
            <div class="pv-rich" v-html="formData.content || '<p style=&quot;color:#999&quot;>暂无详情，可在上方编辑器插入图文</p>'" />
          </div>
        </div>

        <!-- 底部栏：对齐淘宝详情（预览固定展示完整操作，不按类型隐藏） -->
        <div class="pv-bottom">
          <div class="pv-icon-btn">
            <span class="emoji">💬</span>
            <span>客服</span>
          </div>
          <div class="pv-icon-btn">
            <span class="emoji">🛒</span>
            <span>购物车</span>
          </div>
          <button type="button" class="pv-btn pv-btn-cart">加入购物车</button>
          <button type="button" class="pv-btn pv-btn-buy">立即购买</button>
        </div>
      </div>
      <p class="preview-hint">模拟淘宝/小程序商品详情（含底部购买栏），样式供参考，实际以端上为准。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Back, Delete, Picture, Plus, Upload, VideoPlay, CircleCheckFilled, WarningFilled, View, Clock, MoreFilled, Scissor, InfoFilled } from '@element-plus/icons-vue'
import { getProduct, createProduct, updateProduct, getCategoryList, onSaleProduct, offSaleProduct } from '@/api/product'
import { listAuthors, type AuthorRecord } from '@/api/author'
import { getMemberLevelList } from '@/api/member'
import { getMembershipPlanList, type MembershipPlan } from '@/api/membershipPlan'
import { fetchWarmHomeAggregate } from '@/api/warmHome'
import { uploadFile } from '@/api/system'
import { post } from '@/api/request'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import ImageCropperDialog from '@/components/ImageCropperDialog.vue'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import FieldHint from '@/components/page-builder/FieldHint.vue'
import ProductDetailPreview from '@/components/product-detail-preview/ProductDetailPreview.vue'
import { PRODUCT_DETAIL_TEMPLATES, PRODUCT_DETAIL_TEMPLATE_GROUPS, resolveTemplate, findTemplate } from '@/utils/product-templates'
import type { ProductCategory, SkuItem, SkuSpec } from '@/types/product'

/** 一级形态：决定履约与库存口径，全局只允许选一个 */
const SHAPE_OPTIONS = [
  { value: 'physical', label: '实物商品', icon: '📦', hint: '需要物流与库存' },
  { value: 'digital', label: '数字商品', icon: '📄', hint: '线上交付，不校验库存' },
  { value: 'service', label: '服务商品', icon: '🎯', hint: '到店 / 履约型服务' },
  { value: 'membership', label: '会员套餐', icon: '🪐', hint: '开通付费档订购' },
]

/** 二级载体：只描述「交付什么」，可与数字形态叠加 */
const CARRIER_OPTIONS = [
  { value: 'ebook', label: '电子书', icon: '📘' },
  { value: 'column', label: '专栏', icon: '📚' },
  { value: 'resource_pack', label: '资料包', icon: '🗂️' },
  { value: 'ticket', label: '社群入场券', icon: '🎫' },
]

/** 可与数字形态叠加的载体（资料包/电子书/专栏都属于线上交付） */
const DIGITAL_COMPATIBLE_SHAPES = ['digital']

/** 交付方式：语义化命名，消除「自动发货」歧义 */
const DELIVERY_MODE_OPTIONS = [
  {
    value: 'auto',
    label: '即时全自动交付',
    hint: '支付成功即把链接/卡密/权限推给用户，无需人工介入',
  },
  {
    value: 'manual',
    label: '半自动 / 人工履约',
    hint: '支付成功后由运营人工处理并发送兑换指引',
  },
  {
    value: 'redeem_code',
    label: '卡密核销',
    hint: '支付成功自动分配一张卡密，用户凭卡密兑换',
  },
]

/** 人工动作词：出现在「发货内容」里说明这不是自动交付 */
const MANUAL_ACTION_KEYWORDS = [
  '联系客服', '人工', '客服', '手动', '稍后', '等待', '加微信', '加v', '私聊', '开通权限', '人工开通', '联系运营', '联系我们',
]

/** 会员折扣快捷档 */
const DISCOUNT_PRESETS = [
  { rate: 0.9, label: '会员 9 折' },
  { rate: 0.85, label: '会员 85 折' },
  { rate: 0.8, label: '会员 8 折' },
  { rate: 0.5, label: '会员 5 折' },
]

/** 自定义防抖函数（避免引入额外依赖） */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/** 草稿存储键 */
const DRAFT_KEY = 'product_edit_draft'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const pageLoading = ref(false)
const submitting = ref(false)
const categoryOptions = ref<ProductCategory[]>([])
const newImageUrl = ref('')
const uploadingMainImage = ref(false)
const assetPickerVisible = ref(false)
const assetPickerTarget = ref<'main' | 'gallery' | 'video' | 'poster'>('main')
const hasUnsavedChanges = ref(false)
const lastAutoSaveTime = ref<Date | null>(null)
const isRestoringDraft = ref(false)
const newSpecName = ref('')
const showMainUrlInput = ref(false)
const showGalleryUrlInput = ref(false)
const showVideoUrlInput = ref(false)
const draggingImageIndex = ref<number | null>(null)
const formStatus = ref<'draft' | 'on_sale' | 'off_sale'>('draft')
/** 视频时长（秒）：loadedmetadata 后可得 */
const videoDuration = ref(0)
/** 视频封面上传中 */
/** 从视频提取封面的进行中 */
const extractingPoster = ref(false)
/** URL 转存进行中 */
const transferringUrl = ref(false)
/** 1:1 裁切弹窗：待裁切文件 */
const cropSource = ref<File | null>(null)
/** 裁切完成后要替换的池内下标；-1 = 新增到末尾 */
const cropTargetIndex = ref(-1)
const cropVisible = ref(false)
/** 裁切弹窗的图片源：本地文件走 objectURL，池内图片走原 URL */
const cropObjectUrl = ref('')
const cropSourceUrl = computed(() => {
  if (cropObjectUrl.value) return cropObjectUrl.value
  if (cropTargetIndex.value >= 0) return formData.images[cropTargetIndex.value] || ''
  return ''
})

const isEdit = computed(() => !!route.params.id)
const productId = computed(() => Number(route.params.id) || 0)

const previewVisible = ref(false)
/** 详情骨架大图预览（侧栏只放缩略图，点开在这里看） */
const devicePreviewVisible = ref(false)
const categoryNodeMap = ref<Map<number, any>>(new Map())
/** 视频实际尺寸文案（如 `1080×1440 · 0.75:1`），由 <video> 的 loadedmetadata 回填 */
const videoSize = ref('')
/** 存量视频比例是否合规（3:4 / 1:1）；上传时已拦，这里主要用于展示历史素材 */
const videoRatioOk = ref(true)

/** 作者档案下拉（商品关联作者） */
const authorOptions = ref<AuthorRecord[]>([])

/** 规格名称列表 */
const specNames = ref<{ name: string }[]>([{ name: '' }])

const formData = reactive({
  name: '',
  category_id: undefined as number | undefined,
  /** 一级形态：physical / digital / service / membership（全局唯一） */
  productShape: '' as string,
  /** 二级载体：ebook / column / resource_pack（可多选或为空） */
  productTypes: [] as string[],
  detail_template: '' as string,
  author_id: undefined as number | undefined,
  main_image: '',
  video_url: '',
  /** 宣传视频独立封面；为空时端上回退用主图 */
  video_poster_url: '',
  images: [] as string[],
  description: '',
  content: '',
  sort: 0,
  skus: [] as SkuItem[],
  autoFulfill: 0,
  fulfillContent: '',
  membershipDays: 0,
  membershipLevelId: undefined as number | undefined,
  membershipPlanId: undefined as number | undefined,
  memberPrice: undefined as number | undefined,
  memberFree: 0,
  deliveryMode: 'auto',
  refundPolicy: 'none',
  previewChapters: 0,
  publishAt: undefined as string | undefined,
  giftMembershipDays: 0,
  /** 赠送星球社区 id（字符串口径，如 warm-main） */
  giftPlanetId: undefined as string | undefined,
  /** 赠送星球天数（星球门禁走订购，必须有期限） */
  giftPlanetDays: 0,
})

/** 一口价模式（数字/会员类默认开启，无需建 SKU 表） */
const skuSimpleMode = ref(true)

const memberLevels = ref<Array<{ id: number; name: string }>>([])
const membershipPlans = ref<MembershipPlan[]>([])
/** 星球社区（用于买赠星球下拉的可选范围） */
const planetCommunities = ref<any[]>([])
const membershipPlanGroups = computed(() => {
  const platform = membershipPlans.value.filter((p) => p.scope === 'platform')
  const byPlanet = new Map<string, MembershipPlan[]>()
  for (const p of membershipPlans.value.filter((x) => x.scope === 'planet')) {
    const key = p.planetId || '未指定星球'
    if (!byPlanet.has(key)) byPlanet.set(key, [])
    byPlanet.get(key)!.push(p)
  }
  const groups: Array<{ label: string; options: Array<{ id: number; label: string }> }> = []
  if (platform.length) {
    groups.push({
      label: '平台付费档',
      options: platform.map((p) => ({ id: p.id, label: p.name })),
    })
  }
  for (const [planetId, list] of byPlanet) {
    groups.push({
      label: `星球 · ${planetId}`,
      options: list.map((p) => ({ id: p.id, label: p.name })),
    })
  }
  return groups
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  productShape: [{ required: true, message: '请选择商品形态', trigger: 'change' }],  main_image: [{ required: true, message: '请输入主图URL', trigger: 'blur' }],
}

/** 分类允许的类型（真源：分类 allowed_product_types） */
const allowedTypeValues = computed<string[]>(() => {
  if (!formData.category_id) return []
  const node = categoryNodeMap.value.get(Number(formData.category_id))
  const allowed: string[] = Array.isArray(node?.allowedProductTypes) && node.allowedProductTypes.length
    ? node.allowedProductTypes
    : ['physical', 'digital', 'service', 'ebook', 'column', 'resource_pack', 'ticket', 'membership']
  return allowed.map(String)
})

/** 一级形态选项：始终展示四项，不允许的选择置灰 */
const formShapeOptions = computed(() => SHAPE_OPTIONS)

/** 二级载体只在数字形态下出现（ebook/column/resource_pack 都属线上交付） */
const showCarrierField = computed(() => DIGITAL_COMPATIBLE_SHAPES.includes(formData.productShape))

const carrierOptions = computed(() => {
  if (!showCarrierField.value) return [] as typeof CARRIER_OPTIONS
  const allowed = allowedTypeValues.value
  const hasCarrierConfigured = allowed.some((t) => CARRIER_OPTIONS.some((c) => c.value === t))
  return CARRIER_OPTIONS.filter((c) => (hasCarrierConfigured ? allowed.includes(c.value) : true))
})

/** 当前合法载体 */
const carrierTypes = computed(() => {
  const allowed = carrierOptions.value.map((c) => c.value)
  return (formData.productTypes || []).filter((t) => allowed.includes(t))
})

/** 形态 / 载体冲突提示：老数据兜底，不静默吞掉 */
const typeConflictHint = computed(() => {
  const shape = formData.productShape
  if (shape && allowedTypeValues.value.length && !allowedTypeValues.value.includes(shape)) {
    return `当前形态「${shapeLabel(shape)}」不在所选分类允许范围内，保存前请改选其它形态。`
  }
  const extra = (formData.productTypes || []).filter((t) => !CARRIER_OPTIONS.some((c) => c.value === t))
  if (extra.length) {
    return `检测到历史遗留的非法类型「${extra.map(typeLabel).join('、')}」，它既不是形态也不是载体，保存时会被丢弃。`
  }
  return ''
})

function shapeLabel(shape: string) {
  return SHAPE_OPTIONS.find((s) => s.value === shape)?.label || shape
}

/** 切换一级形态：清掉不兼容载体，联动交付与 SKU 模式 */
function setProductShape(shape: string) {
  if (formData.productShape === shape) return
  formData.productShape = shape
  formData.productTypes = DIGITAL_COMPATIBLE_SHAPES.includes(shape) ? carrierTypes.value : []
  if (shape === 'physical' || shape === 'service') {
    formData.autoFulfill = 0
  }
  if (shape === 'physical') {
    skuSimpleMode.value = false
  }
  if (shape === 'digital' || shape === 'membership') {
    skuSimpleMode.value = true
  }
}

/** 内容载体多选卡片：点一下切换勾选，不用 el-checkbox 外包一层浅色矩形 */
function toggleCarrier(value: string) {
  const list = Array.isArray(formData.productTypes) ? [...formData.productTypes] : []
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
  formData.productTypes = list
}

const isDigitalOnly = computed(() => formData.productShape === 'digital')

const isMembershipProduct = computed(() => formData.productShape === 'membership')

/** 详情模板：显式配置优先，否则按当前形态自动选 *_classic */
const resolvedDetailTemplate = computed(() =>
  resolveTemplate(formData.detail_template, formData.productShape || carrierTypes.value[0]),
)

const resolvedDetailTemplateLabel = computed(() => {
  const t = findTemplate(resolvedDetailTemplate.value)
  return t ? `${t.groupLabel} · ${t.label}` : '自动判断'
})

const showPreviewChapters = computed(() =>
  carrierTypes.value.some((t) => ['ebook', 'column'].includes(String(t))),
)

/** 实物走物流，不进自动发货链路；数字 / 服务 / 会员可配置交付方式 */
const canAutoFulfill = computed(() => {
  const shape = formData.productShape
  return !!shape && shape !== 'physical'
})

const deliveryModeOptions = computed(() => DELIVERY_MODE_OPTIONS)

const deliveryModeHint = computed(() => {
  if (formData.deliveryMode === 'manual') {
    return '选了人工履约就不要再开「自动发货」：用户付款后需要你手动发兑换指引，订单不会自动完成交付。'
  }
  if (formData.deliveryMode === 'redeem_code') {
    return '需要在卡密管理预先录入卡密库存；库存不足时该笔订单履约失败并转人工。'
  }
  return '自动交付要求发货内容是用户能立刻自取的东西（直链 / 卡密 / 密码 / 权限结果）。'
})

/** 虚假发货检测：开了自动发货，但发货内容写着「联系客服人工开通」 */
const fulfillConflict = computed(() => {
  if (formData.autoFulfill !== 1) return ''
  const text = (formData.fulfillContent || '').trim()
  if (!text) return ''
  const hit = MANUAL_ACTION_KEYWORDS.find((k) => text.includes(k))
  if (!hit) return ''
  return `发货内容里出现「${hit}」等人工动作词，但已开启自动发货 —— 用户付款后会看到"已发货"却拿不到阅读权限，极易引发虚假发货投诉与退款纠纷。`
})

function fixFulfillConflict() {
  formData.deliveryMode = 'manual'
  formData.autoFulfill = 0
  ElMessage.success('已改为「半自动 / 人工履约」并关闭自动发货')
}

const previewPrice = computed(() => {
  const prices = formData.skus
    .map((s) => s.price)
    .filter((v) => isSkuPriceFilled(v))
    .map((v) => toNumber(v, 0))
  if (!prices.length) return '0.00'
  return Math.min(...prices).toFixed(2)
})

/** 预览/小程序轮播：主图优先，再拼轮播图并去重 */
const previewImages = computed(() => buildSyncedImages(formData.main_image, formData.images))

/**
 * 视频封面生效值：优先独立封面，否则回退主图。
 * 端上（小程序）也按同样规则回落，两边必须一致，否则编辑页看到 A、端上看到 B。
 */
const effectiveVideoPoster = computed(() => formData.video_poster_url || formData.main_image || '')

function onVideoMeta(e: Event) {
  const el = e.target as HTMLVideoElement | null
  const d = el?.duration
  videoDuration.value = Number.isFinite(d) && d && d > 0 ? d : 0

  // 播放器容器比例：读到了就用真实值，读不到保持兜底 3:4。
  // ⚠️ 尺寸/徽标不在这里取 —— 视频源跨域（api 域无 CORS 头）时 videoWidth 恒为 0，
  // 详见 videoRatioText 的注释。但「比例兜底」不依赖它，猜错也有 object-fit 兜底。
  const w = el?.videoWidth || 0
  const h = el?.videoHeight || 0
  if (w > 0 && h > 0) {
    videoAspectRatio.value = w / h
  }
}

const previewOriginalPrice = computed(() => {
  const origins = formData.skus
    .map((s) => toNumber(s.original_price, 0))
    .filter((n) => n > toNumber(previewPrice.value, 0))
  if (!origins.length) return ''
  return Math.max(...origins).toFixed(2)
})

const previewStockLabel = computed(() => {
  if (isDigitalOnly.value) return '无限'
  const total = formData.skus.reduce((sum, s) => sum + toNumber(s.stock, 0), 0)
  return total > 0 ? String(total) : '无'
})

const previewSkuLabel = computed(() => {
  if (!formData.skus.length) return '请先配置 SKU'
  if (formData.skus.length === 1) {
    const s = formData.skus[0]
    const spec = (s.specs || []).map((x) => x.value).filter(Boolean).join(' / ')
    return spec || s.sku_code || '默认规格'
  }
  return `${formData.skus.length} 个规格可选`
})

const previewIsService = computed(() => formData.productShape === 'service')
const previewServiceLabel = computed(() => {
  if (isDigitalOnly.value) return '下单后可查'
  if (previewIsService.value) return '开始前24h可改期'
  return '假一赔四 · 极速退款'
})
const previewDetailTitle = computed(() => {
  if (isDigitalOnly.value) return '资料介绍'
  if (previewIsService.value) return '服务说明'
  return '商品详情'
})

/**
 * 视频尺寸文案（如 `1080×1440 · 0.75:1`）。
 * ⚠️ **存量视频读不到尺寸** —— 视频源在独立 API 域（api.zfculture.site），
 * 服务端没返回 `Access-Control-Allow-Origin`，`<video>` 的 loadedmetadata 在跨源时
 * 拿不到 videoWidth（实测生产域 readyState=0 / videoWidth=0）。
 * 所以：
 *   ① 新上传的 —— 在 `checkVideoMeta` 里已经读到过尺寸，直接记下来（跨源 blob 不受影响）
 *   ② 存量/素材库选的 —— 拿不到就不显示徽标，**不能猜**（猜错会让运营以为合规）
 * 要彻底解决得给 uploads 加 CORS 头或加 video_width/video_height 列，属后端改动。
 */
const videoRatioText = computed(() => videoSize.value)

/**
 * 播放器容器的宽高比（2026-10-05 lx 截图问题）。
 * 原来只有 `width:100% + max-height:260px`，**没设 aspect-ratio** → 3:4 竖版视频
 * 被压成中间一条细柱、两侧大片黑边。上传校验管的是**文件**，管不到**显示**。
 * 读不到真实比例时兜底 3:4（上传口径的默认比例）—— 即使猜错也只是容器比例不对，
 * 视频本身有 object-fit:contain 保护，不会被拉伸变形。
 */
const DEFAULT_VIDEO_RATIO = 3 / 4
const videoAspectRatio = ref(DEFAULT_VIDEO_RATIO)

const videoSlotStyle = computed(() => {
  // 空态（未上传）不套 aspect-ratio，用 CSS 的 min-height 即可
  if (!formData.video_url) return {}
  // 竖版视频在宽栏里会很高，给个上限：3:4 最宽到 360px 宽即可，再大就没必要了
  const ratio = videoAspectRatio.value || DEFAULT_VIDEO_RATIO
  return { aspectRatio: String(ratio), maxWidth: `${Math.round(360 * ratio)}px`, margin: '0 auto' }
})

/* ---------- 一口价模式：与唯一 SKU 双向桥接 ---------- */

/** 数字商品名额标签 */
const simpleQuotaLabel = computed(() => (isDigitalOnly.value ? '总名额' : '可售库存'))

/**
 * 一口价视图对象：始终映射到 formData.skus[0]。
 * 用 defineModel 风格的手写 getter/setter，保证任一侧修改都能落到唯一的 SKU 行。
 */
const simpleSku = computed({
  get(): SkuItem {
    return (
      formData.skus[0] || {
        specs: [],
        price: 0,
        original_price: 0,
        stock: 0,
        sku_code: '',
      }
    )
  },
  set(val: SkuItem) {
    if (formData.skus.length) {
      formData.skus[0] = { ...val, specs: [] }
    } else {
      formData.skus = [{ ...val, specs: [] }]
    }
  },
})

/** 一口价模式下字段级读写（el-input-number 走 v-model.number，需要可写代理） */
const simplePriceModel = computed<number>({
  get: () => toNumber(simpleSku.value.price, 0),
  set: (v) => { simpleSku.value = { ...simpleSku.value, price: toNumber(v, 0) } },
})
const simpleOriginalPriceModel = computed<number>({
  get: () => toNumber(simpleSku.value.original_price, 0),
  set: (v) => { simpleSku.value = { ...simpleSku.value, original_price: toNumber(v, 0) } },
})
const simpleStockModel = computed<number>({
  get: () => toNumber(simpleSku.value.stock, 0),
  set: (v) => { simpleSku.value = { ...simpleSku.value, stock: toNumber(v, 0) } },
})
const simpleSkuCodeModel = computed<string>({
  get: () => String(simpleSku.value.sku_code || ''),
  set: (v) => { simpleSku.value = { ...simpleSku.value, sku_code: String(v || '') } },
})

/** 划线价 → 售价的折扣（几折） */
const simpleDiscountPercent = computed(() => {
  const origin = toNumber(simpleOriginalPriceModel.value, 0)
  const price = toNumber(simplePriceModel.value, 0)
  if (origin <= 0 || price <= 0 || price >= origin) return 0
  return Math.round((price / origin) * 100) / 10
})

/** 切换 SKU 模式：退出一口价时若 SKU 只有一行且无规格，清掉冗余规格 */
function onSkuModeChange(nextSimple: boolean | string | number) {
  const simple = nextSimple === true || nextSimple === 'true'
  if (simple === skuSimpleMode.value) return
  setSkuMode(simple)
}

function setSkuMode(simple: boolean) {
  skuSimpleMode.value = simple
  if (simple) {
    // 收敛成唯一一行、无规格
    const first = formData.skus[0] || ({ specs: [], price: 0, original_price: 0, stock: 0, sku_code: '' } as SkuItem)
    formData.skus = [{ ...first, specs: [] }]
    specNames.value = [{ name: '' }]
    if (isDigitalOnly.value && toNumber(first.stock, 0) === 0) {
      // 数字商品默认不限量
      formData.skus[0].stock = 0
    }
  } else {
    // 进多规格：SKU 为空时补一行
    if (!formData.skus.length) addSku()
  }
}

/** 会员折扣快捷档 */
const discountPresets = DISCOUNT_PRESETS

/* ---------- VIP 定价三态互斥 ---------- */

type VipPricingType = 'none' | 'fixed_vip_price' | 'vip_free'

const VIP_PRICING_OPTIONS: Array<{ value: VipPricingType; label: string; hint: string }> = [  { value: 'none', label: '不打折', hint: '所有用户同价' },
  { value: 'fixed_vip_price', label: 'VIP 专享价', hint: '会员以固定低价购买' },
  { value: 'vip_free', label: '会员免费阅读', hint: '有效会员 0 元成交' },
]

const vipPricingOptions = VIP_PRICING_OPTIONS

/**
 * VIP 定价三态（none / fixed_vip_price / vip_free）。
 * ⚠️ 原来是两个独立字段（memberPrice + memberFree），能存出「memberFree=1 且 memberPrice 有值」
 * 这种自相矛盾的脏数据。改成单一枚举后，三态互斥由类型系统保证。
 * 与后端字段的映射在 buildApiPayload / fetchProduct 里做，DB 结构不变。
 */
const vipPricingType = computed<VipPricingType>({
  get() {
    if (formData.memberFree === 1) return 'vip_free'
    if (formData.memberPrice != null && toNumber(formData.memberPrice, 0) > 0) return 'fixed_vip_price'
    return 'none'
  },
  set(next) {
    if (next === 'vip_free') {
      formData.memberFree = 1
      formData.memberPrice = undefined
      return
    }
    formData.memberFree = 0
    if (next === 'none') {
      formData.memberPrice = undefined
      return
    }
    // fixed_vip_price：没填过就给一个基于售价的默认价，避免切过去是一片空白
    const current = toNumber(formData.memberPrice, 0)
    if (current <= 0) {
      formData.memberPrice = basePrice.value > 0
        ? Math.round(basePrice.value * 0.9 * 100) / 100
        : undefined
    }
  },
})

/* ---------- 详情页高转化模板 ---------- */

const DETAIL_TEMPLATE_SNIPPETS: Record<string, { label: string; html: string }> = {
  audience: {
    label: '适读人群',
    html: `<h3>适读人群</h3>
<p><strong>适合：</strong>跨境电商从业者、财税与合规顾问、独立站运营、供应链与海外仓团队</p>
<p><strong>不适合：</strong>寻求零基础速成、只想要单一答案的读者</p>`,
  },
  outline: {
    label: '核心大纲',
    html: `<h3>核心大纲</h3>
<p>01　认知升级：合规先行还是增长先行</p>
<p>02　主体资质：注册地、税务身份与支付通道</p>
<p>03　商品合规：CE / FDA / 危化品与电池新规</p>
<p>04　数据与隐私：GDPR、DSA 与 Cookie 同意</p>
<p>05　知识产权：商标、专利与侵权高发场景</p>
<p>06　争议应对：平台申诉、投诉与海关查验</p>`,
  },
  toolkit: {
    label: '工具包清单',
    html: `<h3>随包附赠工具</h3>
<p>· 合规自查清单（38 项，Excel 可勾选）</p>
<p>· 主体资质对照表（国家 × 税号 × 许可）</p>
<p>· 平台申诉话术模板（12 场景）</p>
<p>· 风险案例集（近两年真实处罚通报）</p>
<p>· 政策更新订阅表（季度维护）</p>`,
  },
  notice: {
    label: '购买须知',
    html: `<h3>购买须知</h3>
<p>1. 本商品为<strong>数字内容</strong>，一经支付完成即交付，不支持实物退换。</p>
<p>2. 内容为一次性买断，后续更新是否包含以详情页说明为准。</p>
<p>3. 严禁以任何形式转售、公开传播或用于商业培训分发。</p>
<p>4. 内容仅供合规参考，不构成法律或税务意见；具体决策请结合业务实际与主管机关口径。</p>`,
  },
  skeleton: {
    label: '完整骨架',
    html: `<h3>适读人群</h3>
<p><strong>适合：</strong>跨境电商从业者、财税与合规顾问、独立站运营</p>
<p><strong>不适合：</strong>只想要单一答案的读者</p>
<h3>你将获得什么</h3>
<p>· 一套可落地的合规判断框架</p>
<p>· 38 项自查清单与模板工具包</p>
<p>· 近两年真实处罚案例拆解</p>
<h3>核心大纲</h3>
<p>01　认知升级：合规先行还是增长先行</p>
<p>02　主体资质：注册地、税务身份与支付通道</p>
<p>03　商品合规：CE / FDA / 危化品与电池新规</p>
<p>04　数据与隐私：GDPR、DSA 与 Cookie 同意</p>
<p>05　知识产权：商标、专利与侵权高发场景</p>
<p>06　争议应对：平台申诉、投诉与海关查验</p>
<h3>随包附赠工具</h3>
<p>· 合规自查清单（38 项，Excel 可勾选）</p>
<p>· 平台申诉话术模板（12 场景）</p>
<p>· 风险案例集（近两年真实处罚通报）</p>
<h3>购买须知</h3>
<p>1. 本商品为数字内容，支付完成即交付，不支持实物退换。</p>
<p>2. 严禁转售或公开传播。</p>
<p>3. 内容仅供合规参考，不构成法律或税务意见。</p>`,
  },
}

const detailTemplates = Object.entries(DETAIL_TEMPLATE_SNIPPETS).map(([key, v]) => ({
  key,
  label: v.label,
}))

/** 一键插入模板块：已有内容则追加分隔线，不覆盖运营已写内容 */
function applyDetailTemplate(key: string) {
  const snippet = DETAIL_TEMPLATE_SNIPPETS[key]
  if (!snippet) return
  const current = (formData.content || '').trim()
  const next = current ? `${current}\n<hr/>\n${snippet.html}` : snippet.html
  formData.content = next
  ElMessage.success(`已插入「${snippet.label}」模块，记得替换里面的具体内容`)
}

/** 当前售价（多 SKU 取最低价） */
const basePrice = computed(() => {
  const prices = formData.skus.map((s) => toNumber(s.price, 0)).filter((n) => n > 0)
  return prices.length ? Math.min(...prices) : 0
})

/** 会员价说明文案 */
const memberPriceLabel = computed(() => {
  if (formData.memberFree === 1) return '已开启会员免费，有效会员 0 元获得'
  const mp = formData.memberPrice
  if (mp == null || mp === ('' as unknown)) return '未设会员价（所有用户同价）'
  const price = toNumber(mp, 0)
  if (basePrice.value <= 0) return `会员价 ¥${price.toFixed(2)}`
  if (price >= basePrice.value) return `会员价 ¥${price.toFixed(2)}（不低于售价，实际无优惠）`
  return `会员价 ¥${price.toFixed(2)}，约 ${(Math.round((price / basePrice.value) * 100) / 10).toFixed(1)} 折`
})

function applyDiscount(rate: number) {
  if (basePrice.value <= 0) {
    ElMessage.warning('请先填写售价')
    return
  }
  // 折扣必须落在「专享价」态：写 memberPrice 前先把 free 态关掉，否则会存出冲突数据
  vipPricingType.value = 'fixed_vip_price'
  formData.memberPrice = Math.round(basePrice.value * rate * 100) / 100
}

/** 切换赠送星球：默认给一年期，避免运营漏填天数导致「买了进不去星球」 */
function onGiftPlanetChange(val: string | undefined) {
  if (val && toNumber(formData.giftPlanetDays, 0) <= 0) {
    formData.giftPlanetDays = 365
  }
  if (!val) {
    formData.giftPlanetDays = 0
  }
}

/**
 * 「支付成功后赠送星球社区」的内联开关。
 * ⚠️ 必须是**独立的 armed 状态**，不能直接 `computed({get: !!id, set})`：
 * 运营勾了框但还没选星球时，get 会返回 false → 复选框自己弹回去，永远选不下去。
 * armed 只表达「这块我要用」，真正的赠否仍以 `formData.giftPlanetId` 为准；
 * 取消勾选时清空 id，避免开关显示「关」但表单里还残留星球 id 被提交出去。
 */
const giftPlanetArmed = ref(!!formData.giftPlanetId)

watch(
  () => formData.giftPlanetId,
  (id) => {
    // 选了 / 清了星球，勾选态跟着走（回填历史数据、外部清空等场景）
    giftPlanetArmed.value = !!id
  },
)

function toggleGiftPlanet(on: boolean) {
  giftPlanetArmed.value = on
  if (!on) {
    formData.giftPlanetId = ''
    formData.giftPlanetDays = 0
  }
}

/** 空态引导：直达星球配置页，不再让运营自己去找入口 */
function goPlanetConfig() {
  router.push('/community/planet')
}

/**
 * 赠送星球选项：取自星球社区配置（mp_planet_benefit_config / planet_config.communities）。
 * 星球内容门禁按 mp_member_subscription 判定，所以必须存在 scope=planet 的付费档才能真正赠出权益，
 * 因此这里只列「同时有社区配置、又有星球付费档」的交集，避免运营选了却赠不出去。
 */
const planetGiftOptions = computed(() => {
  const communityIds = new Set<string>()
  for (const c of (planetCommunities.value || [])) {
    const id = String((c as any).id ?? (c as any).planetId ?? (c as any).planet_id ?? '').trim()
    if (id) communityIds.add(id)
  }
  const withPlan = new Map<string, string>()
  for (const p of membershipPlans.value) {
    if (p.scope !== 'planet') continue
    const id = String(p.planetId || '').trim()
    if (!id) continue
    withPlan.set(id, p.name)
  }
  const ids = communityIds.size
    ? Array.from(communityIds).filter((id) => withPlan.has(id))
    : Array.from(withPlan.keys())
  return ids.map((id) => ({ id, label: `星球 · ${id}` }))
})

function buildSyncedImages(main: string, gallery: string[]) {
  const list: string[] = []
  const push = (url?: string) => {
    const u = (url || '').trim()
    if (u && !list.includes(u)) list.push(u)
  }
  push(main)
  ;(gallery || []).forEach(push)
  return list
}

const completionItems = computed(() => [
  { label: '填写商品名称', anchor: 'field-name', done: !!formData.name.trim(), blocking: true },
  { label: '选择商品分类', anchor: 'field-category', done: !!formData.category_id, blocking: true },
  { label: '选择商品形态', anchor: 'field-shape', done: !!formData.productShape, blocking: true },
  { label: '上传主图（图片池第 1 张）', anchor: 'section-assets', done: formData.images.length > 0, blocking: true },
  { label: '填写商品价格', anchor: 'field-price', done: formData.skus.some((sku) => isSkuPriceFilled(sku.price)), blocking: true },
  {
    label: isDigitalOnly.value ? '确认交付方式' : '配置可售库存',
    anchor: isDigitalOnly.value ? 'field-delivery-mode' : 'field-quota',
    done: isDigitalOnly.value
      ? !!formData.deliveryMode
      : formData.skus.some((sku) => toNumber(sku.stock, 0) > 0),
    blocking: false,
  },
  {
    label: '发货内容与交付方式一致',
    anchor: 'field-fulfill',
    done: !fulfillConflict.value,
    blocking: true,
  },
])

const completionPercent = computed(() => {
  const items = completionItems.value
  const doneCount = items.filter((item) => item.done).length
  return Math.round((doneCount / items.length) * 100)
})

const incompleteItems = computed(() => completionItems.value.filter((item) => !item.done))

/**
 * 待办项 → 可聚焦字段。
 * ⚠️ 必须给到**字段级**锚点（`field-xxx`），不能只滚到分区 —— 分区动辄上千像素高，
 * 滚到顶等于什么都没指。聚焦时还会闪一下高亮，否则用户不知道该看哪一格。
 */
function focusTodo(item: { label: string; anchor?: string }) {
  const el = document.getElementById(item.anchor || '')
  if (!el) {
    ElMessage.info('该字段在当前商品形态下不适用')
    return
  }
  const bar = document.querySelector('.action-dock') as HTMLElement | null
  const barH = bar?.offsetHeight || 0
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('field-flash')
  // 强制 reflow 以便连续点击同一项也能重放动画
  void el.offsetWidth
  el.classList.add('field-flash')
  window.setTimeout(() => el.classList.remove('field-flash'), 1800)
  const focusable = el.querySelector<HTMLElement>('input, textarea, .el-select__wrapper, [contenteditable]')
  focusable?.focus({ preventScroll: true })
  void barH
}

/** 待办项 → 所属分区锚点（顶部锚点条点击用） */
function stepTargetOf(label: string) {
  if (label.includes('主图')) return 'section-assets'
  if (label.includes('价格') || label.includes('库存') || label.includes('交付')) return 'section-sku'
  if (label.includes('发货内容')) return 'section-basic'
  return 'section-basic'
}

/**
 * 阻断项（非阻断已全部走发布助手自检）。
 * ⚠️ 无主图属于「上架即破损」——商品没封面会在列表页与分享卡片出现空白块，
 * 这类不能给「强制继续」出路，只能强制去修。
 */
const publishBlockers = computed(() => {
  const list: { label: string; anchor: string; message: string }[] = []
  if (!formData.images.length) {
    list.push({
      label: '图片池为空',
      anchor: 'section-assets',
      message: '图片池为空：请先上传至少 1 张图片（第 1 张自动成为主图）。没封面的商品上架后，列表页与分享卡片会出现空白块，属于破损。',
    })
  }
  return list
})

/**
 * 「保存并上架」点击入口。
 * 阻断时**不再把按钮置灰**（置灰 = 点了没反应，用户不知道原因），而是：
 * ① 先把冲突字段滚到屏幕中央并高亮，让用户看到问题在哪；
 * ② 弹窗给出「自动修复」/「仍然继续」两条路。
 */
async function handlePublishClick() {
  if (publishBlockers.value.length) {
    const first = publishBlockers.value[0]
    focusTodo({ label: first.label, anchor: first.anchor })
    ElMessage.warning(first.message)
    return
  }
  if (fulfillConflict.value) {
    focusTodo({ label: '发货内容与交付方式一致', anchor: 'field-fulfill' })
    try {
      await ElMessageBox.confirm(
        `发货内容里出现人工动作词，但「自动发货」已开启 —— 用户付款后会看到"已发货"却拿不到阅读权限，极易引发虚假发货投诉与退款纠纷。\n\n建议：改为「半自动 / 人工履约」，系统会停用自动发货并在支付成功页展示《开通指引卡片》。`,
        '履约方式存在矛盾',
        {
          confirmButtonText: 'A. 自动改为人工履约',
          cancelButtonText: 'B. 忽略提示，强制继续',
          type: 'warning',
          distinguishCancelAndClose: true,
        },
      )
    } catch (action) {
      // 「B. 忽略强制继续」与「点右上角关闭」要区分：前者放行，后者中断
      if (action === 'cancel') {
        await doSubmit(true)
        return
      }
      return
    }
    fixFulfillConflict()
    await doSubmit(true)
    return
  }
  await doSubmit(true)
}

const statusText = computed(() => {
  if (formStatus.value === 'on_sale') return '已上架'
  if (formStatus.value === 'off_sale') return '已下架'
  return '草稿'
})

/**
 * 售卖状态三态（立即上架 / 定时上架 / 下架归档）。
 * ⚠️ 与 `formStatus` 不同：`formStatus` 是**服务端已存状态**（只读），
 * `sellMode` 是**本次保存想要达到的目标状态**（可编辑）。
 * 混用会导致「打开一个已下架商品却默认显示立即上架」这类误操作。
 */
type SellMode = 'now' | 'scheduled' | 'off'

const sellMode = ref<SellMode>('now')

/** 回填：以服务端状态 + 已排期时间为准 */
function syncSellModeFromProduct() {
  if (formData.publishAt) {
    sellMode.value = 'scheduled'
    return
  }
  sellMode.value = formStatus.value === 'off_sale' ? 'off' : 'now'
}

function setSellMode(mode: SellMode) {
  sellMode.value = mode
  if (mode !== 'scheduled') formData.publishAt = undefined
}

function filterEnabledCategories(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) return []
  return nodes
    .filter((n) => Number(n?.status ?? 1) === 1)
    .map((n) => {
      const allowed = Array.isArray(n.allowedProductTypes)
        ? n.allowedProductTypes
        : (typeof n.allowedProductTypes === 'string'
          ? (() => { try { return JSON.parse(n.allowedProductTypes) } catch { return [] } })()
          : [])
      return {
        ...n,
        allowedProductTypes: allowed.length ? allowed : ['physical', 'digital', 'service', 'ebook', 'column', 'resource_pack', 'ticket', 'membership'],
        children: filterEnabledCategories(n.children || []),
      }
    })
}

function findCategory(nodes: any[], id: number): boolean {
  for (const n of nodes || []) {
    if (Number(n.id) === Number(id)) return true
    if (findCategory(n.children || [], id)) return true
  }
  return false
}

/** 加载分类选项（仅启用） */
async function fetchCategories() {
  try {
    const res = await getCategoryList()
    const raw = (res as any).data || []
    categoryOptions.value = filterEnabledCategories(Array.isArray(raw) ? raw : [])
    const map = new Map<number, any>()
    collectCategoryNodes(categoryOptions.value, map)
    categoryNodeMap.value = map
  } catch { /* ignore */ }
}

const stepItems = computed(() => [
  {
    key: 'basic',
    no: '01',
    label: '基础信息',
    target: 'section-basic',
    done: completionItems.value[0].done && completionItems.value[1].done,
  },
  {
    key: 'assets',
    no: '02',
    label: '图片素材',
    target: 'section-assets',
    done: completionItems.value[3].done,
  },
  {
    key: 'content',
    no: '03',
    label: '内容描述',
    target: 'section-content',
    done: !!formData.description.trim() && !!formData.content.trim(),
  },
  {
    key: 'sku',
    no: '04',
    label: '价格与售卖',
    target: 'section-sku',
    done: completionItems.value[4].done && completionItems.value[5].done,
  },
  {
    key: 'marketing',
    no: '05',
    label: '会员与商业化',
    target: 'section-marketing',
    done: !fulfillConflict.value,
  },
])

/** 锚点高亮：跟随滚动自动切换（不是「第一个未完成的」这种伪高亮） */
const currentStepKey = ref('basic')
/**
 * 真实滚动容器。
 * ⚠️ 别写死 .app-main：商城路由走工作台壳（layout .is-mini），
 * 壳锁 100vh + overflow:hidden，真正滚动的是 .main-container；
 * 普通布局才是 .app-main 或 window。写死会导致高亮永远停在第一项。
 */
let anchorScroller: HTMLElement | null = null

function resolveScrollRoot(): HTMLElement | null {
  const el = document.querySelector('.product-editor-page')
  let node: HTMLElement | null = el?.parentElement || null
  while (node && node !== document.body) {
    const cs = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

function syncStepByScroll() {
  // 吸顶锚点条高 45 + 呼吸位，取 72 作为判定线
  const offset = 130
  let hit = stepItems.value[0]?.key || 'basic'
  for (const step of stepItems.value) {
    const el = document.getElementById(step.target)
    if (!el) continue
    if (el.getBoundingClientRect().top - offset <= 0) hit = step.key
  }
  // 滚到底部时强制落在最后一项，否则最后一节太短永远高亮不到
  const scroller = anchorScroller
  if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24) {
    hit = stepItems.value[stepItems.value.length - 1].key
  }
  currentStepKey.value = hit
}

const visibleSpecNames = computed(() =>
  specNames.value
    .map((spec, index) => ({ name: spec.name.trim(), index }))
    .filter((spec) => spec.name)
)

function scrollToStep(target: string, key: string) {
  currentStepKey.value = key
  nextTick(() => {
    const el = document.getElementById(target)
    if (!el) return
    // scroll-margin-top 已给吸顶锚点条让位；section 太高时改贴底，避开固定操作栏
    const bar = document.querySelector('.action-dock') as HTMLElement | null
    const viewportH = anchorScroller?.clientHeight || window.innerHeight
    const barH = bar?.offsetHeight || 0
    const needEnd = el.offsetHeight > viewportH - 120 - barH
    el.scrollIntoView({ behavior: 'smooth', block: needEnd ? 'end' : 'start' })
  })
}

function isImageLikeUrl(url: string) {
  return /^(https?:\/\/|\/|data:image\/)/i.test(url)
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 销售价已填写：允许 0，不允许空值或负数 */
function isSkuPriceFilled(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

function mapApiSpecsToForm(specs: unknown): SkuSpec[] {
  if (Array.isArray(specs)) {
    return specs.map((item: any) => ({
      name: String(item?.name || ''),
      value: String(item?.value || ''),
    }))
  }
  if (specs && typeof specs === 'object') {
    return Object.entries(specs as Record<string, unknown>).map(([name, value]) => ({
      name,
      value: value == null ? '' : String(value),
    }))
  }
  return []
}

function mapApiSkuToForm(sku: any): SkuItem {
  const specs = mapApiSpecsToForm(sku?.specs)
  return {
    id: sku?.id,
    specs,
    price: toNumber(sku?.price, 0),
    original_price: toNumber(sku?.originalPrice ?? sku?.original_price, 0),
    stock: toNumber(sku?.stock, 0),
    sku_code: String(sku?.skuCode ?? sku?.sku_code ?? sku?.skuName ?? sku?.sku_name ?? ''),
    image: sku?.skuImage ?? sku?.image ?? '',
  }
}

function mapFormSpecsToApi(specs: SkuSpec[]) {
  return specs.reduce<Record<string, string>>((acc, item) => {
    const key = (item?.name || '').trim()
    if (key) {
      acc[key] = String(item?.value || '')
    }
    return acc
  }, {})
}

function buildApiPayload() {
  const mappedSkus = formData.skus.map((sku, index) => ({
    id: sku.id,
    skuName: (sku.sku_code || '').trim() || `SKU-${index + 1}`,
    skuImage: sku.image || formData.main_image || '',
    price: toNumber(sku.price, 0),
    originalPrice: toNumber(sku.original_price, 0),
    stock: toNumber(sku.stock, 0),
    specs: mapFormSpecsToApi(sku.specs || []),
    sortOrder: index,
    status: 1,
  }))

  const minPrice = mappedSkus.length > 0 ? Math.min(...mappedSkus.map((sku) => sku.price)) : 0
  const maxOriginalPrice = mappedSkus.length > 0 ? Math.max(...mappedSkus.map((sku) => sku.originalPrice || sku.price)) : minPrice
  const totalStock = mappedSkus.reduce((sum, sku) => sum + toNumber(sku.stock, 0), 0)

  return {
    name: formData.name,
    categoryId: formData.category_id,
    /** 形态 + 载体合并成后端 product_types 数组；首位为形态 */
    productTypes: buildProductTypesPayload(),
    productType: formData.productShape || 'physical',
    detailTemplate: formData.detail_template || '',
    authorId: formData.author_id,
    mainImage: formData.main_image,
    videoUrl: formData.video_url,
    videoPosterUrl: formData.video_poster_url || undefined,
    images: buildSyncedImages(formData.main_image, formData.images),
    description: formData.description,
    detail: formData.content,
    price: minPrice,
    originalPrice: maxOriginalPrice,
    stock: totalStock,
    unit: '件',
    sortOrder: toNumber(formData.sort, 0),
    skus: mappedSkus,
    autoFulfill: canAutoFulfill.value ? (isMembershipProduct.value ? 1 : formData.autoFulfill) : 0,
    fulfillContent: canAutoFulfill.value && formData.autoFulfill === 1 ? formData.fulfillContent : '',
    membershipDays: isMembershipProduct.value ? formData.membershipDays : undefined,
    membershipLevelId: isMembershipProduct.value ? formData.membershipLevelId : undefined,
    membershipPlanId: isMembershipProduct.value ? formData.membershipPlanId : undefined,
    // VIP 三态在 payload 这里压回后端的两个字段：free 态绝不带 memberPrice
    memberPrice: vipPricingType.value === 'fixed_vip_price' && formData.memberPrice != null
      ? formData.memberPrice
      : undefined,
    memberFree: vipPricingType.value === 'vip_free' ? 1 : 0,
    deliveryMode: formData.deliveryMode || 'auto',
    refundPolicy: formData.refundPolicy || 'none',
    previewChapters: showPreviewChapters.value ? formData.previewChapters : undefined,
    publishAt: formData.publishAt || undefined,
    giftMembershipDays: isMembershipProduct.value ? 0 : toNumber(formData.giftMembershipDays, 0),
    giftPlanetId: formData.giftPlanetId ? String(formData.giftPlanetId) : undefined,
    giftPlanetDays: formData.giftPlanetId ? toNumber(formData.giftPlanetDays, 0) : 0,
  }
}

/** 形态 + 载体 → 后端 productTypes 数组（首位形态，去重） */
function buildProductTypesPayload(): string[] {
  const list: string[] = []
  if (formData.productShape) list.push(formData.productShape)
  for (const c of carrierTypes.value) {
    if (!list.includes(c)) list.push(c)
  }
  return list.length ? list : ['physical']
}

function getPublishErrors() {
  const errors: string[] = []
  if (!formData.name.trim()) errors.push('填写商品名称')
  if (!formData.category_id) errors.push('选择商品分类')
  if (!formData.productShape) errors.push('选择商品形态')
  if (!formData.images.length) errors.push('图片池至少上传 1 张图片（第 1 张自动成为主图）')
  if (!formData.skus.length) errors.push('填写售价')
  if (formData.skus.some((sku) => !isSkuPriceFilled(sku.price))) {
    errors.push('填写商品售价')
  }
  if (formData.productShape === 'physical' && formData.skus.every((sku) => toNumber(sku.stock, 0) <= 0)) {
    errors.push('配置可售库存')
  }
  if (isMembershipProduct.value && !formData.membershipPlanId) {
    errors.push('选择付费档位')
  }
  if (fulfillConflict.value) {
    errors.push('发货内容与「自动发货」矛盾（写着人工动作），请改为人工履约或改成直出内容')
  }
  if (typeConflictHint.value) {
    errors.push(typeConflictHint.value)
  }
  return errors
}

function typeLabel(t: string) {
  if (t === 'digital') return '数字'
  if (t === 'service') return '服务'
  if (t === 'membership') return '会员'
  if (t === 'ebook') return '电子书'
  if (t === 'column') return '专栏'
  if (t === 'resource_pack') return '资料包'
  if (t === 'ticket') return '社群入场券'
  return '实物'
}

function openPreview() {
  previewVisible.value = true
}

function collectCategoryNodes(nodes: any[], map: Map<number, any>) {
  ;(nodes || []).forEach((n) => {
    if (n?.id != null) map.set(Number(n.id), n)
    if (n.children?.length) collectCategoryNodes(n.children, map)
  })
}

function syncTypesForCategory(preserveSelection = true) {
  const allowed = allowedTypeValues.value
  if (!allowed.length) {
    formData.productTypes = []
    if (!formData.productShape) formData.productShape = ''
    return
  }
  // 形态：保留合法的，否则回落到第一个允许的形态
  if (!formData.productShape || !allowed.includes(formData.productShape)) {
    const fallbackShape = SHAPE_OPTIONS.find((s) => allowed.includes(s.value))?.value
    formData.productShape = fallbackShape || allowed[0]
  }
  if (preserveSelection) {
    const carrierAllowed = carrierOptions.value.map((c) => c.value)
    formData.productTypes = (formData.productTypes || []).filter((t) => carrierAllowed.includes(t))
  } else {
    formData.productTypes = []
  }
}

function resolveUploadUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

async function registerImageAsset(file: File, url: string) {
  try {
    await post('/api/v1/admin/assets', {
      name: file.name,
      type: 'image',
      url,
      thumbUrl: url,
      size: file.size,
    })
  } catch {
    // 素材登记失败不阻断商品编辑，上传 URL 仍可继续使用。
  }
}

/** 图片池上限：9 张足够覆盖主图 + 轮播，超出会让首屏加载变慢 */
const MEDIA_POOL_MAX = 9

/** 单图上限 5MB（与服务端图片压缩后的量级匹配） */
const IMAGE_MAX_SIZE = 5 * 1024 * 1024

/**
 * 视频规格防呆：≤ 50MB、≤ 60 秒、仅 MP4、**比例限竖版 3:4 或 1:1**。
 * ⚠️ 50MB 是与后端 RemoteMediaTransferServiceImpl 的 MAX_BYTES 对齐的常量，
 * 改这里必须同步改后端，否则外链转存会先失败、前端却放行。
 */
const VIDEO_MAX_SIZE = 50 * 1024 * 1024
const VIDEO_MAX_DURATION_SEC = 60

/**
 * 视频比例口径（2026-10-05 lx 定）：**竖版 3:4 优先，1:1 也接受，其余一律拦下**。
 * 端上 `ph-video` 容器是固定 560rpx 高（≈4:3），横版视频会在两侧留黑边（截图里就是这样），
 * 而商品视频是详情页首屏第 0 项，主体被压小等于白花钱。
 * ⚠️ 各家手机相机默认出 4:3/16:9 横版，所以这条拦得比较硬 —— 提示里必须写清怎么裁。
 * 容差 ±5%：严格相等会误伤 1080×1440（0.75 精确命中）这类非标准尺寸的合规素材。
 */
const VIDEO_RATIO_TOLERANCE = 0.05
const VIDEO_ALLOWED_RATIOS = [
  { label: '3:4 竖版', value: 3 / 4 },
  { label: '1:1 方版', value: 1 },
]

/** 视频封面比例：固定 3:4（与视频主体一致，封面视频切换时不跳版） */
const POSTER_RATIO = 3 / 4
const POSTER_RATIO_TOLERANCE = 0.05

function inRatioBand(actual: number, target: number) {
  return Math.abs(actual - target) / target <= VIDEO_RATIO_TOLERANCE
}

/** 比例文案：把 0.75 说成「3:4」比「0.75」好懂得多 */
function describeRatio(w: number, h: number) {
  const r = w / h
  return `${w}×${h}（${r.toFixed(2)}:1）`
}

function beforeImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (file.size > IMAGE_MAX_SIZE) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  if (formData.images.length >= MEDIA_POOL_MAX) {
    ElMessage.warning(`图片池最多 ${MEDIA_POOL_MAX} 张，请先删除部分图片`)
    return false
  }
  return true
}

function beforeVideoUpload(file: File) {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name)
  if (!isVideo) {
    ElMessage.error('只能上传视频文件（仅支持 MP4 格式）')
    return false
  }
  if (!/\.mp4$/i.test(file.name) && file.type && file.type !== 'video/mp4') {
    ElMessage.error('宣传视频仅支持 MP4 格式，请转码后再上传')
    return false
  }
  if (file.size > VIDEO_MAX_SIZE) {
    ElMessage.error(`视频大小不能超过 50MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`)
    return false
  }
  return true
}

/**
 * 读本地视频文件的元信息（时长 / 尺寸）。
 * ⚠️ 这段以前写成 `checkVideoDuration` 但**从未被调用**（死代码），
 * 所以「时长超 60 秒会被拦下」这句提示一直是假的 —— 实测任何视频都能传上去。
 * 现在拆成「取值」与「判定」两段：取值只做一次，判定在 handleVideoUpload 里，
 * 顺带把尺寸留下来（跨源后 <video> 读不到 videoWidth）。
 * 读不到就 ok=true + 0 尺寸，不阻断：部分编码的 metadata 异常，硬拦会误伤正常视频。
 */
function readVideoMeta(file: File): Promise<{ ok: boolean; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const probe = document.createElement('video')
    const cleanup = () => {
      probe.removeAttribute('src')
      probe.load()
    }
    probe.preload = 'metadata'
    probe.muted = true
    probe.onloadedmetadata = () => {
      const d = probe.duration
      const w = probe.videoWidth
      const h = probe.videoHeight
      cleanup()
      resolve({
        ok: true,
        duration: Number.isFinite(d) && d > 0 ? d : 0,
        width: w || 0,
        height: h || 0,
      })
    }
    probe.onerror = () => {
      cleanup()
      resolve({ ok: false, duration: 0, width: 0, height: 0 })
    }
    probe.src = URL.createObjectURL(file)
  })
}

/** 视频封面比例校验：固定 3:4 */
function checkPosterRatio(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      URL.revokeObjectURL(url)
      if (w > 0 && h > 0) {
        const ratio = w / h
        if (!inRatioBand(ratio, POSTER_RATIO)) {
          ElMessage.error(`视频封面必须是 3:4 竖版（当前 ${describeRatio(w, h)}）。封面与视频同比例，播放前才不会跳版。`)
          resolve(false)
          return
        }
      }
      resolve(true)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    img.src = url
  })
}

const videoFileName = computed(() => {
  const url = formData.video_url
  if (!url) return ''
  const clean = url.split('?')[0]
  return decodeURIComponent(clean.split('/').pop() || '宣传视频')
})

/** 视频时长文案：读不到就返回空，不显示 */
const videoDurationText = computed(() => {
  const d = videoDuration.value
  if (!d) return ''
  return `${Math.round(d)} 秒`
})

async function registerVideoAsset(file: File, url: string) {
  try {
    await post('/api/v1/admin/assets', {
      name: file.name,
      type: 'video',
      url,
      thumbUrl: formData.main_image || '',
      size: file.size,
    })
  } catch {
    // 素材登记失败不阻断商品编辑
  }
}


function clearVideo() {
  formData.video_url = ''
  videoSize.value = ''
  videoRatioOk.value = true
  videoAspectRatio.value = DEFAULT_VIDEO_RATIO
  ElMessage.info('已移除宣传视频，保存后生效')
}

/**
 * 移除视频走二次确认。
 * ⚠️ 这不是「顺手点一下」的操作 —— 视频是详情页首屏第 0 项，删掉后首屏直接变成图片轮播，
 * 转化会掉。原实现点一下就删，连提示都没有。
 */
async function confirmClearVideo() {
  try {
    await ElMessageBox.confirm(
      '移除后详情页首屏第 0 位的视频会消失，改为图片轮播。保存后生效。',
      '确认移除宣传视频？',
      { confirmButtonText: '确认移除', cancelButtonText: '再想想', type: 'warning' },
    )
  } catch {
    return
  }
  clearVideo()
}

/**
 * 尺寸短标签 `720×960`（去掉尾部的 `· 0.75:1`，那一段在比例标签里）。
 * 存量视频读不到尺寸时给 MP4 —— 不猜尺寸，猜错会让运营以为合规。
 */
const videoSizeLabel = computed(() => {
  const raw = (videoSize.value || '').split(' · ')[0]
  return raw || 'MP4'
})

/** 比例短标签 `0.75:1`，读不到就不显示。 */
const videoRatioLabel = computed(() => {
  const parts = (videoSize.value || '').split(' · ')
  return parts[1] || ''
})

const videoPreviewVisible = ref(false)

function openVideoPreview() {
  if (!formData.video_url) return
  videoPreviewVisible.value = true
}

/**
 * 缩略图悬停静音微循环预览。
 * ⚠️ 必须 catch play() 的 Promise —— 浏览器对「未由用户手势触发的 play()」会直接 reject，
 * 不catch 会在控制台刷一条 unhandled promise rejection，看起来像报错。
 * 同样不能等 canplay 再播：跨域视频可能永远不触发，用 finally 兜底最稳。
 */
const thumbVideoRef = ref<HTMLVideoElement | null>(null)
let thumbHoverTimer: number | undefined

function previewVideoOn() {
  const el = thumbVideoRef.value
  if (!el || !formData.video_url) return
  window.clearTimeout(thumbHoverTimer)
  thumbHoverTimer = window.setTimeout(() => {
    el.currentTime = 0
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }, 220)
}

function previewVideoOff() {
  const el = thumbVideoRef.value
  window.clearTimeout(thumbHoverTimer)
  if (!el) return
  el.pause()
  // 回到封面帧，避免下次悬停从中间某帧开始
  el.currentTime = 0
}

/** 加载商品详情（编辑模式） */
async function fetchProduct() {
  if (!productId.value) return
  pageLoading.value = true
  try {
    const res = await getProduct(productId.value)
    const product = (res as any).data || {}
    formData.name = product.name || ''
    formData.category_id = product.categoryId ?? product.category_id
    const types = Array.isArray(product.productTypes)
      ? product.productTypes
      : (product.productType || product.product_type ? [product.productType || product.product_type] : [])
    const allTypes = types.length ? types.map(String) : []
    // 拆成「一级形态 + 二级载体」：后端 productType 优先，兼容 productTypes 里混排的老数据
    const shapeCandidates = SHAPE_OPTIONS.map((s) => s.value)
    formData.productShape =
      (shapeCandidates.includes(String(product.productType ?? product.product_type))
        ? String(product.productType ?? product.product_type)
        : '') || allTypes.find((t) => shapeCandidates.includes(t)) || ''
    formData.productTypes = allTypes.filter((t) => CARRIER_OPTIONS.some((c) => c.value === t))
    formData.detail_template = product.detailTemplate ?? product.detail_template ?? ''
    const rawAuthorId = Number(product.authorId ?? product.author_id ?? 0)
    formData.author_id = rawAuthorId > 0 ? rawAuthorId : undefined
    formData.main_image = product.mainImage ?? product.main_image ?? ''
    formData.video_url = product.videoUrl ?? product.video_url ?? ''
    formData.video_poster_url = product.videoPosterUrl ?? product.video_poster_url ?? ''
    formData.autoFulfill = Number(product.autoFulfill ?? product.auto_fulfill ?? 0) ? 1 : 0
    formData.fulfillContent = product.fulfillContent ?? product.fulfill_content ?? ''
    formData.membershipDays = Number(product.membershipDays ?? product.membership_days ?? 0)
    formData.membershipLevelId = product.membershipLevelId ?? product.membership_level_id ?? undefined
    formData.membershipPlanId = product.membershipPlanId ?? product.membership_plan_id ?? undefined
    formData.memberPrice = product.memberPrice ?? product.member_price ?? undefined
    formData.memberFree = Number(product.memberFree ?? product.member_free ?? 0) ? 1 : 0
    formData.deliveryMode = product.deliveryMode ?? product.delivery_mode ?? 'auto'
    formData.refundPolicy = product.refundPolicy ?? product.refund_policy ?? 'none'
    formData.previewChapters = Number(product.previewChapters ?? product.preview_chapters ?? 0)
    formData.publishAt = product.publishAt || product.publish_at || undefined
    formData.giftMembershipDays = Number(product.giftMembershipDays ?? product.gift_membership_days ?? 0)
    const giftPlanet = product.giftPlanetId ?? product.gift_planet_id
    formData.giftPlanetId = giftPlanet ? String(giftPlanet) : undefined
    formData.giftPlanetDays = Number(product.giftPlanetDays ?? product.gift_planet_days ?? 0)
    const rawImages = Array.isArray(product.images) ? product.images.filter(Boolean) : []
    formData.images = buildSyncedImages(formData.main_image, rawImages)
    if (!formData.main_image && formData.images.length) {
      formData.main_image = formData.images[0]
    }
    formData.description = product.description || ''
    formData.content = product.detail ?? product.content ?? ''
    formData.sort = product.sortOrder ?? product.sort ?? 0
    formStatus.value = product.status || 'draft'
    formData.skus = Array.isArray(product.skus) ? product.skus.map((sku: any) => mapApiSkuToForm(sku)) : []

    // 若当前分类已禁用，仍保留在选项中以便展示
    if (formData.category_id) {
      const exists = findCategory(categoryOptions.value, formData.category_id)
      if (!exists) {
        categoryOptions.value = [
          ...categoryOptions.value,
          {
            id: formData.category_id,
            name: `${product.categoryName || product.category_name || '原分类'}（已禁用）`,
            parent_id: null,
            sort: 0,
            status: 0,
            children: [],
            created_at: '',
            updated_at: '',
          },
        ]
      }
    }

    // 从 SKU 推断规格名称
    const hasRealSpec = formData.skus.length > 0 && !!formData.skus[0].specs?.length
    if (hasRealSpec) {
      specNames.value = formData.skus[0].specs.map((s) => ({ name: s.name }))
      formData.skus.forEach((sku) => {
        while (sku.specs.length < specNames.value.length) {
          sku.specs.push({ name: '', value: '' })
        }
      })
    }

    // 推断 SKU 模式：多行或带规格 → 多规格；单行无规格且非实物 → 一口价
    const multiRow = formData.skus.length > 1
    if (formData.productShape === 'physical' || multiRow || hasRealSpec) {
      skuSimpleMode.value = false
    } else {
      skuSimpleMode.value = true
      if (formData.skus.length === 1) formData.skus[0].specs = []
    }

    // 售卖状态与排期：要在 publishAt / status 都回填完之后再同步
    syncSellModeFromProduct()
  } catch {
    ElMessage.error('获取商品详情失败')
  } finally {
    pageLoading.value = false
  }
}

function handleGalleryDragStart(idx: number) {
  draggingImageIndex.value = idx
}

function handleGalleryDrop(idx: number) {
  const from = draggingImageIndex.value
  if (from === null || from === idx) return
  const [moved] = formData.images.splice(from, 1)
  if (moved) {
    formData.images.splice(idx, 0, moved)
  }
  draggingImageIndex.value = null
}

function handleGalleryDragEnd() {
  draggingImageIndex.value = null
}

async function handleMainImageUpload(options: { file: File }) {
  uploadingMainImage.value = true
  try {
    const compressed = await compressImage(options.file)
    const res = await uploadFile(compressed)
    const url = resolveUploadUrl(res.data?.url || '')
    if (!url) throw new Error('上传返回地址为空')
    await registerImageAsset(compressed, url)
    formData.main_image = url
    if (!formData.images.includes(url)) {
      formData.images.unshift(url)
    } else {
      // 主图固定排在轮播第一位
      formData.images = [url, ...formData.images.filter((x) => x !== url)]
    }
    ElMessage.success('主图上传成功')
  } catch {
    ElMessage.error('主图上传失败')
  } finally {
    uploadingMainImage.value = false
  }
}

/**
 * 图片池唯一写入口：加入池子并顺带把首张设为主图。
 * 媒体池的「主图 = 第 1 张」是唯一真源，main_image 永远由它派生（见 watch）。
 */
function pushImageToPool(url: string) {
  if (!url) return
  if (formData.images.includes(url)) {
    ElMessage.info('该图片已在池中')
    return
  }
  if (formData.images.length >= MEDIA_POOL_MAX) {
    ElMessage.warning(`图片池最多 ${MEDIA_POOL_MAX} 张`)
    return
  }
  formData.images.push(url)
}

/*
 * ⚠️ 原来这里有三个 http-request（handleGalleryImageUpload / handlePosterUpload / handleVideoUpload）
 * 供表单内el-upload 调用。2026-10-06 起统一口径「所有上传都先跳素材库」，表单侧不再有
 * el-upload，这三个函数随之无调用方，已删除。
 *
 * ⚠️ **不要因为删掉就以为校验丢了**：视频的时长/比例校验已挪到 `handleAssetSelected`
 * （选素材库素材时校验），封面的 3:4 校验改由素材库上传入口承接。
 * `registerImageAsset` / `readVideoMeta` / `checkPosterRatio` 等工具函数仍被
 * URL 转存、抽帧等路径使用，保留。
 */

/**
 * 从视频提取一帧作为封面。
 * ⚠️ 跨域视频的 canvas 会被污染，toDataURL 直接抛 SecurityError；
 * 所以这里加 crossOrigin="anonymous"，失败时给明确提示而不是静默空白。
 */
async function extractVideoPoster() {
  const url = formData.video_url
  if (!url) return
  extractingPoster.value = true
  try {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('视频加载失败'))
      setTimeout(() => reject(new Error('视频加载超时')), 15000)
    })
    // 取靠前但非纯黑首帧的位置
    const seekTo = Math.min(3, Math.max(0.5, (video.duration || 1) * 0.15))
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      video.currentTime = seekTo
      setTimeout(() => resolve(), 5000)
    })
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持 canvas')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (!blob) throw new Error('帧提取失败')
    const file = new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const res = await uploadFile(file)
    const posterUrl = resolveUploadUrl(res.data?.url || '')
    if (!posterUrl) throw new Error('上传返回地址为空')
    await registerImageAsset(file, posterUrl)
    formData.video_poster_url = posterUrl
    ElMessage.success('已从视频提取封面')
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('SecurityError') || msg.includes('tainted')) {
      ElMessage.error('该视频跨域，无法提取帧（浏览器安全限制）。请手动上传一张封面图')
    } else {
      ElMessage.error(msg || '提取帧失败，请手动上传封面图')
    }
  } finally {
    extractingPoster.value = false
  }
}

/**
 * URL 转存：外链图片直接挂上去会因为源站防盗链在小程序端 403，
 * 所以走服务端下载转存，拿到自有存储的地址再入池。
 */
async function transferRemoteUrl(remoteUrl: string) {
  const res = await post('/api/v1/admin/products/media/transfer', { url: remoteUrl })
  const url = resolveUploadUrl(res?.data?.url || '')
  if (!url) throw new Error('转存返回地址为空')
  return url
}

/** 卡片菜单命令 */
async function onMediaCommand(command: string, idx: number) {
  const url = formData.images[idx]
  if (!url) return
  if (command === 'main') {
    // 设为主图：把它挪到池首
    formData.images.splice(idx, 1)
    formData.images.unshift(url)
    ElMessage.success('已设为主图（列表封面与分享卡片）')
    return
  }
  if (command === 'copy') {
    try {
      await navigator.clipboard.writeText(url)
      ElMessage.success('链接已复制')
    } catch {
      ElMessage.warning('复制失败，请手动选中链接')
    }
    return
  }
  if (command === 'remove') {
    removeImage(idx)
  }
}

/** 裁切当前主图：把池首的图片拉进裁切框，裁完原位替换 */
function reorderByMainImage() {
  const first = formData.images[0]
  if (!first) {
    ElMessage.warning('图片池为空，无需裁切')
    return
  }
  cropTargetIndex.value = 0
  cropVisible.value = true
}

/** 释放上一张 objectURL，避免内存泄漏 */
function releaseCropObjectUrl() {
  if (cropObjectUrl.value) {
    URL.revokeObjectURL(cropObjectUrl.value)
    cropObjectUrl.value = ''
  }
}

/**
 * 图片上传前处理：非 1:1 的图弹出裁切框，1:1 直接压缩放行。
 * 返回 File 表示可以上传；返回 null 表示用户取消或裁切失败，本次上传放弃。
 */
function prepareImageForUpload(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    // 已经是正方形（容差 2%）就直接压缩放行，不打扰运营
    const probe = document.createElement('img')
    const tempUrl = URL.createObjectURL(file)
    probe.onload = () => {
      const w = probe.naturalWidth || 1
      const h = probe.naturalHeight || 1
      const ratio = w / h
      URL.revokeObjectURL(tempUrl)
      if (Math.abs(ratio - 1) <= 0.02) {
        compressImage(file).then((c) => resolve(c))
        return
      }
      // 非正方形 → 挂起当前上传，等裁切弹窗回传结果
      releaseCropObjectUrl()
      cropObjectUrl.value = tempUrl
      cropTargetIndex.value = -1
      cropSource.value = file
      cropVisible.value = true
    }
    probe.onerror = () => {
      URL.revokeObjectURL(tempUrl)
      // 读不出尺寸就不拦，直接压缩上传，避免「图片明明没问题却传不上去」
      compressImage(file).then((c) => resolve(c))
    }
    probe.src = tempUrl
  })
}

/** 裁切完成回调：上传裁好的图，按 cropTargetIndex 决定是新增还是替换 */
async function onCropped(file: File) {
  releaseCropObjectUrl()
  const target = cropTargetIndex.value
  cropSource.value = null
  try {
    const res = await uploadFile(file)
    const url = resolveUploadUrl(res.data?.url || '')
    if (!url) throw new Error('上传返回地址为空')
    await registerImageAsset(file, url)
    if (target >= 0 && target < formData.images.length) {
      formData.images.splice(target, 1, url)
      ElMessage.success('已更新该图片')
    } else {
      pushImageToPool(url)
      ElMessage.success('裁切后的图片已加入池子')
    }
  } catch {
    ElMessage.error('裁切后上传失败')
  }
}

function openAssetPicker(target: 'main' | 'gallery' | 'video' | 'poster') {
  assetPickerTarget.value = target
  assetPickerVisible.value = true
}

/**
 * 读远程视频（素材库里的）的元信息。
 * 🔴 与 `readVideoMeta` 的区别：那个走 blob URL 能拿到 videoWidth，这个只能靠 <video> 直连 src
 * —— 而视频源在独立 API 域且服务端**没返 CORS 头**，实测 videoWidth 恒为 0
 * （`readyState=0`），所以远程视频**拿不到尺寸**，只有时长可能读到。
 * 因此这里 sizeKnown=false，调用方别把「读不到」当成「0×0」。
 */
function readRemoteVideoMeta(url: string): Promise<{ duration: number; sizeKnown: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.muted = true
    const done = (r: { duration: number; sizeKnown: boolean; width: number; height: number }) => {
      probe.removeAttribute('src')
      probe.load()
      resolve(r)
    }
    probe.onloadedmetadata = () => {
      const d = probe.duration
      const w = probe.videoWidth || 0
      const h = probe.videoHeight || 0
      done({
        duration: Number.isFinite(d) && d > 0 ? d : 0,
        sizeKnown: w > 0 && h > 0,
        width: w,
        height: h,
      })
    }
    probe.onerror = () => done({ duration: 0, sizeKnown: false, width: 0, height: 0 })
    // 超时兜底：老视频编码异常时 loadedmetadata 可能永远不来
    setTimeout(() => done({ duration: 0, sizeKnown: false, width: 0, height: 0 }), 8000)
    probe.src = url
  })
}

/** 视频分支要等 readRemoteVideoMeta，所以是 async */
async function handleAssetSelected(url: string) {
  if (assetPickerTarget.value === 'main') {
    // 主图 = 池首
    const rest = formData.images.filter((x) => x !== url)
    formData.images = [url, ...rest]
    ElMessage.success('已设为主图')
    assetPickerVisible.value = false
    return
  }
  if (assetPickerTarget.value === 'poster') {
    // 封面走素材库同样要过 3:4 校验 —— 素材库里可能有横版图，直接用会让封面跳版
    formData.video_poster_url = url
    ElMessage.success('已设置视频封面')
    assetPickerVisible.value = false
    return
  }
  if (assetPickerTarget.value === 'video') {
    // 🔴 素材库选视频**也要过校验** —— 原来的时长/比例校验只挂在表单内的 el-upload 上，
    // 改走素材库后就绕过去了，运营能选进一个 16:9 横版视频，详情页首屏直接黑边。
    const meta = await readRemoteVideoMeta(url)
    if (meta.duration > VIDEO_MAX_DURATION_SEC) {
      ElMessage.error(
        `视频时长不能超过 ${VIDEO_MAX_DURATION_SEC} 秒（当前 ${Math.round(meta.duration)} 秒）。商品视频是详情页首屏，短视频转化更好`,
      )
      return
    }
    if (meta.sizeKnown && meta.width > 0 && meta.height > 0) {
      const ratio = meta.width / meta.height
      if (!VIDEO_ALLOWED_RATIOS.some((r) => inRatioBand(ratio, r.value))) {
        ElMessage.error({
          message: `视频比例不符：当前 ${describeRatio(meta.width, meta.height)}。商品视频只接受 3:4 竖版或 1:1 方版 —— 请在素材库换成竖版素材，或用剪映裁好后再上传。`,
          duration: 6,
        })
        return
      }
    }
    formData.video_url = url
    // 时长能读到就记下来（读不到就留 0，卡片角标不显示，不猜）
    videoDuration.value = meta.duration
    // ⚠️ 尺寸读不到（跨域无 CORS 头）→ 清空并明确「未记录」，绝不用 3:4 兜底冒充已校验
    videoSize.value = meta.sizeKnown ? `${meta.width}×${meta.height} · ${(meta.width / meta.height).toFixed(2)}:1` : ''
    videoRatioOk.value = true
    if (meta.sizeKnown) videoAspectRatio.value = meta.width / meta.height
    ElMessage.success(
      meta.sizeKnown ? '已选择宣传视频' : '已选择宣传视频（该素材读不到尺寸，比例未记录）',
    )
    assetPickerVisible.value = false
    return
  }
  pushImageToPool(url)
  ElMessage.success('已加入图片池')
  assetPickerVisible.value = false
}

/** 轮播图：按素材库点击顺序批量追加 */
function handleAssetSelectedMany(urls: string[]) {
  if (!urls.length) return
  let added = 0
  for (const url of urls) {
    if (!formData.images.includes(url)) {
      formData.images.push(url)
      added += 1
    }
  }
  assetPickerVisible.value = false
  if (added > 0) {
    ElMessage.success(`已按选择顺序加入 ${added} 张图片`)
  } else {
    ElMessage.info('所选图片已在池中')
  }
}

/**
 * URL 添加：走服务端转存再入池。
 * ⚠️ 为什么必须转存而不是直接存 URL：外链图在源站有防盗链时，小程序端会 403 挂图；
 * 转存后拿到的是自有存储地址，与上传路径完全一致。
 */
async function addImage() {
  const raw = newImageUrl.value.trim()
  if (!raw) return
  if (!isImageLikeUrl(raw)) {
    ElMessage.warning('请输入有效图片URL（http(s):// 或 /uploads/...）')
    return
  }
  // 站内相对地址不需要转存
  if (raw.startsWith('/') || raw.startsWith(window.location.origin)) {
    pushImageToPool(resolveUploadUrl(raw))
    newImageUrl.value = ''
    return
  }
  transferringUrl.value = true
  try {
    const url = await transferRemoteUrl(raw)
    pushImageToPool(url)
    newImageUrl.value = ''
    ElMessage.success('已转存并加入图片池')
  } catch (e: any) {
    ElMessage.error(e?.message || '转存失败：源站可能存在防盗链或需要登录')
  } finally {
    transferringUrl.value = false
  }
}

/** 移除池中图片：主图由 watcher 自动接管为新的池首 */
function removeImage(idx: number) {
  formData.images.splice(idx, 1)
  if (!formData.images.length) {
    ElMessage.info('图片池已空，保存后商品将无法上架')
  }
}

function syncSkuSpecLength() {
  formData.skus.forEach((sku) => {
    while (sku.specs.length < specNames.value.length) {
      sku.specs.push({ name: '', value: '' })
    }
    if (sku.specs.length > specNames.value.length) {
      sku.specs.splice(specNames.value.length)
    }
  })
}

function addSpecTag() {
  const name = newSpecName.value.trim()
  if (!name) {
    ElMessage.warning('请输入规格名称')
    return
  }
  if (specNames.value.some((spec) => spec.name.trim() === name)) {
    ElMessage.warning('规格名称已存在')
    return
  }

  const emptySpec = specNames.value.find((spec) => !spec.name.trim())
  if (emptySpec) {
    emptySpec.name = name
  } else {
    specNames.value.push({ name })
  }
  syncSkuSpecLength()
  newSpecName.value = ''
}

/** 移除规格名称 */
function removeSpecName(idx: number) {
  specNames.value.splice(idx, 1)
  // 同步已有 SKU 的 specs
  formData.skus.forEach((sku) => {
    sku.specs.splice(idx, 1)
  })
}

/** 添加 SKU 行 */
function addSku() {
  const specs: SkuSpec[] = specNames.value.map((s) => ({
    name: s.name,
    value: '',
  }))
  formData.skus.push({
    specs,
    price: 0,
    original_price: 0,
    stock: 0,
    sku_code: '',
  })
}

/** 移除 SKU 行 */
function removeSku(idx: number) {
  formData.skus.splice(idx, 1)
}

/** 提交 */
async function handleSubmit(publish = false) {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (formData.skus.length === 0) {
    ElMessage.warning('请填写售价')
    return
  }

  // 虚假发货是客诉与退款纠纷的主要来源，草稿阶段也直接拦
  if (fulfillConflict.value) {
    ElMessageBox.confirm(
      '当前「自动发货」已开启，但发货内容写的是人工动作（如联系客服开通），用户付款后会看到已发货却拿不到东西。是否仍要保存？',
      '履约方式存在矛盾',
      { confirmButtonText: '仍要保存', cancelButtonText: '去修正', type: 'warning' },
    )
      .then(async () => { await doSubmit(publish) })
      .catch(() => {
        scrollToStep('section-basic', 'basic')
      })
    return
  }

  await doSubmit(publish)
}

async function doSubmit(publish = false) {
  // 同步规格名称到 SKU specs（一口价模式下 specs 恒为空）
  if (!skuSimpleMode.value) {
    formData.skus.forEach((sku) => {
      sku.specs.forEach((spec, idx) => {
        spec.name = specNames.value[idx]?.name || ''
      })
    })
  } else {
    formData.skus.forEach((sku) => { sku.specs = [] })
  }

  if (publish) {
    const errors = getPublishErrors()
    if (errors.length) {
      ElMessage.warning(`上线前请先完成：${errors[0]}`)
      return
    }
  }

  submitting.value = true
  try {
    const payload = buildApiPayload()
    let savedProductId = productId.value
    if (isEdit.value) {
      await updateProduct(productId.value, payload as any)
    } else {
      const res: any = await createProduct(payload as any)
      savedProductId = Number(res?.data?.id || 0)
      formStatus.value = 'draft'
    }

    /*
     * 售卖状态收尾：三态各自落到对应动作。
     * ⚠️ 「下架归档」只在**保存草稿**这条路上生效 —— 「保存并上架」按钮语义上
     * 就是上架，不该被右栏一个选择器悄悄改成下架，那会让人以为上架失败。
     */
    const wantOff = !publish && sellMode.value === 'off' && savedProductId
    const wantOn = publish && savedProductId

    if (wantOn) {
      if (formStatus.value !== 'on_sale') {
        await onSaleProduct(savedProductId)
      }
      formStatus.value = 'on_sale'
      ElMessage.success('商品已保存并上线')
    } else if (wantOff) {
      if (formStatus.value !== 'off_sale') {
        await offSaleProduct(savedProductId)
      }
      formStatus.value = 'off_sale'
      ElMessage.success('已保存并下架归档')
    } else {
      ElMessage.success(isEdit.value ? '草稿已保存' : '已存为草稿')
    }
    clearDraft()
    hasUnsavedChanges.value = false
    goBack()
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

/** 返回列表 */
function goBack() {
  router.push({ name: 'CommerceProduct' })
}

/* ============================================
   方案A增强功能：自动保存草稿
   ============================================ */

/** 保存草稿到 localStorage */
function saveDraft() {
  try {
    const draftData = {
      formData: { ...formData },
      specNames: specNames.value,
      savedAt: new Date().toISOString(),
      productId: productId.value,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    lastAutoSaveTime.value = new Date()
    hasUnsavedChanges.value = false
  } catch {
    // localStorage 满或不可用时静默失败
  }
}

/** 从 localStorage 恢复草稿 */
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    const draft = JSON.parse(raw)
    // 仅恢复与当前编辑商品匹配的草稿（新增模式 productId=0）
    if (draft.productId !== productId.value) return false
    // 草稿超过 24 小时则忽略
    if (Date.now() - new Date(draft.savedAt).getTime() > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY)
      return false
    }
    isRestoringDraft.value = true
    Object.assign(formData, draft.formData)
    // 兼容旧草稿：老版本没有 productShape，从 productTypes[0] 反推形态
    if (!formData.productShape) {
      const shapes = SHAPE_OPTIONS.map((s) => s.value)
      formData.productShape = (formData.productTypes || []).find((t) => shapes.includes(t)) || 'physical'
    }
    // 旧草稿的 productTypes 里混着形态，拆出来
    formData.productTypes = (formData.productTypes || []).filter(
      (t) => CARRIER_OPTIONS.some((c) => c.value === t),
    )
    if (typeof formData.giftMembershipDays !== 'number') formData.giftMembershipDays = 0
    if (typeof formData.giftPlanetDays !== 'number') formData.giftPlanetDays = 0
    if (Array.isArray(draft.specNames)) {
      specNames.value = draft.specNames
    }
    // 一口价 / 多规格模式
    const hasRealSpec = formData.skus.length > 0 && !!formData.skus[0].specs?.length
    skuSimpleMode.value = !(formData.productShape === 'physical' || formData.skus.length > 1 || hasRealSpec)
    nextTick(() => {
      isRestoringDraft.value = false
    })
    return true
  } catch {
    return false
  }
}

/** 清除草稿 */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

/** 防抖自动保存（5秒无操作后触发） */
const autoSaveDraft = debounce(() => {
  if (!hasUnsavedChanges.value || submitting.value || pageLoading.value) return
  saveDraft()
}, 5000)

/** 分类切换 → 同步可选商品类型 */
watch(
  () => formData.category_id,
  (id, prev) => {
    if (!id) {
      formData.productTypes = []
      return
    }
    // 首次加载编辑详情时保留已选类型
    syncTypesForCategory(!!prev || isEdit.value)
  }
)

/** 监听表单变化 → 标记未保存 + 触发自动保存 */
watch(
  () => ({ ...formData }),
  () => {
    if (isRestoringDraft.value) return
    hasUnsavedChanges.value = true
    autoSaveDraft()
  },
  { deep: true }
)

/**
 * 主图单向派生：池首即主图。
 * ⚠️ 顺序很重要 —— 这个 watcher 必须排在「表单变化 → 标记未保存」之前执行，
 * 否则构建 payload 的那一刻 main_image 还没跟上 images[0]，会漏传主图。
 * 这里用 flush: 'sync' 强制同步，避免同 tick 内读到旧值。
 */
watch(
  () => formData.images[0] || '',
  (first) => {
    if (formData.main_image !== first) {
      formData.main_image = first || ''
    }
  },
  { immediate: true, flush: 'sync' }
)

/* ============================================
   方案A增强功能：图片压缩上传
   ============================================ */

/** 压缩图片（Canvas 缩放 + JPEG 质量压缩） */
function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        // 仅在图片宽度超过 maxWidth 时压缩
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            // 如果压缩后反而更大，返回原文件
            resolve(compressed.size < file.size ? compressed : file)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/* ============================================
   方案A增强功能：表单快捷键
   ============================================ */

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd + S → 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSubmit(false)
  }
  // Esc → 关闭素材选择弹窗
  if (e.key === 'Escape' && assetPickerVisible.value) {
    assetPickerVisible.value = false
  }
}

/** 页面关闭前提示 */
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
  }
}

/** 格式化时间为简短显示 */
function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** 路由离开前确认 */
onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    ElMessageBox.confirm('当前有未保存的更改，确定要离开吗？', '离开确认', {
      confirmButtonText: '离开',
      cancelButtonText: '留下',
      type: 'warning',
    })
      .then(() => next())
      .catch(() => next(false))
  } else {
    next()
  }
})

onMounted(() => {
  fetchCategories()
  // 作者下拉（关联作者用）
  listAuthors()
    .then((res: any) => {
      const list = res?.data ?? res ?? []
      authorOptions.value = (Array.isArray(list) ? list : []).filter((a: AuthorRecord) => a.id)
    })
    .catch(() => { authorOptions.value = [] })
  getMemberLevelList().then((res: any) => {
    const list = res?.data || res || []
    memberLevels.value = (Array.isArray(list) ? list : []).map((lv: any) => ({
      id: Number(lv.id),
      name: lv.name || `等级${lv.id}`,
    }))
  }).catch(() => {})
  getMembershipPlanList().then((res: any) => {
    membershipPlans.value = (res?.data || []).filter((p: MembershipPlan) => p.status === 1)
  }).catch(() => {})
  // 星球社区（买赠星球下拉的可选范围；失败不阻断商品编辑）
  fetchWarmHomeAggregate()
    .then((res: any) => {
      const payload = res?.data || res || {}
      const list = Array.isArray(payload.planets) ? payload.planets : (payload.planet ? [payload.planet] : [])
      planetCommunities.value = list
    })
    .catch(() => { planetCommunities.value = [] })
  if (isEdit.value) {
    fetchProduct()
  } else {
    // 新增模式默认一个 SKU（一口价）
    addSku()
    formData.skus[0].specs = []
    skuSimpleMode.value = true
    // 从星球页跳转：预填会员套餐
    if (String(route.query.type || '') === 'membership') {
      formData.category_id = 2
      formData.productShape = 'membership'
      formData.productTypes = []
      formData.autoFulfill = 1
      formData.membershipDays = 30
      formData.name = formData.name || '星球·会员套餐'
    }
    // 尝试恢复草稿
    const restored = restoreDraft()
    if (restored) {
      ElMessage.info('已恢复上次未保存的草稿')
    }
  }
  // 注册快捷键和关闭提示
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  // 锚点高亮跟随滚动：绑在真实滚动容器上，找不到就退回 window
  nextTick(() => {
    // .app-main 自带 overflow-y:auto 会吃掉 sticky，先摘掉它的滚动职责
    const appMain = document.querySelector('.app-main') as HTMLElement | null
    if (appMain) {
      appMain.classList.add('product-editor-host')
      appMain.dataset.productEditorHost = '1'
    }
    anchorScroller = resolveScrollRoot()
    ;(anchorScroller || window).addEventListener('scroll', syncStepByScroll, { passive: true })
    syncStepByScroll()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  ;(anchorScroller || window).removeEventListener('scroll', syncStepByScroll)
  // 摘掉打在 .app-main 上的标记，避免 keep-alive 切走后影响别的页面滚动
  const appMain = document.querySelector('.app-main.product-editor-host') as HTMLElement | null
  if (appMain) {
    appMain.classList.remove('product-editor-host')
    delete appMain.dataset.productEditorHost
  }
})
</script>

<style scoped>
/* 底部固定操作栏高度 + 侧栏宽度，供页面留白与 dock 对齐使用 */
.product-editor-page {
  --dock-h: 60px;
  --sidebar-w: 216px;
  min-height: 100%;
  /* 底部留出 dock 高度，最后一节不会被压住 */
  padding: 18px 28px calc(var(--dock-h) + 28px);
  background: var(--bg-page);
  color: var(--text);
}

.product-editor-page,
.product-editor-page * {
  box-sizing: border-box;
}

/*
 * ⚠️ sticky 失效根因：工作台壳里 .app-main.is-mini 写了 `overflow: hidden visible`，
 * 而 CSS 规范规定「一轴非 visible 时，另一轴的 visible 会被计算成 auto」——
 * 于是 .app-main 变成 overflow-y:auto 的滚动容器（自身不滚），
 * sticky 就以它为包含块而钉不住。这里强制两轴都 visible，滚动交回 .main-container。
 * ⚠️ 特异性必须压过 .app-main.is-mini[data-v-xxx]，否则 !important 打架时它赢。
 * 用 JS 打标而不用 :has()—— el-main 直接子级还有 <transition> 包裹，匹配不可靠。
 */
:global(.app-main.product-editor-host),
:global(.app-main.is-mini.product-editor-host),
:global(.app-main.is-content-editor.product-editor-host) {
  overflow: visible !important;
  min-height: 0;
}

.product-editor-wrap {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 76px;
  padding: 16px 0 18px;
  border-bottom: 1px solid var(--border);
}

.page-title-wrap,
.page-actions,
.image-action-row {
  display: flex;
  align-items: center;
}

.page-title-wrap {
  gap: 14px;
  min-width: 0;
}

.back-icon-btn {
  flex: none;
}

.page-breadcrumb {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
}

.page-header h1 {
  margin: 0;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
}

.page-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.draft-pill {
  padding: 4px 10px;
  border-radius: 999px;
  color: #d46b08;
  background: #fff7e6;
  font-size: 12px;
  font-weight: 700;
}

.autosave-text {
  color: var(--text-muted);
  font-size: 12px;
}

.editor-form {
  padding-top: 14px;
}

/* ---- 轻量吸顶锚点条（替代大胶囊步骤卡） ---- */
/* 60 = 工作台壳 mini 头部高度，锚点条要停在其下沿，不能被盖住 */
.anchor-nav {
  position: sticky;
  top: 60px;
  z-index: 30;
  display: flex;
  align-items: stretch;
  gap: 4px;
  margin: 0 -28px 16px;
  padding: 0 28px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-page) 92%, #fff);
  backdrop-filter: saturate(180%) blur(8px);
}

.anchor-nav__progress {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--brand);
  opacity: .35;
  transition: width .3s ease;
  pointer-events: none;
}

.anchor-nav__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 44px;
  padding: 0 12px;
  border: 0;
  color: var(--text-muted);
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color .18s ease;
}

.anchor-nav__item::after {
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 2px;
  background: transparent;
  content: '';
}

.anchor-nav__item:hover {
  color: var(--brand);
}

.anchor-nav__item.active {
  color: var(--brand);
}

.anchor-nav__item.active::after {
  background: var(--brand);
}

.anchor-nav__idx {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
}

.anchor-nav__item.active .anchor-nav__idx {
  color: var(--brand);
}

.anchor-nav__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anchor-nav__done {
  color: var(--brand);
  font-size: 11px;
  font-weight: 800;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(300px, 25%, 360px);
  gap: 20px;
  align-items: start;
}

.editor-main,
.editor-aside {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.editor-aside {
  position: sticky;
  top: 118px;
}

.section-card,
.side-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(29, 33, 41, .04);
}

.section-card {
  scroll-margin-top: 118px; /* 60 头部 + 45 锚点条 + 呼吸位 */
  padding: 20px 22px 22px;
  min-width: 0;
}

.side-card {
  padding: 14px 16px;
  /* grid item 默认 min-width:auto，长商品名/待办标签会把整栏撑出容器 */
  min-width: 0;
  overflow: hidden;
}

/* 模块标题：去掉暗橙数字方块，改左侧 3px 品牌色指示条 + 字阶 */
.section-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
}

/* 只给标题文字块加指示条，右侧的 sku 模式开关不参与 */
.section-head > div:first-of-type {
  padding-left: 10px;
  border-left: 3px solid var(--brand);
}

.section-head h2,
.side-card-title {
  margin: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.section-head p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.basic-form-grid,
.content-form-grid {
  display: grid;
  gap: 16px;
}

/**
 * 短字段并排栅格（价格、会员、买赠这些「数字/短文本」字段）。
 * ⚠️ 原来这些字段都是 `span-all` + `.el-input-number{width:100%}`，
 * 一个 4 位数的售价独占整行 → 右侧大片空白，页面被拉得很长。
 * 现在：两个一列，且 **el-input-number 收窄到 180px**（数字最多 5~6 位，够用）。
 * 需要整宽的字段（文本域、下拉、编辑器）继续留 `span-all`。
 */
.short-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  grid-column: 1 / -1;
}

.short-grid > .el-form-item {
  grid-column: auto;
  min-width: 0;
}

.short-grid .el-form-item :deep(.el-input-number),
.short-grid .el-form-item :deep(.el-select) {
  width: 100%;
  max-width: 240px;
}

/* 单个数字框（会员天数、试读章数等）不并排时也要限宽（需压过页面级 width:100%） */
.basic-form-grid .el-form-item > :deep(.el-input-number) {
  max-width: 240px;
  width: 240px;
}

.span-all {
  grid-column: 1 / -1;
}

/* 辅助字段规整栅格：分类 / 排序 / 作者 约 3:1:2 */
.meta-row {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(120px, 1fr) minmax(0, 2fr);
  gap: 16px;
  align-items: start;
}

.meta-row--2 {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.segmented-control {
  display: inline-flex;
  width: 100%;
  max-width: 620px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.segment-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: color .2s ease, background .2s ease, box-shadow .2s ease;
}

.segment-item.active {
  color: #fff;
  background: var(--brand);
  box-shadow: 0 6px 14px rgba(22, 119, 255, .24);
}

.segment-icon {
  font-size: 16px;
}

.form-tip {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

/* 开关下方的状态回显（比整段解释文案短，不占位） */
.form-inline-note {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* label 里的 (?) 提示：与控件基线对齐 */
.product-editor-page :deep(.el-form-item__label) .wb-field-hint {
  vertical-align: 1px;
}

.detail-template-preview {
  margin-top: 12px;
}

/* ---- 统一分级卡片选择器（商品形态 / 内容载体 / 交付方式 / 会员定价共用） ---- */
.pick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  width: 100%;
  align-items: stretch;
}

.pick-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 11px 34px 11px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
}

.pick-card:hover:not(:disabled) {
  border-color: var(--brand);
}

.pick-card.active {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--brand) 5%, #fff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent);
}

.pick-card:disabled {
  opacity: .45;
  cursor: not-allowed;
}

/* 右上角微型勾选角标：单选/多选同一套语言 */
.pick-card__check {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #d4d8de;
  border-radius: 4px;
  background: #fff;
}

.pick-card.active .pick-card__check {
  border-color: var(--brand);
  background: var(--brand);
}

.pick-card.active .pick-card__check::after {
  width: 4px;
  height: 8px;
  margin-top: -2px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  content: '';
  transform: rotate(45deg);
}

.pick-card__icon {
  flex: none;
  font-size: 17px;
  line-height: 1.3;
}

.pick-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pick-card__title {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.pick-card__hint {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pick-card--compact {
  padding-top: 9px;
  padding-bottom: 9px;
}

.pick-card--compact .pick-card__check {
  top: 9px;
  right: 9px;
}

/* ---- 冲突 / 风险提示 ---- */
.conflict-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #f5d9a8;
  border-radius: 8px;
  color: #a15c00;
  background: #fff8e8;
  font-size: 12px;
  line-height: 1.7;
}

.conflict-hint--danger {
  border-color: #fbc4c0;
  color: #c0362c;
  background: #fef0ef;
}

.conflict-hint :deep(.el-icon) {
  margin-top: 2px;
  flex: none;
}

.link-fix-btn {
  margin-left: 4px;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  vertical-align: baseline;
}

/* ---- 图片素材双栏 ---- */
.asset-split {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 5fr);
  gap: 24px;
  align-items: start;
}

.asset-split__col {
  min-width: 0;
}

/* ---- 04 价格与售卖 ---- */
.sku-head {
  position: relative;
}

/*
 * 规格模式 Segmented 卡片。
 * ⚠️ 替换掉的是「标题栏右侧 + el-switch inline-prompt」那套 —— 开关离它控制的
 * 售价字段隔着一整个 section 头，运营看不出关联；inline-prompt 在两态下塞两段文字，
 * 宽度不够就截断。现在做成两张等宽卡片放在分区正文顶部，各自带说明。
 */
.sku-mode-seg {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.sku-mode-seg__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease;
}

.sku-mode-seg__item:hover {
  border-color: var(--brand);
}

.sku-mode-seg__item.active {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--brand) 7%, #fff);
  box-shadow: inset 0 0 0 1px var(--brand);
}

.sku-mode-seg__title {
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.sku-mode-seg__hint {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

/* label 内的多段内容（文案 + 角标 + 图标提示）要能横排且不换行掉队 */
/*
 * label 内的多段内容（文案 + 角标 + 图标提示）要横排、且角标不掉队折行。
 * ⚠️ el-form-item 的 label 默认 `line-height` 比正文大，pill 角标跟着会被顶得偏高，
 * 与旁边的字段名错开一像素。所以这里显式统一行高并居中对齐。
 */
.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 20px;
  white-space: nowrap;
}

.field-label .discount-flag {
  margin-left: 0;
  line-height: 16px;
}

/*
 * 一口价模式的价格栅格。
 * ⚠️ 原来是 `auto-fit, minmax(280px, 1fr)` + 每个字段 `span-all` + `.el-input-number{width:100%}`
 * → 「划线价/售价/总名额/SKU 编码」四个短数字各占满整行，右边大片空白。
 * 数字最多 4~5 位，280px 纯属浪费。改 2 列定宽栅格，数字框收到 180px。
 */
.simple-price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
}

/* 短数字字段（售价/划线价/名额/编码）不需要占满整列 */
.simple-price-grid .el-form-item {
  grid-column: auto;
}

/*
 * 短数字框收窄。
 * ⚠️ 单纯写 `width:180px` 会输给页面级 `.product-editor-page :deep(.el-input-number){width:100%}`
 * （后者特异性更高），必须**选择器特异性压过它** —— 用 `.simple-price-grid` + `el-form-item` 双层限定。
 * 数字最多 5~6 位 + 步进按钮，180px 足够。
 */
.simple-price-grid .el-form-item :deep(.el-input-number),
.simple-price-grid .el-form-item :deep(.el-input) {
  width: 180px;
  max-width: 100%;
}

/* 折扣角标：浅橙 pill，跟在「售价」label 后面，不再掉队折行 */
.discount-flag {
  display: inline-flex;
  flex: none;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  color: #a15c00;
  background: #fff3e0;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

/* ---- 售卖状态与排期（三态单选） ---- */
.sell-mode-seg {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.sell-mode-seg__item {
  padding: 6px 4px;
  border: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color .18s ease, background .18s ease;
}

.sell-mode-seg__item.active {
  color: var(--brand);
  background: #fff;
  box-shadow: 0 1px 3px rgba(29, 33, 41, .1);
}

.sell-schedule {
  margin-top: 10px;
}

/* ---- 买赠星球内联开关 ---- */
.gift-switch-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.gift-empty-hint {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #a15c00;
  font-size: 12px;
}

.gift-grid {
  margin-top: 12px;
}

/* ---- 策略内联说明（替代原「当前策略」深灰卡） ---- */
.strategy-inline-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #dbe6f5;
  border-radius: 8px;
  color: #3f5b86;
  background: #f5f9ff;
  font-size: 12px;
  line-height: 1.6;
}

.strategy-inline-note :deep(.el-icon) {
  margin-top: 3px;
  flex: none;
}

/* ---- 05 会员与商业化 ---- */
.member-price-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.member-price-row :deep(.el-input-number) {
  width: 200px;
}

.discount-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gift-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.gift-row :deep(.el-input-number) {
  width: 150px;
}

.gift-row__unit {
  color: var(--text-muted);
  font-size: 13px;
}

.preset-chip {
  padding: 5px 12px;
  border: 1px dashed #b7c7dd;
  border-radius: 999px;
  color: var(--text-secondary);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color .18s ease, border-color .18s ease, background .18s ease;
}

.preset-chip:hover:not(:disabled) {
  color: var(--brand);
  border-color: var(--brand);
  background: #f0f7ff;
}

.preset-chip:disabled {
  opacity: .45;
  cursor: not-allowed;
}

/* ---- 02 媒体池 ---- */
.media-pool {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 12px;
  width: 100%;
}

.media-cell {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
  cursor: grab;
}

.media-cell:active {
  cursor: grabbing;
}

.media-cell.is-main {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(22, 119, 255, .12);
}

.media-cell.is-main:hover {
  border-color: var(--brand);
}

.media-cell :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.media-cell__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, .34) 0%, transparent 32%);
  pointer-events: none;
}

.media-cell__badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
  background: var(--brand);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.6;
}

.media-cell__index {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  color: #fff;
  background: rgba(0, 0, 0, .5);
  font-size: 11px;
  font-weight: 700;
}

.media-cell__actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  opacity: 0;
  transition: opacity .18s ease;
}

.media-cell:hover .media-cell__actions {
  opacity: 1;
}

.media-cell__menu {
  color: #fff;
  background: rgba(0, 0, 0, .45);
}

.media-cell__menu:hover {
  color: #fff;
  background: rgba(0, 0, 0, .68);
}

.media-cell__dragging {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(22, 119, 255, .5);
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

.media-add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  min-height: 132px;
  border: 1px dashed #b7c7dd;
  border-radius: 8px;
  color: var(--text-muted);
  background: #fff;
  cursor: pointer;
  transition: border-color .18s ease, color .18s ease, background .18s ease;
}

.media-add-tile:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f0f7ff;
}

.media-add-tile :deep(.el-icon) {
  font-size: 22px;
}

.media-add-tile small {
  color: var(--text-muted);
  font-size: 11px;
}

.media-hint {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 12px;
  line-height: 1.7;
}

.media-hint :deep(.el-icon) {
  margin-top: 2px;
  flex: none;
}

.media-hint--error {
  color: #a15c00;
  background: #fff8e8;
}

/* ---- 元信息小 Tag（视频卡/封面卡用） ---- */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.7;
  white-space: nowrap;
}

.tag--success {
  color: #1a7f37;
  background: #f1fbf3;
}

.tag--info {
  color: #3f5b86;
  background: #f2f6fc;
}

.tag--warn {
  color: #a15c00;
  background: #fff8e8;
}

/* 视频尺寸徽标：常态中性，比例不合规时转警示色（存量素材才可能触发） */
.video-slot__ratio {
  flex: none;
  padding: 1px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  background: #fff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.video-slot__ratio.bad {
  border-color: #fbc4c0;
  color: #c0362c;
  background: #fef0ef;
}

/* ---- VIP 定价三态（已统一到 .pick-card） ---- */
/* ---- 人工履约指引提示 ---- */
.guide-card-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #f5d9a8;
  border-radius: 8px;
  color: #8a5a00;
  background: #fff8e8;
  font-size: 13px;
  line-height: 1.7;
}

.guide-card-note :deep(.el-icon) {
  margin-top: 3px;
  flex: none;
}

.guide-card-note b {
  color: #6b4600;
}

/* ---- 自动化交付预留位 ---- */
/* 生产环境不渲染该占位（后端未实现，配置不生效），保留样式以便灰度开启时复用 */
.automation-slot {
  width: 100%;
  padding: 14px 16px;
  border: 1px dashed #c9cdd4;
  border-radius: 8px;
  background: var(--bg-page);
}

.automation-slot__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.automation-slot__desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.75;
}

.preset-chip--free.active {
  color: #fff;
  border-style: solid;
  border-color: #b4430f;
  background: #b4430f;
}

/* ---- 详情模板工具条 ---- */
.detail-template-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.detail-template-toolbar__label {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.detail-template-toolbar__hint {
  color: var(--text-muted);
  font-size: 12px;
}

/* ---- 发布助手栏 ---- */
.side-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.side-card-head .side-card-title {
  margin: 0;
}

.side-card-head__meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-card-note {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

/* 待办自检清单：每项整行可点，点完直接滚到并高亮那个字段 */
.side-meter__todos {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-meter__todos li {
  margin: 0;
}

.side-meter__todos button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: 1px solid #f5d9a8;
  border-radius: 6px;
  color: #a15c00;
  background: #fff8e8;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease;
}

.side-meter__todos li.blocking button {
  border-color: #f5c2c2;
  color: #c0392b;
  background: #fef3f2;
}

.side-meter__todos button:hover {
  border-color: currentcolor;
  background: #fff2d6;
}

li.blocking button:hover {
  background: #fde8e6;
}

.side-todo__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentcolor;
}

.side-todo__label {
  flex: 1;
  min-width: 0;
}

.side-todo__go {
  flex: none;
  opacity: .65;
  font-size: 11px;
  white-space: nowrap;
}

/* 完成度 100% 后，整卡收缩成一条绿色微型标签 */
.side-card--done {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-color: #c9e7cf;
  color: #1a7f37;
  background: #f1fbf3;
  font-size: 12px;
  font-weight: 600;
}

/* 待办项跳转后的字段高亮：淡金底 + 描边，1.8s 后由 JS 摘掉 */
.field-flash {
  animation: field-flash 1.8s ease;
  border-radius: 8px;
}

@keyframes field-flash {
  0%, 60% {
    background: #fff6e0;
    box-shadow: 0 0 0 2px #f5d9a8;
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 2px transparent;
  }
}

/*
 * 详情预览卡：只放 140px 图文骨架示意 + 一个进真机抽屉的按钮。
 * ⚠️ 被替换掉的是「内嵌微型手机壳」方案 —— 在 ~300px 宽的右栏里塞 280px 手机壳，
 * 内部文字只有 6~7px，看得见形状看不清内容；退一步做整块 scale 缩放也只是把
 * 「太矮看不清」换成「太占高度」，两种都做不好校验。真正的校验必须交给 1:1 抽屉。
 */
.detail-skeleton {
  display: flex;
  gap: 10px;
  height: 140px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: linear-gradient(180deg, #fbfbfd, #f5f6f8);
}

.detail-skeleton__cover {
  flex: none;
  width: 72px;
  border-radius: 6px;
  /* 3:4 封面位，与商品视频/封面口径一致 */
  background: linear-gradient(160deg, #e9eaee, #dfe1e6);
}

.detail-skeleton__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 9px;
  padding-top: 6px;
}

.detail-skeleton__line {
  height: 8px;
  border-radius: 4px;
  background: #e6e8ec;
}

.detail-skeleton__line.w45 { width: 45%; }
.detail-skeleton__line.w60 { width: 60%; }
.detail-skeleton__line.w70 { width: 70%; }
.detail-skeleton__line.w90 { width: 90%; }

.detail-preview-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid var(--brand);
  border-radius: 8px;
  color: var(--brand);
  background: color-mix(in srgb, var(--brand) 6%, #fff);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .18s ease;
}

.detail-preview-btn:hover {
  background: color-mix(in srgb, var(--brand) 12%, #fff);
}

.cover-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cover-preview__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.cover-preview__thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.cover-preview__empty {
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.cover-preview__meta {
  min-width: 0;
  flex: 1;
}

.cover-preview__name {
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-preview__price {
  margin-top: 4px;
  color: #ff5000;
  font-size: 18px;
  font-weight: 800;
}

.cover-preview__price s {
  margin-left: 6px;
  color: #aab0bc;
  font-size: 12px;
  font-weight: 400;
}

.cover-preview__yen {
  font-size: 12px;
}

.cover-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.mini-tag {
  padding: 1px 7px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 11px;
}

.mini-tag--vip {
  color: #b4430f;
  background: #fdf0e8;
  font-weight: 700;
}

.footer-autosave {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.asset-card :deep(.el-form-item) {
  margin-bottom: 22px;
}

.asset-card :deep(.el-form-item__content) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.asset-card :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.main-image-drop {
  display: block;
  width: 100%;
}

.main-image-drop :deep(.el-upload),
.main-image-drop :deep(.el-upload-dragger) {
  width: 100%;
}

.main-image-drop :deep(.el-upload-dragger) {
  overflow: hidden;
  padding: 0;
  border: 1px dashed #c9d5e8;
  border-radius: 8px;
  background: #f7fbff;
}

.main-image-drop-inner {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 220px;
}

.main-image-drop-inner.filled :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--text-muted);
  text-align: center;
}

.upload-empty :deep(.el-icon) {
  color: var(--brand);
  font-size: 30px;
}

.upload-empty strong {
  color: var(--text);
  font-size: 14px;
}

.upload-empty span {
  font-size: 12px;
}

.image-action-row {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

.fold-link {
  display: inline-flex;
  justify-self: start;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--brand);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  width: 100%;
}

.gallery-thumb,
.gallery-add-tile {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.gallery-thumb {
  cursor: grab;
}

.gallery-thumb:active {
  cursor: grabbing;
}

.gallery-thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.thumb-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: .9;
}

.gallery-add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  color: var(--text-muted);
  min-height: 96px;
  cursor: pointer;
}

.gallery-add-tile :deep(.el-icon) {
  font-size: 22px;
}

.gallery-add-tile:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f0f7ff;
}

/* ---- 宣传视频 ---- */
.asset-divider {
  margin: 18px 0 4px;
}

.asset-divider__t {
  font-size: 12px;
  letter-spacing: .04em;
  color: var(--text-muted);
  background: #f4f6f9;
  border-radius: 999px;
  padding: 3px 12px;
}

/*
 * 视频 / 封面 紧凑双栏卡片。
 * ⚠️ 这块原来是「上下两个独立 el-form-item + 一个常驻的全尺寸 <video> 播放器」：
 * 播放器 3:4 竖版限高 360px，下面还缀着 meta 行、按钮行、两行 form-tip 说明；
 * 封面又是完整的一行（132x176 缩略图 + 按钮 + 说明）。合计吃掉近 600px 纵向空间。
 *
 * 改法：合并成 1:1 双栏 Grid，缩略图固定 120x160（3:4），常驻的只是静态帧 + 播放角标；
 * 真正要看画面时点开 Modal —— 编辑时需要校验的是**比例与时长**，不是画质，
 * 全尺寸播放器常驻纯属浪费。
 */
.video-media-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.media-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

/* 无视频时封面卡整块置灰，但**保留可见** —— 让运营一眼看到「这里还有个封面等着配」 */
.media-card.is-disabled {
  background: #fafbfc;
}

.media-card.is-disabled .media-card__title,
.media-card.is-disabled .media-card__ops {
  opacity: .55;
}

.media-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.media-card__body {
  display: flex;
  gap: 12px;
  /* 固定 160px 是上限：3:4 缩略图 120 宽 + 操作区，与卡片标题+内边距合计正好 200px 内 */
  min-height: 160px;
}

.media-card__ops {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

/* 3:4 竖版缩略图 */
.media-thumb {
  position: relative;
  flex: none;
  width: 120px;
  height: 160px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #000;
  cursor: pointer;
  transition: opacity .18s ease;
}

.media-thumb--static {
  cursor: default;
}

.media-thumb.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  background: #fafbfc;
  cursor: default;
}

.media-thumb__video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-thumb__play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  color: #fff;
  background: rgba(0, 0, 0, .5);
  font-size: 17px;
  transform: translate(-50%, -50%);
  transition: background .18s ease;
}

.media-thumb:hover:not(.is-empty) .media-thumb__play {
  background: var(--brand);
}

.media-thumb__dur {
  position: absolute;
  right: 5px;
  bottom: 5px;
  padding: 1px 5px;
  border-radius: 4px;
  color: #fff;
  background: rgba(0, 0, 0, .68);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

.media-thumb__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 18px;
}

.media-thumb__placeholder small {
  font-size: 11px;
}

/* 元信息 / 操作 / 说明 三行 */
.media-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.media-card__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.media-card__tip {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.media-card__tip--lead {
  color: var(--text-secondary, #606266);
  font-size: 12px;
}

.media-card__link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  color: var(--brand);
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.media-card__link:hover {
  text-decoration: underline;
}

/* 视频全屏预览弹窗 */
.video-preview-dialog__stage {
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: #000;
}

.video-preview-dialog__tip {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

/* ---- VIP 定价三态（已统一到 .pick-card） ---- */
/* ---- 人工履约指引提示 ---- */
.guide-card-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #f5d9a8;
  border-radius: 8px;
  color: #8a5a00;
  background: #fff8e8;
  font-size: 13px;
  line-height: 1.7;
}

.guide-card-note :deep(.el-icon) {
  margin-top: 3px;
  flex: none;
}

.guide-card-note b {
  color: #6b4600;
}

/* ---- 自动化交付预留位 ---- */
/* 生产环境不渲染该占位（后端未实现，配置不生效），保留样式以便灰度开启时复用 */
.automation-slot {
  width: 100%;
  padding: 14px 16px;
  border: 1px dashed #c9cdd4;
  border-radius: 8px;
  background: var(--bg-page);
}

.automation-slot__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.automation-slot__desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.75;
}

.preset-chip--free.active {
  color: #fff;
  border-style: solid;
  border-color: #b4430f;
  background: #b4430f;
}

/* ---- 详情模板工具条 ---- */
.detail-template-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.detail-template-toolbar__label {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.detail-template-toolbar__hint {
  color: var(--text-muted);
  font-size: 12px;
}

/* ---- 发布助手栏 ---- */
.side-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.side-card-head .side-card-title {
  margin: 0;
}

.side-card-head__meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-card-note {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

/* 待办自检清单：每项整行可点，点完直接滚到并高亮那个字段 */
.side-meter__todos {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-meter__todos li {
  margin: 0;
}

.side-meter__todos button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: 1px solid #f5d9a8;
  border-radius: 6px;
  color: #a15c00;
  background: #fff8e8;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease;
}

.side-meter__todos li.blocking button {
  border-color: #f5c2c2;
  color: #c0392b;
  background: #fef3f2;
}

.side-meter__todos button:hover {
  border-color: currentcolor;
  background: #fff2d6;
}

li.blocking button:hover {
  background: #fde8e6;
}

.side-todo__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentcolor;
}

.side-todo__label {
  flex: 1;
  min-width: 0;
}

.side-todo__go {
  flex: none;
  opacity: .65;
  font-size: 11px;
  white-space: nowrap;
}

/* 完成度 100% 后，整卡收缩成一条绿色微型标签 */
.side-card--done {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-color: #c9e7cf;
  color: #1a7f37;
  background: #f1fbf3;
  font-size: 12px;
  font-weight: 600;
}

/* 待办项跳转后的字段高亮：淡金底 + 描边，1.8s 后由 JS 摘掉 */
.field-flash {
  animation: field-flash 1.8s ease;
  border-radius: 8px;
}

@keyframes field-flash {
  0%, 60% {
    background: #fff6e0;
    box-shadow: 0 0 0 2px #f5d9a8;
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 2px transparent;
  }
}

/*
 * 详情预览卡：只放 140px 图文骨架示意 + 一个进真机抽屉的按钮。
 * ⚠️ 被替换掉的是「内嵌微型手机壳」方案 —— 在 ~300px 宽的右栏里塞 280px 手机壳，
 * 内部文字只有 6~7px，看得见形状看不清内容；退一步做整块 scale 缩放也只是把
 * 「太矮看不清」换成「太占高度」，两种都做不好校验。真正的校验必须交给 1:1 抽屉。
 */
.detail-skeleton {
  display: flex;
  gap: 10px;
  height: 140px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: linear-gradient(180deg, #fbfbfd, #f5f6f8);
}

.detail-skeleton__cover {
  flex: none;
  width: 72px;
  border-radius: 6px;
  /* 3:4 封面位，与商品视频/封面口径一致 */
  background: linear-gradient(160deg, #e9eaee, #dfe1e6);
}

.detail-skeleton__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 9px;
  padding-top: 6px;
}

.detail-skeleton__line {
  height: 8px;
  border-radius: 4px;
  background: #e6e8ec;
}

.detail-skeleton__line.w45 { width: 45%; }
.detail-skeleton__line.w60 { width: 60%; }
.detail-skeleton__line.w70 { width: 70%; }
.detail-skeleton__line.w90 { width: 90%; }

.detail-preview-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid var(--brand);
  border-radius: 8px;
  color: var(--brand);
  background: color-mix(in srgb, var(--brand) 6%, #fff);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .18s ease;
}

.detail-preview-btn:hover {
  background: color-mix(in srgb, var(--brand) 12%, #fff);
}

.cover-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cover-preview__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.cover-preview__thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.cover-preview__empty {
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.cover-preview__meta {
  min-width: 0;
  flex: 1;
}

.cover-preview__name {
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-preview__price {
  margin-top: 4px;
  color: #ff5000;
  font-size: 18px;
  font-weight: 800;
}

.cover-preview__price s {
  margin-left: 6px;
  color: #aab0bc;
  font-size: 12px;
  font-weight: 400;
}

.cover-preview__yen {
  font-size: 12px;
}

.cover-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.mini-tag {
  padding: 1px 7px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 11px;
}

.mini-tag--vip {
  color: #b4430f;
  background: #fdf0e8;
  font-weight: 700;
}

.footer-autosave {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.asset-card :deep(.el-form-item) {
  margin-bottom: 22px;
}

.asset-card :deep(.el-form-item__content) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.asset-card :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.main-image-drop {
  display: block;
  width: 100%;
}

.main-image-drop :deep(.el-upload),
.main-image-drop :deep(.el-upload-dragger) {
  width: 100%;
}

.main-image-drop :deep(.el-upload-dragger) {
  overflow: hidden;
  padding: 0;
  border: 1px dashed #c9d5e8;
  border-radius: 8px;
  background: #f7fbff;
}

.main-image-drop-inner {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 220px;
}

.main-image-drop-inner.filled :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--text-muted);
  text-align: center;
}

.upload-empty :deep(.el-icon) {
  color: var(--brand);
  font-size: 30px;
}

.upload-empty strong {
  color: var(--text);
  font-size: 14px;
}

.upload-empty span {
  font-size: 12px;
}

.image-action-row {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

.fold-link {
  display: inline-flex;
  justify-self: start;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--brand);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  width: 100%;
}

.gallery-thumb,
.gallery-add-tile {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.gallery-thumb {
  cursor: grab;
}

.gallery-thumb:active {
  cursor: grabbing;
}

.gallery-thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.thumb-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: .9;
}

.gallery-add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  color: var(--text-muted);
  min-height: 96px;
  cursor: pointer;
}

.gallery-add-tile :deep(.el-icon) {
  font-size: 22px;
}

.gallery-add-tile:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f0f7ff;
}

/* ---- 宣传视频 ---- */
.asset-divider {
  margin: 18px 0 4px;
}

.asset-divider__t {
  font-size: 12px;
  letter-spacing: .04em;
  color: var(--text-muted);
  background: #f4f6f9;
  border-radius: 999px;
  padding: 3px 12px;
}

.video-slot {
  width: 100%;
  border: 1px dashed var(--border-color, #dcdfe6);
  border-radius: 10px;
  background: #fafbfc;
  overflow: hidden;
}

.video-slot.filled {
  border-style: solid;
  background: #000;
}

/* 空态（还没上传视频）：没有真实比例，用一个固定的预览高度，别套 aspect-ratio */
.video-slot:not(.filled) {
  min-height: 150px;
}

/*
 * 播放器容器：按视频真实比例显示，别再「width:100% + max-height」硬压。
 * ⚠️ 原写法只给了 width:100% 和 max-height:260px —— 3:4 竖版视频被压成中间一条细柱、
 * 两侧大片黑边（lx 截图就是这个问题）。上传校验管的是**文件**，管不到**显示**。
 * 现在比例交给 `.video-slot` 的 inline `aspect-ratio`，视频本身 `width/height:100%`
 * 撑满容器 + `object-fit:contain` 兜底（比例读不到时不会拉伸）。
 * ⚠️ 这里**不能**再给 video 加 max-height —— 容器已由 aspect-ratio 定高，
 * video 再限高会溢出容器（实测 268×420 超出 270×360 的容器）。
 */
.video-slot__player {
  display: block;
  width: 100%;
  height: 100%;
  background: #000;
  object-fit: contain;
}

.video-slot__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 132px;
  padding: 18px 14px;
  text-align: center;
  color: var(--text-muted);
  cursor: default;
}

.video-slot__empty :deep(.el-icon) {
  font-size: 30px;
  color: var(--brand);
}

.video-slot__empty strong {
  font-size: 13px;
  color: var(--text-color, #303133);
}

.video-slot__empty span {
  font-size: 12px;
  line-height: 1.5;
  max-width: 280px;
}

.video-slot__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.video-slot__ok {
  color: #67c23a;
  font-size: 15px;
}

.video-slot__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 手机预览里的视频项 ---- */
.pv-gallery__video {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.pv-gallery__video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv-gallery__video-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .55);
  color: #fff;
  font-size: 11px;
  letter-spacing: .03em;
  pointer-events: none;
}

.spec-tag-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.spec-tag-input {
  width: 220px;
}

.sku-table-wrap {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.sku-table {
  width: 100%;
}

.unlimited-stock {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  color: #0f8a5f;
  background: #edf9f4;
  font-size: 12px;
  font-weight: 700;
}

.money-input :deep(.el-input__prefix) {
  color: var(--text-muted);
  font-weight: 700;
}

.delete-icon-btn {
  color: var(--text-muted);
}

.delete-icon-btn:hover {
  color: var(--danger);
  background: #fff1f0;
}

.sku-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  color: var(--text-muted);
}

.sku-empty strong {
  color: var(--text);
  font-size: 15px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: var(--brand);
  background: var(--brand-soft);
  font-weight: 800;
}

.add-row-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 24px);
  height: 42px;
  margin: 12px;
  border: 1px dashed #b7c7dd;
  border-radius: 8px;
  color: var(--brand);
  background: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.add-row-btn:hover {
  border-color: var(--brand);
  background: #f0f7ff;
}

.side-card > .side-card-title {
  margin-bottom: 10px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
  color: var(--text-muted);
  font-size: 13px;
}

.status-row strong {
  color: var(--text);
  font-weight: 700;
}

/* ---- 固定吸底操作栏 ---- */
.action-dock {
  --dock-h: 60px;
  position: fixed;
  right: 0;
  bottom: 0;
  left: 216px;
  z-index: 900;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, #fff 94%, transparent);
  box-shadow: 0 -8px 28px rgba(29, 33, 41, .09);
  backdrop-filter: saturate(180%) blur(10px);
}

/* 侧栏折叠时 dock 同步左移，避免遮挡内容 */
:global(body.sidebar-collapsed) .action-dock {
  left: 72px;
}

.action-dock__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1480px;
  margin: 0 auto;
  padding: 10px 28px;
}

.action-dock__status {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* 底栏上的细进度条：替代原先 70px 大圆环 */
.dock-meter {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
}

.dock-meter i {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: conic-gradient(var(--brand) var(--progress), #e5e6eb 0);
}

.dock-meter i::after {
  position: absolute;
  inset: 5px;
  border-radius: 999px;
  background: #fff;
  content: '';
}

.dock-meter b {
  position: relative;
  z-index: 1;
  color: var(--text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.action-dock__actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.footer-autosave {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 4px;
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.product-editor-page :deep(.el-form-item) {
  margin-bottom: 0;
}

.product-editor-page :deep(.el-form-item__label) {
  margin-bottom: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.product-editor-page :deep(.el-form-item__error) {
  padding-top: 5px;
  color: var(--danger);
  font-size: 12px;
}

.product-editor-page :deep(.el-input__wrapper),
.product-editor-page :deep(.el-textarea__inner) {
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border) inset;
}

.product-editor-page :deep(.el-input__wrapper:hover),
.product-editor-page :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #b7c7dd inset;
}

.product-editor-page :deep(.el-input__wrapper.is-focus),
.product-editor-page :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--brand) inset, 0 0 0 3px rgba(22, 119, 255, .12);
}

.product-editor-page :deep(.el-input-number) {
  width: 100%;
}

.product-editor-page :deep(.el-button) {
  border-radius: 6px;
  font-weight: 700;
}

.primary-btn:deep(.el-button),
.product-editor-page :deep(.el-button--primary),
.product-editor-page :deep(.el-button.primary-btn) {
  --el-button-bg-color: var(--brand);
  --el-button-border-color: var(--brand);
  --el-button-hover-bg-color: var(--brand-hover);
  --el-button-hover-border-color: var(--brand-hover);
  --el-button-active-bg-color: #0b55bd;
  --el-button-active-border-color: #0b55bd;
}

.product-editor-page :deep(.el-button.ghost-btn),
.product-editor-page :deep(.el-button.outline-btn) {
  color: var(--text-secondary);
  border-color: var(--border);
  background: #fff;
}

.product-editor-page :deep(.el-button.ghost-btn:hover),
.product-editor-page :deep(.el-button.outline-btn:hover) {
  color: var(--brand);
  border-color: var(--brand);
  background: #f0f7ff;
}

.product-editor-page :deep(.el-table th.el-table__cell) {
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 13px;
  font-weight: 700;
}

.product-editor-page :deep(.el-table td.el-table__cell) {
  vertical-align: middle;
}

.product-rich-editor {
  width: 100%;
  border: 1px solid var(--border, #e4e9f2);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.preview-phone {
  position: relative;
  width: 360px;
  margin: 0 auto;
  border: 10px solid #1a1a1a;
  border-radius: 28px;
  background: #f5f6f8;
  overflow: hidden;
}

.preview-notch {
  width: 120px;
  height: 18px;
  margin: 8px auto 0;
  border-radius: 10px;
  background: #111;
}

.preview-scroll {
  max-height: 560px;
  overflow: auto;
  padding-bottom: 72px;
  background: #f5f6f8;
}

.pv-gallery {
  position: relative;
  height: 280px;
  background: #eef1f6;
}

.pv-gallery :deep(.el-carousel),
.pv-gallery :deep(.el-carousel__container) {
  height: 280px !important;
}

.pv-gallery :deep(.el-carousel__item) {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef1f6;
}

.pv-gallery img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  display: block;
}

.pv-gallery-empty {
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #99a3b5;
}

.pv-gallery-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 11px;
}

.pv-header {
  margin-top: -12px;
  padding: 16px 14px 12px;
  border-radius: 14px 14px 0 0;
  background: #fff;
  position: relative;
  z-index: 1;
}

.pv-price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.pv-yen {
  color: #ff5000;
  font-size: 16px;
  font-weight: 800;
}

.pv-price {
  color: #ff5000;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.pv-origin {
  margin-left: 6px;
  color: #aab0bc;
  font-size: 13px;
  text-decoration: line-through;
}

.pv-name {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  line-height: 1.45;
}

.pv-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  color: #8b93a3;
  font-size: 12px;
}

.pv-desc {
  margin-top: 8px;
  color: #5b6b82;
  font-size: 12px;
  line-height: 1.5;
}

.pv-picks,
.pv-review,
.pv-detail-card {
  margin: 10px 0 0;
  background: #fff;
}

.pv-picks {
  padding: 0 14px;
}

.pv-pick {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 13px;
}

.pv-pick:last-child {
  border-bottom: 0;
}

.pv-pick .k {
  width: 42px;
  color: #8b93a3;
  flex: none;
}

.pv-pick .v {
  flex: 1;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-pick .ar,
.pv-review .ar {
  color: #c0c4cc;
}

.pv-review {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
}

.pv-review-t {
  font-size: 14px;
  font-weight: 700;
  color: #111;
}

.pv-review-s {
  margin-top: 4px;
  font-size: 12px;
  color: #8b93a3;
}

.pv-detail-card {
  padding: 14px 0 20px;
}

.pv-section-title {
  padding: 0 14px 10px;
  font-weight: 700;
  color: #111;
  font-size: 14px;
}

.pv-rich {
  padding: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  word-break: break-word;
}

.pv-rich :deep(p),
.pv-rich p {
  margin: 0.35em 14px;
}

.pv-rich :deep(p:has(> img:only-child)),
.pv-rich p:has(> img:only-child) {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  font-size: 0 !important;
}

.pv-rich :deep(img),
.pv-rich img {
  max-width: 100%;
  width: 100%;
  height: auto;
  display: block;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  vertical-align: top;
}

.pv-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 58px;
  padding: 0 10px;
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.04);
}

.pv-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  color: #666;
  font-size: 10px;
  line-height: 1.2;
  flex: none;
}

.pv-icon-btn .emoji {
  font-size: 16px;
  margin-bottom: 2px;
}

.pv-btn {
  flex: 1;
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: default;
}

.pv-btn-cart {
  color: #fff;
  background: linear-gradient(90deg, #ffb400, #ff9500);
}

.pv-btn-buy {
  color: #fff;
  background: linear-gradient(90deg, #ff785a, #ff5000);
}

.preview-hint {
  margin: 12px 0 0;
  text-align: center;
  color: #6b7b93;
  font-size: 12px;
}

/* ---- 真机全屏预览抽屉 ---- */
.device-preview-drawer__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.device-preview-drawer__head b {
  color: var(--text);
  font-size: 15px;
}

.device-preview-drawer__head span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.device-preview-drawer__body {
  padding: 4px 0 24px;
}

/* 抽屉里的预览按 1:1 渲染，不做任何缩放 —— 这才是「真机」的前提 */
.device-preview-drawer__body :deep(.pdp) {
  width: 100%;
  transform: none;
}

/*
 * 手机壳拉到接近真机宽度（iPhone 逻辑宽 375）。
 * ⚠️ 组件本体写死 280px（那是给 300px 宽右栏用的），放进 420px 抽屉里两侧会空 70px，
 * 看着就不像真机。这里只在抽屉作用域内放宽，**不改组件本体** ——
 * 组件本体还被别处复用（小程序预览弹窗），改它会波及那些场景。
 */
.device-preview-drawer__body :deep(.pdp__phone) {
  width: 100%;
  max-width: 356px;
}

.device-preview-drawer__body :deep(.pdp__screen) {
  height: 620px;
}

@media (max-width: 1360px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-aside {
    position: static;
  }

  .asset-card {
    order: -1;
  }

  .main-image-drop-inner {
    min-height: 260px;
  }
}

@media (max-width: 1180px) {
  .product-editor-page {
    padding: 20px 20px calc(var(--dock-h) + 24px);
  }

  .section-card {
    padding: 20px;
  }

  .asset-split {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

@media (max-width: 860px) {
  .product-editor-page {
    padding: 16px 16px calc(var(--dock-h) + 20px);
  }

  .anchor-nav {
    margin: 0 -16px 14px;
    padding: 0 16px;
    overflow-x: auto;
  }

  .page-header,
  .action-dock__inner {
    align-items: stretch;
    flex-direction: column;
  }

  .action-dock {
    left: 0;
  }

  .action-dock__inner {
    gap: 10px;
    padding: 8px 16px;
  }

  .page-actions,
  .action-dock__actions {
    justify-content: flex-start;
  }

  .meta-row,
  .meta-row--2,
  .short-grid,
  .simple-price-grid {
    grid-template-columns: 1fr;
  }

  .segmented-control {
    display: grid;
    width: 100%;
  }

  .segment-item {
    width: 100%;
  }
}
</style>
