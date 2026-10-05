<template>
  <el-form label-width="72px" size="small">
    <template v-if="type === 'warm_greet'">
      <el-form-item label="问候语">
        <el-input :model-value="data.greet_template" placeholder="你好" @input="emit('update', { greet_template: $event })" />
      </el-form-item>
      <el-form-item label="顶部视觉">
        <el-radio-group
          :model-value="data.greet_skin || 'classic'"
          @change="(v: string) => emit('update', { greet_skin: v })"
        >
          <el-radio value="classic">经典暖阁</el-radio>
          <el-radio value="plain">墨太白 plain</el-radio>
        </el-radio-group>
        <div class="ds-hint">
          「墨太白 plain」= 白底搜索条 + 36px 首字头像。这是总开关，选了哪个就按哪个渲染。
        </div>
      </el-form-item>
      <el-form-item label="搜索提示">
        <el-input :model-value="data.search_placeholder" @input="emit('update', { search_placeholder: $event })" />
      </el-form-item>
      <el-form-item label="显示搜索">
        <el-switch :model-value="data.show_search !== false" @change="(v: boolean) => emit('update', { show_search: v })" />
      </el-form-item>
      <el-form-item label="显示导航">
        <el-switch :model-value="data.show_nav !== false" @change="(v: boolean) => emit('update', { show_nav: v })" />
      </el-form-item>
      <el-form-item label="通知铃">
        <el-switch :model-value="data.show_notice !== false" @change="(v: boolean) => emit('update', { show_notice: v })" />
      </el-form-item>
      <el-form-item label="会员标签">
        <el-switch
          :model-value="data.show_member_badge === true"
          @change="(v: boolean) => emit('update', { show_member_badge: v })"
        />
        <div class="ds-hint">开启后右侧显示会员身份标签，替代通知铃样式</div>
      </el-form-item>
      <template v-if="data.show_member_badge === true">
        <el-form-item label="未开通文案">
          <el-input
            :model-value="data.member_cta_label || '开通会员 ›'"
            @input="(v: string) => emit('update', { member_cta_label: v })"
          />
        </el-form-item>
        <el-form-item label="已开通文案">
          <el-input
            :model-value="data.member_active_label || '年度会员'"
            @input="(v: string) => emit('update', { member_active_label: v })"
          />
        </el-form-item>
        <el-form-item label="跳转路径">
          <el-input
            :model-value="data.member_link || '/pages/member-center/member-center'"
            @input="(v: string) => emit('update', { member_link: v })"
          />
        </el-form-item>
      </template>
      <el-form-item label="品牌首字">
        <el-input
          :model-value="data.brand_initial || ''"
          maxlength="1"
          placeholder="无头像时圆形内显示，如「墨」"
          @input="(v: string) => emit('update', { brand_initial: v })"
        />
      </el-form-item>
      <el-form-item label="问候字号">
        <el-input-number
          :model-value="Number(data.greet_title_font_size ?? 20)"
          :min="12"
          :max="28"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { greet_title_font_size: v ?? 20 })"
        />
        <div class="ds-hint">墨太白建议 15</div>
      </el-form-item>
      <el-form-item label="副标题字号">
        <el-input-number
          :model-value="Number(data.greet_sub_font_size ?? 11)"
          :min="10"
          :max="16"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { greet_sub_font_size: v ?? 11 })"
        />
        <div class="ds-hint">墨太白建议 11.5（取 11 或 12）</div>
      </el-form-item>

      <el-divider content-position="left">金刚区入口</el-divider>
      <p class="ds-hint">写入首页全局配置，问候区会实时读取。建议 5 个，最多 8 个。</p>
      <div class="nav-list">
        <SubItemList
          :items="navs"
          :title-of="(nv) => nv?.label || ''"
          :key-of="(nv, i) => nv?.key || i"
          add-text="添加入口"
          placeholder="未填写入口名称"
          empty-text="还没有配置入口"
          :default-open="0"
          @add="addNav"
          @remove="(i) => removeNav(i)"
          @active-change="(p) => (activeNav = p)"
        >
          <!--
            🔴 插槽作用域**不要解构**（2026-10-05 修复）。
            `#actions="{ index: ni, item: nav }"` 编译成 `_withCtx(({index: ni, item: nav}) => ...)`，
            上游传 undefined 本身时解构直接抛
            `Cannot read properties of undefined (reading 'item')`，
            整块属性面板渲染中断 —— 表现只有「面板空白」，报错却落在本文件，
            极易误判成「面板组件没注册」。`= {}` 默认值也救不了。
            这里改成 `#actions="scope"` + `scope?.` 取值。
          -->
          <template #actions="scope">
            <el-tooltip content="上移一位" placement="top">
              <button
                type="button"
                class="nav-move"
                :disabled="(scope?.index ?? 0) === 0"
                aria-label="上移"
                @click="moveNav(scope?.index ?? 0, -1)"
              >↑</button>
            </el-tooltip>
            <el-tooltip content="下移一位" placement="top">
              <button
                type="button"
                class="nav-move"
                :disabled="(scope?.index ?? 0) >= navs.length - 1"
                aria-label="下移"
                @click="moveNav(scope?.index ?? 0, 1)"
              >↓</button>
            </el-tooltip>
          </template>
          <!--
            🔴 展开区**不取插槽作用域**（2026-10-05 修复）。
            原写法 `#default="{ item: nav, index: ni }"` 编译成
            `_withCtx(({ item: nav, index: ni }) => ...)`：上游一旦传 undefined 本身，
            **解构直接抛 `Cannot read properties of undefined (reading 'item')`**，
            整个属性面板渲染中断 —— 表现只有「面板空白」，报错却落在本文件，
            极易误判成「面板组件没注册」（为此绕了好几轮）。
            `= {}` 默认值也救不了：默认值只在「对象存在但属性为 undefined」时生效。
            改法：当前项由 SubItemList 的 `active-change` 事件驱动（见 activeNav），
            与插槽是否存在解耦，折叠/异步/空列表都不会崩。
          -->
          <template #default>
            <div class="nav-item__grid">
              <div class="nav-field nav-field--icon">
                <span class="nav-field__label">图标</span>
                <!-- 图标支持两种：素材库图片（/uploads/ 开头）或直接输入 emoji。 -->
                <div v-if="isImageIcon(curNav.icon)" class="nav-icon-picker">
                  <img class="nav-icon-picker__preview" :src="String(curNav.icon)" alt="" />
                  <div class="nav-icon-picker__actions">
                    <el-button size="small" @click="pickIcon(curNi)">换图</el-button>
                    <el-tooltip content="改回输入 emoji" placement="top">
                      <el-button size="small" text @click="patchNav(curNi, { icon: '' })">改 emoji</el-button>
                    </el-tooltip>
                  </div>
                </div>
                <div v-else class="nav-icon-picker">
                  <el-input
                    :model-value="curNav.icon"
                    placeholder="emoji 或点右侧选图"
                    maxlength="8"
                    @input="(v: string) => patchNav(curNi, { icon: v })"
                  />
                  <el-button size="small" class="nav-icon-picker__btn" @click="pickIcon(curNi)">素材库</el-button>
                </div>
                <AssetPickerDialog
                  v-model="iconPickerVisible"
                  @select="(url: string) => patchNav(pickingIndex, { icon: url })"
                />
              </div>
              <label class="nav-field">
                <span class="nav-field__label">文案</span>
                <el-input
                  :model-value="curNav.label"
                  placeholder="如：资料库"
                  maxlength="8"
                  @input="(v: string) => patchNav(curNi, { label: v })"
                />
              </label>
              <label class="nav-field nav-field--wide">
                <span class="nav-field__label">跳转路径</span>
                <el-input
                  :model-value="curNav.url"
                  placeholder="/pages/... 或 /pkg-xxx/xxx/xxx"
                  @input="(v: string) => patchNav(curNi, { url: v })"
                />
              </label>
              <div class="nav-field nav-field--switch">
                <span class="nav-field__label">打开方式</span>
                <el-tooltip content="页 = 普通页面跳转；Tab = 切换到小程序底部 Tab 页" placement="top">
                  <el-switch
                    :model-value="!!curNav.tab"
                    inline-prompt
                    active-text="Tab"
                    inactive-text="页"
                    @change="(v: boolean) => patchNav(curNi, { tab: v })"
                  />
                </el-tooltip>
              </div>
            </div>
          </template>
        </SubItemList>
      </div>
      <div class="nav-actions">
        <el-button size="small" :disabled="navs.length >= 8" @click="addNav">+ 入口</el-button>
        <el-button type="primary" size="small" :loading="navSaving" @click="saveNavs">保存到首页配置</el-button>
      </div>

      <el-alert title="连续阅读天数、头像、昵称来自当前登录用户，不能在这里填写。" type="info" :closable="false" show-icon style="margin-top: 12px" />
    </template>

    <template v-else-if="type === 'warm_authors'">
      <el-form-item label="区块标题">
        <el-input :model-value="data.title" placeholder="墨太白出品" @input="emit('update', { title: $event })" />
      </el-form-item>
      <el-form-item label="更多文案">
        <el-input :model-value="data.more_text" placeholder="全部作者 ›" @input="emit('update', { more_text: $event })" />
      </el-form-item>
      <el-form-item label="跳转路径">
        <PathPickerField
          :model-value="data.more_url || '/pkg-content/author-list/author-list'"
          placeholder="/pkg-content/author-list/author-list"
          @update:model-value="(v: string) => emit('update', { more_url: v })"
        />
      </el-form-item>
      <el-form-item label="Tab 跳转">
        <el-switch :model-value="!!data.more_tab" @change="(v: boolean) => emit('update', { more_tab: v })" />
      </el-form-item>
      <el-form-item label="空态文案">
        <el-input
          :model-value="data.empty_text || ''"
          placeholder="暂无作者"
          @input="(v: string) => emit('update', { empty_text: v })"
        />
      </el-form-item>

      <!-- ============ 数据源模式分段器（V122） ============ -->
      <div class="wa-section">
        <div class="wa-section__head">
          <span class="wa-section__title">数据来源</span>
          <FieldHint
            text="手动挑选：从作者库勾选 1~8 位，头像/昵称/身份自动带出，路径自动绑定主页。动态聚合：按标签自动拉取作者库，新作者打上标签后首页自动出现，运营零维护。"
          />
        </div>
        <BuilderSegmented
          :model-value="sourceMode"
          :options="SOURCE_MODE_OPTIONS"
          block
          aria-label="作者数据源模式"
          @update:model-value="(v: string | number) => setSourceMode(String(v))"
        />
        <div class="wa-mode-note">{{ sourceModeHint }}</div>
      </div>

      <!-- ============ 模式 A：手动挑选 ============ -->
      <div v-if="sourceMode === 'manual'" class="wa-section">
        <div class="wa-section__head">
          <span class="wa-section__title">已选作者</span>
          <span class="wa-section__spacer" />
          <span class="wa-count">{{ manualAuthors.length }} / {{ AUTHOR_LIMIT }}</span>
        </div>

        <div v-if="!manualAuthors.length" class="wa-empty">
          还没选作者。点下方【从作者库选择】勾选，头像、昵称、身份、主页路径全部自动带出。
        </div>

        <ul v-else class="wa-plist">
          <li
            v-for="(a, i) in manualAuthors"
            :key="a.authorId || i"
            class="wa-pitem"
            :class="{ 'is-dragging': dragIndex === i }"
            draggable="true"
            @dragstart="onDragStart(i)"
            @dragover.prevent
            @drop="onDrop(i)"
            @dragend="onDragEnd"
          >
            <span class="wa-pitem__grip" title="拖拽调整顺序">⠿</span>
            <span class="wa-pitem__idx">{{ i + 1 }}</span>
            <img v-if="a.avatar" class="wa-pitem__ava" :src="a.avatar" alt="" />
            <span v-else class="wa-pitem__ava wa-pitem__ava--empty">{{ (a.nickname || '作').slice(0, 1) }}</span>
            <div class="wa-pitem__meta">
              <div class="wa-pitem__name">
                {{ a.nickname || '未命名作者' }}
                <el-tooltip v-if="a.authorId" :content="`已绑定作者库 #${a.authorId}，改档案不会自动同步（快照模式）`" placement="top">
                  <el-icon class="wa-pitem__link"><Link /></el-icon>
                </el-tooltip>
              </div>
              <div class="wa-pitem__role">
                <template v-if="customTitleOf(a)">
                  <s class="wa-pitem__orig">{{ a.title || '—' }}</s>
                  <span class="wa-pitem__arrow">→</span>
                  <b>{{ customTitleOf(a) }}</b>
                </template>
                <template v-else>{{ a.title || '未设身份' }}</template>
              </div>
            </div>
            <el-tooltip content="上移" placement="top">
              <el-button link :disabled="i === 0" @click="moveAuthor(i, -1)">↑</el-button>
            </el-tooltip>
            <el-tooltip content="下移" placement="top">
              <el-button link :disabled="i === manualAuthors.length - 1" @click="moveAuthor(i, 1)">↓</el-button>
            </el-tooltip>
            <el-tooltip content="移除" placement="top">
              <el-button link type="danger" aria-label="移除作者" @click="removeAuthor(i)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </li>
        </ul>

        <button
          type="button"
          class="wa-add"
          :disabled="manualAuthors.length >= AUTHOR_LIMIT"
          @click="openAuthorPicker"
        >
          <span class="wa-add__plus">＋</span>
          <span>从作者库选择</span>
          <span class="wa-add__count">{{ manualAuthors.length }} / {{ AUTHOR_LIMIT }}</span>
        </button>

        <!-- 局部字段覆盖：只改首页展示，不动作者库档案 -->
        <template v-if="overrideTarget">
          <div class="wa-section__head wa-section__head--sub">
            <span class="wa-section__title">对外头衔微调</span>
            <FieldHint text="只改首页展示，不动作者库档案。留空 = 用作者库原头衔。" />
          </div>
          <div class="nav-field">
            <span class="nav-field__label">
              {{ overrideTarget.nickname }} 的展示头衔
            </span>
            <div class="wa-override">
              <el-input
                :model-value="customTitleOf(overrideTarget) || ''"
                :placeholder="overrideTarget.originTitle || overrideTarget.title || '如：合规主理人'"
                maxlength="24"
                @input="(v: string) => setCustomTitle(v)"
              />
              <el-button v-if="customTitleOf(overrideTarget)" link size="small" @click="setCustomTitle('')">还原</el-button>
            </div>
            <div class="nav-field__note">
              作者库原头衔：{{ overrideTarget.originTitle || overrideTarget.title || '未设置' }}
            </div>
          </div>
        </template>
      </div>

      <!-- ============ 模式 B：动态聚合 ============ -->
      <div v-else class="wa-section">
        <div class="wa-section__head">
          <span class="wa-section__title">聚合规则</span>
          <FieldHint text="按标签筛选作者库中的启用档案。标签在「内容管理 › 作者管理」里维护，打上标签即自动上榜。" />
        </div>

        <el-form-item label="作者标签">
          <el-select
            :model-value="dynamicConfig.tagIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="不选 = 全部作者（按下方规则取前N 位）"
            style="width: 100%"
            @update:model-value="(v: string[]) => patchDynamic({ tagIds: v || [] })"
          >
            <el-option v-for="t in authorTagOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>

        <div v-if="!authorTagOptions.length" class="wa-empty wa-empty--tight">
          作者库里还没有任何标签。先到「作者管理」给作者打标签，这里才有筛选项。
        </div>

        <el-form-item label="排序规则">
          <el-radio-group
            :model-value="dynamicConfig.sortBy"
            @change="(v: string) => patchDynamic({ sortBy: v })"
          >
            <el-radio value="weight">权重优先</el-radio>
            <el-radio value="latest">最新入驻</el-radio>
            <el-radio value="article_count">内容最多</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="展示数量">
          <div class="wa-slider">
            <el-slider
              :model-value="dynamicConfig.limit"
              :min="3"
              :max="8"
              :step="1"
              :marks="{ 3: '3', 5: '5', 8: '8' }"
              @update:model-value="(v: number | number[]) => patchDynamic({ limit: Array.isArray(v) ? v[0] : v })"
            />
            <b class="wa-slider__val">{{ dynamicConfig.limit }} 位</b>
          </div>
        </el-form-item>

        <div class="wa-preview">
          <div class="wa-preview__head">
            <span>当前规则将拉出</span>
            <el-button link type="primary" size="small" @click="refreshAggregatePreview">刷新预览</el-button>
          </div>
          <div v-if="aggLoading" class="wa-empty wa-empty--tight">加载中…</div>
          <div v-else-if="!aggPreview.length" class="wa-empty wa-empty--tight">
            当前规则匹配不到作者。检查标签是否打对、或作者是否为「启用」状态。
          </div>
          <div v-else class="wa-preview__list">
            <div v-for="(p, i) in aggPreview" :key="p.id" class="wa-preview__item">
              <span class="wa-preview__idx">{{ i + 1 }}</span>
              <img v-if="p.avatarUrl" class="wa-preview__ava" :src="p.avatarUrl" alt="" />
              <span v-else class="wa-preview__ava wa-preview__ava--empty">{{ (p.name || '作').slice(0, 1) }}</span>
              <span class="wa-preview__name">{{ p.name }}</span>
              <span class="wa-preview__role">{{ p.title || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 招募位（组件全局配置，V122 解耦） ============ -->
      <div class="wa-section wa-section--recruit">
        <div class="wa-section__head">
          <span class="wa-section__title">招募位设置</span>
          <FieldHint
            text="招募位是列表末尾的常驻「＋」入口，与作者条目无关。开启后自动追加在所有真实作者之后，点击进招募页。"
          />
        </div>

        <div class="nav-field nav-field--inline">
          <span class="nav-field__label">末尾招募位</span>
          <el-switch
            :model-value="recruitmentSlot.enabled"
            @change="(v: boolean) => patchRecruit({ enabled: v })"
          />
          <span class="nav-field__note">{{ recruitmentSlot.enabled ? '已开启' : '已关闭' }}</span>
        </div>

        <template v-if="recruitmentSlot.enabled">
          <label class="nav-field">
            <span class="nav-field__label">主标文案</span>
            <el-input
              :model-value="recruitmentSlot.iconText || ''"
              placeholder="＋"
              maxlength="2"
              @input="(v: string) => patchRecruit({ iconText: v })"
            />
          </label>
          <label class="nav-field">
            <span class="nav-field__label">身份副标</span>
            <el-input
              :model-value="recruitmentSlot.label || ''"
              placeholder="招募中"
              maxlength="8"
              @input="(v: string) => patchRecruit({ label: v })"
            />
          </label>
          <el-form-item label="点击跳转">
            <div class="wa-recruit-actions">
              <el-button size="small" @click="applyRecruitPreset('apply')">创作者入驻申请</el-button>
              <el-button size="small" @click="applyRecruitPreset('intro')">招募说明长文</el-button>
            </div>
            <PathPickerField
              :model-value="recruitmentSlot.targetPath || ''"
              placeholder="/pkg-content/contribute/contribute"
              @update:model-value="(v: string) => patchRecruit({ targetPath: v })"
            />
            <div class="nav-field__note">当前：{{ recruitmentSlot.targetPath || '未配置（点击无跳转）' }}</div>
          </el-form-item>
        </template>
      </div>

      <BrandAuthorPickerModal
        v-model="authorPickerModalVisible"
        :value="pickedForModal"
        :max="AUTHOR_LIMIT"
        @confirm="onAuthorsPicked"
      />
    </template>

    <template v-else-if="type === 'warm_columns'">
      <BuilderFieldItem label="区块标题">
        <el-input :model-value="data.title" placeholder="精品专栏" @input="emit('update', { title: $event })" />
      </BuilderFieldItem>

      <BuilderFieldItem
        label="展示数量"
        hint="最多展示几个专栏卡。手动指定的专栏不足时会按实际数量渲染。"
      >
        <NumSliderRow
          :model-value="columnLimit"
          :min="1"
          :max="10"
          :step="1"
          :fallback="4"
          @update:model-value="(v: number) => emit('update', { limit: v })"
        />
      </BuilderFieldItem>

      <BuilderFieldItem
        label="获取方式"
        hint="自动拉取按下方排序规则取专栏；手动指定则只展示你勾选的那几个，顺序即展示顺序。"
      >
        <BuilderSegmented
          :model-value="columnFetchMode"
          :options="FETCH_MODE_OPTIONS"
          @update:model-value="onColumnFetchModeChange"
        />
      </BuilderFieldItem>

      <BuilderFieldItem v-if="columnFetchMode === 'auto'" label="排序规则">
        <el-select
          :model-value="columnSortBy"
          style="width: 100%"
          @change="(v: string) => emit('update', { sort_by: v })"
        >
          <el-option v-for="o in COLUMN_SORT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <div class="ds-hint">{{ sortHint }}</div>
      </BuilderFieldItem>

      <BuilderFieldItem v-else label="指定专栏">
        <div class="picker-row">
          <el-input
            :model-value="columnSummary"
            readonly
            :placeholder="columnIds.length ? '' : '尚未指定，点击右侧挑选'"
          />
          <el-button size="small" @click="columnPickerOpen = true">挑选</el-button>
        </div>
        <div class="ds-hint">
          从商品库挑选「付费专栏」类型的商品。当前已选 <b>{{ columnIds.length }}</b> 个。
        </div>
      </BuilderFieldItem>

      <BuilderFieldItem label="更多文案">
        <el-input :model-value="data.more_text" placeholder="全部 ›" @input="emit('update', { more_text: $event })" />
      </BuilderFieldItem>
      <BuilderFieldItem label="跳转路径">
        <PathPickerField
          :model-value="data.more_url"
          @update:model-value="(v: string) => emit('update', { more_url: v })"
        />
      </BuilderFieldItem>
      <BuilderFieldItem label="Tab 跳转" hint="开启后跳到小程序底部 Tab 页，而不是普通页面。">
        <el-switch :model-value="!!data.more_tab" @change="(v: boolean) => emit('update', { more_tab: v })" />
      </BuilderFieldItem>

      <el-divider content-position="left">数据兜底</el-divider>

      <BuilderFieldItem
        label="无数据时隐藏"
        hint="小程序端拉到 0 个专栏时，整个区块直接不渲染（推荐开）。关闭则显示空状态文案。"
      >
        <el-switch
          :model-value="columnAutoHide"
          @change="(v: boolean) => emit('update', { auto_hide_when_empty: v })"
        />
      </BuilderFieldItem>
      <BuilderFieldItem
        v-if="!columnAutoHide"
        label="空态文案"
        hint="无数据且未开启隐藏时显示的提示语。"
      >
        <el-input
          :model-value="data.empty_text"
          placeholder="暂无专栏"
          maxlength="12"
          @input="emit('update', { empty_text: $event })"
        />
      </BuilderFieldItem>

      <BuilderFieldItem
        label="编辑期演示卡片"
        hint="装修器画布上没有真实专栏时，用预设封面与标题填充卡片，方便看排版效果。仅装修器生效，小程序端不会出现演示数据。"
      >
        <el-switch
          :model-value="columnPreviewMock"
          @change="(v: boolean) => emit('update', { preview_mock: v })"
        />
      </BuilderFieldItem>

      <ColumnPickerModal
        v-model="columnPickerOpen"
        :model-ids="columnIds"
        :max="10"
        @confirm="onColumnIdsConfirm"
      />
    </template>

    <template v-else-if="type === 'warm_feature'">
      <el-form-item label="空状态">
        <el-input :model-value="data.empty_text" placeholder="暂无精选内容" @input="emit('update', { empty_text: $event })" />
      </el-form-item>
      <el-alert title="精选封面与标题来自后台绑定的已发布内容。" type="info" :closable="false" show-icon />
    </template>

    <template v-else-if="type === 'warm_feed'">
      <el-form-item label="底部文案">
        <el-input :model-value="data.footer" @input="emit('update', { footer: $event })" />
      </el-form-item>
      <el-form-item label="阅读/点赞">
        <el-radio-group
          :model-value="feedStatsMode"
          @change="onFeedStatsMode"
        >
          <el-radio-button value="auto">自动（内容真实数）</el-radio-button>
          <el-radio-button value="manual">手动（配置 meta）</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-alert
        title="自动：长文用阅读数、笔记用点赞数，并写入系统 warm_home_config。手动：沿用 feed[].meta。内容编辑页可改阅读/点赞基数。"
        type="info"
        :closable="false"
        show-icon
      />
    </template>
  </el-form>
</template>

import SubItemList from '../SubItemList.vue'
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, Delete, Link } from '@element-plus/icons-vue'
import { getConfigsSilent, updateConfigs } from '@/api/system'
import { get } from '@/api/request'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import FieldHint from '../FieldHint.vue'
import PathPickerField from '../PathPickerField.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import BuilderFieldItem from '../BuilderFieldItem.vue'
import NumSliderRow from './NumSliderRow.vue'
import ColumnPickerModal from '../ColumnPickerModal.vue'
import { COLUMN_SORT_OPTIONS, COLUMN_CONFIG_DEFAULTS } from '../columnConfig'
import BrandAuthorPickerModal, { type PickedAuthor } from '../BrandAuthorPickerModal.vue'
import { listAuthors, authorHomePath, type AuthorRecord, type AuthorAggregateItem } from '@/api/author'

/** 小程序端作者聚合列表接口（与后端 MpAuthorController 的 GET /api/v1/mp/authors 对齐） */
const MpAuthorListApi = '/api/v1/mp/authors'

export type WarmNavItem = {
  key?: string
  icon?: string
  label?: string
  url?: string
  tab?: boolean
}

/**
 * 手动模式下的作者条目（V122）。
 *
 * 与旧结构（key/name/role/avatar/url/apply）的差异：
 *   - 不再有 apply —— 招募位已解耦为组件级 recruitmentSlot，
 *     每条作者都带一个「是否招募位」开关本身就是语义冲突（不知道哪个才是）。
 *   - 新增 authorId / nickname / customTitle / originTitle / homePath：
 *     authorId 绑定作者库实体，homePath 由代码统一拼（不再让运营手写长路径），
 *     customTitle 只覆盖首页展示头衔，不动作者库档案。
 *   - 保留 name/role 作为读取时的兼容别名（老DSL 里是这两个 key）。
 */
export type WarmAuthorItem = {
  /** 作者库 ID（手填的历史数据可能没有） */
  authorId?: number | null
  /** 作者昵称（老数据 key = name） */
  nickname?: string
  name?: string
  /** 作者头像（老数据 key = avatar） */
  avatar?: string
  /** 作者库原头衔/身份（老数据 key = role） */
  title?: string
  role?: string
  /** 运营对本次首页展示的头衔覆盖 */
  customTitle?: string
  /** 记录作者库原头衔，供覆盖时显示「原值 → 新值」 */
  originTitle?: string
  /** 自动生成的主页路径 */
  homePath?: string
  url?: string
  /** 兼容旧版：旧招募位用 apply 标记，读取时迁移到 recruitmentSlot */
  apply?: boolean
  /** 内部稳定 key，用于列表渲染与拖拽定位（不参与业务语义） */
  key?: string
}

const DEFAULT_NAVS: WarmNavItem[] = [
  { key: 'list', icon: '📚', label: '长文', url: '/pkg-content/content-list/content-list' },
  { key: 'column', icon: '🎧', label: '专栏课', url: '/pkg-content/product-list/product-list?type=column' },
  { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
  { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
  { key: 'resources', icon: '🗂', label: '资料库', url: '/pkg-content/resources/resources' },
]

const { props: data, type } = defineProps<{ props: Record<string, any>; type?: string }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const remoteFeedStatsMode = ref<'auto' | 'manual'>('auto')

/* ------------------------------------------------------------------ *
 * 品牌专栏（warm_columns）配置
 *
 * 真实数据源是 warm_home_config.columnProductIds（运营勾选的付费专栏商品 id 列表），
 * 原先面板只有标题与跳转 4 个字段，运营既不能调数量也不能选专栏，
 * 而生产该值恰好是 `[]` → 画布恒显「暂无专栏」。
 * ------------------------------------------------------------------ */

const FETCH_MODE_OPTIONS = [
  { value: 'auto', label: '自动拉取' },
  { value: 'manual', label: '手动指定' },
]

const columnLimit = computed(() => {
  const n = Number(data.value?.limit ?? data.value?.count)
  if (!Number.isFinite(n)) return COLUMN_CONFIG_DEFAULTS.limit
  return Math.min(10, Math.max(1, Math.round(n)))
})

const columnFetchMode = computed(() =>
  data.value?.fetch_mode === 'manual' ? 'manual' : 'auto',
)

const columnSortBy = computed(() => {
  const v = String(data.value?.sort_by || '')
  return v === 'hot' || v === 'manual' ? v : 'newest'
})

const sortHint = computed(
  () => COLUMN_SORT_OPTIONS.find((o) => o.value === columnSortBy.value)?.hint || '',
)

const columnIds = computed<number[]>(() =>
  (Array.isArray(data.value?.column_ids) ? data.value.column_ids : []).map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x)),
)

const columnSummary = computed(() =>
  columnIds.value.length ? `已指定 ${columnIds.value.length} 个专栏` : '',
)

const columnPickerOpen = ref(false)

const columnAutoHide = computed(() =>
  data.value?.auto_hide_when_empty !== false,
)

/** 老 DSL 没有 preview_mock 键 → 默认开启（与 columnConfig.previewMockEnabled 同口径） */
const columnPreviewMock = computed(() => data.value?.preview_mock !== false)

function onColumnFetchModeChange(v: string | number) {
  // 切到 manual 时给个明确落点：从 auto 语义下没有 column_ids，保留已有即可
  emit('update', { fetch_mode: String(v) })
}

function onColumnIdsConfirm(ids: number[]) {
  emit('update', {
    column_ids: ids,
    // 指定了专栏就说明运营想手动控，隐式切到 manual，避免选了却不生效
    fetch_mode: 'manual',
    // 指定的比展示数量多时自动抬高上限，否则运营会以为「勾了没生效」
    limit: Math.max(columnLimit.value, Math.min(10, ids.length || 1)),
  })
}

const navDraft = ref<WarmNavItem[]>([])
const navSaving = ref(false)
const navHydrated = ref(false)

/**
 * 当前正在编辑的导航项（模板里的 curNav / curNi 由此而来）。
 *
 * 来自 SubItemList 的 `active-change` 事件，**不用插槽作用域**：
 * 作用域只在展开区渲染时存在，且上游传 undefined 时解构会直接把面板打挂
 * （见模板里那段注释）。事件方式与插槽是否存在解耦，最稳。
 */
const activeNav = ref<{ item: any; index: number }>({ item: {}, index: 0 })
const curNav = computed<Partial<WarmNavItem>>(() => activeNav.value.item ?? {})
const curNi = computed(() => activeNav.value.index ?? 0)

const feedStatsMode = computed(() => {
  if (data.feed_stats_mode === 'manual' || data.feed_stats_mode === 'auto') {
    return data.feed_stats_mode
  }
  return remoteFeedStatsMode.value
})

const navs = computed(() => {
  if (navDraft.value.length) return navDraft.value
  if (Array.isArray(data.navs) && data.navs.length) return data.navs as WarmNavItem[]
  return DEFAULT_NAVS
})

/** 金刚区图标：支持素材库图片或 emoji 二选一 */
const iconPickerVisible = ref(false)
/** 正在挑图的那一行索引 */
const pickingIndex = ref(0)

/* =====================================================================
 * warm_authors 作者区块（V122 重构）
 *
 * 改造前：authors 数组 + 每条内部藏一个 apply（招募位）开关，昵称/头像/身份全手打。
 *   → 与作者库脱节、跳转路径手写必 404、不知道哪个才是招募位。
 * 改造后：sourceMode 二选一 + recruitmentSlot 组件级配置。
 *   manual  = 弹窗勾选作者库，头像/昵称/身份/主页路径自动带出
 *   dynamic = 按标签+排序规则实时聚合，新作者打标签即自动上榜
 *
 * ⚠️ 本段落的规则必须与canvas 端 DslWarmBlock.vue 和小程序端
 *    dsl-warm-block.js 保持完全一致（三处都要改），否则画布与真机必分歧。
 * ===================================================================== */

const AUTHOR_LIMIT = 8

const SOURCE_MODE_OPTIONS = [
  { value: 'manual', label: '手动挑选' },
  { value: 'dynamic', label: '动态聚合' },
]

/** 手动模式下已选作者（内部统一成 WarmAuthorItem 形状，模板不用管别名） */
const manualAuthors = computed<WarmAuthorItem[]>(() => {
  const list = data.authors
  return Array.isArray(list) ? (list as WarmAuthorItem[]) : []
})

/**
 * 数据源模式。默认 manual —— 但历史草稿没写 sourceMode 且 authors 非空时，
 * 也按 manual 处理（向后兼容，见 migrateLegacyAuthors）。
 */
const sourceMode = computed<'manual' | 'dynamic'>(() => {
  const m = String((data as Record<string, unknown>).source_mode || '')
  return m === 'dynamic' ? 'dynamic' : 'manual'
})

const sourceModeHint = computed(() =>
  sourceMode.value === 'manual'
    ? '手动挑选：勾选作者库成员，头像/昵称/身份/主页路径自动带出，顺序可拖拽调整。'
    : '动态聚合：按标签与排序规则实时拉取作者库，新作者打上标签后首页自动出现，无需再手动维护。',
)

/** 招募位（组件全局配置） */
const recruitmentSlot = computed(() => {
  const raw = (data.recruitment_slot || {}) as Record<string, unknown>
  return {
    enabled: raw.enabled === true,
    iconText: String(raw.icon_text || ''),
    label: String(raw.label || ''),
    actionType: String(raw.action_type || 'link'),
    targetPath: String(raw.target_path || ''),
  }
})

/** 动态聚合配置，带默认值 */
const dynamicConfig = computed(() => {
  const raw = (data.dynamic_config || {}) as Record<string, unknown>
  const sortBy = String(raw.sort_by || 'weight')
  const limit = Number(raw.limit)
  return {
    tagIds: Array.isArray(raw.tag_ids) ? (raw.tag_ids as string[]) : [],
    sortBy: (sortBy === 'latest' || sortBy === 'article_count' ? sortBy : 'weight') as
      | 'weight'
      | 'latest'
      | 'article_count',
    limit: Number.isFinite(limit) ? Math.min(8, Math.max(3, Math.round(limit))) : 5,
  }
})

/* ---------- 兼容旧数据：is_recruit/apply → recruitmentSlot ---------- */

/**
 * 历史草稿兼容：旧结构 authors:[{name, avatar, apply, path}] 里 apply=true 的那条
 * 就是当年运营标的招募位。这里在读取时把它从作者列表里摘出来，喂给 recruitmentSlot，
 * 保证老页面打开后招募位仍在末尾、作者列表也不再混着「哪个是招募位」的困惑。
 *
 * 只读不写 —— 不在渲染期改DSL，避免「看一眼面板就把草稿改脏」。
 * 真正落库的迁移发生在下方 migrateLegacyAuthors（用户在面板操作时才触发）。
 */
const legacyRecruitMigrated = computed(() => {
  const list = Array.isArray(data.authors) ? (data.authors as WarmAuthorItem[]) : []
  const recruit = list.find((a) => a?.apply === true)
  if (!recruit) return null
  return { targetPath: String(recruit.url || '') }
})

/** 有效招募位配置：优先新字段，其次回落旧 apply 条目 */
const effectiveRecruit = computed(() => {
  if (recruitmentSlot.value.enabled || recruitmentSlot.value.targetPath) return recruitmentSlot.value
  const legacy = legacyRecruitMigrated.value
  if (legacy) {
    return { ...recruitmentSlot.value, enabled: true, targetPath: legacy.targetPath }
  }
  return recruitmentSlot.value
})

/* ---------- 作者库标签选项 ---------- */

const allAuthors = ref<AuthorRecord[]>([])

/** 作者库里出现过的全部标签（去重排序），供动态模式下拉多选 */
const authorTagOptions = computed(() => {
  const set = new Set<string>()
  allAuthors.value.forEach((a) => {
    String(a.tags || '')
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => set.add(t))
  })
  return Array.from(set).sort()
})

