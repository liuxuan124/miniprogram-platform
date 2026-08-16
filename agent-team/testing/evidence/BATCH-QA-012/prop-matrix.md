# 装修器全量属性实测

编辑器：http://127.0.0.1:3000/page-builder/editor/11

## 页面属性（未选中组件）
结论：PASS
可见：页面属性、页面名称、背景色、分享标题、全局配置、下拉刷新、触底加载
缺：无
操作：名称可改；下拉刷新可点

## 通用样式（选中任一组件 → 样式 Tab）
结论：PASS
可见：自动播放、间隔时间、指示点、图片1、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小、删除此图、+ 添加图片
缺：无

## 各组件内容属性

### 轮播图 · FAIL
- 能否添加：是；选中后标题：轮播图
- 可见字段：自动播放、间隔时间、指示点、图片1、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小、删除此图、+ 添加图片
- 相对清单缺少：标题、链接
- 额外看到：圆角、背景色、文字颜色、文字大小、删除此图
- 操作探测：locator.fill: Error: Cannot type text into input[type=number]
Call log:
  - waiting for locator('.props-panel').locator('.el-input__inner, .el-textarea__inner').filter({ hasNot: locator('[disabled]') }).first()
    - locator resolved to <input step="500" min="1000" max="10000" tabindex="0" type="number" role="spinbutton" autocomplete="off" id="el-id-6453-88" aria-valuemin="1000" aria-valuenow="3000" aria-valuemax="10000" aria-disabled="false" class="el-input__inner"/>
    - fill("3000-QA")
  - attempting fill action
    - waiting for element to be visible, enabled and editable

- 截图：`01-轮播图.png`

### 图片 · PASS
- 能否添加：是；选中后标题：图片
- 可见字段：图片、链接类型、链接地址、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色、文字大小
- 操作探测：locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.props-panel').locator('.el-input-number').first().locator('.el-input-number__increase')
    - locator resolved to <span role="button" aria-label="增加数值" class="el-input-number__increase">…</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

- 截图：`02-图片.png`

### 视频 · PASS
- 能否添加：是；选中后标题：视频
- 可见字段：视频地址、封面图、自动播放、循环播放、控制栏、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色、文字大小
- 操作探测：locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.props-panel').locator('.el-input-number').first().locator('.el-input-number__increase')
    - locator resolved to <span role="button" aria-label="增加数值" class="el-input-number__increase">…</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

- 截图：`03-视频.png`

### 图文组合 · PASS
- 能否添加：是；选中后标题：图文组合
- 可见字段：标题、布局、内容、标题字号、正文字号、图片、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`04-图文组合.png`

### 搜索组件 · PASS
- 能否添加：是；选中后标题：搜索组件
- 可见字段：提示词、搜索范围、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色、文字大小
- 操作探测：locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.props-panel').locator('.el-input-number').first().locator('.el-input-number__increase')
    - locator resolved to <span role="button" aria-label="增加数值" class="el-input-number__increase">…</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

- 截图：`05-搜索组件.png`

### 分类导航 · FAIL
- 能否添加：是；选中后标题：分类导航
- 可见字段：标题、布局、列数、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小、+ 添加分类项
- 相对清单缺少：图标、名称、链接
- 额外看到：圆角、背景色、文字颜色、文字大小、+ 添加分类项
- 操作探测：文本可改；数字步进可点
- 截图：`06-分类导航.png`

### 商品列表 · PASS
- 能否添加：是；选中后标题：商品列表
- 可见字段：标题、列数、显示价格、显示销量、购物车、显示数量、标题字号、元信息字号、排序方式、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`07-商品列表.png`

### 限时秒杀 · PASS
- 能否添加：是；选中后标题：限时秒杀
- 可见字段：标题、商品数量、标题字号、元信息字号、显示倒计时、结束时间、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`08-限时秒杀.png`

### 优惠券 · PASS
- 能否添加：是；选中后标题：优惠券
- 可见字段：标题、样式、显示数量、按钮文案、标题字号、内容字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`09-优惠券.png`

