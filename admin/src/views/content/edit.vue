<template>
  <div class="content-edit-page" v-loading="pageLoading">
    <div class="edit-topbar">
      <div class="edit-topbar__left">
        <div class="edit-topbar__title">{{ pageTitle }}</div>
        <span v-if="draftHint" class="edit-topbar__draft">{{ draftHint }}</span>
        <span v-if="saveStatusText" class="edit-topbar__save" :class="`is-${saveState}`">
          <el-icon v-if="saveState === 'saving'" class="is-loading"><Loading /></el-icon>{{ saveStatusText }}
        </span>
      </div>
      <div class="edit-topbar__right">
        <el-button @click="goBack()">取消</el-button>
        <el-button class="ai-entry-btn" @click="aiDialogVisible = true">AI 辅助</el-button>
        <el-button @click="openPreviewDialog">预览</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ submitButtonText }}</el-button>
      </div>
    </div>

    <div class="edit-layout">
    <el-card class="editor-card" shadow="never">
      <el-tabs v-model="activeTab" class="art-tabs">
        <el-tab-pane label="基础内容" name="base">
          <el-form ref="baseFormRef" :model="formData" :rules="baseRules" label-width="90px">
            <el-form-item :label="titleLabel" prop="title">
              <el-input
                v-model="formData.title"
                :maxlength="titleMaxLength"
                show-word-limit
                :placeholder="titlePlaceholder"
              />
              <!-- 超字数才提醒：主色提示，不打断填写；未超限时说明极简 -->
              <div v-if="isTitleOver" class="title-over">
                标题已超出 {{ titleMaxLength }} 字上限，建议精简后再发布
              </div>
            </el-form-item>

            <!-- 形态由侧栏入口锁定，不再并列切换 -->
            <div v-if="typeLocked" class="field-hint field-hint--tight">
              当前为「{{ pageTitle.replace(/^(编辑|写|发|上传)/, '') }}」入口
            </div>
            <el-form-item v-else label="内容形态">
              <el-radio-group v-model="contentType">
                <el-radio-button value="article">长文</el-radio-button>
                <el-radio-button value="note">笔记</el-radio-button>
                <el-radio-button value="moment">动态</el-radio-button>
                <el-radio-button value="video">视频</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <template v-if="contentType === 'note'">
              <el-form-item label="笔记图片">
                <ImageGalleryInput
                  :images="noteImages"
                  :max="9"
                  :uploading="noteImageUploading"
                  @remove="removeNoteImage"
                  @reorder="moveNoteImage"
                  @pick="uploadNoteImageFile"
                  @pick-asset="openGalleryAssetPicker"
                />
              </el-form-item>

              <el-form-item label="正文">
                <div class="xhs-editor">
                  <div class="xhs-editor__toolbar">
                    <el-popover
                      v-model:visible="emojiPanelVisible"
                      placement="bottom-start"
                      :width="352"
                      trigger="click"
                      popper-class="xhs-emoji-popper"
                    >
                      <template #reference>
                        <button type="button" class="xhs-editor__btn" :class="{ 'is-active': emojiPanelVisible }" title="插入表情">😊 表情</button>
                      </template>
                      <div class="emoji-panel">
                        <div class="emoji-panel__tabs">
                          <button
                            v-for="g in emojiGroups"
                            :key="g.key"
                            type="button"
                            class="emoji-panel__tab"
                            :class="{ 'is-active': activeEmojiGroup === g.key }"
                            @click="activeEmojiGroup = g.key"
                          >{{ g.label }}</button>
                        </div>
                        <div class="emoji-panel__grid">
                          <button
                            v-for="e in activeGroupEmojis"
                            :key="e"
                            type="button"
                            class="emoji-panel__item"
                            @click="insertEmoji(e)"
                          >{{ e }}</button>
                        </div>
                      </div>
                    </el-popover>
                    <button type="button" class="xhs-editor__btn" title="插入话题标签" @click="insertTopic"># 话题</button>
                    <span class="xhs-editor__tip">支持 #话题 标签</span>
                  </div>
                  <el-input
                    ref="noteBodyInputRef"
                    v-model="noteBody"
                    type="textarea"
                    :rows="8"
                    maxlength="1000"
                    show-word-limit
                    resize="vertical"
                    class="xhs-editor__input"
                    placeholder="输入笔记正文，1000 字以内。点击「表情」添加 emoji，#话题 可提升曝光"
                  />
                </div>
              </el-form-item>

              <el-form-item label="话题标签">
                <el-input v-model="noteTagsText" placeholder="多个标签用逗号分隔，如：选品,供应链" />
              </el-form-item>

              <el-form-item label="展示数据">
                <div class="stats-row">
                  <el-input-number v-model="formData.view_count" :min="0" controls-position="right" />
                  <span class="stats-label">阅读</span>
                  <el-input-number v-model="formData.like_count" :min="0" controls-position="right" />
                  <span class="stats-label">点赞</span>
                  <el-input-number v-model="formData.favorite_count" :min="0" controls-position="right" />
                  <span class="stats-label">收藏</span>
                </div>
                <div class="field-hint">首页信息流：长文取阅读数，笔记取点赞数。</div>
              </el-form-item>
            </template>

            <template v-else-if="contentType === 'moment'">
              <el-form-item label="动态图片">
                <ImageGalleryInput
                  :images="noteImages"
                  :max="9"
                  :uploading="noteImageUploading"
                  @remove="removeNoteImage"
                  @reorder="moveNoteImage"
                  @pick="uploadNoteImageFile"
                  @pick-asset="openGalleryAssetPicker"
                />
              </el-form-item>

              <el-form-item label="正文">
                <el-input v-model="noteBody" type="textarea" :rows="8" maxlength="5000" show-word-limit placeholder="输入动态正文" />
              </el-form-item>

              <el-form-item label="资料附件">
                <div class="attachment-list">
                  <div v-for="(item, idx) in momentAttachments" :key="item.id" class="attachment-item">
                    <span class="attachment-item__icon">{{ fileTypeIcon(item.fileType) }}</span>
                    <div class="attachment-item__meta">
                      <div class="attachment-item__name">{{ item.name }}</div>
                      <div class="attachment-item__size">{{ formatFileSize(item.size) }}</div>
                    </div>
                    <el-button text type="danger" size="small" @click="removeAttachment(idx)">删除</el-button>
                  </div>
                  <label v-if="momentAttachments.length < 5" class="upload-btn">
                    {{ attachmentUploading ? '上传中…' : '+ 上传资料文件' }}
                    <input type="file" hidden :disabled="attachmentUploading" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar" @change="onUploadAttachment" />
                  </label>
                  <el-button v-if="momentAttachments.length < 5" class="upload-btn" @click="filePickerVisible = true">从文件库选择</el-button>
                </div>
                <div class="field-hint">最多 5 个，建议用文件库配置阅读/下载权限。</div>
              </el-form-item>

              <FilePickerDialog v-model="filePickerVisible" @select="onPickLibraryFile" />

              <el-form-item label="分享封面">
                <el-input v-model="formData.cover_image" placeholder="留空则使用首图；无图时使用默认封面" />
              </el-form-item>
            </template>

            <template v-if="contentType === 'article'">
            <el-form-item label="封面图">
              <div class="cover-field">
                <div v-if="coverPreviewUrl" class="cover-preview">
                  <img :src="coverPreviewUrl" alt="" />
                  <el-button text type="danger" size="small" @click="clearCover">清除</el-button>
                </div>
                <el-input
                  v-model="formData.cover_image"
                  placeholder="封面图 URL（可上传或粘贴）"
                  @input="syncCoverToSeo"
                />
                <label class="upload-btn">
                  {{ coverUploading ? '上传中…' : '本地上传' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    :disabled="coverUploading"
                    @change="onUploadCover"
                  />
                </label>
                <el-button size="small" @click="assetPickerVisible = true">素材库</el-button>
              </div>
            </el-form-item>

            <div class="section-label">正文编辑（所见即所得）</div>
            <div class="editor-toolbar-extra">
              <el-button size="small" @click="insertProductCard">插入商品卡</el-button>
              <el-select v-model="formData.layout_theme" size="small" style="width: 140px" placeholder="排版主题">
                <el-option label="标准阅读" value="standard" />
                <el-option label="杂志风" value="magazine" />
                <el-option label="极简" value="minimal" />
                <el-option label="大字号" value="large" />
                <el-option label="深色" value="dark" />
              </el-select>
              <el-select
                v-if="contentType === 'article'"
                v-model="formData.discover_layout"
                size="small"
                style="width: 150px; margin-left: 8px"
                placeholder="发现页展示"
              >
                <el-option label="发现页：自动" value="auto" />
                <el-option label="发现页：通栏" value="full" />
                <el-option label="发现页：双列" value="duo" />
              </el-select>
            </div>
            <PageRichTextEditor v-model="formData.content" class="rich-editor" />
            <div class="editor-tip">编辑区显示效果即为发布后小程序/页面展示效果。商品卡写法：&lt;product id="商品ID"/&gt;</div>
            </template>

            <template v-else-if="contentType === 'video'">
              <!-- 小红书式视频上传区 -->
              <div class="video-uploader">
                <div class="video-uploader__hd">
                  <span class="video-uploader__lb">视频</span>
                  <div class="video-uploader__ratio">
                    <span class="video-uploader__ratio-lb">画面比例</span>
                    <el-radio-group v-model="videoRatio" size="small">
                      <el-radio-button value="3:4">3:4</el-radio-button>
                      <el-radio-button value="1:1">1:1</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>

                <div class="video-uploader__box" :class="{ 'is-square': videoRatio === '1:1' }">
                  <label v-if="!videoPreviewUrl && !videoUploading" class="video-uploader__empty">
                    <div class="video-uploader__plus">＋</div>
                    <div class="video-uploader__hint">上传视频</div>
                    <div class="video-uploader__sub">点击选择 mp4 文件 · 建议 3 分钟内 · 50MB 内</div>
                    <input type="file" accept="video/mp4" hidden :disabled="videoUploading" @change="onUploadVideo" />
                  </label>
                  <div v-else class="video-uploader__stage">
                    <video
                      v-if="videoPreviewUrl"
                      class="video-uploader__player"
                      :src="videoPreviewUrl"
                      :poster="coverPreviewUrl || undefined"
                      controls
                      playsinline
                    ></video>
                    <div v-else class="video-uploader__loading">
                      <el-icon class="is-loading"><Loading /></el-icon>
                      <span>视频上传中…</span>
                    </div>
                    <span v-if="durationText" class="video-uploader__dur">{{ durationText }}</span>
                  </div>
                </div>

                <div class="video-uploader__ops">
                  <label v-if="!videoUploading" class="video-uploader__op">
                    {{ formData.video_url ? '↻ 换一个视频' : '上传视频' }}
                    <input type="file" accept="video/mp4" hidden :disabled="videoUploading" @change="onUploadVideo" />
                  </label>
                  <button v-if="formData.video_url" type="button" class="video-uploader__op is-danger" @click="clearVideo">删除</button>
                  <button type="button" class="video-uploader__op" @click="showVideoUrlInput = !showVideoUrlInput">粘贴链接</button>
                  <span class="video-uploader__tip">比例仅影响预览与封面裁切，视频本身不裁剪</span>
                </div>

                <el-input
                  v-if="showVideoUrlInput"
                  v-model="formData.video_url"
                  class="video-uploader__url"
                  placeholder="粘贴视频直链 https://… 或 /uploads/…，回车确认"
                />
                <div v-if="videoUploading" class="field-hint">视频上传中，文件较大时约需 1-2 分钟，请勿关闭页面。</div>
              </div>

              <el-form-item label="封面">
                <div class="cover-field">
                  <div v-if="coverPreviewUrl" class="cover-preview">
                    <img :src="coverPreviewUrl" alt="" :class="['video-cover-preview', { 'is-square': videoRatio === '1:1' }]" />
                    <div class="cover-preview__ops">
                      <el-button text type="danger" size="small" @click="clearCover">清除</el-button>
                    </div>
                  </div>
                  <div class="cover-actions">
                    <el-button size="small" :disabled="!videoPreviewUrl || coverUploading" @click="captureVideoCover">从视频截取封面</el-button>
                    <label class="upload-btn">
                      {{ coverUploading ? '上传中…' : '本地上传' }}
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="coverUploading" @change="onUploadCover" />
                    </label>
                    <el-button size="small" @click="assetPickerTarget = 'cover'; assetPickerVisible = true">素材库</el-button>
                  </div>
                  <div class="field-hint">留空时小程序端默认取视频首帧展示。比例 {{ videoRatio }} 下建议 {{ videoRatio === '1:1' ? '1080×1080' : '1080×1440' }}。</div>
                </div>
              </el-form-item>

              <el-form-item label="简介">
                <el-input v-model="formData.content" type="textarea" :rows="5" maxlength="1000" show-word-limit placeholder="说说这条视频讲了什么（展示在视频下方）" />
              </el-form-item>
            </template>

            <el-form-item label="作者">
              <div class="author-picker-row">
                <el-select v-model="authorMode" style="width: 100px" @change="onAuthorModeChange">
                  <el-option label="选档案" value="profile" />
                  <el-option label="自定义" value="custom" />
                </el-select>
                <el-select
                  v-if="authorMode === 'profile'"
                  v-model="formData.author_id"
                  filterable
                  placeholder="选择作者档案"
                  style="flex: 1"
                  @change="onAuthorProfileChange"
                >
                  <el-option
                    v-for="a in authors"
                    :key="a.id"
                    :label="`${a.name}${a.title ? ' · ' + a.title : ''}`"
                    :value="a.id"
                  />
                </el-select>
                <el-input v-else v-model="formData.author" maxlength="64" placeholder="作者昵称" style="flex: 1" />
              </div>
            </el-form-item>

            <el-form-item label="作者头像">
              <div class="cover-field">
                <div v-if="authorAvatarPreview" class="cover-preview">
                  <img :src="authorAvatarPreview" alt="" class="avatar-preview" />
                  <el-button text type="danger" size="small" @click="formData.author_avatar = ''">清除</el-button>
                </div>
                <el-input v-model="formData.author_avatar" placeholder="头像 URL（可上传或粘贴）" />
                <label class="upload-btn">
                  {{ avatarUploading ? '上传中…' : '本地上传' }}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="avatarUploading" @change="onUploadAuthorAvatar" />
                </label>
                <el-button size="small" @click="assetPickerTarget = 'author'; assetPickerVisible = true">素材库</el-button>
              </div>
            </el-form-item>

            <el-form-item label="作者身份">
              <el-select v-model="formData.author_role" style="width: 100%">
                <el-option label="主理人" value="owner" />
                <el-option label="编辑" value="editor" />
                <el-option label="投稿人" value="contributor" />
                <el-option label="用户" value="user" />
              </el-select>
            </el-form-item>
          </el-form>

          <!-- 发布设置：跟在内容正文之后，不占右侧栏 -->
          <div class="publish-panel">
            <div class="publish-panel__head">
              <span class="publish-panel__title">发布设置</span>
              <span class="publish-panel__sub">决定这条内容何时、以什么方式上线</span>
            </div>
            <el-form label-width="90px" class="publish-panel__form">
              <el-form-item label="发布方式">
                <el-radio-group v-model="publishMode">
                  <el-radio-button value="publish">立即发布</el-radio-button>
                  <el-radio-button value="schedule">定时发布</el-radio-button>
                  <el-radio-button value="draft">存为草稿</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="publishMode === 'schedule'" label="发布时间">
                <el-date-picker
                  v-model="scheduleTime"
                  style="width: 100%"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择定时发布时间"
                />
                <div class="field-hint">到点后由服务端每分钟扫描自动发布。</div>
              </el-form-item>
              <el-form-item label="内容分类">
                <el-select v-model="formData.category_id" style="width: 100%" placeholder="请选择内容分类" filterable>
                  <el-option
                    v-for="item in flatCategoryOptions"
                    :key="item.id"
                    :value="item.id"
                    :label="item.label"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="可见范围">
                <el-select v-model="formData.visibility" style="width: 100%">
                  <el-option label="公开" value="public" />
                  <el-option label="仅会员" value="member_only" />
                </el-select>
              </el-form-item>
              <template v-if="contentType === 'article' || contentType === 'note'">
                <el-form-item label="版权性质">
                  <el-select v-model="formData.copyright_nature" style="width: 100%">
                    <el-option label="原创" value="original" />
                    <el-option label="转载" value="reprint" />
                    <el-option label="汇编" value="compile" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="formData.copyright_nature === 'reprint'" label="转载授权">
                  <el-input
                    v-model="formData.reprint_authorization"
                    type="textarea"
                    :rows="2"
                    placeholder="授权说明或链接（发布必填）"
                  />
                </el-form-item>
              </template>
              <el-form-item v-if="contentType === 'article'" label="付费墙">
                <el-checkbox-group v-model="accessRule.grants">
                  <el-checkbox label="free">免费</el-checkbox>
                  <el-checkbox label="login">登录可读</el-checkbox>
                  <el-checkbox label="member">会员</el-checkbox>
                  <el-checkbox label="planet">星球</el-checkbox>
                  <el-checkbox label="product">单篇付费</el-checkbox>
                  <el-checkbox label="invite">邀请解锁</el-checkbox>
                </el-checkbox-group>
                <div class="field-hint">满足任一项即可读全文（OR）。</div>
              </el-form-item>
              <el-form-item v-if="contentType === 'article'" label="试读比例">
                <el-slider v-model="accessRule.previewValue" :min="0" :max="100" show-input />
              </el-form-item>
              <el-form-item v-if="contentType === 'article' && accessRule.grants.includes('product')" label="解锁商品">
                <el-select
                  v-model="accessRule.payProductId"
                  filterable
                  remote
                  :remote-method="searchProducts"
                  :loading="productSearchLoading"
                  placeholder="选择单篇 SKU"
                  style="width: 100%"
                >
                  <el-option v-for="p in productOptions" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="运营位">
                <div class="publish-ops">
                  <el-checkbox v-model="formData.is_pinned">频道置顶</el-checkbox>
                  <el-checkbox v-model="formData.is_recommended">首页推荐</el-checkbox>
                  <el-checkbox v-if="contentType === 'moment'" v-model="formData.planet_exclusive">星球专属</el-checkbox>
                </div>
              </el-form-item>
              <div v-if="contentType === 'moment' && formData.planet_exclusive" class="field-hint field-hint--tight">
                勾选后出现在小程序「星球」时间线。
              </div>
              <el-form-item v-if="contentType === 'moment' && formData.planet_exclusive" label="所属社区">
                <el-select
                  v-model="formData.planet_id"
                  filterable
                  clearable
                  placeholder="选择所属社区（默认主社区）"
                  style="width: 100%"
                >
                  <el-option
                    v-for="c in planetCommunities"
                    :key="c.id"
                    :label="c.title || c.id"
                    :value="c.id"
                  />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="关联商品" name="products">
          <el-form label-width="90px">
            <el-form-item label="挂载商品">
              <el-select
                v-model="linkedProductIds"
                multiple
                filterable
                remote
                reserve-keyword
                placeholder="搜索并选择商品"
                :remote-method="searchProducts"
                :loading="productSearchLoading"
                style="width: 100%"
              >
                <el-option
                  v-for="p in productOptions"
                  :key="p.id"
                  :label="`${p.name}（¥${p.price ?? '-'}）`"
                  :value="p.id"
                />
              </el-select>
              <div class="field-hint">下单可归因到本内容。</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="showSeoTab" label="SEO 与 分享配置" name="seo">
          <el-form :model="seoForm" label-width="90px">
            <el-form-item label="SEO 标题">
              <el-input v-model="seoForm.title" placeholder="用于搜索引擎与分享标题" />
            </el-form-item>
            <el-form-item label="SEO 描述">
              <el-input
                v-model="seoForm.description"
                type="textarea"
                :rows="4"
                placeholder="简要描述内容核心，利于搜索收录与卡片分享"
              />
            </el-form-item>
            <el-form-item label="分享封面">
              <div class="cover-field">
                <div v-if="coverPreviewUrl" class="cover-preview">
                  <img :src="coverPreviewUrl" alt="" />
                  <el-button text type="danger" size="small" @click="clearCover">清除</el-button>
                </div>
                <el-input
                  v-model="formData.cover_image"
                  placeholder="与基础内容封面图共用"
                  @input="syncCoverToSeo"
                />
                <label class="upload-btn">
                  {{ coverUploading ? '上传中…' : '本地上传' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    :disabled="coverUploading"
                    @change="onUploadCover"
                  />
                </label>
                <el-button size="small" @click="assetPickerVisible = true">素材库</el-button>
                <div class="field-hint">与「基础内容」封面图共用同一字段。</div>
              </div>
            </el-form-item>
            <div class="seo-tip">
              提示：优化 SEO 配置可提升内容在微信搜一搜及社交平台卡片点击率。
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <aside class="edit-aside">
      <div class="preview-aside">
        <div class="preview-aside__head">
          <span>{{ isArticleType ? '长文预览' : '小红书预览' }}</span>
          <el-radio-group
            v-if="isArticleType"
            v-model="asidePreviewMode"
            size="small"
            class="preview-aside__toggle"
          >
            <el-radio-button value="phone">手机</el-radio-button>
            <el-radio-button value="wide">宽屏</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="isArticleType && asidePreviewMode === 'wide'" class="preview-aside__wide">
          <ArticleReadPreview :model="previewModel" dense />
        </div>
        <ContentPreviewPanel v-else :model="previewModel" />
      </div>
    </aside>
    </div>

    <!-- AI 辅助创作：独立弹窗，点顶栏按钮直接弹出 -->
    <el-dialog
      v-model="aiDialogVisible"
      class="ai-assist-dialog"
      width="880px"
      align-center
      destroy-on-close
      :show-close="false"
    >
      <template #header>
        <div class="ai-dialog__head">
          <div class="ai-dialog__headtxt">
            <div class="ai-dialog__eyebrow">创作加速</div>
            <div class="ai-dialog__title">AI 辅助创作</div>
          </div>
          <div class="ai-dialog__close" role="button" tabindex="0" @click="aiDialogVisible = false">✕</div>
        </div>
      </template>
      <ContentAiAssist
        :content-id="isEdit ? Number(route.query.id) : null"
        :content-type="contentType"
        :title="formData.title"
        :summary="formData.summary"
        :body="aiBodyText"
        @apply-field="onAiApplyField"
      />
      <template #footer>
        <div class="ai-dialog__foot">
          <span class="ai-dialog__hint">生成的内容会填入对应字段，可继续手动调整</span>
          <el-button type="primary" @click="aiDialogVisible = false">完成</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewDialogVisible"
      class="pv-dialog"
      width="1160px"
      align-center
      destroy-on-close
      :show-close="false"
    >
      <template #header>
        <div class="pv-dialog__head">
          <div class="pv-dialog__headtxt">
            <div class="pv-dialog__eyebrow">发布前校验</div>
            <div class="pv-dialog__title">预览效果</div>
          </div>
          <div class="pv-dialog__close" role="button" tabindex="0" @click="previewDialogVisible = false">✕</div>
        </div>
      </template>

      <div class="preview-dialog">
        <section class="preview-dialog__col preview-dialog__col--phone">
          <header class="preview-dialog__head">
            <span class="preview-dialog__badge">手机</span>
            <span class="preview-dialog__sub">小程序端</span>
          </header>
          <div class="preview-dialog__stage">
            <ContentPreviewPanel :model="previewModel" :show-hint="false" />
          </div>
          <p class="preview-dialog__note">以小程序实际渲染为准</p>
        </section>

        <section class="preview-dialog__col preview-dialog__col--pc">
          <header class="preview-dialog__head">
            <span class="preview-dialog__badge">PC 宽屏</span>
            <span class="preview-dialog__sub">浏览器端</span>
          </header>
          <div class="preview-dialog__stage preview-dialog__stage--wide">
            <div class="preview-dialog__pc-frame">
              <ArticleReadPreview v-if="isArticleType" :model="previewModel" />
              <template v-else>
                <div class="preview-dialog__pc-body">
                  <div class="preview-dialog__pc-eyebrow">{{ previewModel.categoryLabel || '未分类' }}</div>
                  <h3 class="preview-dialog__title">{{ previewModel.title || '未命名' }}</h3>
                  <p v-if="formData.summary" class="preview-dialog__summary">{{ formData.summary }}</p>
                  <div
                    v-if="previewModel.contentHtml"
                    class="preview-dialog__html"
                    v-html="previewModel.contentHtml"
                  />
                  <pre v-else-if="previewModel.noteBody" class="preview-dialog__note-body">{{ previewModel.noteBody }}</pre>
                  <p v-else class="preview-dialog__empty">正文为空，返回编辑区补充内容后再发布</p>
                </div>
              </template>
            </div>
          </div>
          <p class="preview-dialog__note">内容较长时可滑动查看</p>
        </section>
      </div>

      <template #footer>
        <div class="pv-dialog__foot">
          <span class="pv-dialog__footinfo">确认两端展示无误后再提交</span>
          <div class="pv-dialog__footbtns">
            <el-button @click="previewDialogVisible = false">关闭</el-button>
            <el-button type="primary" :loading="submitLoading" @click="previewDialogVisible = false; handleSubmit()">
              {{ submitButtonText }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
    <AssetPickerDialog
      v-model="assetPickerVisible"
      :multiple="assetPickerTarget === 'gallery'"
      @select="onPickAsset"
      @select-many="onPickAssetsMany"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createContent,
  getCategoryList,
  getContentDetail,
  publishContent,
  unpublishContent,
  updateContent,
} from '@/api/content'
import { getProductList } from '@/api/product'
import { get, put } from '@/api/request'
import { normalizeUploadUrl, uploadFile } from '@/api/system'
import { ContentStatus } from '@/types/content'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import ContentPreviewPanel from '@/components/content/ContentPreviewPanel.vue'
import ImageGalleryInput from '@/components/content/ImageGalleryInput.vue'
import ArticleReadPreview from '@/components/content/ArticleReadPreview.vue'
import ContentAiAssist from '@/components/content/ContentAiAssist.vue'
import FilePickerDialog from '@/components/files/FilePickerDialog.vue'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { listAuthors, type AuthorRecord } from '@/api/author'
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'
import { getPlainTextFromHtml, type ContentPreviewModel } from '@/utils/content-preview'
import {
  type ContentAttachment,
  fileTypeIcon,
  formatFileSize,
  normalizeAttachment,
  uploadAttachmentFile,
  attachmentFromFileLibrary,
} from '@/utils/content-attachment'
import { useUserStore } from '@/stores/user'

interface FlatCategoryOption {
  id: number
  label: string
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { uploadImage, uploadBlob, uploading: coverUploading } = useImageUpload()
const assetPickerVisible = ref(false)

/** 作者档案库 + 选择模式（profile=选档案 / custom=自定义手填） */
const authors = ref<AuthorRecord[]>([])
const authorMode = ref<'profile' | 'custom'>('custom')
/** 头像选择目标：author=作者头像（AuthorPicker 用）；cover=封面（其他位置用）；gallery=笔记/动态图集（多选回填） */
const assetPickerTarget = ref<'author' | 'cover' | 'gallery'>('cover')

/** 复用素材库已有图片作为封面或作者头像：只引用 URL，不重复上传 */
function onPickAsset(url: string) {
  if (!url) return
  const normalized = normalizeUploadUrl(url)
  if (assetPickerTarget.value === 'author') {
    formData.author_avatar = normalized
  } else if (assetPickerTarget.value === 'gallery') {
    appendGalleryAssets([url])
  } else {
    formData.cover_image = normalized
    syncCoverToSeo()
  }
}

/** 素材库多选回填图集（笔记/动态共用）：按点击顺序追加，超出 9 张截断 */
function onPickAssetsMany(urls: string[]) {
  if (assetPickerTarget.value !== 'gallery') return
  appendGalleryAssets(urls)
}

/** 打开素材库选择图集图片：满了就提示，不再弹窗 */
function openGalleryAssetPicker() {
  if (noteImages.value.length >= 9) {
    ElMessage.warning('图集最多 9 张，先删除几张再选')
    return
  }
  assetPickerTarget.value = 'gallery'
  assetPickerVisible.value = true
}

/** 图集引用素材库图片：只引用 URL 不重复上传，追加后首张仍为封面 */
function appendGalleryAssets(urls: string[]) {
  const room = 9 - noteImages.value.length
  const picked = (urls || []).filter(Boolean).map(normalizeUploadUrl).slice(0, Math.max(room, 0))
  if (!picked.length) {
    ElMessage.warning('图集最多 9 张，本次选择未追加')
    return
  }
  noteImages.value = [...noteImages.value, ...picked]
  formData.cover_image = noteImages.value[0]
  ElMessage.success(`已引用 ${picked.length} 张素材库图片`)
}

/** 加载作者档案列表（启用状态） */
async function loadAuthors() {
  try {
    // 2026-10-05 修正：原来误传 `1`，而签名是 `listAuthors(query?: AuthorQuery)`。
    // 运行时 `query.status` 在数字上取不到 → 「启用状态」筛选静默失效，
    // 下拉里会混进已停用的作者。类型检查（vue-tsc TS2559）也早就报出来了。
    const res: any = await listAuthors({ status: 1 })
    authors.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    authors.value = []
  }
}

/** 选择作者档案：自动带出昵称/头像/身份 */
function onAuthorProfileChange(id: number) {
  const a = authors.value.find((x) => x.id === id)
  if (!a) {
    formData.author_id = null
    return
  }
  formData.author_id = id
  if (a.name) formData.author = a.name
  if (a.avatarUrl) formData.author_avatar = normalizeUploadUrl(a.avatarUrl)
  if (a.role) formData.author_role = a.role
}

/** 切换选择模式 */
function onAuthorModeChange(mode: 'profile' | 'custom') {
  authorMode.value = mode
  if (mode === 'custom') {
    formData.author_id = null
  }
}

const activeTab = ref('base')
const pageLoading = ref(false)
const submitLoading = ref(false)
const lastEditedAt = ref<Date | null>(null)
const isEdit = computed(() => Boolean(route.query.id))
const pageTitle = computed(() => {
  const t = contentType.value
  if (t === 'note') return isEdit.value ? '编辑笔记' : '写笔记'
  if (t === 'video') return isEdit.value ? '编辑视频' : '发视频'
  if (t === 'moment') return isEdit.value ? '编辑动态' : '发动态'
  return isEdit.value ? '编辑长文' : '写长文'
})
const showSeoTab = computed(() => contentType.value !== 'moment')
const titleMaxLength = computed(() => (contentType.value === 'note' ? 30 : 128))
/** 真正超字数（粘贴/程序回填可能绕过 maxlength，这里兜底） */
const isTitleOver = computed(() => (formData.title || '').length > titleMaxLength.value)
const titleLabel = computed(() => (contentType.value === 'moment' ? '标题（选填）' : '标题'))
const titlePlaceholder = computed(() => {
  if (contentType.value === 'note') return '一句话说清这篇讲什么'
  if (contentType.value === 'moment') return '可不填，直接发正文'
  return '请输入标题'
})
const submitButtonText = computed(() => {
  if (isEdit.value && formData.status === ContentStatus.Published && publishMode.value === 'publish') {
    return '保存并更新'
  }
  if (publishMode.value === 'schedule') return '定时发布'
  if (publishMode.value === 'draft') return '存草稿'
  return '立即发布'
})
const draftHint = computed(() => {
  if (publishMode.value !== 'draft') return ''
  if (!lastEditedAt.value) return '草稿'
  const d = lastEditedAt.value
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `草稿 · 本地编辑 ${hh}:${mm}`
})
const aiBodyText = computed(() => {
  if (contentType.value === 'note' || contentType.value === 'moment') {
    return noteBody.value || getPlainTextFromHtml(formData.content)
  }
  return getPlainTextFromHtml(formData.content) || formData.summary
})
const baseFormRef = ref<FormInstance>()
const linkedProductIds = ref<number[]>([])
const productOptions = ref<Array<{ id: number; name: string; price?: number | string }>>([])
const productSearchLoading = ref(false)

const publishMode = ref<'publish' | 'schedule' | 'draft'>('publish')
const scheduleTime = ref('')
const previewDialogVisible = ref(false)
const aiDialogVisible = ref(false)
const asidePreviewMode = ref<'phone' | 'wide'>('wide')
const contentType = ref<'article' | 'note' | 'moment' | 'video'>('article')
const typeLocked = ref(false)
const noteImages = ref<string[]>([])
const noteBody = ref('')
const noteBodyInputRef = ref()
const emojiPanelVisible = ref(false)
const activeEmojiGroup = ref('common')

/** 小红书风格 emoji 分组（面向跨境营销笔记场景） */
const emojiGroups = [
  {
    key: 'common',
    label: '常用',
    emojis: ['😄', '🔥', '✅', '❗️', '💡', '⭐️', '👍', '🙏', '👉', '👇', '📌', '⏰', '💰', '📣', '🎯', '⚡️', '✨', '❤️', '🎉', '👀', '😭', '😅', '🤔', '😍'],
  },
  {
    key: 'face',
    label: '表情',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😉', '😍', '😘', '😜', '🤪', '🥳', '😎', '🤩', '🥺', '😢', '😤', '😡', '🤯', '😱', '🤗', '🫡', '🤝', '💪', '👏'],
  },
  {
    key: 'marketing',
    label: '营销',
    emojis: ['💰', '🏷️', '🛒', '💸', '📈', '📉', '💹', '🧾', '🎫', '🎁', '📦', '🚚', '🆕', '🆓', '✂️', '🔴', '🟢', '🟡', '⏳', '🔔', '🧮', '💳', '🏅', '🚀'],
  },
  {
    key: 'hand',
    label: '手势',
    emojis: ['👇', '👆', '👉', '👈', '🙌', '✊', '👊', '🖐️', '🤙', '👌', '✌️', '🤞', '☝️', '👋', '🫶', '🫰', '💪', '🦾', '🖖', '🤟', '✍️', '👐', '🤲', '🙏'],
  },
] as const
const activeGroupEmojis = computed(
  () => emojiGroups.find((g) => g.key === activeEmojiGroup.value)?.emojis ?? [],
)

/** 在光标处插入文本（emoji / 话题符号），插入后恢复焦点与光标位置 */
function insertTextAtCursor(text: string) {
  const el = noteBodyInputRef.value?.textarea as HTMLTextAreaElement | undefined
  const body = noteBody.value
  if (!el) {
    noteBody.value = body + text
    return
  }
  const start = el.selectionStart ?? body.length
  const end = el.selectionEnd ?? start
  noteBody.value = body.slice(0, start) + text + body.slice(end)
  nextTick(() => {
    el.focus()
    const pos = start + text.length
    el.setSelectionRange(pos, pos)
  })
}
const insertEmoji = (emoji: string) => insertTextAtCursor(emoji)
const insertTopic = () => insertTextAtCursor('#')
const noteTagsText = ref('')
const momentAttachments = ref<ContentAttachment[]>([])
const filePickerVisible = ref(false)
const noteImageUploading = ref(false)
const attachmentUploading = ref(false)
const avatarUploading = ref(false)

// ===== 视频投稿（小红书式）：上传 / 比例 / 截帧封面 =====
const VIDEO_MAX_SIZE_MB = 50
const VIDEO_MAX_DURATION_SEC = 180
const videoRatio = ref<'3:4' | '1:1'>('3:4')
const videoUploading = ref(false)
const showVideoUrlInput = ref(false)

const videoPreviewUrl = computed(() => {
  const raw = String(formData.video_url || '').trim()
  return raw ? normalizeUploadUrl(raw) : ''
})

const durationText = computed(() => {
  const s = Math.round(Number(formData.video_duration) || 0)
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

/** 读取视频元数据时长（秒） */
function readVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.muted = true
    const done = (v: number) => { el.src = ''; resolve(v) }
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : 0)
    el.onerror = () => done(0)
    setTimeout(() => done(Number.isFinite(el.duration) ? Math.round(el.duration) : 0), 10000)
    el.src = url
  })
}

async function onUploadVideo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.type && !file.type.startsWith('video/')) {
    ElMessage.warning('请选择视频文件（mp4）')
    return
  }
  if (file.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
    ElMessage.warning(`视频不能超过 ${VIDEO_MAX_SIZE_MB}MB，请压缩后再上传`)
    return
  }
  videoUploading.value = true
  try {
    const res = await uploadFile(file)
    const url = (res.data as any)?.url || (res as any)?.url || ''
    if (!url) throw new Error('上传失败')
    formData.video_url = normalizeUploadUrl(url)
    showVideoUrlInput.value = false
    ElMessage.success('视频已上传')
    const duration = await readVideoDuration(videoPreviewUrl.value)
    formData.video_duration = duration
    if (duration > VIDEO_MAX_DURATION_SEC) {
      ElMessage.warning(`视频时长 ${durationText.value || duration + 's'}，超过 3 分钟建议裁剪后重新上传`)
    }
    // 未手动选封面时自动截取首帧
    if (!formData.cover_image?.trim()) {
      await captureVideoCover(true)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '视频上传失败')
  } finally {
    videoUploading.value = false
  }
}

function clearVideo() {
  formData.video_url = ''
  formData.video_duration = 0
}

/** 从当前视频截帧当封面：按所选比例中心裁切后上传 */
async function captureVideoCover(silent = false) {
  const src = videoPreviewUrl.value
  if (!src) return
  const ratio = videoRatio.value === '1:1' ? 1 : 3 / 4
  try {
    const frame = await new Promise<Blob | null>((resolve) => {
      const el = document.createElement('video')
      el.preload = 'auto'
      el.muted = true
      el.crossOrigin = 'anonymous'
      let settled = false
      const finish = (blob: Blob | null) => {
        if (settled) return
        settled = true
        resolve(blob)
      }
      el.onloadedmetadata = () => {
        el.currentTime = Math.min(1, (el.duration || 1) * 0.1)
      }
      el.onseeked = () => {
        try {
          const vw = el.videoWidth
          const vh = el.videoHeight
          if (!vw || !vh) return finish(null)
          // 中心裁切到目标宽高比
          let cw = vw
          let ch = vw / ratio
          if (ch > vh) { ch = vh; cw = vh * ratio }
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(cw)
          canvas.height = Math.round(ch)
          const ctx = canvas.getContext('2d')
          if (!ctx) return finish(null)
          ctx.drawImage(el, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((b) => finish(b), 'image/jpeg', 0.85)
        } catch {
          finish(null)
        }
      }
      el.onerror = () => finish(null)
      setTimeout(() => finish(null), 12000)
      el.src = src
    })
    if (!frame) throw new Error('截帧失败')
    const blob = new Blob([frame], { type: 'image/jpeg' })
    const ok = await uploadBlob(blob, `video-cover-${Date.now()}.jpg`, {
      onSuccess: (url: string) => {
        formData.cover_image = normalizeUploadUrl(url)
        syncCoverToSeo()
        if (!silent) ElMessage.success('封面已从视频截取')
      },
    })
    if (!ok && !silent) ElMessage.error('封面上传失败')
  } catch (e: any) {
    if (!silent) ElMessage.error(e?.message || '截取封面失败，请手动上传封面')
  }
}

const formData = reactive({
  title: '',
  category_id: undefined as number | undefined,
  summary: '',
  content: '',
  cover_image: '',
  video_url: '',
  video_duration: 0,
  layout_theme: 'standard',
  discover_layout: 'auto',
  tag_ids: [] as number[],
  status: ContentStatus.Draft,
  author: '',
  author_avatar: '',
  author_role: 'editor',
  author_id: null as number | null,
  visibility: 'public',
  audit_status: 'approved',
  like_count: 0,
  view_count: 0,
  favorite_count: 0,
  sort: 0,
  is_pinned: false,
  is_recommended: false,
  planet_exclusive: false,
  planet_id: '',
  copyright_nature: 'original',
  reprint_authorization: '',
})

const planetCommunities = ref<{ id: string; title: string }[]>([])

const accessRule = reactive({
  grants: [] as string[],
  previewValue: 20,
  payProductId: undefined as number | undefined,
  planetId: '',
})

const seoForm = reactive({
  title: '',
  description: '',
  cover: '',
})

const baseRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  if (contentType.value !== 'moment') {
    rules.title = [
      {
        required: true,
        message: contentType.value === 'note' ? '请输入标题（最多 30 字）' : '请输入标题',
        trigger: 'blur',
      },
    ]
  }
  return rules
})