async function loadAuthorTags() {
  try {
    const res: any = await listAuthors({ status: 1 })
    allAuthors.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    allAuthors.value = []
  }
}

/* ---------- 动态聚合预览（画布上给运营看效果） ---------- */

const aggPreview = ref<AuthorAggregateItem[]>([])
const aggLoading = ref(false)

async function refreshAggregatePreview() {
  const cfg = dynamicConfig.value
  aggLoading.value = true
  try {
    const res: any = await get<any>(MpAuthorListApi, {
      tags: cfg.tagIds.join(','),
      sortBy: cfg.sortBy,
      limit: cfg.limit,
    })
    const rows = res?.data
    aggPreview.value = Array.isArray(rows) ? rows : rows?.records || []
  } catch (e: any) {
    aggPreview.value = []
    ElMessage.error(e?.message || '聚合预览加载失败')
  } finally {
    aggLoading.value = false
  }
}

/* ---------- 写操作 ---------- */

function setSourceMode(mode: string) {
  const patch: Record<string, unknown> = { source_mode: mode }
  // 首次切到 dynamic 时顺手迁移旧招募位，避免老页面切模式后招募位消失
  if (mode === 'dynamic') {
    migrateLegacyRecruit()
  }
  emit('update', patch)
}

/** 把旧 authors 里的 apply 条目迁到 recruitmentSlot（切模式/保存时触发一次） */
function migrateLegacyRecruit() {
  const legacy = legacyRecruitMigrated.value
  if (!legacy) return
  emit('update', {
    recruitment_slot: {
      enabled: true,
      icon_text: '＋',
      label: '招募中',
      action_type: 'link',
      target_path: legacy.targetPath,
    },
    // authors 里那条 apply 条目由 normalizeAuthors 过滤掉，这里一并提交干净列表
    authors: normalizeAuthors(data.authors),
  })
  ElMessage.info('已把旧招募位迁移到组件设置，作者列表已清理')
}