### 标题栏 · PASS
- 能否添加：是；选中后标题：标题栏
- 可见字段：标题、副标题、对齐、标题字号、副标题字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`10-标题栏.png`

### 文章列表 · PASS
- 能否添加：是；选中后标题：文章列表
- 可见字段：标题、样式、显示封面、显示日期、显示数量、标题字号、元信息字号、排序方式、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`11-文章列表.png`

### 富文本 · PASS
- 能否添加：是；选中后标题：富文本
- 可见字段：内容、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.props-panel').locator('.el-input__inner, .el-textarea__inner').filter({ hasNot: locator('[disabled]') }).first()
    - locator resolved to <input min="0" step="1" max="100" tabindex="0" type="number" role="spinbutton" aria-valuemin="0" aria-valuenow="0" autocomplete="off" id="el-id-6453-68" aria-valuemax="100" aria-disabled="false" class="el-input__inner"/>
    - fill("0-QA")
  - attempting fill action
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and editable
      - element is not visible
    - retrying fill action
      - waiting 100ms
    60 × waiting for element to be visible, enabled and editable
       - element is not visible
     - retrying fill action
       - waiting 500ms

- 截图：`12-富文本.png`

### 品牌介绍 · PASS
- 能否添加：是；选中后标题：品牌介绍
- 可见字段：标题、副标题、介绍、标题字号、副标题字号、正文字号、Logo位置、文字对齐、Logo尺寸、左右、上下、Logo、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：正文字号、圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`13-品牌介绍.png`

### 资质证书 · FAIL
- 能否添加：是；选中后标题：资质证书
- 可见字段：标题、列数、标题字号、名称字号、边距、上、左、右、下、圆角、背景色、文字颜色、+ 添加证书
- 相对清单缺少：说明、图片
- 额外看到：圆角、背景色、文字颜色、+ 添加证书
- 操作探测：文本可改；数字步进可点
- 截图：`14-资质证书.png`

### 公告栏 · PASS
- 能否添加：是；选中后标题：公告栏
- 可见字段：左侧文案、滚动开关、滚动方向、滚动速度、喇叭图标、右侧箭头、关闭按钮、文字颜色、背景颜色、文字大小、跳转链接、边距、上、左、右、下、圆角、背景色、删除、+ 添加公告
- 相对清单缺少：无
- 额外看到：圆角、背景色、删除
- 操作探测：开关可切换；文本可改
- 截图：`15-公告栏.png`

### 活动入口 · PASS
- 能否添加：是；选中后标题：活动入口
- 可见字段：活动标题、副标题、封面文案、封面图、活动时间、活动地点、按钮文案、显示按钮、卡片样式、主题色、链接类型、链接地址、标题字号、元信息字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：标题字号、元信息字号、圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`16-活动入口.png`

### 活动列表 · PASS
- 能否添加：是；选中后标题：活动列表
- 可见字段：模块标题、显示数量、按钮文案、显示按钮、标题字号、条目字号、元信息字号、名称、时间、地点、封面、链接、边距、上、左、右、下、圆角、背景色、文字颜色、删除、+ 添加活动
- 相对清单缺少：无
- 额外看到：条目字号、元信息字号、圆角、背景色、文字颜色、删除、+ 添加活动
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`17-活动列表.png`

### 预约服务 · PASS
- 能否添加：是；选中后标题：预约服务
- 可见字段：标题、标题字号、服务名字号、说明字号、名称、说明、按钮、链接、边距、上、左、右、下、圆角、背景色、文字颜色、删除、+ 添加服务
- 相对清单缺少：无
- 额外看到：服务名字号、圆角、背景色、文字颜色、删除、+ 添加服务
- 操作探测：文本可改；数字步进可点
- 截图：`18-预约服务.png`

