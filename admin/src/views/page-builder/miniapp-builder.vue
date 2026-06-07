<template>
  <div class="miniapp-builder">
    <!-- ==================== VIEW A: Template Gallery ==================== -->
    <div v-if="viewMode === 'gallery'" class="template-gallery">
      <div class="builder-toolbar">
        <div class="toolbar-left">
          <h1>小程序搭建</h1>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="handleNewBuild">
            <el-icon><Plus /></el-icon> 新建搭建
          </el-button>
          <el-button :loading="galleryLoading" @click="loadGalleryData">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <div class="gallery-body">
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-icon">📦</span>
            <div class="stat-info">
              <span class="stat-value">{{ templateCount }}</span>
              <span class="stat-label">模板数</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <div class="stat-info">
              <span class="stat-value">{{ latestPublished ? latestPublished.semver : '无' }}</span>
              <span class="stat-label">已发布版本</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🔄</span>
            <div class="stat-info">
              <span class="stat-value">{{ releases.length }}</span>
              <span class="stat-label">总版本数</span>
            </div>
          </div>
        </div>

        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: galleryFilter === tab.value }"
            @click="galleryFilter = tab.value"
          >{{ tab.label }}</button>
        </div>

        <div v-if="filteredReleases.length > 0" class="template-grid">
          <div
            v-for="item in filteredReleases"
            :key="item.id"
            class="template-card"
            :class="{
              'card-published': item.status === 1,
              'card-template': item.mode === 'template' || item.status === 0,
            }"
          >
            <div class="card-header">
              <div class="card-badges">
                <el-tag v-if="item.status === 1" type="success" size="small" effect="dark">
                  已发布
                  <span v-if="item.isCurrentPublished" class="current-live-badge">★ 当前线上</span>
                </el-tag>
                <el-tag v-else-if="item.mode === 'template' || item.status === 0" type="primary" size="small" effect="dark">模板</el-tag>
                <el-tag v-else-if="item.status === 2" type="info" size="small" effect="dark">已替换</el-tag>
              </div>
              <span class="card-semver" :style="{ color: getChangeTypeColor(item.changeType) }">
                {{ item.semver }}
              </span>
            </div>

            <div class="card-notes">{{ item.releaseNotes || '暂无说明' }}</div>

            <div class="card-meta">
              <span><el-icon><Document /></el-icon> {{ item.pageCount }} 页面</span>
              <span>{{ formatTime(item.createTime) }}</span>
            </div>

            <div class="card-actions">
              <el-button size="small" type="success" plain @click="openH5Preview(item)">H5预览</el-button>
              <el-button size="small" type="warning" plain :loading="pushingReleaseId === item.id" @click="handlePushPreview(item)">
                推送体验版
              </el-button>
              <el-button size="small" text type="primary" @click="copyH5PreviewLink(item)">复制链接</el-button>
              <template v-if="item.status === 1">
                <el-button size="small" type="primary" plain @click="handleEditTemplate(item)">编辑</el-button>
                <el-popconfirm title="确认回滚到此版本？" confirm-button-text="确认" cancel-button-text="取消" @confirm="handleRollback(item)">
                  <template #reference>
                    <el-button size="small" plain>回滚</el-button>
                  </template>
                </el-popconfirm>
              </template>
              <template v-else>
                <el-button size="small" type="primary" plain @click="handleEditTemplate(item)">编辑</el-button>
                <el-button v-if="item.mode === 'template' || item.status === 0" size="small" type="success" plain @click="handlePromote(item)">
                  🚀 发布上线
                </el-button>
                <el-popconfirm title="确认删除此模板？删除后不可恢复。" confirm-button-text="确认删除" cancel-button-text="取消" @confirm="handleDelete(item)">
                  <template #reference>
                    <el-button v-if="item.mode === 'template' || item.status === 0" size="small" type="danger" text>删除🗑️</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="empty-gallery">
          <el-empty description="暂无模板，点击「新建搭建」开始">
            <el-button type="primary" @click="handleNewBuild">
              <el-icon><Plus /></el-icon> 新建搭建
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- ==================== VIEW B: Editor ==================== -->
    <div v-else class="editor-view">
      <div class="builder-toolbar">
        <div class="toolbar-left">
          <el-button size="small" plain @click="goToGallery">
            <el-icon><ArrowLeft /></el-icon> 返回模板中心
          </el-button>
          <h1>{{ editingTemplateId ? '编辑模板' : '新建搭建' }}</h1>
          <span v-if="isDirty" class="dirty-pill">有未保存更改</span>
        </div>
        <div class="toolbar-right">
          <el-button size="small" @click="autoBindPages">
            <el-icon><Connection /></el-icon> 自动绑定
          </el-button>
          <el-button size="small" @click="handleReset">恢复默认</el-button>
          <el-button size="small" @click="showModuleVersionDialog = true">
            <el-icon><Clock /></el-icon> 📦 模块版本
          </el-button>
          <el-button type="warning" size="small" :loading="saving" @click="handleSaveAsTemplate">
            <el-icon><Box /></el-icon> 💾 保存为模板
          </el-button>
          <el-button type="primary" size="small" :loading="saving" @click="handlePublishOnline">
            <el-icon><Check /></el-icon> 🚀 发布上线
          </el-button>
        </div>
      </div>

      <div class="step-bar">
        <button
          v-for="(step, idx) in steps"
          :key="step.key"
          class="step-item"
          :class="{ active: activeStep === idx, done: published ? idx < 5 : (idx < activeStep) }"
          @click="activeStep = idx"
        >
          <span class="step-num">{{ idx + 1 }}</span>
          <span class="step-text">{{ step.label }}</span>
        </button>
      </div>

      <div class="builder-body">
        <div class="config-panel">
          <div v-loading="loading" class="config-scroll">
            <div v-show="activeStep === 0" class="config-section">
              <ThemeConfig v-model="form.theme" />
              <div class="step-footer">
                <el-button type="primary" @click="activeStep = 1">下一步：导航配置 →</el-button>
              </div>
            </div>

            <div v-show="activeStep === 1" class="config-section">
              <NavTemplateSelector v-model="form.templateKey" @update:model-value="onTemplateChange" />
              <div class="section-divider"></div>
              <TabBarEditor :tabs="form.tabs" :pages="pages" @update:tabs="form.tabs = $event" />
              <div class="section-divider"></div>
              <div class="section-label">核心页面绑定</div>
              <el-form label-width="80px" size="small">
                <el-form-item label="首页">
                  <el-select v-model="form.homePageId" placeholder="选择首页" clearable filterable style="width:100%">
                    <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="我的页面">
                  <div class="mine-mode-selector">
                    <el-radio-group v-model="minePageMode" size="small" @change="onMinePageModeChange">
                      <el-radio-button value="config">配置模板</el-radio-button>
                      <el-radio-button value="custom">自定义页面</el-radio-button>
                    </el-radio-group>
                  </div>
                  <el-select
                    v-if="minePageMode === 'custom'"
                    v-model="form.minePageId"
                    placeholder="选择已搭建的页面"
                    clearable
                    filterable
                    style="width:100%; margin-top:8px"
                  >
                    <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
                  </el-select>
                  <div v-else class="mine-mode-hint">
                    <span class="hint-icon">⚙️</span>
                    <span>使用第3步「我的页面」的配置模板（登录区+菜单+订单入口）</span>
                    <el-button text type="primary" size="small" @click="activeStep = 2">去配置 →</el-button>
                  </div>
                </el-form-item>
              </el-form>
              <div class="step-footer">
                <el-button @click="activeStep = 0">← 上一步</el-button>
                <el-button type="primary" @click="activeStep = 2">下一步：我的页面 →</el-button>
              </div>
            </div>

            <div v-show="activeStep === 2" class="config-section">
              <div class="section-label" style="margin-bottom:8px">选择模板风格</div>
              <div class="mine-template-picker">
                <div
                  v-for="tpl in personalCenterTemplates"
                  :key="tpl.key"
                  class="mine-tpl-card"
                  :class="{ selected: selectedMineTemplate === tpl.key }"
                  @click="selectMineTemplate(tpl.key)"
                >
                  <div class="mine-tpl-preview" :style="{ background: tpl.gradient }">
                    <div class="mine-tpl-icon">{{ tpl.icon }}</div>
                  </div>
                  <div class="mine-tpl-name">{{ tpl.name }}</div>
                </div>
              </div>
              <div class="section-divider"></div>
              <MinePageConfig v-model="form.mineConfig" />
              <div class="step-footer">
                <el-button @click="activeStep = 1">← 上一步</el-button>
                <el-button type="primary" @click="activeStep = 3">下一步：确认发布 →</el-button>
              </div>
            </div>

            <div v-show="activeStep === 3" class="config-section">
              <div class="confirm-header">配置确认</div>
              <div class="confirm-summary">
                <div class="summary-item">
                  <span class="summary-label">导航模板</span>
                  <span class="summary-value">{{ templateName }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">导航项</span>
                  <span class="summary-value">{{ form.tabs.length }} 个，已绑定 {{ boundCount }} 个</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">主题色</span>
                  <span class="summary-value">
                    <span class="color-dot" :style="{ background: form.theme.primaryColor }"></span>
                    {{ form.theme.primaryColor }}
                  </span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">我的页面菜单</span>
                  <span class="summary-value">{{ visibleMenuCount }} 项可见</span>
                </div>
              </div>

              <div class="section-divider"></div>

              <div class="share-config">
                <div class="section-label">分享配置</div>
                <el-form label-width="80px" size="small">
                  <el-form-item label="分享标题">
                    <el-input v-model="form.shareTitle" placeholder="小程序分享卡片标题" maxlength="30" show-word-limit />
                  </el-form-item>
                  <el-form-item label="分享图片">
                    <div class="share-image-upload" @click="triggerShareImageUpload">
                      <img v-if="form.shareImage" :src="form.shareImage" class="share-preview" />
                      <div v-else class="upload-placeholder">
                        <el-icon><Plus /></el-icon>
                        <span>上传分享图</span>
                      </div>
                    </div>
                    <input ref="shareImageInput" type="file" accept="image/*" style="display:none" @change="handleShareImageChange" />
                  </el-form-item>
                </el-form>
              </div>

              <div class="section-divider"></div>

              <div v-if="unboundTabs.length > 0" class="confirm-warnings">
                <el-alert type="warning" :closable="false">
                  <template #title>
                    以下导航项尚未绑定页面：{{ unboundTabs.map(t => t.text).join('、') }}
                  </template>
                </el-alert>
              </div>

              <div class="confirm-actions">
                <el-button @click="activeStep = 2">← 返回修改</el-button>
                <div class="confirm-btns">
                  <el-button size="large" @click="handleSaveAsTemplate">💾 保存为模板</el-button>
                  <el-button type="primary" size="large" :loading="saving" @click="handlePublishOnline">
                    <el-icon><Check /></el-icon> 🚀 发布上线
                  </el-button>
                </div>
              </div>
            </div>

            <!-- Step 5A: Template Saved Success -->
            <div v-show="activeStep === 4 && successMode === 'template'" class="config-section success-section">
              <div class="success-icon">📦</div>
              <h2 class="success-title">模板保存成功！</h2>
              <p class="success-desc">当前配置已保存为模板，您可以随时编辑或发布上线</p>

              <div v-if="newReleaseInfo" class="version-release-card version-release-card-template">
                <div class="version-release-header">
                  <el-tag type="primary" effect="dark" size="large" round>
                    模板版本 {{ newReleaseInfo.semver || 'v1.0.0' }}
                  </el-tag>
                  <span class="version-release-time">{{ formatTime(new Date()) }}</span>
                </div>
                <div class="version-release-body">
                  <div class="release-detail-row">
                    <span>变更类型</span><strong>{{ changeTypeLabel(newReleaseInfo.changeType) }}</strong>
                  </div>
                  <div class="release-detail-row">
                    <span>包含页面</span><strong>{{ newReleaseInfo.pageCount ?? 0 }} 个页面</strong>
                  </div>
                  <div class="release-detail-row" v-if="newReleaseInfo.releaseNotes">
                    <span>备注说明</span><strong>{{ newReleaseInfo.releaseNotes }}</strong>
                  </div>
                </div>
              </div>

              <div class="next-steps">
                <div class="next-step-title">接下来您可以：</div>
                <div class="next-step-list">
                  <a class="next-step-item highlight" href="#" @click.prevent="handlePublishOnline">
                    <span class="next-icon">🚀</span>
                    <div class="next-info">
                      <strong>发布此模板</strong>
                      <span>将当前模板正式发布到线上环境</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                  <a class="next-step-item" href="#" @click.prevent="goToGallery">
                    <span class="next-icon">↩️</span>
                    <div class="next-info">
                      <strong>返回模板中心</strong>
                      <span>查看所有已保存的模板和版本记录</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                  <a class="next-step-item" href="#" @click.prevent="activeStep = 3; successMode = 'template'">
                    <span class="next-icon">🎨</span>
                    <div class="next-info">
                      <strong>继续编辑</strong>
                      <span>修改配置内容并重新保存</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                </div>
              </div>

              <div class="success-footer">
                <el-button size="large" @click="goToGallery">返回</el-button>
                <el-button size="large" type="success" @click="handlePublishOnline">
                  🚀 发布上线
                </el-button>
                <el-button size="large" type="primary" @click="activeStep = 3; successMode = 'template'">
                  💾 重新保存
                </el-button>
              </div>
            </div>

            <!-- Step 5B: Publish Success -->
            <div v-show="activeStep === 4 && successMode === 'publish'" class="config-section success-section">
              <div class="success-icon">🟢</div>
              <h2 class="success-title">发布成功！小程序已更新</h2>
              <p class="success-desc">您的小程序新版本已成功发布到线上，用户将看到最新内容</p>

              <div v-if="newReleaseInfo" class="version-release-card">
                <div class="version-release-header">
                  <el-tag type="success" effect="dark" size="large" round>
                    版本 {{ newReleaseInfo.semver || 'v1.0.0' }} · 已线上
                  </el-tag>
                  <span class="version-release-time">{{ formatTime(new Date()) }}</span>
                </div>
                <div class="version-release-body">
                  <div class="release-detail-row">
                    <span>变更类型</span><strong>{{ changeTypeLabel(newReleaseInfo.changeType) }}</strong>
                  </div>
                  <div class="release-detail-row">
                    <span>包含页面</span><strong>{{ newReleaseInfo.pageCount ?? 0 }} 个已发布页面</strong>
                  </div>
                  <div class="release-detail-row" v-if="replacedOldVersion">
                    <span>替换旧版本</span><strong>{{ replacedOldVersion }}</strong>
                  </div>
                  <div class="release-detail-row" v-if="newReleaseInfo.releaseNotes">
                    <span>发布说明</span><strong>{{ newReleaseInfo.releaseNotes }}</strong>
                  </div>
                </div>
              </div>

              <div class="next-steps">
                <div class="next-step-title">接下来您可以：</div>
                <div class="next-step-list">
                  <a class="next-step-item highlight" href="#" @click.prevent="goToVersionManagement">
                    <span class="next-icon">🔄</span>
                    <div class="next-info">
                      <strong>查看版本记录</strong>
                      <span>查看本次发布的版本快照，支持回滚到历史版本</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                  <a class="next-step-item" href="#" @click.prevent="goToGallery">
                    <span class="next-icon">↩️</span>
                    <div class="next-info">
                      <strong>返回模板中心</strong>
                      <span>管理所有模板和版本</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                  <a class="next-step-item" href="#" @click.prevent="goToPageBuilder">
                    <span class="next-icon">🎨</span>
                    <div class="next-info">
                      <strong>装修页面内容</strong>
                      <span>前往页面装修器，为首页和其他页面添加组件</span>
                    </div>
                    <el-icon><ArrowRight /></el-icon>
                  </a>
                </div>
              </div>

              <div class="success-footer">
                <el-button size="large" @click="published = false; activeStep = 3; successMode = 'publish'">返回修改配置</el-button>
                <el-button size="large" @click="goToVersionManagement">
                  🔄 查看版本管理
                </el-button>
                <el-button size="large" type="primary" @click="handlePublishOnline">
                  🚀 重新发布
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-panel" :class="{ collapsed: previewCollapsed }">
          <div class="preview-toggle" @click="previewCollapsed = !previewCollapsed">
            <DArrowLeft v-if="previewCollapsed" />
            <DArrowRight v-else />
          </div>
          <div v-if="!previewCollapsed" class="preview-content">
            <div class="preview-label">实时预览</div>
            <MiniappPreview :form="form" :pages="pages" :mine-page-mode="minePageMode" />
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Module Version Dialog ==================== -->
    <el-dialog v-model="pushPreviewVisible" title="推送微信小程序体验版" width="560px" :close-on-click-modal="false">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="页面/配置变更会自动同步到小程序，无需推送。仅在 miniapp 代码变更或平台要求重新上传代码时使用。"
        style="margin-bottom: 16px"
      />
      <el-alert
        v-if="pushPreviewResult && isPushPreviewFailure(pushPreviewResult.message)"
        type="error"
        :closable="false"
        show-icon
        :title="pushPreviewResult.message"
        style="margin-bottom: 16px"
      />
      <el-descriptions v-if="pushPreviewResult" :column="1" border size="small">
        <el-descriptions-item label="版本号">{{ pushPreviewResult.version }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ pushPreviewResult.versionDesc }}</el-descriptions-item>
        <el-descriptions-item label="结果">{{ pushPreviewResult.message }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="pushPreviewResult?.manageUrl" class="push-preview-footer">
        <el-link type="primary" :href="pushPreviewResult.manageUrl" target="_blank">前往微信公众平台查看体验版</el-link>
      </div>
      <template #footer>
        <el-button @click="pushPreviewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showModuleVersionDialog" title="📦 模块版本管理" width="860px" :close-on-click-modal="false" @opened="loadModuleVersions">
      <el-tabs v-model="moduleVersionTab" type="border-card">
        <el-tab-pane label="🎨 风格配色" name="theme">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理主题配色（主色、辅色、圆角、字体等）的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('theme')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="themeVersions" v-loading="moduleLoading && moduleVersionTab === 'theme'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="🧭 导航配置" name="navigation">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理导航模板、TabBar 配置、页面绑定的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('navigation')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="navVersions" v-loading="moduleLoading && moduleVersionTab === 'navigation'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="👤 我的页面" name="mine">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理个人中心页面模板、菜单项、功能入口的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('mine')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="mineVersions" v-loading="moduleLoading && moduleVersionTab === 'mine'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Check, Connection, Plus, DArrowLeft, DArrowRight, ArrowRight, Refresh, ArrowLeft, Box, Document, Clock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { uploadFile } from '@/api/system'
import {
  getAllReleases,
  getLatestRelease,
  createRelease,
  promoteRelease,
  deleteRelease as deleteReleaseApi,
  rollbackRelease,
  getReleaseDetail,
  pushPreviewRelease,
} from '@/api/version'
import {
  getTargetVersions,
  createModuleVersion,
  publishModuleVersion,
  rollbackModuleVersion,
  deleteModuleVersion,
  type ModuleVersionRecord
} from '@/api/module-version'
import type { ReleaseRecord } from '@/types/page'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import { NAV_TEMPLATES } from '@/types/miniapp'
import NavTemplateSelector from '@/components/miniapp-builder/NavTemplateSelector.vue'
import TabBarEditor from '@/components/miniapp-builder/TabBarEditor.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import ThemeConfig from '@/components/miniapp-builder/ThemeConfig.vue'
import MiniappPreview from '@/components/miniapp-builder/MiniappPreview.vue'

const {
  form, pages, loading, saving, isDirty,
  applyTemplate, handleSave, handleReset, autoBindPages,
} = useMiniappConfig()

const router = useRouter()
const viewMode = ref<'gallery' | 'editor'>('gallery')
const editingTemplateId = ref<number | null>(null)
const galleryLoading = ref(false)
const releases = ref<ReleaseRecord[]>([])
const latestPublished = ref<ReleaseRecord | null>(null)
const galleryFilter = ref<'all' | 'published' | 'template'>('all')

const activeStep = ref(0)
const previewCollapsed = ref(false)
const shareImageInput = ref<HTMLInputElement>()
const minePageMode = ref<'config' | 'custom'>('config')
const published = ref(false)
const selectedMineTemplate = ref('standard')
const newReleaseInfo = ref<any>(null)
const successMode = ref<'template' | 'publish'>('template')
const replacedOldVersion = ref<string>('')

const showModuleVersionDialog = ref(false)
const moduleVersionTab = ref<'theme' | 'navigation' | 'mine'>('theme')
const themeVersions = ref<ModuleVersionRecord[]>([])
const navVersions = ref<ModuleVersionRecord[]>([])
const mineVersions = ref<ModuleVersionRecord[]>([])
const moduleLoading = ref(false)
const moduleSaving = ref(false)
const publishingId = ref<number | null>(null)
const pushingReleaseId = ref<number | null>(null)
const pushPreviewVisible = ref(false)
const pushPreviewResult = ref<any>(null)

const filterTabs: { label: string; value: 'all' | 'published' | 'template' }[] = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '模板', value: 'template' },
]