const categoryTree = ref<any[]>([])
const flatCategoryOptions = computed<FlatCategoryOption[]>(() => {
  const output: FlatCategoryOption[] = []
  const walk = (arr: any[], prefix = '') => {
    arr.forEach((node) => {
      if (node.status !== undefined && Number(node.status) !== 1) return
      output.push({ id: Number(node.id), label: `${prefix}${node.name}` })
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, `${prefix}└ `)
      }
    })
  }
  walk(categoryTree.value)
  return output
})

async function fetchCategories() {
  const res = await getCategoryList()
  categoryTree.value = (res as any).data || []
}

async function searchProducts(keyword: string) {
  productSearchLoading.value = true
  try {
    const res = await getProductList({ keyword: keyword || undefined, page: 1, size: 20, status: 'on_sale' } as any)
    const list = (res as any).data?.list || (res as any).data?.records || (res as any).data || []
    productOptions.value = (Array.isArray(list) ? list : []).map((p: any) => ({
      id: Number(p.id),
      name: p.name,
      price: p.price,
    }))
  } catch {
    productOptions.value = []
  } finally {
    productSearchLoading.value = false
  }
}

async function loadLinkedProducts(contentId: number) {
  try {
    const res = await get(`/api/v1/mp/contents/${contentId}/products`)
    const list = (res as any).data || []
    linkedProductIds.value = list.map((p: any) => Number(p.id)).filter(Boolean)
    productOptions.value = list.map((p: any) => ({
      id: Number(p.id),
      name: p.name,
      price: p.price,
    }))
  } catch {
    linkedProductIds.value = []
  }
}