/** 过滤掉 apply 条目并补齐新字段别名 */
function normalizeAuthors(raw: unknown): WarmAuthorItem[] {
  const list = Array.isArray(raw) ? (raw as WarmAuthorItem[]) : []
  return list
    .filter((a) => a && a.apply !== true)
    .map((a, i) => {
      const nickname = String(a.nickname || a.name || '')
      const title = String(a.title || a.role || '')
      const authorId = a.authorId ? Number(a.authorId) : null
      return {
        ...a,
        authorId,
        nickname,
        name: nickname,
        avatar: String(a.avatar || ''),
        title,
        role: title,
        customTitle: String(a.customTitle || ''),
        originTitle: String(a.originTitle || title || ''),
        homePath: String(a.homePath || a.url || (authorId ? authorHomePath(authorId, nickname) : '')),
        apply: undefined,
        key: String(a.key || `author_${i}`),
      } as WarmAuthorItem
    })
}

function commitAuthors(next: WarmAuthorItem[]) {
  emit('update', { authors: next })
}

function patchAuthor(index: number, patch: Partial<WarmAuthorItem>) {
  const next = normalizeAuthors(data.authors)
  if (!next[index]) return
  next[index] = { ...next[index], ...patch }
  commitAuthors(next)
}

function moveAuthor(index: number, delta: number) {
  const next = normalizeAuthors(data.authors)
  const j = index + delta
  if (j < 0 || j >= next.length) return
  const tmp = next[index]
  next[index] = next[j]
  next[j] = tmp
  commitAuthors(next)
}