const personalCenterTemplates = [
  { key: 'standard', name: '标准版', icon: '👤', gradient: 'linear-gradient(135deg, #1769ff, #5b8def)' },
  { key: 'premium', name: '尊享版', icon: '👑', gradient: 'linear-gradient(135deg, #d4a017, #f0c040)' },
  { key: 'minimal', name: '简约版', icon: '🍃', gradient: 'linear-gradient(135deg, #0faa6e, #34d399)' },
  { key: 'dark', name: '暗黑版', icon: '🌙', gradient: 'linear-gradient(135deg, #1e293b, #475569)' },
]

const steps = [
  { key: 'theme', label: '风格配色' },
  { key: 'navigation', label: '导航配置' },
  { key: 'mine', label: '我的页面' },
  { key: 'confirm', label: '确认发布' },
  { key: 'success', label: '完成' },
]

const templateName = computed(() => {
  const tpl = NAV_TEMPLATES.find(t => t.key === form.templateKey)
  return tpl?.name || '自定义'
})

const boundCount = computed(() => form.tabs.filter(t => t.pageId || t.pagePath.includes('index')).length)
const unboundTabs = computed(() => form.tabs.filter(t => !t.pageId && !t.pagePath.includes('index')))
const visibleMenuCount = computed(() => form.mineConfig.menuItems.filter(m => m.enabled).length)