async function saveLinkedProducts(contentId: number) {
  await put(`/api/v1/admin/contents/${contentId}/products`, {
    productIds: linkedProductIds.value,
  })
}

async function loadDetail(id: number) {
  pageLoading.value = true
  try {
    const res = await getContentDetail(id)
    const data = (res as any).data || {}
    formData.title = data.title || ''
    formData.category_id = Number(data.categoryId ?? data.category_id) || undefined
    formData.summary = data.summary || ''
    formData.content = data.content || ''
    formData.cover_image = data.coverImage || data.cover_image || data.shareCover || ''
    formData.author = data.author || ''
    formData.author_avatar = data.authorAvatar || data.author_avatar || ''
    formData.author_role = data.authorRole || data.author_role || 'editor'
    formData.author_id = Number(data.authorId) || null
    authorMode.value = formData.author_id ? 'profile' : 'custom'
    formData.visibility = data.visibility || 'public'
    formData.audit_status = data.auditStatus || data.audit_status || 'approved'
    formData.like_count = Number(data.likeCount ?? data.like_count ?? 0)
    formData.view_count = Number(data.viewCount ?? data.view_count ?? 0)
    formData.favorite_count = Number(data.favoriteCount ?? data.favorite_count ?? 0)
    formData.sort = Number(data.sortOrder ?? data.sort ?? 0)
    formData.status = normalizeContentStatus(data.status)
    const rawType = String(data.contentType || data.content_type || 'article')
    const attachments = Array.isArray(data.attachments)
      ? data.attachments.map((item: Record<string, unknown>, idx: number) => normalizeAttachment(item, idx))
      : []
    momentAttachments.value = attachments
    const qType = String(route.query.type || '')
    if (qType && ['article', 'note', 'video', 'moment'].includes(qType)) {
      contentType.value = qType as typeof contentType.value
    } else {
      contentType.value = (['note', 'moment', 'video'].includes(rawType) ? rawType : 'article') as typeof contentType.value
    }
    typeLocked.value = true
    noteImages.value = Array.isArray(data.images) ? [...data.images] : (formData.cover_image ? [formData.cover_image] : [])
    noteBody.value = getPlainTextFromHtml(formData.content)
    formData.video_url = data.videoUrl || data.video_url || ''
    formData.video_duration = Number(data.videoDuration ?? data.video_duration ?? 0)
    formData.layout_theme = data.layoutTheme || data.layout_theme || 'standard'
    formData.discover_layout = data.discoverLayout || data.discover_layout || 'auto'
    formData.is_pinned = !!(data.isPinned ?? data.is_pinned)
    formData.is_recommended = !!(data.isRecommended ?? data.is_recommended)
    formData.planet_exclusive = !!(data.planetExclusive ?? data.planet_exclusive)
    formData.planet_id = String(data.planetId ?? data.planet_id ?? '')
    formData.copyright_nature = String(data.copyrightNature ?? data.copyright_nature ?? 'original')
    formData.reprint_authorization = String(data.reprintAuthorization ?? data.reprint_authorization ?? '')
    const tags = Array.isArray(data.tags) ? data.tags : []
    noteTagsText.value = tags.join(', ')
    formData.tag_ids = tags.map(String)
    if (formData.status === ContentStatus.Published) publishMode.value = 'publish'
    else if (formData.status === ContentStatus.Scheduled || data.scheduledAt || data.scheduled_at) {
      publishMode.value = 'schedule'
      const rawSched = data.scheduledAt || data.scheduled_at
      scheduleTime.value = rawSched ? String(rawSched).replace('T', ' ').slice(0, 19) : ''
    } else publishMode.value = 'draft'

    seoForm.title = data.seoTitle || data.title || ''
    seoForm.description = data.seoDescription || data.summary || ''
    syncCoverToSeo()
    await loadLinkedProducts(id)
    await loadAccessRule(id)
    // 回填完成，清掉回填过程中触发的必填校验红框
    // （contentType 切换会让 baseRules 重算，此时 title 仍可能为空 → required 报错后不会自愈）
    await nextTick()
    baseFormRef.value?.clearValidate()
  } finally {
    pageLoading.value = false
  }
}