### 会员卡 · PASS
- 能否添加：是；选中后标题：会员卡
- 可见字段：标题、副标题、标题字号、副标题字号、权益字号、数值字号、标签字号、升级字号、背景类型、主题色、显示等级、显示积分、显示余额、显示优惠券、显示升级、升级文案、升级链接、整卡链接、边距、上、左、右、下、圆角、背景色、文字颜色、删除、+ 添加权益
- 相对清单缺少：无
- 额外看到：主题色、升级文案、升级链接、圆角、背景色、文字颜色、删除、+ 添加权益
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`19-会员卡.png`

### 倒计时 · PASS
- 能否添加：是；选中后标题：倒计时
- 可见字段：标题、结束时间、样式、显示天数、结束文案、标题字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`20-倒计时.png`

### 悬浮按钮 · FAIL
- 能否添加：是；选中后标题：悬浮按钮
- 可见字段：文案、显示文字、预设图标、自定义图、按钮颜色、尺寸、透明度、停靠位置、左右边距、上下边距、可拖动、自动收边、动作、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：页面路径
- 额外看到：圆角、背景色、文字颜色、文字大小
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`21-悬浮按钮.png`

### 表单入口 · PASS
- 能否添加：是；选中后标题：表单入口
- 可见字段：关联表单、标题、副标题、按钮文案、样式、标题字号、副标题字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`22-表单入口.png`

### AI入口 · PASS
- 能否添加：是；选中后标题：AI入口
- 可见字段：标题、描述、头像、主题色、标题字号、描述字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色
- 操作探测：文本可改；数字步进可点
- 截图：`23-AI入口.png`

### 联系方式 · PASS
- 能否添加：是；选中后标题：联系方式
- 可见字段：标题、电话、地址、营业时间、排列方式、卡片样式、文字对齐、显示图标、显示电话、显示地址、显示时间、标题字号、内容字号、边距、上、左、右、下、圆角、背景色、文字颜色
- 相对清单缺少：无
- 额外看到：内容字号、圆角、背景色、文字颜色
- 操作探测：开关可切换；文本可改；数字步进可点
- 截图：`24-联系方式.png`

### 导航栏 · PASS
- 能否添加：是；选中后标题：导航栏
- 可见字段：每行数量、样式、图标、标题、链接、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小、删除、+ 添加导航项
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色、文字大小、删除
- 操作探测：locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.props-panel').locator('.el-input-number').first().locator('.el-input-number__increase')
    - locator resolved to <span role="button" aria-label="增加数值" class="el-input-number__increase">…</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

- 截图：`25-导航栏.png`

### 分割线 · PASS
- 能否添加：是；选中后标题：分割线
- 可见字段：线型、颜色、间距、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字大小
- 操作探测：locator.fill: Error: Cannot type text into input[type=number]
Call log:
  - waiting for locator('.props-panel').locator('.el-input__inner, .el-textarea__inner').filter({ hasNot: locator('[disabled]') }).first()
    - locator resolved to <input min="0" step="1" max="60" tabindex="0" type="number" role="spinbutton" aria-valuemin="0" autocomplete="off" aria-valuemax="60" aria-valuenow="16" id="el-id-6453-1099" aria-disabled="false" class="el-input__inner"/>
    - fill("16-QA")
  - attempting fill action
    - waiting for element to be visible, enabled and editable

- 截图：`26-分割线.png`

### 间距 · PASS
- 能否添加：是；选中后标题：间距
- 可见字段：高度、边距、上、左、右、下、圆角、背景色、文字颜色、文字大小
- 相对清单缺少：无
- 额外看到：圆角、背景色、文字颜色、文字大小
- 操作探测：locator.fill: Error: Cannot type text into input[type=number]
Call log:
  - waiting for locator('.props-panel').locator('.el-input__inner, .el-textarea__inner').filter({ hasNot: locator('[disabled]') }).first()
    - locator resolved to <input min="5" step="5" max="200" tabindex="0" type="number" role="spinbutton" aria-valuemin="5" autocomplete="off" aria-valuenow="20" aria-valuemax="200" id="el-id-6453-1105" aria-disabled="false" class="el-input__inner"/>
    - fill("20-QA")
  - attempting fill action
    - waiting for element to be visible, enabled and editable

- 截图：`27-间距.png`