const templateCount = computed(() => releases.value.filter(r => r.status === 0 || r.mode === 'template').length)

const filteredReleases = computed(() => {
  if (galleryFilter.value === 'published') return releases.value.filter(r => r.status === 1)
  if (galleryFilter.value === 'template') return releases.value.filter(r => r.mode === 'template' || r.status === 0)
  return releases.value
})

function selectMineTemplate(key: string) {
  selectedMineTemplate.value = key
  const tplMap: Record<string, any> = {
    standard: { style: 'gradient', themeColor: '#1769ff' },
    premium: { style: 'gradient', themeColor: '#d4a017' },
    minimal: { style: 'flat', themeColor: '#0faa6e' },
    dark: { style: 'gradient', themeColor: '#1e293b' },
  }
  const preset = tplMap[key]
  if (preset && form.mineConfig) {
    Object.assign(form.mineConfig, preset)
  }
}

watch(() => (form.mineConfig as any).mode, (mode) => {
  if (mode === 'config' || mode === 'custom') {
    minePageMode.value = mode
  }
}, { immediate: true })

function onTemplateChange(key: string) {
  applyTemplate(key)
}

function onMinePageModeChange(mode: 'config' | 'custom') {
  if (mode === 'config') {
    form.minePageId = ''
  }
  ;(form.mineConfig as any).mode = mode
}