async function loadAccessRule(contentId: number) {
  try {
    const res = await get(`/api/v1/admin/contents/${contentId}/access-rule`)
    const row = (res as any).data
    if (!row) {
      accessRule.grants = []
      accessRule.previewValue = 20
      accessRule.payProductId = undefined
      return
    }
    accessRule.previewValue = Number(row.previewValue ?? 20)
    accessRule.payProductId = row.payProductId != null ? Number(row.payProductId) : undefined
    accessRule.planetId = row.planetId || ''
    try {
      accessRule.grants = row.grantsJson ? JSON.parse(row.grantsJson) : []
    } catch {
      accessRule.grants = []
    }
  } catch {
    accessRule.grants = []
  }
}

async function saveAccessRule(contentId: number) {
  if (contentType.value !== 'article') return
  if (!accessRule.grants.length) return
  await put(`/api/v1/admin/contents/${contentId}/access-rule`, {
    grants: accessRule.grants,
    previewMode: 'percent',
    previewValue: accessRule.previewValue,
    payProductId: accessRule.payProductId,
    planetId: accessRule.planetId || undefined,
  })
}

function normalizeContentStatus(statusRaw: unknown): ContentStatus {
  if (typeof statusRaw === 'number') {
    if (statusRaw === 1) return ContentStatus.Published
    if (statusRaw === 2) return ContentStatus.Unpublished
    return ContentStatus.Draft
  }
  const value = String(statusRaw || '').toLowerCase()
  if (value === ContentStatus.Published) return ContentStatus.Published
  if (value === ContentStatus.Scheduled) return ContentStatus.Scheduled
  if (value === ContentStatus.Unpublished || value === 'offline') return ContentStatus.Unpublished
  if (value === ContentStatus.Deleted) return ContentStatus.Deleted
  return ContentStatus.Draft
}