function removeAuthor(index: number) {
  const next = normalizeAuthors(data.authors)
  if (index < 0 || index >= next.length) return
  next.splice(index, 1)
  commitAuthors(next)
}

/* ---------- 拖拽排序 ---------- */

const dragIndex = ref(-1)

function onDragStart(i: number) {
  dragIndex.value = i
}

function onDrop(i: number) {
  const from = dragIndex.value
  if (from < 0 || from === i) return
  const next = normalizeAuthors(data.authors)
  const [item] = next.splice(from, 1)
  next.splice(i, 0, item)
  dragIndex.value = -1
  commitAuthors(next)
}

function onDragEnd() {
  dragIndex.value = -1
}

/* ---------- 头衔覆盖 ---------- */

/** 当前正在编辑覆盖值的作者：取第一个人（有覆盖值的优先），无覆盖值时给 null */
const overrideTarget = computed<WarmAuthorItem | null>(() => {
  const list = manualAuthors.value
  const withOverride = list.find((a) => String(a.customTitle || '').trim())
  return withOverride || null
})

function customTitleOf(a: WarmAuthorItem): string {
  return String(a?.customTitle || '').trim()
}

function setCustomTitle(v: string) {
  const target = overrideTarget.value
  if (!target) return
  const idx = manualAuthors.value.indexOf(target)
  if (idx < 0) return
  patchAuthor(idx, { customTitle: String(v || '').trim() })
}