function triggerShareImageUpload() {
  shareImageInput.value?.click()
}

async function handleShareImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await uploadFile(file)
    form.shareImage = (res.data as any)?.url || ''
  } catch { /* ignore */ }
}

// ==================== Gallery Functions ====================
async function loadGalleryData() {
  galleryLoading.value = true
  try {
    const [allRes, latestRes] = await Promise.all([
      getAllReleases(),
      getLatestRelease().catch(() => null),
    ])
    const data = (allRes.data as any)?.data || allRes.data || []
    releases.value = Array.isArray(data) ? data : []
    if (latestRes) {
      const ld = (latestRes as any).data || latestRes
      latestPublished.value = ld ? { ...ld, isCurrentPublished: true } : null
    }
    releases.value.forEach((r: any) => {
      if (latestPublished.value && r.id === latestPublished.value.id) {
        r.isCurrentPublished = true
      }
    })
  } catch (err) {
    console.error('加载模板数据失败:', err)
    ElMessage.error('加载模板数据失败')
  } finally {
    galleryLoading.value = false
  }
}

function handleNewBuild() {
  editingTemplateId.value = null
  published.value = false
  successMode.value = 'template'
  newReleaseInfo.value = null
  replacedOldVersion.value = ''
  applyTemplate('standard')
  activeStep.value = 0
  viewMode.value = 'editor'
}