function openPreviewDialog() {
  previewDialogVisible.value = true
}

/** 发布前检查：标题/封面/正文长度/定时时间 */
function validateBeforePublish(): string | null {
  if (contentType.value !== 'moment' && !formData.title?.trim()) return '请填写标题'
  if (contentType.value === 'note' && formData.title.trim().length > 30) {
    return '笔记标题最多 30 字'
  }
  const needCover =
    contentType.value === 'article'
    || contentType.value === 'video'
    || contentType.value === 'note'
  const cover =
    contentType.value === 'note' || contentType.value === 'moment'
      ? (noteImages.value[0] || formData.cover_image)
      : formData.cover_image
  if (needCover && !String(cover || '').trim()) {
    if (contentType.value === 'video') return '视频请设置封面（可点「从视频截取封面」自动截取）'
    if (contentType.value === 'note') return '笔记请至少上传一张封面图'
    return '长文请上传封面图'
  }
  if (contentType.value === 'article') {
    const plain = getPlainTextFromHtml(formData.content || '')
    if (plain.replace(/\s/g, '').length < 80) return '长文正文过短（至少约 80 字）'
  }
  if (publishMode.value === 'schedule') {
    if (!scheduleTime.value) return '请选择定时发布时间'
    const ts = Date.parse(String(scheduleTime.value).replace(' ', 'T'))
    if (!Number.isFinite(ts) || ts <= Date.now()) return '定时发布时间需晚于当前时间'
  }
  return null
}

function goBack(refresh = false) {
  const t = contentType.value
  const path =
    t === 'note'
      ? '/content/notes'
      : t === 'moment'
        // V111：动态管理并入社区管理，保存后回到社区内容管理台
        ? '/community/content/all'
        : t === 'video'
          ? '/content/videos'
          : '/content/articles'
  router.push({
    path,
    query: refresh ? { refresh: String(Date.now()) } : undefined,
  })
}