/* ---------- 弹窗选择 ---------- */

/**
 * 喂给弹窗的已选列表（做一次形状适配）。
 * 弹窗只关心「勾了谁、叫什么、长什么样、主页在哪」，
 * 不需要知道 customTitle / originTitle 这些面板侧字段。
 */
const pickedForModal = computed<PickedAuthor[]>(() =>
  manualAuthors.value.map((a) => ({
    authorId: Number(a.authorId || 0),
    nickname: String(a.nickname || a.name || ''),
    avatar: String(a.avatar || ''),
    title: String(a.title || a.role || ''),
    originTitle: String(a.originTitle || a.title || a.role || ''),
    homePath: String(a.homePath || ''),
  })),
)

const authorPickerModalVisible = ref(false)

function openAuthorPicker() {
  authorPickerModalVisible.value = true
}

function onAuthorsPicked(list: PickedAuthor[]) {
  commitAuthors(
    list.map((p) => ({
      authorId: p.authorId,
      nickname: p.nickname,
      name: p.nickname,
      avatar: p.avatar,
      title: p.title,
      role: p.title,
      originTitle: p.originTitle || p.title,
      customTitle: '',
      homePath: p.homePath,
    })),
  )
  ElMessage.success(`已选 ${list.length} 位作者，头像/昵称/身份/主页路径自动带出`)
}