async function handleEditTemplate(item: ReleaseRecord) {
  editingTemplateId.value = item.id
  published.value = false
  successMode.value = 'template'
  newReleaseInfo.value = null
  replacedOldVersion.value = ''
  viewMode.value = 'editor'
  loading.value = true
  try {
    const res = await getReleaseDetail(item.id)
    const detail = (res as any).data || res
    if (detail?.snapshot) {
      parseSnapshotToForm(detail.snapshot)
    }
  } catch (err) {
    console.error('加载模板详情失败:', err)
    ElMessage.error('加载模板详情失败，将使用默认配置')
    applyTemplate('standard')
  } finally {
    loading.value = false
  }
  activeStep.value = 0
}

async function handlePromote(item: ReleaseRecord) {
  try {
    await promoteRelease(item.id)
    ElMessage.success('模板已发布上线')
    await loadGalleryData()
  } catch {
    ElMessage.error('发布失败，请重试')
  }
}

async function handleDelete(item: ReleaseRecord) {
  try {
    await deleteReleaseApi(item.id)
    ElMessage.success('模板已删除')
    await loadGalleryData()
  } catch {
    ElMessage.error('删除失败，请重试')
  }
}

async function handleRollback(item: ReleaseRecord) {
  try {
    await rollbackRelease({ targetSemver: item.semver, reason: `回滚到 ${item.semver}` })
    ElMessage.success(`已回滚到 ${item.semver}`)
    await loadGalleryData()
  } catch {
    ElMessage.error('回滚失败，请重试')
  }
}

function buildH5PreviewUrl(item: ReleaseRecord) {
  const { href } = router.resolve({
    path: '/h5/preview',
    query: {
      releaseId: String(item.id),
      semver: item.semver,
      path: 'pages/index/index',
      mode: item.mode === 'template' || item.status === 0 ? 'template' : 'release',
    },
  })
  return `${window.location.origin}${href}`
}

function openH5Preview(item: ReleaseRecord) {
  window.open(buildH5PreviewUrl(item), '_blank', 'noopener,noreferrer')
}