function onAiApplyField(payload: { field: string; value: string }) {
  const field = String(payload.field || '')
  const value = String(payload.value || '')
  if (!value.trim()) return
  if (field === 'title' || field === 'seoTitle') {
    formData.title = value.trim()
    if (!seoForm.title) seoForm.title = value.trim()
    return
  }
  if (field === 'summary' || field === 'seoDescription') {
    formData.summary = value.trim()
    seoForm.description = value.trim()
    return
  }
  if (field === 'content' || field === 'body') {
    if (contentType.value === 'note' || contentType.value === 'moment') {
      noteBody.value = value
      formData.content = value.includes('<') ? value : `<p>${value.replace(/\n/g, '</p><p>')}</p>`
    } else {
      formData.content = value.includes('<') ? value : `<p>${value.replace(/\n/g, '</p><p>')}</p>`
    }
  }
}

function normalizePreviewUrl(raw: string) {
  const value = String(raw || '').trim()
  return value ? normalizeUploadUrl(value) : ''
}

const authorAvatarPreview = computed(() => normalizePreviewUrl(formData.author_avatar))

function parseNoteTags() {
  const fromText = noteTagsText.value
    .split(/[,，\s#]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const fromBody = (noteBody.value.match(/#[\u4e00-\u9fa5\w]+/g) || []).map((t) => t.replace(/^#/, ''))
  const merged = [...fromText, ...fromBody]
  return [...new Set(merged)]
}

function noteBodyToHtml(text: string) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

/** 拖拽排序：把 from 位置的图挪到 to 位置 */
function moveNoteImage(from: number, to: number) {
  const next = [...noteImages.value]
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  noteImages.value = next
  // 首张始终作为封面，排序后必须同步
  formData.cover_image = next[0] || ''
}

function removeNoteImage(index: number) {
  const next = noteImages.value.filter((_, i) => i !== index)
  noteImages.value = next
  formData.cover_image = next[0] || ''
}

/** 画廊上传：走统一上传逻辑，成功后追加并自动纠正封面 */
async function uploadNoteImageFile(file: File) {
  if (!file || noteImages.value.length >= 9) return
  noteImageUploading.value = true
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      const normalized = normalizeUploadUrl(url)
      noteImages.value = [...noteImages.value, normalized]
      if (!noteImages.value.length) formData.cover_image = normalized
      ElMessage.success('图片已上传')
    },
  })
  noteImageUploading.value = false
}

async function onUploadAuthorAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarUploading.value = true
  await uploadImage(file, {
    maxSizeMB: 2,
    onSuccess: (url: string) => {
      formData.author_avatar = normalizeUploadUrl(url)
      ElMessage.success('头像已上传')
    },
  })
  avatarUploading.value = false
}

function removeAttachment(index: number) {
  momentAttachments.value = momentAttachments.value.filter((_, i) => i !== index)
}

function onPickLibraryFile(file: { id: number; name: string; size?: number; mimeType?: string; fileType?: string }) {
  if (momentAttachments.value.length >= 5) return
  const item = attachmentFromFileLibrary(file, momentAttachments.value.length)
  momentAttachments.value = [...momentAttachments.value, item]
  ElMessage.success('已添加文件库附件')
}

async function onUploadAttachment(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || momentAttachments.value.length >= 5) return
  attachmentUploading.value = true
  try {
    const item = await uploadAttachmentFile(file, 20)
    if (item) {
      item.sortOrder = momentAttachments.value.length
      momentAttachments.value = [...momentAttachments.value, item]
      ElMessage.success('附件已上传')
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '附件上传失败')
  } finally {
    attachmentUploading.value = false
  }
}

function syncCoverToSeo() {
  seoForm.cover = formData.cover_image || ''
}

function clearCover() {
  formData.cover_image = ''
  syncCoverToSeo()
}

async function onUploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      formData.cover_image = normalizeUploadUrl(url)
      syncCoverToSeo()
      ElMessage.success('封面已上传')
    },
  })
}

const coverPreviewUrl = computed(() => {
  const raw = formData.cover_image?.trim() || ''
  return raw ? normalizeUploadUrl(raw) : ''
})

const isArticleType = computed(() => contentType.value === 'article')

const previewModel = computed<ContentPreviewModel>(() => {
  const category = flatCategoryOptions.value.find((item) => item.id === formData.category_id)
  return {
    title: formData.title,
    contentType: contentType.value as ContentPreviewModel['contentType'],
    contentHtml: formData.content,
    noteBody: noteBody.value,
    coverImage: formData.cover_image,
    images: noteImages.value,
    attachments: momentAttachments.value,
    attachmentCount: momentAttachments.value.length,
    author: formData.author,
    authorAvatar: formData.author_avatar,
    categoryLabel: category?.label || '',
    videoUrl: contentType.value === 'video' ? formData.video_url : '',
    videoDuration: contentType.value === 'video' ? Number(formData.video_duration) || 0 : 0,
    videoRatio: videoRatio.value,
  }
})

function ensureSummary() {
  if (formData.summary?.trim()) return
  const text = getPlainTextFromHtml(formData.content).slice(0, 120)
  if (text) formData.summary = text
}

function insertProductCard() {
  const id = window.prompt('请输入商品 ID')
  if (!id || !String(id).trim()) return
  const tag = `<p><product id="${String(id).trim()}"/></p>`
  formData.content = `${formData.content || ''}${tag}`
  ElMessage.success('已插入商品卡标签，可在正文末尾继续编辑')
}