/* ---------- 招募位 ---------- */

/**
 * 招募位字段名映射：面板内部（computed / 事件参数）用 camelCase，
 * 落库到 recruitment_slot 用 snake_case。
 *
 * 🔴 这里的映射不能省。之前 patch 直接 `...patch`，而调用方传的是 camelCase
 * （`{ targetPath }`），spread 会把 `targetPath` 当成一个**额外的新键**塞进去，
 * 而 `target_path` 仍保留旧值 —— computed 只读 `raw.target_path`，
 * 于是预设按钮点了没有任何反应，底部一直显示「未配置（点击无跳转）」。
 */
const RECRUIT_FIELD_MAP: Record<string, string> = {
  enabled: 'enabled',
  iconText: 'icon_text',
  label: 'label',
  actionType: 'action_type',
  targetPath: 'target_path',
}

function patchRecruit(patch: Record<string, unknown>) {
  const cur = effectiveRecruit.value
  const slot: Record<string, unknown> = {
    enabled: cur.enabled,
    icon_text: cur.iconText,
    label: cur.label,
    action_type: cur.actionType,
    target_path: cur.targetPath,
  }
  // 先把 camelCase 键翻译成 snake_case，再落到 slot 上（而不是直接 spread patch）
  Object.entries(patch).forEach(([key, value]) => {
    const snakeKey = RECRUIT_FIELD_MAP[key] || key
    slot[snakeKey] = value
  })
  emit('update', { recruitment_slot: slot })
}