async function copyH5PreviewLink(item: ReleaseRecord) {
  const url = buildH5PreviewUrl(item)
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('H5 预览链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

async function handlePushPreview(item: ReleaseRecord) {
  const releaseId = Number(item.id)
  if (!Number.isFinite(releaseId) || releaseId <= 0) {
    ElMessage.warning('请先保存并发布版本后再推送体验版')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认将版本 v${item.semver} 对应的 miniapp 代码包推送到微信体验版吗？\n\n说明：页面装修内容已自动同步，本次仅上传代码包。`,
      '推送体验版',
      {
        confirmButtonText: '确认推送',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  pushingReleaseId.value = item.id
  pushPreviewResult.value = null
  const loadingMsg = ElMessage({
    message: '正在推送体验版到微信，请稍候（约 10–60 秒）…',
    type: 'info',
    duration: 0,
    showClose: false,
  })
  try {
    const res = await pushPreviewRelease(releaseId, {
      versionDesc: item.releaseNotes || `后台推送体验版 v${item.semver}`,
      confirmCodeChange: true,
    })
    pushPreviewResult.value = (res as any).data || res
    pushPreviewVisible.value = true
    ElMessage.success('体验版推送成功，请到微信公众平台「版本管理 → 开发版本」查看')
  } catch (error: any) {
    const message = formatPushPreviewError(error)
    pushPreviewResult.value = { message, version: item.semver, manageUrl: 'https://mp.weixin.qq.com/' }
    pushPreviewVisible.value = true
    ElMessage.error(message)
  } finally {
    loadingMsg.close()
    pushingReleaseId.value = null
  }
}

function formatPushPreviewError(error: any): string {
  const apiMessage = String(error?.response?.data?.message || error?.message || '')
  const code = error?.response?.data?.code
  if (code === 5005 || apiMessage.includes('上传密钥')) {
    return '请先在「系统设置 → 基础配置」保存代码上传密钥，并确认提示「上传密钥已入库」'
  }
  if (apiMessage.includes('invalid ip') || apiMessage.includes('-10008')) {
    const ipMatch = apiMessage.match(/invalid ip:\s*([0-9.]+)/i)
    const ip = ipMatch?.[1] || '124.220.11.79'
    return `微信拒绝上传：服务器 IP ${ip} 未加入代码上传白名单。请到 mp.weixin.qq.com → 开发 → 开发设置 → IP白名单 添加后重试`
  }
  if (code === 400 || apiMessage.includes('参数格式错误')) {
    return '版本记录无效，请刷新页面后重试'
  }
  if (apiMessage.includes('signature fail') || apiMessage.includes('DECODER')) {
    return '代码上传密钥格式有误，请从微信公众平台重新下载并完整粘贴后保存'
  }
  return apiMessage || '体验版推送失败，请稍后重试'
}

function isPushPreviewFailure(message?: string) {
  if (!message) return false
  return !message.includes('成功') && !message.includes('最近一次体验版推送版本')
}

// ==================== Editor Functions ====================
async function handleSaveAsTemplate() {
  try {
    await handleSave()
    newReleaseInfo.value = null
    try {
      const res = await createRelease({
        mode: 'template',
        baseReleaseId: editingTemplateId.value || undefined,
        releaseNotes: `模板：${form.templateKey}模板，${form.tabs.length}个导航项`,
      })
      newReleaseInfo.value = (res as any).data || res
    } catch { /* ignore */ }
    successMode.value = 'template'
    published.value = true
    activeStep.value = 4
  } catch {
    ElMessage.error('保存模板失败，请检查配置后重试')
  }
}

async function handlePublishOnline() {
  try {
    if (isDirty.value) {
      await handleSave()
    }
    newReleaseInfo.value = null
    replacedOldVersion.value = ''
    if (latestPublished.value) {
      replacedOldVersion.value = latestPublished.value.semver
    }
    try {
      const res = await createRelease({
        mode: 'publish',
        baseReleaseId: editingTemplateId.value || undefined,
        releaseNotes: `发布配置：${form.templateKey}模板，${form.tabs.length}个导航项`,
      })
      newReleaseInfo.value = (res as any).data || res
    } catch { /* ignore */ }
    successMode.value = 'publish'
    published.value = true
    activeStep.value = 4
    await loadGalleryData()
    ElMessage.success('发布成功，微信体验版将与 H5 预览一致（请重新进入小程序）')
  } catch {
    ElMessage.error('发布失败，请检查配置后重试')
  }
}

function goToGallery() {
  viewMode.value = 'gallery'
  editingTemplateId.value = null
  published.value = false
  successMode.value = 'template'
  newReleaseInfo.value = null
  loadGalleryData()
}

function goToPageBuilder() {
  router.push('/page-builder/list')
}

function goToTemplateMarket() {
  router.push('/page-builder/template-center')
}

function goToSystemSettings() {
  router.push('/settings/basic')
}

function goToVersionManagement() {
  router.push('/page-builder/version-management')
}

// ==================== Common Helper Functions ====================
function formatTime(t: string | Date | null | undefined): string {
  if (!t) return '-'
  const d = typeof t === 'string' ? new Date(t) : t
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getChangeTypeColor(type: string): string {
  const map: Record<string, string> = { major: '#ef4444', minor: '#f59e0b', patch: '#10b981' }
  return map[type] || '#607187'
}

function changeTypeLabel(type: string): string {
  const map: Record<string, string> = { major: '主版本', minor: '次版本', patch: '修订版' }
  return map[type] || type
}

function getStatusLabel(s: number): string {
  const map: Record<number, string> = { 0: '草稿/模板', 1: '已发布', 2: '已回滚' }
  return map[s] || '未知'
}

function parseSnapshotToForm(snapshotJson: string) {
  try {
    const snap = typeof snapshotJson === 'string' ? JSON.parse(snapshotJson) : snapshotJson
    if (!snap) return
    if (snap.templateKey) {
      form.templateKey = snap.templateKey
      applyTemplate(snap.templateKey)
    }
    if (snap.homePageId !== undefined) form.homePageId = snap.homePageId
    if (snap.minePageId !== undefined) form.minePageId = snap.minePageId
    if (Array.isArray(snap.tabs) && snap.tabs.length > 0) {
      form.tabs = snap.tabs.map((t: any, i: number) => ({
        id: t.id || `tab-${i}`,
        text: t.text || t.label || '',
        icon: t.icon || '',
        pagePath: t.pagePath || t.path || '',
        pageId: t.pageId || '',
        pageName: t.pageName || '',
      }))
    }
    if (snap.mineConfig) Object.assign(form.mineConfig, snap.mineConfig)
    if (snap.theme) Object.assign(form.theme, snap.theme)
    if (snap.shareTitle !== undefined) form.shareTitle = snap.shareTitle
    if (snap.shareImage !== undefined) form.shareImage = snap.shareImage
  } catch (err) {
    console.warn('解析快照失败:', err)
  }
}

async function loadModuleVersions() {
  moduleLoading.value = true
  try {
    const [themeRes, navRes, mineRes] = await Promise.all([
      getTargetVersions('miniapp_theme', 0).catch(() => ({ data: [] })),
      getTargetVersions('miniapp_navigation', 0).catch(() => ({ data: [] })),
      getTargetVersions('miniapp_mine', 0).catch(() => ({ data: [] })),
    ])
    themeVersions.value = extractVersionData(themeRes)
    navVersions.value = extractVersionData(navRes)
    mineVersions.value = extractVersionData(mineRes)
  } catch (err) {
    console.error('加载模块版本失败:', err)
    ElMessage.error('加载模块版本失败')
  } finally {
    moduleLoading.value = false
  }
}

function extractVersionData(res: any): ModuleVersionRecord[] {
  const data = (res as any)?.data?.data || (res as any)?.data || res
  return Array.isArray(data) ? data : []
}

function getStepSnapshot(stepKey: string): string {
  const snap: Record<string, any> = {}
  if (stepKey === 'theme') {
    snap.theme = { ...form.theme }
    snap.step = 'theme'
  } else if (stepKey === 'navigation') {
    snap.templateKey = form.templateKey
    snap.tabs = JSON.parse(JSON.stringify(form.tabs))
    snap.homePageId = form.homePageId
    snap.minePageId = form.minePageId
    snap.minePageMode = minePageMode.value
    snap.step = 'navigation'
  } else if (stepKey === 'mine') {
    snap.mineConfig = JSON.parse(JSON.stringify(form.mineConfig))
    snap.selectedMineTemplate = selectedMineTemplate.value
    snap.minePageMode = minePageMode.value
    snap.step = 'mine'
  }
  return JSON.stringify(snap)
}

const STEP_MODULE_MAP: Record<string, string> = {
  theme: 'miniapp_theme',
  navigation: 'miniapp_navigation',
  mine: 'miniapp_mine',
}

const STEP_LABEL_MAP: Record<string, string> = {
  theme: '风格配色',
  navigation: '导航配置',
  mine: '我的页面',
}

async function saveStepSnapshot(stepKey: string) {
  moduleSaving.value = true
  try {
    const { value } = await ElMessageBox.prompt(
      `保存「${STEP_LABEL_MAP[stepKey]}」的当前配置为版本快照`,
      '创建快照',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputPlaceholder: '描述本次变更内容（可选）',
        inputType: 'textarea',
      }
    ).catch(() => ({ value: '' }))

    const versionData = getStepSnapshot(stepKey)
    await createModuleVersion({
      moduleType: STEP_MODULE_MAP[stepKey],
      targetId: 0,
      versionData,
      changeSummary: value || undefined,
    })
    ElMessage.success(`${STEP_LABEL_MAP[stepKey]} 快照已保存`)
    loadModuleVersions()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('保存快照失败')
  } finally {
    moduleSaving.value = false
  }
}

async function handleModulePublish(row: ModuleVersionRecord) {
  publishingId.value = row.id
  try {
    await publishModuleVersion(row.id)
    ElMessage.success(`版本 ${row.semver} 已发布`)
    loadModuleVersions()
  } catch (err) {
    console.error('发布失败:', err)
  } finally {
    publishingId.value = null
  }
}

async function handleModuleRollback(row: ModuleVersionRecord) {
  try {
    const snapshot = row.versionData
    if (!snapshot) {
      ElMessage.warning('该版本无数据，无法回滚')
      return
    }
    const snap = JSON.parse(snapshot)
    if (snap.step === 'theme' && snap.theme) {
      Object.assign(form.theme, snap.theme)
    } else if (snap.step === 'navigation') {
      if (snap.templateKey) {
        form.templateKey = snap.templateKey
        applyTemplate(snap.templateKey)
      }
      if (Array.isArray(snap.tabs)) form.tabs = snap.tabs
      if (snap.homePageId !== undefined) form.homePageId = snap.homePageId
      if (snap.minePageId !== undefined) form.minePageId = snap.minePageId
    } else if (snap.step === 'mine' && snap.mineConfig) {
      Object.assign(form.mineConfig, snap.mineConfig)
      if (snap.selectedMineTemplate) selectedMineTemplate.value = snap.selectedMineTemplate
    }
    ElMessage.success(`已回滚到版本 ${row.semver}`)
    loadModuleVersions()
  } catch (err) {
    console.error('回滚失败:', err)
    ElMessage.error('回滚失败，数据格式异常')
  }
}

async function handleModuleDelete(row: ModuleVersionRecord) {
  try {
    await deleteModuleVersion(row.id)
    ElMessage.success('已删除')
    loadModuleVersions()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

onBeforeRouteLeave(() => {
  if (viewMode.value === 'editor' && isDirty.value) {
    if (!window.confirm('有未保存的更改，确认离开？')) return false
  }
})

onMounted(() => {
  loadGalleryData()
})
</script>

<style lang="scss" scoped>
.miniapp-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f6f8fb;
}

.builder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
  flex-shrink: 0;

  h1 {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.dirty-pill {
  padding: 2px 10px;
  color: #f59e0b;
  font-size: 12px;
  font-weight: 600;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 99px;
}

.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
  flex-shrink: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid #e3e8f0;
  border-radius: 99px;
  background: #fff;
  cursor: pointer;
  transition: 0.14s;
  font-size: 13px;
  color: #607187;
}

.step-item:hover {
  border-color: #a0b4d0;
}

.step-item.active {
  color: #1769ff;
  border-color: #1769ff;
  background: #eff6ff;
  font-weight: 700;
}

.step-item.done {
  color: #0faa6e;
  border-color: #0faa6e;
  background: #ecfdf5;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: #e3e8f0;
  color: #607187;
}

.step-item.active .step-num {
  background: #1769ff;
  color: #fff;
}

.step-item.done .step-num {
  background: #0faa6e;
  color: #fff;
}

.builder-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.config-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.config-scroll {
  max-width: 640px;
  margin: 0 auto;
}

.config-section {
  padding: 20px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
}

.section-divider {
  height: 1px;
  background: #e3e8f0;
  margin: 16px 0;
}

.section-label {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #1769ff;
}

.preview-panel {
  width: 420px;
  padding: 16px;
  background: #fff;
  border-left: 1px solid #e3e8f0;
  flex-shrink: 0;
  overflow-y: auto;
  position: relative;
  transition: width 0.3s;
}

.preview-panel.collapsed {
  width: 40px;
  padding: 8px;
}

.preview-toggle {
  position: absolute;
  top: 50%;
  left: -14px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.preview-toggle:hover {
  border-color: #1769ff;
  color: #1769ff;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-label {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
  margin-bottom: 12px;
}

.confirm-header {
  font-size: 16px;
  font-weight: 800;
  color: #172033;
  margin-bottom: 16px;
}

.confirm-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f8faff;
  border-radius: 8px;
}

.summary-label {
  font-size: 13px;
  color: #7b8798;
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #172033;
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #e3e8f0;
}

.confirm-warnings {
  margin: 12px 0;
}

.confirm-actions {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid #e3e8f0;
}
.confirm-btns { display: flex; gap: 10px; }

.share-config {
  margin-top: 4px;
}

.share-image-upload {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9e2ef;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
}

.share-image-upload:hover {
  border-color: #1769ff;
}

.share-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #7b8798;
  font-size: 12px;
}

.mine-mode-selector { margin-bottom: 8px; }
.mine-mode-hint {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; background: #f0f4ff; border: 1px solid #d9e2ef; border-radius: 8px;
  margin-top: 8px; font-size: 12px; color: #607187;
}
.hint-icon { font-size: 16px; }

.mine-template-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.mine-tpl-card {
  border: 2px solid #e3e8f0;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: 0.16s;
  background: #fff;
  &:hover { border-color: #1769ff; transform: translateY(-1px); }
  &.selected { border-color: #1769ff; background: #f0f4ff; box-shadow: 0 0 0 1px #1769ff; }
}
.mine-tpl-preview {
  height: 56px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
}
.mine-tpl-icon { font-size: 22px; }
.mine-tpl-name { font-size: 12px; font-weight: 600; color: #172033; }

.step-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid #eef0f4;
}
.step-footer .el-button { min-width: 120px; }

@media (max-width: 1024px) {
  .builder-body {
    flex-direction: column;
  }

  .preview-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e3e8f0;
  }

  .preview-panel.collapsed {
    width: 100%;
    height: 40px;
  }
}

/* ====== Gallery View Styles ====== */
.template-gallery {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: fadeIn 0.25s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.gallery-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  transition: 0.16s;

  &:hover {
    box-shadow: 0 4px 12px rgba(23,105,255,0.08);
    border-color: #c7d6ed;
  }

  .stat-icon {
    font-size: 32px;
    line-height: 1;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #172033;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 13px;
    color: #7b8798;
    margin-top: 2px;
  }
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-tab {
  padding: 7px 20px;
  border: 1px solid #e3e8f0;
  border-radius: 99px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  color: #607187;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    border-color: #1769ff;
    color: #1769ff;
  }

  &.active {
    background: #1769ff;
    color: #fff;
    border-color: #1769ff;
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}

.template-card {
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: 0.18s;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.07);
    transform: translateY(-2px);
    border-color: #c7d6ed;
  }

  &.card-published {
    border-left: 3px solid #10b981;
  }

  &.card-template {
    border-left: 3px solid #1769ff;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.current-live-badge {
  margin-left: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.card-semver {
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.card-notes {
  font-size: 13px;
  color: #607187;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #a0b4d0;
  gap: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.card-actions {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
  flex-wrap: wrap;
}

.push-preview-footer {
  margin-top: 12px;
}

.empty-gallery {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  animation: fadeIn 0.35s ease;
}

/* ====== Success Pages ====== */
.success-section {
  text-align: center; padding: 32px 20px 24px;
}
.success-icon {
  font-size: 56px; margin-bottom: 12px; display: block;
  animation: bounceIn 0.6s ease;
}
@keyframes bounceIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
.success-title {
  font-size: 22px; font-weight: 800; color: #172033; margin: 0 0 8px;
}
.success-desc {
  font-size: 14px; color: #7b8798; margin: 0 0 20px;
}

.version-release-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1.5px solid #86efac; border-radius: 12px;
  margin-bottom: 24px; overflow: hidden; animation: slideUp 0.4s ease;
}

.version-release-card-template {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #93c5fd;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.version-release-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; background: rgba(16,185,129,0.06);
  border-bottom: 1px solid rgba(16,185,129,0.12);
}
.version-release-card-template .version-release-header {
  background: rgba(23,105,255,0.06);
  border-bottom-color: rgba(23,105,255,0.12);
}
.version-release-time { font-size: 12px; color: #6b7280; }
.version-release-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
.release-detail-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; padding: 4px 0;
}
.release-detail-row span { color: #7b8798; }
.release-detail-row strong { color: #172033; }

.publish-summary {
  text-align: left; margin-bottom: 28px;
}
.summary-card {
  background: #f8faff; border: 1px solid #e3e8f0; border-radius: 10px; padding: 16px;
}
.summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid #eef0f4; font-size: 13px;
}
.summary-row:last-child { border-bottom: none; }
.summary-row span { color: #7b8798; }

.next-steps { text-align: left; margin-bottom: 28px; }
.next-step-title {
  font-size: 14px; font-weight: 700; color: #172033; margin-bottom: 10px;
}
.next-step-list { display: flex; flex-direction: column; gap: 8px; }
.next-step-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: #fff; border: 1px solid #e3e8f0; border-radius: 10px;
  cursor: pointer; transition: 0.16s; text-decoration: none; color: inherit;
}
.next-step-item:hover { border-color: #1769ff; box-shadow: 0 2px 8px rgba(23,105,255,0.1); transform: translateX(2px); }
.next-icon { font-size: 28px; flex-shrink: 0; }
.next-info { flex: 1; min-width: 0; }
.next-info strong { display: block; font-size: 13px; color: #172033; }
.next-info span { display: block; font-size: 11px; color: #a0b4d0; margin-top: 2px; }
.next-step-item .el-icon { color: #a0b4d0; flex-shrink: 0; }
.next-step-item.highlight {
  border-color: #10b981; background: linear-gradient(135deg, #f0fdf4, #fff);
}
.next-step-item.highlight:hover { border-color: #059669; box-shadow: 0 2px 12px rgba(16,185,129,0.15); }

.success-footer {
  display: flex; justify-content: center; gap: 12px; padding-top: 20px; border-top: 1px solid #eef0f4;
  flex-wrap: wrap;
}

.module-version-content {
  padding: 8px 0;
}
.module-version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  .module-desc {
    font-size: 13px;
    color: #909399;
  }
}
.semver {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-weight: 600;
  color: #409eff;
}
</style>