async function handleSubmit() {
  const form = baseFormRef.value
  if (!form) return

  if (!formData.category_id) {
    ElMessage.warning('请选择内容分类')
    return
  }
  if (contentType.value !== 'moment' && !formData.title?.trim()) {
    ElMessage.warning(contentType.value === 'note' ? '请输入标题（最多 30 字）' : '请输入标题')
    activeTab.value = 'base'
    return
  }
  if (contentType.value === 'note' && formData.title.trim().length > 30) {
    ElMessage.warning('笔记标题最多 30 字')
    activeTab.value = 'base'
    return
  }

  const valid = await form.validate().catch(() => false)
  if (!valid) {
    activeTab.value = 'base'
    return
  }

  ensureSummary()
  if (contentType.value === 'note') {
    if (!noteImages.value.length && !formData.cover_image?.trim()) {
      ElMessage.warning('请至少上传一张笔记图片')
      activeTab.value = 'base'
      return
    }
    if (!noteBody.value.trim()) {
      ElMessage.warning('请输入笔记正文')
      activeTab.value = 'base'
      return
    }
  } else if (contentType.value === 'moment') {
    if (!noteBody.value.trim() && !noteImages.value.length && !momentAttachments.value.length) {
      ElMessage.warning('请至少填写正文、图片或资料附件之一')
      activeTab.value = 'base'
      return
    }
  } else if (contentType.value === 'video') {
    if (!formData.video_url?.trim()) {
      ElMessage.warning('请上传视频（或粘贴视频链接）')
      activeTab.value = 'base'
      return
    }
  } else if (!getPlainTextFromHtml(formData.content)) {
    ElMessage.warning('请输入正文内容')
    activeTab.value = 'base'
    return
  }

  if (publishMode.value === 'schedule' && !scheduleTime.value) {
    ElMessage.warning('请选择定时发布时间')
    return
  }

  if (publishMode.value === 'publish' || publishMode.value === 'schedule') {
    const block = validateBeforePublish()
    if (block) {
      ElMessage.warning(block)
      activeTab.value = 'base'
      return
    }
  }

  const wasPublished = formData.status === ContentStatus.Published
  if (isEdit.value && wasPublished && (publishMode.value === 'publish' || publishMode.value === 'draft')) {
    try {
      await ElMessageBox.confirm(
        publishMode.value === 'publish'
          ? '将覆盖线上版本，确认继续保存？'
          : '内容当前已上架，存草稿将先下架。确认？',
        '确认覆盖',
        { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }

  submitLoading.value = true
  saveState.value = 'saving'
  try {
    const tags = contentType.value === 'note' ? parseNoteTags() : formData.tag_ids.map(String)
    // 四类入口各自落库 contentType（资料帖已下线，文件资料统一走「文件库」），列表互不串台
    const apiType = contentType.value
    const isShortForm = apiType === 'note' || apiType === 'moment'
    const withAttachments = apiType === 'moment'
    const payload = {
      title: formData.title.trim() || (contentType.value === 'moment' ? '动态' : ''),
      contentType: apiType,
      categoryId: formData.category_id,
      summary:
        formData.summary?.trim()
        || seoForm.description?.trim()
        || (isShortForm ? noteBody.value.trim().slice(0, 120) : undefined),
      content: isShortForm ? noteBodyToHtml(noteBody.value) : formData.content,
      coverImage: (
        contentType.value === 'note' || contentType.value === 'moment'
          ? (noteImages.value[0] || formData.cover_image)
          : formData.cover_image
      )?.trim() || undefined,
      images: isShortForm ? noteImages.value : undefined,
      attachments: withAttachments
        ? momentAttachments.value.map((item, idx) => ({ ...item, sortOrder: idx }))
        : undefined,
      tags,
      author: formData.author?.trim() || undefined,
      authorAvatar: formData.author_avatar?.trim() || undefined,
      authorRole: formData.author_role || 'editor',
      authorId: formData.author_id ?? undefined,
      visibility: formData.visibility || 'public',
      auditStatus: formData.audit_status || 'approved',
      likeCount: formData.like_count,
      viewCount: formData.view_count,
      favoriteCount: formData.favorite_count,
      source:
        contentType.value === 'note'
          ? '笔记'
          : contentType.value === 'moment'
            ? '动态'
            : contentType.value === 'video'
              ? '视频'
              : undefined,
      sortOrder: formData.sort,
      seoTitle: seoForm.title?.trim() || undefined,
      seoDescription: seoForm.description?.trim() || undefined,
      scheduledAt: publishMode.value === 'schedule' ? scheduleTime.value : '',
      confirmOverwrite: wasPublished || undefined,
      videoUrl: contentType.value === 'video' ? formData.video_url.trim() : undefined,
      videoDuration: contentType.value === 'video' ? formData.video_duration : undefined,
      layoutTheme: formData.layout_theme || 'standard',
      discoverLayout: formData.discover_layout || 'auto',
      isPinned: formData.is_pinned ? 1 : 0,
      isRecommended: formData.is_recommended ? 1 : 0,
      planetExclusive: contentType.value === 'moment' && formData.planet_exclusive ? 1 : 0,
      planetId: contentType.value === 'moment' && formData.planet_exclusive
        ? (formData.planet_id || undefined)
        : undefined,
      copyrightNature: ['article', 'note'].includes(contentType.value) ? formData.copyright_nature : undefined,
      reprintAuthorization: formData.copyright_nature === 'reprint' ? formData.reprint_authorization : undefined,
    } as any

    if (isEdit.value) {
      const id = Number(route.query.id)
      await updateContent(id, payload)
      await saveLinkedProducts(id)
      await saveAccessRule(id)
      if (publishMode.value === 'publish' && !wasPublished) {
        await publishContent(id)
      } else if (publishMode.value === 'draft' && wasPublished) {
        await unpublishContent(id)
      }
      // schedule：update 已带 scheduledAt → 后端设 status=scheduled，勿再 unpublish
      ElMessage.success(
        publishMode.value === 'schedule'
          ? `已设定定时发布：${scheduleTime.value}`
          : '内容已更新',
      )
    } else {
      const created = await createContent(payload)
      const createdId = Number((created as any).data?.id ?? (created as any).id)
      if (createdId) {
        await saveLinkedProducts(createdId)
        await saveAccessRule(createdId)
      }
      if (publishMode.value === 'publish' && createdId) {
        await publishContent(createdId)
      }
      ElMessage.success(
        publishMode.value === 'schedule'
          ? `已设定定时发布：${scheduleTime.value}`
          : publishMode.value === 'draft'
            ? '草稿已保存'
            : '内容已创建',
      )
    }

    dirty.value = false
    lastSavedAt.value = new Date()
    saveState.value = 'saved'
    goBack(true)
  } catch (err: any) {
    saveState.value = 'error'
    ElMessage.error(err?.message || '提交失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchPlanetCommunities(), loadAuthors()])
  if (!userStore.userInfo) {
    try { await userStore.fetchUserInfo() } catch { /* ignore */ }
  }
  const qType = String(route.query.type || '')
  if (['note', 'moment', 'video', 'article'].includes(qType)) {
    contentType.value = qType as typeof contentType.value
    typeLocked.value = true
  }
  if (isEdit.value) {
    await loadDetail(Number(route.query.id))
    if (!formData.author?.trim()) applyDefaultAuthor()
  } else {
    applyDefaultAuthor()
  }
  hydrated.value = true
})

watch(
  () => [formData.title, formData.content, noteBody.value, publishMode.value],
  () => { lastEditedAt.value = new Date() },
)

// ===== 未保存修改守卫（QA P1-02）：hydrated 之前的回填不算脏；保存成功后复位 =====
const hydrated = ref(false)
const dirty = ref(false)
watch(
  [formData, seoForm, accessRule],
  () => {
    if (hydrated.value) {
      dirty.value = true
      if (saveState.value !== 'saving') saveState.value = 'dirty'
    }
  },
  { deep: true },
)

// ===== 保存状态机（QA P1-03）：idle → dirty → saving → saved / error，顶栏实时可见 =====
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
const saveState = ref<SaveState>('idle')
const lastSavedAt = ref<Date | null>(null)
const saveStatusText = computed(() => {
  if (saveState.value === 'saving') return '保存中…'
  if (saveState.value === 'dirty') return '有未保存修改'
  if (saveState.value === 'error') return '保存失败，请重试'
  if (saveState.value === 'saved' && lastSavedAt.value) {
    const d = lastSavedAt.value
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `已保存 ${hh}:${mm}`
  }
  return ''
})
onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm(
      '当前内容有未保存的修改，离开后修改将丢失。',
      '放弃修改？',
      { confirmButtonText: '放弃修改', cancelButtonText: '继续编辑', type: 'warning' },
    )
    return true
  } catch {
    return false
  }
})

watch(showSeoTab, (ok) => {
  if (!ok && activeTab.value === 'seo') activeTab.value = 'base'
})

function applyDefaultAuthor() {
  if (formData.author?.trim()) return
  const u = userStore.userInfo
  formData.author = String(u?.nickname || u?.username || '').trim()
}

async function fetchPlanetCommunities() {
  try {
    const res = await get<any>('/api/v1/admin/planet/config')
    const data = (res as any)?.data ?? res
    const rows = data?.communities || []
    planetCommunities.value = (Array.isArray(rows) ? rows : [])
      .filter((c: any) => c && c.id)
      .map((c: any) => ({ id: String(c.id), title: String(c.title || c.id) }))
  } catch {
    planetCommunities.value = []
  }
}
</script>

<style lang="scss" scoped>
.content-edit-page {
  padding: 16px 20px 28px;
  box-sizing: border-box;

  .edit-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    padding: 10px 14px;
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    position: sticky;
    top: 0;
    z-index: 8;
  }

  .edit-topbar__left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .edit-topbar__title {
    font-size: 16px;
    font-weight: 700;
    color: #172033;
  }

  .edit-topbar__draft {
    font-size: 12px;
    color: #8a94a6;
    background: #f5f6f9;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .edit-topbar__save {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;

    &.is-dirty {
      color: #b88230;
      background: #fdf3e3;
    }

    &.is-saving {
      color: #4a6fa5;
      background: #eaf1fb;
    }

    &.is-saved {
      color: #3d8a5a;
      background: #e8f6ee;
    }

    &.is-error {
      color: #c0483e;
      background: #fdeceb;
    }
  }

  .edit-topbar__right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .edit-layout {
    display: grid;
    /* 右栏只放预览，可适当加宽让手机壳更大更清晰 */
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 16px;
    align-items: start;
  }

  .edit-aside {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: 64px;
  }

  .publish-ops {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px 18px;
    align-items: center;
  }

  /* 右栏现在只放预览，给它更宽的展示位 */
  .preview-aside {
    padding: 16px 14px 18px;
    border: 1px solid var(--border, #e4e9f2);
    border-radius: 12px;
    background: var(--bg-elevated, #fff);
  }

  .preview-aside__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 700;
    color: #172033;
  }

  .preview-aside__toggle {
    :deep(.el-radio-button__inner) {
      padding: 4px 10px;
      font-size: 12px;
    }
  }

  .preview-aside__wide {
    max-height: 680px;
    overflow: auto;
    border-radius: 12px;
    background: #f7f8fa;
    padding: 10px;
  }

  .editor-card {
    border-radius: 12px;
    border: 1px solid #e4e9f2;
  }

  .editor-toolbar-extra {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .section-label {
    margin: 8px 0 10px;
    color: #607187;
    font-size: 13px;
    font-weight: 600;
  }

  .rich-editor {
    width: 100%;
  }

  .editor-tip {
    margin-top: 8px;
    color: #8a94a6;
    font-size: 12px;
  }

  .field-hint {
    margin-top: 6px;
    color: #8a94a6;
    font-size: 12px;
    line-height: 1.4;
  }

  .field-hint--tight {
    margin: 0 0 16px 90px;
  }

  /* 超字数提醒：主色 + 轻底，不用红色（红色是「错误」的语义，这里只是提示） */
  .title-over {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 7px;
    padding: 6px 10px;
    border-radius: 7px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--brand, #002fa7);
    background: color-mix(in srgb, var(--brand, #002fa7) 7%, transparent);
  }

  /* 发布设置：现在位于正文表单下方，跟随内容流 */
  .publish-panel {
    margin-top: 20px;
    padding: 16px 18px 6px;
    border: 1px solid var(--border, #e4e9f2);
    border-radius: 12px;
    background:
      linear-gradient(180deg,
        color-mix(in srgb, var(--brand, #002fa7) 5%, transparent) 0%,
        transparent 96px),
      var(--bg-elevated, #fff);
  }

  .publish-panel__head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border, #e4e9f2);
  }

  .publish-panel__title {
    position: relative;
    padding-left: 10px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text, #172033);
  }

  /* 标题左侧主色竖条，与右栏主色呼应 */
  .publish-panel__title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 15px;
    border-radius: 2px;
    transform: translateY(-50%);
    background: var(--brand, #002fa7);
  }

  .publish-panel__sub {
    font-size: 12px;
    color: var(--text-secondary, #64748b);
  }

  .publish-panel__form {
    max-width: 860px;

    :deep(.el-form-item) {
      margin-bottom: 14px;
    }
    :deep(.el-radio-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .ai-entry-btn {
    color: var(--brand, #002fa7);
    border-color: color-mix(in srgb, var(--brand, #002fa7) 40%, transparent);
    background: color-mix(in srgb, var(--brand, #002fa7) 8%, transparent);
  }

  .ai-entry-btn:hover {
    color: #fff;
    border-color: var(--brand, #002fa7);
    background: var(--brand, #002fa7);
  }

  .author-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .cover-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .cover-preview {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cover-preview img {
    /* 微信公众号大封面比例 2.35:1（900×383），与运营按微信标准设计的封面图一致 */
    width: 160px;
    aspect-ratio: 2.35 / 1;
    height: auto;
    object-fit: cover;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    background: #eef2f7;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
    background: #fff;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    cursor: pointer;
  }

  /* ===== 小红书式视频上传区 ===== */
  .video-uploader {
    margin-bottom: 18px;
  }

  .video-uploader__hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .video-uploader__lb {
    font-size: 14px;
    font-weight: 600;
    color: #172033;
  }

  .video-uploader__ratio {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .video-uploader__ratio-lb {
    font-size: 12px;
    color: #8a94a6;
  }

  .video-uploader__box {
    position: relative;
    width: 100%;
    max-width: 420px;
    aspect-ratio: 3 / 4;
    border-radius: 12px;
    overflow: hidden;
    background: #111;
  }

  .video-uploader__box.is-square {
    aspect-ratio: 1 / 1;
  }

  .video-uploader__empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #fafafa;
    border: 1px dashed #ddd;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: #d34d4d;
    }
  }

  .video-uploader__plus {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fdeeee;
    color: #d34d4d;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .video-uploader__hint {
    margin-top: 6px;
    font-size: 15px;
    font-weight: 600;
    color: #172033;
  }

  .video-uploader__sub {
    font-size: 12px;
    color: #8a94a6;
  }

  .video-uploader__stage {
    position: absolute;
    inset: 0;
  }

  .video-uploader__player {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .video-uploader__loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #8a94a6;
    font-size: 13px;
  }

  .video-uploader__dur {
    position: absolute;
    right: 10px;
    bottom: 10px;
    padding: 2px 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 12px;
  }

  .video-uploader__ops {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 10px;
  }

  .video-uploader__op {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
    color: #607187;
    background: #f5f7fb;
    border: 1px solid #e3e8f0;
    border-radius: 13px;
    cursor: pointer;

    &:hover {
      color: #d34d4d;
      background: #fdf1f1;
      border-color: #f2c6c6;
    }

    &.is-danger {
      color: #c0483e;
      background: #fdf1f1;
      border-color: #f2c6c6;
    }
  }

  .video-uploader__tip {
    margin-left: auto;
    font-size: 12px;
    color: #a3adc2;
  }

  .video-uploader__url {
    margin-top: 10px;
    max-width: 420px;
  }

  .video-cover-preview {
    width: 120px;
    aspect-ratio: 3 / 4;
    height: auto;
    object-fit: cover;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    background: #eef2f7;

    &.is-square {
      aspect-ratio: 1 / 1;
      width: 140px;
    }
  }

  .cover-preview__ops {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cover-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .xhs-editor {
    width: 100%;

    &__toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      height: 26px;
      padding: 0 10px;
      font-size: 12px;
      color: #607187;
      background: #f5f7fb;
      border: 1px solid #e3e8f0;
      border-radius: 13px;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        color: #d34d4d;
        background: #fdf1f1;
        border-color: #f2c6c6;
      }

      &.is-active {
        color: #d34d4d;
        background: #fdf1f1;
        border-color: #f2c6c6;
      }
    }

    &__tip {
      margin-left: auto;
      font-size: 12px;
      color: #a3adc2;
    }

    &__input {
      :deep(.el-textarea__inner) {
        line-height: 1.7;
        font-size: 14px;
        color: #172033;
        border-radius: 8px;
        box-shadow: none;

        &:focus {
          border-color: #d34d4d;
        }
      }
    }
  }

  .avatar-preview {
    width: 48px !important;
    height: 48px !important;
    border-radius: 50%;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid #e3e8f0;
    border-radius: 8px;
    background: #f8faff;
  }

  .attachment-item__icon {
    font-size: 18px;
  }

  .attachment-item__meta {
    flex: 1;
    min-width: 0;
  }

  .attachment-item__name {
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-item__size {
    margin-top: 2px;
    font-size: 12px;
    color: #8a94a6;
  }

  .stats-label {
    color: #607187;
    font-size: 13px;
  }

  .seo-tip {
    background: #eff5ff;
    border: 1px solid #d6e4ff;
    border-radius: 8px;
    padding: 10px 12px;
    color: #3b5bdb;
    font-size: 12px;
    line-height: 1.5;
  }
}

.field-tip {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 1200px) {
  .content-edit-page .edit-layout {
    grid-template-columns: 1fr;
  }

  .content-edit-page .edit-aside {
    position: static;
  }
}

/* ══════════ 发布前预览弹窗══════════ */
.preview-dialog {
  --pv-ink: var(--text, #2a1f17);
  --pv-mute: var(--text-secondary, #6b5b4e);
  --pv-faint: var(--text-muted, #a1897a);
  --pv-line: var(--border, #e8dfd3);
  --pv-accent: var(--brand, #b4430f);
  --pv-accent-soft: var(--brand-soft, #fbeadf);
  /* 舞台固定高度 = 手机屏 600 + 上下留白 20*2，两栏据此严格等高 */
  --pv-stage-h: 640px;

  display: grid;
  grid-template-columns: minmax(340px, 400px) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  text-align: left;
}

.preview-dialog__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px 16px 14px;
  border-radius: 14px;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--pv-line);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--pv-ink) 5%, transparent);
}

.preview-dialog__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.preview-dialog__badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--pv-accent);
  letter-spacing: 0.5px;
}

.preview-dialog__sub {
  font-size: 13px;
  color: var(--pv-faint);
}

/* 舞台：中性暖灰，把手机/PC 当成"展品"托起来。
   高度固定为 --pv-stage-h，是两栏严格等高的唯一依据 */
.preview-dialog__stage {
  flex: 0 0 var(--pv-stage-h);
  height: var(--pv-stage-h);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 16px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--pv-accent) 7%, transparent), transparent 62%),
    color-mix(in srgb, var(--pv-ink) 4%, transparent);
  border: 1px solid var(--pv-line);
  overflow: hidden;
}

.preview-dialog__stage--wide {
  align-items: stretch;
  padding: 0;
}

.preview-dialog__note {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pv-faint);
  text-align: center;
}

/* PC 端：纸面阅读区，独立滚动 */
.preview-dialog__pc-frame {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-elevated, #fff);
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--pv-ink) 22%, transparent) transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--pv-ink) 20%, transparent);
  }
  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--pv-ink) 34%, transparent);
  }
}

.preview-dialog__pc-body {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 30px 40px;
}

.preview-dialog__pc-eyebrow {
  display: inline-block;
  margin-bottom: 9px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--pv-accent);
  background: var(--pv-accent-soft);
}

.preview-dialog__title {
  margin: 0 0 8px;
  font-size: 19px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--pv-ink);
}

.preview-dialog__summary {
  margin: 0 0 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--pv-line);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--pv-mute);
}

.preview-dialog__html {
  font-size: 13px;
  line-height: 1.75;
  color: var(--pv-ink);

  :deep(p) {
    margin: 0 0 11px;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
  }

  /* 正文里的标题同样要压小，否则一屏放不下几句 */
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 18px 0 8px;
    font-size: 15px;
    line-height: 1.45;
    font-weight: 700;
  }

  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(strong) {
    font-weight: 700;
  }
}