/**
 * 招募位预设路由。
 * 🔴 这里的路径必须与小程序 app.json subPackages 中真实登记的页面一致。
 * 原先写的 `/pkg-content/author-apply/author-apply` 与 `/pkg-content/author-list/author-list`
 * 里前者根本不存在（目录和 app.json 均无此页），配上去点了也只会跳失败。
 * 现改为：入驻申请 → contribute（页内文案即「创作者申请」，含申请状态与审核流），
 * 招募说明 → author-list（作者列表页）。
 */
const RECRUIT_PRESETS: Record<string, { path: string; label: string }> = {
  apply: { path: '/pkg-content/contribute/contribute', label: '入驻申请' },
  intro: { path: '/pkg-content/author-list/author-list', label: '招募说明' },
}

function applyRecruitPreset(kind: string) {
  const preset = RECRUIT_PRESETS[kind]
  if (!preset) return
  patchRecruit({ targetPath: preset.path, actionType: 'link', enabled: true })
}

function patchDynamic(patch: Record<string, unknown>) {
  const cur = dynamicConfig.value
  emit('update', {
    dynamic_config: {
      tag_ids: cur.tagIds,
      sort_by: cur.sortBy,
      limit: cur.limit,
      ...patch,
    },
  })
}

/* ---------- 进入面板时按需拉数据 ---------- */

watch(
  () => [sourceMode.value, dynamicConfig.value.tagIds.join(','), dynamicConfig.value.sortBy, dynamicConfig.value.limit],
  () => {
    if (sourceMode.value !== 'dynamic') return
    if (!authorTagOptions.value.length && !allAuthors.value.length) loadAuthorTags()
    refreshAggregatePreview()
  },
  { immediate: true },
)

/** 是否是图片图标：素材库图片一律以 /uploads/ 开头（相对路径），emoji 则不是 */
function isImageIcon(icon: unknown): boolean {
  const s = String(icon || '').trim()
  return s.startsWith('/uploads/') || /^https?:\/\//i.test(s)
}

function pickIcon(index: number) {
  pickingIndex.value = index
  iconPickerVisible.value = true
}

function parseWarmHomeConfig(raw: string) {
  try {
    const obj = JSON.parse(raw || '{}')
    return obj && typeof obj === 'object' ? obj as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function normalizeNav(n: any, i: number): WarmNavItem {
  return {
    key: String(n?.key || `nav_${i}`),
    icon: String(n?.icon || ''),
    label: String(n?.label || ''),
    url: String(n?.url || ''),
    tab: !!n?.tab,
  }
}

function commitNavs(next: WarmNavItem[]) {
  navDraft.value = next.map((n, i) => normalizeNav(n, i))
  emit('update', { navs: navDraft.value.map((n) => ({ ...n })) })
}

function patchNav(index: number, patch: Partial<WarmNavItem>) {
  const next = navs.value.map((n, i) => (i === index ? { ...n, ...patch } : { ...n }))
  commitNavs(next)
}

function moveNav(index: number, delta: number) {
  const next = navs.value.map((n) => ({ ...n }))
  const j = index + delta
  if (j < 0 || j >= next.length) return
  const tmp = next[index]
  next[index] = next[j]
  next[j] = tmp
  commitNavs(next)
}

function removeNav(index: number) {
  if (navs.value.length <= 1) return
  commitNavs(navs.value.filter((_, i) => i !== index))
}

function addNav() {
  if (navs.value.length >= 8) return
  commitNavs([
    ...navs.value.map((n) => ({ ...n })),
    { key: `nav_${Date.now().toString(36)}`, icon: '⭐', label: '新入口', url: '/pages/index/index', tab: false },
  ])
}

async function loadWarmHomeHit() {
  const res = await getConfigsSilent()
  const rows = Array.isArray(res) ? res : ((res as any)?.data || [])
  const hit = (rows as any[]).find((r) => (r.configKey || r.config_key) === 'warm_home_config')
  const cfg = parseWarmHomeConfig(String(hit?.configValue || hit?.config_value || ''))
  return { hit, cfg }
}

async function loadFeedStatsMode() {
  try {
    const { cfg } = await loadWarmHomeHit()
    remoteFeedStatsMode.value = cfg.feedStatsMode === 'manual' ? 'manual' : 'auto'
  } catch {
    remoteFeedStatsMode.value = 'auto'
  }
}

async function hydrateNavs() {
  if (navHydrated.value) return
  try {
    if (Array.isArray(data.navs) && data.navs.length) {
      navDraft.value = data.navs.map((n: any, i: number) => normalizeNav(n, i))
      navHydrated.value = true
      return
    }
    const { cfg } = await loadWarmHomeHit()
    const remote = Array.isArray(cfg.navs) ? cfg.navs as WarmNavItem[] : []
    if (remote.length) {
      navDraft.value = remote.map((n, i) => normalizeNav(n, i))
      emit('update', { navs: navDraft.value.map((n) => ({ ...n })) })
    } else {
      navDraft.value = DEFAULT_NAVS.map((n, i) => normalizeNav(n, i))
    }
  } catch {
    navDraft.value = DEFAULT_NAVS.map((n, i) => normalizeNav(n, i))
  } finally {
    navHydrated.value = true
  }
}

async function saveNavs() {
  navSaving.value = true
  try {
    const list = navs.value.map((n, i) => normalizeNav(n, i)).filter((n) => n.label || n.url)
    emit('update', { navs: list.map((n) => ({ ...n })) })
    const { hit, cfg } = await loadWarmHomeHit()
    cfg.navs = list
    await updateConfigs([{
      configKey: 'warm_home_config',
      configValue: JSON.stringify(cfg),
      configGroup: hit?.configGroup || hit?.config_group || 'miniapp',
      description: hit?.description || '暖阁首页配置',
    }])
    navDraft.value = list
    ElMessage.success('快捷入口已写入首页配置')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    navSaving.value = false
  }
}

async function onFeedStatsMode(v: string) {
  const mode = v === 'manual' ? 'manual' : 'auto'
  emit('update', { feed_stats_mode: mode })
  try {
    const { hit, cfg } = await loadWarmHomeHit()
    cfg.feedStatsMode = mode
    await updateConfigs([{
      configKey: 'warm_home_config',
      configValue: JSON.stringify(cfg),
      configGroup: hit?.configGroup || hit?.config_group || 'miniapp',
      description: hit?.description || '暖阁首页配置',
    }])
    remoteFeedStatsMode.value = mode
    ElMessage.success(mode === 'auto' ? '已改为自动真实数据' : '已改为手动 meta')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

watch(() => data.navs, (v) => {
  if (!navHydrated.value) return
  if (Array.isArray(v) && v.length) {
    navDraft.value = v.map((n: any, i: number) => normalizeNav(n, i))
  }
})

onMounted(() => {
  if (type === 'warm_feed') loadFeedStatsMode()
  if (type === 'warm_greet') hydrateNavs()
})
</script>

<style scoped>
.ds-hint {
  color: #8a93a3;
  font-size: 12px;
  line-height: 1.4;
  margin: 0 0 10px;

  b {
    color: #c2410c;
  }
}

/* 只读摘要 + 右侧「挑选」按钮（手动指定专栏等弹窗选择型字段复用） */
.picker-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}
/* 金刚区入口：每个入口一张卡片，字段用栅格对齐，避免原来 flex-wrap 换行后
   「图标/文案」和「路径/开关」错位、看不出哪几个字段属于同一条入口 */
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  padding: 8px 10px 10px;
  background: var(--wb-soft, #f8fafc);
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 8px;
}
.nav-item__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.nav-item__idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--color-primary, #002fa7);
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.nav-item__title {
  color: var(--color-ink, #172033);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-item__spacer {
  flex: 1;
}
.nav-item__grid {
  display: grid;
  /* 图标 / 文案 / 开关各一列，跳转路径占剩余宽度。
     图标列给 132px：既能显示 emoji，也能放下「预览/输入 + 素材库按钮」而不换行。 */
  grid-template-columns: 148px 84px minmax(96px, 1fr) 58px;
  gap: 8px;
  align-items: end;
}
.nav-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.nav-field__label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted, #94a3b8);
  font-size: 11px;
  line-height: 1.2;
}
/* 图标控件：emoji 输入与素材库图片预览共用一个紧凑容器 */
.nav-icon-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.nav-icon-picker :deep(.el-input) {
  min-width: 0;
  flex: 1;
}
/* emoji 直接以文字渲染；图片图标固定 22×22 方形预览，超出部分裁切 */
.nav-icon-picker__preview {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 1px solid var(--wb-line, #e5eaf3);
  border-radius: 4px;
  object-fit: cover;
  background: #fff;
}
.nav-icon-picker__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.nav-icon-picker__actions :deep(.el-button) {
  padding: 5px 7px;
  font-size: 12px;
}
.nav-icon-picker__btn {
  flex-shrink: 0;
  padding: 5px 7px !important;
  font-size: 12px !important;
}
.nav-field--switch :deep(.el-switch) {
  margin-top: 1px;
}
.nav-icon-picker__preview--round {
  border-radius: 50%;
}
/* 作者头像放大到 30px，折叠列表里的小圆标也用同一尺寸，视觉一致 */
.nav-icon-picker__preview--lg {
  width: 30px;
  height: 30px;
}
.nav-icon-picker__preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a1897a;
  font-size: 12px;
  font-weight: 700;
}

/* ============ 作者区专属 ============ */
.wa-section {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--wb-line, #e5eaf3);
}
.wa-section__head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
}
.wa-section__title {
  color: var(--color-ink, #172033);
  font-size: 13px;
  font-weight: 600;
}
.wa-section__spacer {
  flex: 1;
}
.wa-collapse-all {
  font-size: 12px;
  padding: 0;
}
/* 招募位是组件级设置，视觉上与作者列表分区 */
.wa-section--recruit {
  background: #fbf8f4;
  border-color: var(--wb-line, #e8dfd3);
}
.wa-section__head--sub {
  margin-top: 12px;
}
.wa-mode-note {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted, #94a3b8);
}
.wa-count {
  flex: none;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
/* 空态：告诉运营下一步该干什么，而不是只显示空白 */
.wa-empty {
  padding: 14px 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-muted, #94a3b8);
  text-align: center;
  background: #fbf8f4;
  border: 1px dashed var(--wb-line, #e8dfd3);
  border-radius: 8px;
}
.wa-empty--tight {
  padding: 10px 8px;
  margin-top: 4px;
}
/* 已选作者卡片流 */
.wa-plist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
  padding: 0;
  list-style: none;
}
.wa-pitem {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 8px;
  cursor: grab;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wa-pitem:hover {
  border-color: var(--el-color-primary, #c08e6e);
}
.wa-pitem.is-dragging {
  opacity: 0.5;
  border-style: dashed;
}
.wa-pitem__grip {
  flex: none;
  font-size: 13px;
  color: #c3b6a6;
  cursor: grab;
}
.wa-pitem__idx {
  flex: none;
  width: 14px;
  font-size: 11px;
  color: #b3a595;
  text-align: center;
}
.wa-pitem__ava {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--wb-line, #e8dfd3);
}
.wa-pitem__ava--empty {
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #a1897a;
}
.wa-pitem__meta {
  flex: 1;
  min-width: 0;
}
.wa-pitem__name {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--wb-ink, #2a1f17);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wa-pitem__link {
  flex: none;
  font-size: 12px;
  color: var(--el-color-primary, #c08e6e);
}
.wa-pitem__role {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 覆盖前的原值划掉，让「覆盖了什么」一眼可见 */
.wa-pitem__orig {
  color: #b3a595;
}
.wa-pitem__arrow {
  color: #c3b6a6;
}
.wa-override {
  display: flex;
  gap: 6px;
  align-items: center;
}
/* 动态聚合预览 */
.wa-preview {
  margin-top: 10px;
  padding: 8px 10px;
  background: #fbf8f4;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 8px;
}
.wa-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--wb-ink, #2a1f17);
}
.wa-preview__list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wa-preview__item {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}
.wa-preview__idx {
  flex: none;
  width: 14px;
  color: #b3a595;
  text-align: center;
}
.wa-preview__ava {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}
.wa-preview__ava--empty {
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #a1897a;
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
}
.wa-preview__name {
  flex: 1;
  min-width: 0;
  color: var(--wb-ink, #2a1f17);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wa-preview__role {
  flex: none;
  color: var(--text-muted, #94a3b8);
}
/* 滑块 + 数值 */
.wa-slider {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}
.wa-slider :deep(.el-slider) {
  flex: 1;
}
.wa-slider__val {
  flex: none;
  width: 40px;
  font-size: 12px;
  color: var(--wb-ink, #2a1f17);
}
.wa-recruit-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
/* 开关与文字同一行，省一行高度又不显拥挤 */
.nav-field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.nav-field__note {
  color: var(--text-muted, #94a3b8);
  font-size: 11px;
}
/* 主操作：占满整行的浅虚线框 */
.wa-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 5%, #fff);
  border: 1px dashed color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.wa-add:hover:not(:disabled) {
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 11%, #fff);
  border-color: var(--el-color-primary, #c08e6e);
}
.wa-add:disabled {
  color: var(--text-muted, #94a3b8);
  background: transparent;
  border-color: var(--wb-line, #e5eaf3);
  cursor: not-allowed;
}
.wa-add__plus {
  font-size: 14px;
  line-height: 1;
}
.wa-add__count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted, #94a3b8);
}
.nav-actions--author {
  align-items: center;
}
.nav-actions__spacer {
  flex: 1;
}
/* 窄侧栏：文案与图标并排、路径与开关各占整行，仍保持「一条入口一块卡片」的分组感 */
@media (max-width: 460px) {
  .nav-item__grid {
    grid-template-columns: 148px 1fr;
    row-gap: 6px;
  }
  .nav-field--wide,
  .nav-field--switch {
    grid-column: 1 / -1;
  }
  /* 窄屏下开关与标签并排，省一行高度 */
  .nav-field--switch {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .nav-field--switch .nav-field__label {
    order: -1;
  }
}

.nav-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