.preview-dialog__note-body {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.75;
  color: var(--pv-ink);
}

.preview-dialog__empty {
  margin: 0;
  padding: 28px 0;
  text-align: center;
  font-size: 14px;
  color: var(--pv-faint);
}
</style>

<!-- 弹窗外壳与 footer 属teleport 渲染，需非 scoped 样式 -->
<style lang="scss">
.pv-dialog {
  --pv-accent: var(--brand, #b4430f);
  --pv-ink: var(--text, #2a1f17);
  --pv-mute: var(--text-secondary, #6b5b4e);
  --pv-line: var(--border, #e8dfd3);

  .el-dialog {
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 28px 70px rgba(30, 22, 15, 0.28);
  }

  .el-dialog__header {
    margin: 0;
    padding: 20px 26px 16px;
    background: var(--pv-ink);
  }

  .el-dialog__body {
    padding: 20px 24px 8px;
    background: color-mix(in srgb, var(--pv-ink) 3%, #fff);
  }

  .el-dialog__footer {
    padding: 14px 24px 20px;
    background: color-mix(in srgb, var(--pv-ink) 3%, #fff);
    border-top: 1px solid var(--pv-line);
  }

  .el-dialog__headerbtn {
    display: none;
  }
}

.pv-dialog__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pv-dialog__headtxt {
  flex: 1;
  min-width: 0;
}

.pv-dialog__eyebrow {
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--pv-accent) 62%, #fff);
}

.pv-dialog__title {
  margin-top: 4px;
  font-size: 19px;
  font-weight: 700;
  color: #fff;
}

.pv-dialog__close {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    color: #fff;
    background: var(--pv-accent);
  }
}

.pv-dialog__foot {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pv-dialog__footinfo {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--pv-mute);
}

.pv-dialog__footbtns {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

/* ══════════ AI 辅助创作弹窗（独立页，teleport →非 scoped） ══════════ */
.ai-assist-dialog {
  --ai-accent: var(--brand, #002fa7);
  --ai-ink: var(--text, #172033);
  --ai-line: var(--border, #e5eaf3);

  .el-dialog {
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.26);
  }

  .el-dialog__header {
    margin: 0;
    padding: 20px 26px 16px;
    background: var(--ai-ink);
  }

  .el-dialog__body {
    padding: 20px 24px;
    max-height: calc(100vh - 260px);
    overflow-y: auto;
    background: color-mix(in srgb, var(--ai-ink) 3%, #fff);
  }

  .el-dialog__footer {
    padding: 14px 24px 18px;
    background: color-mix(in srgb, var(--ai-ink) 3%, #fff);
    border-top: 1px solid var(--ai-line);
  }

  .el-dialog__headerbtn {
    display: none;
  }
}

.ai-dialog__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ai-dialog__headtxt {
  flex: 1;
  min-width: 0;
}

.ai-dialog__eyebrow {
  font-size: 12px;
  letter-spacing: 3px;
  color: color-mix(in srgb, var(--ai-accent) 55%, #fff);
}

.ai-dialog__title {
  margin-top: 4px;
  font-size: 19px;
  font-weight: 700;
  color: #fff;
}

.ai-dialog__close {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    color: #fff;
    background: var(--ai-accent);
  }
}

.ai-dialog__foot {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ai-dialog__hint {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
}
</style>

<!-- emoji 面板 popper teleport 到 body，需非 scoped 样式 -->
<style lang="scss">
.xhs-emoji-popper {
  .emoji-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .emoji-panel__tabs {
    display: flex;
    gap: 4px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f0f2f7;
  }

  .emoji-panel__tab {
    height: 24px;
    padding: 0 10px;
    font-size: 12px;
    color: #607187;
    background: transparent;
    border: none;
    border-radius: 12px;
    cursor: pointer;

    &:hover {
      background: #f5f7fb;
    }

    &.is-active {
      color: #d34d4d;
      background: #fdf1f1;
      font-weight: 600;
    }
  }

  .emoji-panel__grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    max-height: 168px;
    overflow-y: auto;
  }

  .emoji-panel__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    font-size: 22px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background: #f5f7fb;
    }
  }
}
</style>
