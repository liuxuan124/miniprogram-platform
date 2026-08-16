# 功能点清单

> 范围：仅 **页面装修器**（管理后台页面搭建 + 对应 API / DSL / 库表）。
> 全系统其他模块仍未按契约机械枚举，本清单分母 **不等于** 全系统功能点数。
> 状态：已枚举（页面搭建范围）/ **总控已确认**（2026-08-13 17:59，会话确认）。已进入用例设计，尚未执行。
> 契约版本：api-contract、page-dsl-schema、database-model 均为 `2026-07-22` 初稿。
> 编号规则：`FP-<模块>-<三位序号>`，一经分配不复用、不重排。

## 汇总

| 项 | 值 |
| --- | --- |
| 本范围总功能点数 | 268 |
| 各模块分布 | API 78 / UI 185 / DB 5 |
| 明确排除范围 | 订单/支付/会员/内容后台/商品后台/AI/预约等非页面搭建模块；实现里多出的 14 个组件类型（见「待总控裁决」） |
| 排除理由 | 本次只拆页面编辑器；多出的组件未写入 page-dsl-schema §9，按契约第 1.5 条须先变更契约才能纳入正式分母 |
| 总控确认时间 | 2026-08-13 17:59 |
| 总控确认人 | 会话确认（用户「好，可以」） |

## 待总控裁决（不计入 268）

1. `page-dsl-schema` §9 只定义 13 种组件；后台注册表另有 14 种：搜索、图片、分类导航、限时秒杀、公告栏、活动列表、预约服务、图文组合、品牌介绍、资质证书、联系方式、表单入口、AI 入口、标题栏。
2. 契约 `page.type` 为 `home/topic/custom`，库表 `mp_page.type` 为 `1/2/3`，需确认映射是否为唯一合法转换。
3. 契约未定义草稿乐观锁错误码；实现使用「已被其他人修改」。是否补 `300409` 类码。

---

## 功能点

### A. API（api-contract §5 + §7.4）

| FP 编号 | 模块 | 来源契约 | 描述 | 排除 |
| --- | --- | --- | --- | --- |
| FP-API-001 | API | api-contract | `GET /admin/pages` 成功返回分页列表 | 否 |
| FP-API-002 | API | api-contract | `GET /admin/pages` 空列表 | 否 |
| FP-API-003 | API | api-contract | `GET /admin/pages` 分页 `page` 从 1 | 否 |
| FP-API-004 | API | api-contract | `GET /admin/pages` `page_size` 默认 20 | 否 |
| FP-API-005 | API | api-contract | `GET /admin/pages` `page_size` 超过 100 被拒绝 | 否 |
| FP-API-006 | API | api-contract | `GET /admin/pages` 按 type 筛选 | 否 |
| FP-API-007 | API | api-contract | `GET /admin/pages` 按 status 筛选 | 否 |
| FP-API-008 | API | api-contract | `GET /admin/pages` 关键词搜索 | 否 |
| FP-API-009 | API | api-contract | `GET /admin/pages` 未登录 110101 | 否 |
| FP-API-010 | API | api-contract | `GET /admin/pages` Token 过期 110102 | 否 |
| FP-API-011 | API | api-contract | `GET /admin/pages` 参数非法 100101 | 否 |
| FP-API-012 | API | api-contract | `POST /admin/pages` 创建成功（201/200） | 否 |
| FP-API-013 | API | api-contract | `POST /admin/pages` 缺少 name | 否 |
| FP-API-014 | API | api-contract | `POST /admin/pages` 缺少 type | 否 |
| FP-API-015 | API | api-contract | `POST /admin/pages` 缺少 path | 否 |
| FP-API-016 | API | api-contract | `POST /admin/pages` name 超 128 | 否 |
| FP-API-017 | API | api-contract | `POST /admin/pages` type 非法 | 否 |
| FP-API-018 | API | api-contract | `POST /admin/pages` JSON 非法 100102 | 否 |
| FP-API-019 | API | api-contract | `POST /admin/pages` 未登录 110101 | 否 |
| FP-API-020 | API | api-contract | `POST /admin/pages` 角色不足 200301（低于 content_ops） | 否 |
| FP-API-021 | API | api-contract | `POST /admin/pages` 重复提交/幂等 | 否 |
| FP-API-022 | API | api-contract | `GET /admin/pages/{id}` 成功 | 否 |
| FP-API-023 | API | api-contract | `GET /admin/pages/{id}` 不存在 404 | 否 |
| FP-API-024 | API | api-contract | `GET /admin/pages/{id}` id 类型错误 | 否 |
| FP-API-025 | API | api-contract | `GET /admin/pages/{id}` 未登录 110101 | 否 |
| FP-API-026 | API | api-contract | `PUT /admin/pages/{id}` 更新成功 | 否 |
| FP-API-027 | API | api-contract | `PUT /admin/pages/{id}` 不存在 404 | 否 |
| FP-API-028 | API | api-contract | `PUT /admin/pages/{id}` 缺少必填 | 否 |
| FP-API-029 | API | api-contract | `PUT /admin/pages/{id}` 未登录 110101 | 否 |
| FP-API-030 | API | api-contract | `PUT /admin/pages/{id}` 角色不足 200301 | 否 |
| FP-API-031 | API | api-contract | `PUT /admin/pages/{id}` 重复提交/幂等 | 否 |
| FP-API-032 | API | api-contract | `DELETE /admin/pages/{id}` 草稿删除成功 | 否 |
| FP-API-033 | API | api-contract | `DELETE /admin/pages/{id}` 已发布不可删 300201 | 否 |
| FP-API-034 | API | api-contract | `DELETE /admin/pages/{id}` 不存在 404 | 否 |
| FP-API-035 | API | api-contract | `DELETE /admin/pages/{id}` 未登录 110101 | 否 |
| FP-API-036 | API | api-contract | `DELETE /admin/pages/{id}` 角色不足 200301 | 否 |
| FP-API-037 | API | api-contract | `DELETE /admin/pages/{id}` 重复删除/幂等 | 否 |
| FP-API-038 | API | api-contract | `POST /admin/pages/{id}/draft` 保存成功并升版本 | 否 |
| FP-API-039 | API | api-contract | `POST /admin/pages/{id}/draft` 缺少 DSL | 否 |
| FP-API-040 | API | api-contract | `POST /admin/pages/{id}/draft` DSL JSON 非法 | 否 |
| FP-API-041 | API | api-contract | `POST /admin/pages/{id}/draft` 页面不存在 404 | 否 |
| FP-API-042 | API | api-contract | `POST /admin/pages/{id}/draft` 未登录 110101 | 否 |
| FP-API-043 | API | api-contract | `POST /admin/pages/{id}/draft` 角色不足 200301 | 否 |
| FP-API-044 | API | api-contract | `POST /admin/pages/{id}/draft` 版本冲突 409 | 否 |
| FP-API-045 | API | api-contract | `POST /admin/pages/{id}/draft` 重复提交/幂等 | 否 |
| FP-API-046 | API | api-contract | `POST /admin/pages/{id}/publish` 发布成功 | 否 |
| FP-API-047 | API | api-contract | `POST /admin/pages/{id}/publish` 页面不存在 404 | 否 |
| FP-API-048 | API | api-contract | `POST /admin/pages/{id}/publish` 未登录 110101 | 否 |
| FP-API-049 | API | api-contract | `POST /admin/pages/{id}/publish` 角色不足 200301 | 否 |
| FP-API-050 | API | api-contract | `POST /admin/pages/{id}/publish` 重复发布/幂等 | 否 |
| FP-API-051 | API | api-contract | `POST /admin/pages/{id}/unpublish` 下架成功 | 否 |
| FP-API-052 | API | api-contract | `POST /admin/pages/{id}/unpublish` 非已发布状态 422 | 否 |
| FP-API-053 | API | api-contract | `POST /admin/pages/{id}/unpublish` 不存在 404 | 否 |
| FP-API-054 | API | api-contract | `POST /admin/pages/{id}/unpublish` 未登录 110101 | 否 |
| FP-API-055 | API | api-contract | `POST /admin/pages/{id}/unpublish` 角色不足 200301 | 否 |
| FP-API-056 | API | api-contract | `POST /admin/pages/{id}/unpublish` 重复下架/幂等 | 否 |
| FP-API-057 | API | api-contract | `GET /admin/pages/{id}/versions` 成功 | 否 |
| FP-API-058 | API | api-contract | `GET /admin/pages/{id}/versions` 空版本列表 | 否 |
| FP-API-059 | API | api-contract | `GET /admin/pages/{id}/versions` 页面不存在 404 | 否 |
| FP-API-060 | API | api-contract | `GET /admin/pages/{id}/versions` 未登录 110101 | 否 |
| FP-API-061 | API | api-contract | `POST .../versions/{version}/rollback` 回滚成功并生成新版本 | 否 |
| FP-API-062 | API | api-contract | `POST .../rollback` 页面不存在 404 | 否 |
| FP-API-063 | API | api-contract | `POST .../rollback` 版本不存在 404 | 否 |
| FP-API-064 | API | api-contract | `POST .../rollback` 未登录 110101 | 否 |
| FP-API-065 | API | api-contract | `POST .../rollback` 角色不足 200301 | 否 |
| FP-API-066 | API | api-contract | `POST .../rollback` 重复回滚/幂等 | 否 |
| FP-API-067 | API | api-contract | `GET /admin/page-templates` 成功 | 否 |
| FP-API-068 | API | api-contract | `GET /admin/page-templates` 空列表 | 否 |
| FP-API-069 | API | api-contract | `GET /admin/page-templates` 未登录 110101 | 否 |
| FP-API-070 | API | api-contract | `GET /mp/pages/{path}` 成功返回已发布 DSL | 否 |
| FP-API-071 | API | api-contract | `GET /mp/pages/{path}` 路径不存在 404 | 否 |
| FP-API-072 | API | api-contract | `GET /mp/pages/{path}` 仅有草稿未发布时不返回发布 DSL | 否 |
| FP-API-073 | API | api-contract | `GET /mp/pages/{path}` 公开访问无需登录 | 否 |
| FP-API-074 | API | api-contract | 账号已禁用 110103 访问页面接口 | 否 |
| FP-API-075 | API | api-contract | 限流 100201 | 否 |
| FP-API-076 | API | api-contract | 越权访问他人租户/他人页面数据（若多租户） | 否 |
| FP-API-077 | API | api-contract | 写接口 ID 以字符串传输避免精度丢失 | 否 |
| FP-API-078 | API | api-contract | 服务端 500 时页面接口统一错误结构 | 否 |

### B. UI · 装修器壳层（page-dsl-schema §2/§3/§7/§11 + 后台交互）

| FP 编号 | 模块 | 来源契约 | 描述 | 排除 |
| --- | --- | --- | --- | --- |
| FP-UI-001 | UI | page-dsl-schema | 页面列表首次进入渲染 | 否 |
| FP-UI-002 | UI | page-dsl-schema | 页面列表空数据态 | 否 |
| FP-UI-003 | UI | page-dsl-schema | 页面列表加载态 | 否 |
| FP-UI-004 | UI | page-dsl-schema | 页面列表请求失败态 | 否 |
| FP-UI-005 | UI | page-dsl-schema | 页面列表无权限态 | 否 |
| FP-UI-006 | UI | page-dsl-schema | 列表关键词输入 | 否 |
| FP-UI-007 | UI | page-dsl-schema | 列表类型下拉 | 否 |
| FP-UI-008 | UI | page-dsl-schema | 列表状态下拉 | 否 |
| FP-UI-009 | UI | page-dsl-schema | 列表分页 | 否 |
| FP-UI-010 | UI | page-dsl-schema | 列表每页条数 | 否 |
| FP-UI-011 | UI | page-dsl-schema | 「新建页面」按钮 | 否 |
| FP-UI-012 | UI | page-dsl-schema | 新建：页面名称（必填，最长 128） | 否 |
| FP-UI-013 | UI | page-dsl-schema | 新建：名称为空校验 | 否 |
| FP-UI-014 | UI | page-dsl-schema | 新建：名称达上限 | 否 |
| FP-UI-015 | UI | page-dsl-schema | 新建：页面类型 home/topic/custom | 否 |
| FP-UI-016 | UI | page-dsl-schema | 新建：访问路径 | 否 |
| FP-UI-017 | UI | page-dsl-schema | 新建：路径自动生成 | 否 |
| FP-UI-018 | UI | page-dsl-schema | 新建：分享标题 | 否 |
| FP-UI-019 | UI | page-dsl-schema | 新建：分享封面 share_image | 否 |
| FP-UI-020 | UI | page-dsl-schema | 新建：创建并进入装修器（携带 id） | 否 |
| FP-UI-021 | UI | page-dsl-schema | 新建：取消 | 否 |
| FP-UI-022 | UI | page-dsl-schema | 列表进入装修器（路由参数 id） | 否 |
| FP-UI-023 | UI | page-dsl-schema | 列表发布 | 否 |
| FP-UI-024 | UI | page-dsl-schema | 列表下架 | 否 |
| FP-UI-025 | UI | page-dsl-schema | 列表删除及确认 | 否 |
| FP-UI-026 | UI | page-dsl-schema | 装修器首次进入渲染 | 否 |
| FP-UI-027 | UI | page-dsl-schema | 装修器加载态 | 否 |
| FP-UI-028 | UI | page-dsl-schema | 装修器请求失败态 | 否 |
| FP-UI-029 | UI | page-dsl-schema | 装修器无权限态 | 否 |
| FP-UI-030 | UI | page-dsl-schema | 空白画布空数据态 | 否 |
| FP-UI-031 | UI | page-dsl-schema | 未登录访问装修器 | 否 |
| FP-UI-032 | UI | page-dsl-schema | 返回列表 | 否 |
| FP-UI-033 | UI | page-dsl-schema | 未保存离开确认 | 否 |
| FP-UI-034 | UI | page-dsl-schema | 撤销 | 否 |
| FP-UI-035 | UI | page-dsl-schema | 重做 | 否 |
| FP-UI-036 | UI | page-dsl-schema | 撤销在空历史时禁用 | 否 |
| FP-UI-037 | UI | page-dsl-schema | 保存草稿 | 否 |
| FP-UI-038 | UI | page-dsl-schema | 自动保存草稿（每次保存升版本，§11.1） | 否 |
| FP-UI-039 | UI | page-dsl-schema | 保存失败提示 | 否 |
| FP-UI-040 | UI | page-dsl-schema | 保存冲突提示与处理 | 否 |
| FP-UI-041 | UI | page-dsl-schema | 预览按钮 | 否 |
| FP-UI-042 | UI | page-dsl-schema | 发布页面 | 否 |
| FP-UI-043 | UI | page-dsl-schema | 发布将草稿标为已发布并更新 current_version（§11.2） | 否 |
| FP-UI-044 | UI | page-dsl-schema | 历史版本入口 | 否 |
| FP-UI-045 | UI | page-dsl-schema | 查看 DSL | 否 |
| FP-UI-046 | UI | page-dsl-schema | 复制 DSL | 否 |
| FP-UI-047 | UI | page-dsl-schema | 导入 DSL | 否 |
| FP-UI-048 | UI | page-dsl-schema | 导入缺少 schema_version/page/components | 否 |
| FP-UI-049 | UI | page-dsl-schema | 收起/展开组件面板 | 否 |
| FP-UI-050 | UI | page-dsl-schema | 收起/展开属性面板 | 否 |
| FP-UI-051 | UI | page-dsl-schema | 页面属性：name | 否 |
| FP-UI-052 | UI | page-dsl-schema | 页面属性：background_color | 否 |
| FP-UI-053 | UI | page-dsl-schema | 页面属性：share_title | 否 |
| FP-UI-054 | UI | page-dsl-schema | 页面属性：share_image | 否 |
| FP-UI-055 | UI | page-dsl-schema | 全局：pull_refresh | 否 |
| FP-UI-056 | UI | page-dsl-schema | 全局：reach_bottom_load | 否 |
| FP-UI-057 | UI | page-dsl-schema | 组件库搜索 | 否 |
| FP-UI-058 | UI | page-dsl-schema | 点击添加组件 | 否 |
| FP-UI-059 | UI | page-dsl-schema | 拖入添加组件 | 否 |
| FP-UI-060 | UI | page-dsl-schema | 结构树选中 | 否 |
| FP-UI-061 | UI | page-dsl-schema | 结构树删除（含确认） | 否 |
| FP-UI-062 | UI | page-dsl-schema | 画布选中 | 否 |
| FP-UI-063 | UI | page-dsl-schema | 画布删除 | 否 |
| FP-UI-064 | UI | page-dsl-schema | 画布复制 | 否 |
| FP-UI-065 | UI | page-dsl-schema | 画布上移 | 否 |
| FP-UI-066 | UI | page-dsl-schema | 画布下移 | 否 |
| FP-UI-067 | UI | page-dsl-schema | 画布拖拽排序（components 顺序即渲染顺序） | 否 |
| FP-UI-068 | UI | page-dsl-schema | 画布缩放 | 否 |
| FP-UI-069 | UI | page-dsl-schema | 样式 margin_top | 否 |
| FP-UI-070 | UI | page-dsl-schema | 样式 margin_bottom | 否 |
| FP-UI-071 | UI | page-dsl-schema | 样式 margin_left | 否 |
| FP-UI-072 | UI | page-dsl-schema | 样式 margin_right | 否 |
| FP-UI-073 | UI | page-dsl-schema | 样式 padding_top | 否 |
| FP-UI-074 | UI | page-dsl-schema | 样式 padding_bottom | 否 |
| FP-UI-075 | UI | page-dsl-schema | 样式 padding_left | 否 |
| FP-UI-076 | UI | page-dsl-schema | 样式 padding_right | 否 |
| FP-UI-077 | UI | page-dsl-schema | 样式 background_color | 否 |
| FP-UI-078 | UI | page-dsl-schema | 样式 border_radius | 否 |
| FP-UI-079 | UI | page-dsl-schema | 样式 visible=false 不渲染 | 否 |
| FP-UI-080 | UI | page-dsl-schema | 预览真实数据模式 | 否 |
| FP-UI-081 | UI | page-dsl-schema | 预览演示数据模式 | 否 |
| FP-UI-082 | UI | page-dsl-schema | 预览 Tab 切换 | 否 |
| FP-UI-083 | UI | page-dsl-schema | 发布前检查 | 否 |
| FP-UI-084 | UI | page-dsl-schema | 空组件列表不允许发布空页 | 否 |
| FP-UI-085 | UI | page-dsl-schema | 发布成功展示 path | 否 |
| FP-UI-086 | UI | page-dsl-schema | 版本对比 | 否 |
| FP-UI-087 | UI | page-dsl-schema | 版本回滚（§11.3 恢复为草稿并生成新版本号） | 否 |
| FP-UI-088 | UI | page-dsl-schema | 模板列表进入并用模板创建 | 否 |
| FP-UI-089 | UI | page-dsl-schema | schema_version 为 1.0 | 否 |
| FP-UI-090 | UI | page-dsl-schema | 组件 id 页内唯一 | 否 |

### C. UI · 契约组件（page-dsl-schema §4/§5/§6/§10）

每个组件：首次渲染、空态；有数据源的另加加载态、失败态；再加可交互项。

| FP 编号 | 模块 | 来源契约 | 描述 | 排除 |
| --- | --- | --- | --- | --- |
| FP-UI-091 | UI | page-dsl-schema | banner 首次渲染 | 否 |
| FP-UI-092 | UI | page-dsl-schema | banner items 为空 | 否 |
| FP-UI-093 | UI | page-dsl-schema | banner 图片加载失败占位（§10.6） | 否 |
| FP-UI-094 | UI | page-dsl-schema | banner 缺 items（必填） | 否 |
| FP-UI-095 | UI | page-dsl-schema | banner autoplay 开关 | 否 |
| FP-UI-096 | UI | page-dsl-schema | banner interval | 否 |
| FP-UI-097 | UI | page-dsl-schema | banner 指示点开关 | 否 |
| FP-UI-098 | UI | page-dsl-schema | banner 点击单项跳转 | 否 |
| FP-UI-099 | UI | page-dsl-schema | nav 首次渲染 | 否 |
| FP-UI-100 | UI | page-dsl-schema | nav items 为空 | 否 |
| FP-UI-101 | UI | page-dsl-schema | nav 缺 items | 否 |
| FP-UI-102 | UI | page-dsl-schema | nav 行列数 | 否 |
| FP-UI-103 | UI | page-dsl-schema | nav 点击项跳转 | 否 |
| FP-UI-104 | UI | page-dsl-schema | product_list 首次渲染 | 否 |
| FP-UI-105 | UI | page-dsl-schema | product_list 空数据 | 否 |
| FP-UI-106 | UI | page-dsl-schema | product_list 加载态 | 否 |
| FP-UI-107 | UI | page-dsl-schema | product_list 请求失败兜底（§10.7） | 否 |
| FP-UI-108 | UI | page-dsl-schema | product_list 布局 grid/list/waterfall | 否 |
| FP-UI-109 | UI | page-dsl-schema | product_list 点击商品跳转 | 否 |
| FP-UI-110 | UI | page-dsl-schema | product_list 绑定 data_source.type=product | 否 |
| FP-UI-111 | UI | page-dsl-schema | article_list 首次渲染 | 否 |
| FP-UI-112 | UI | page-dsl-schema | article_list 空数据 | 否 |
| FP-UI-113 | UI | page-dsl-schema | article_list 加载态 | 否 |
| FP-UI-114 | UI | page-dsl-schema | article_list 请求失败兜底 | 否 |
| FP-UI-115 | UI | page-dsl-schema | article_list 布局 card/list/compact | 否 |
| FP-UI-116 | UI | page-dsl-schema | article_list 点击文章跳转 | 否 |
| FP-UI-117 | UI | page-dsl-schema | article_list 绑定 data_source.type=content | 否 |
| FP-UI-118 | UI | page-dsl-schema | activity_entry 首次渲染 | 否 |
| FP-UI-119 | UI | page-dsl-schema | activity_entry 空数据 | 否 |
| FP-UI-120 | UI | page-dsl-schema | activity_entry 加载态 | 否 |
| FP-UI-121 | UI | page-dsl-schema | activity_entry 请求失败兜底 | 否 |
| FP-UI-122 | UI | page-dsl-schema | activity_entry 倒计时展示开关 | 否 |
| FP-UI-123 | UI | page-dsl-schema | activity_entry 名额展示开关 | 否 |
| FP-UI-124 | UI | page-dsl-schema | activity_entry 点击进入活动 | 否 |
| FP-UI-125 | UI | page-dsl-schema | activity_entry 绑定 data_source.type=activity | 否 |
| FP-UI-126 | UI | page-dsl-schema | member_card 首次渲染 | 否 |
| FP-UI-127 | UI | page-dsl-schema | member_card 空/未登录会员信息 | 否 |
| FP-UI-128 | UI | page-dsl-schema | coupon 首次渲染 | 否 |
| FP-UI-129 | UI | page-dsl-schema | coupon 空数据 | 否 |
| FP-UI-130 | UI | page-dsl-schema | coupon 加载态 | 否 |
| FP-UI-131 | UI | page-dsl-schema | coupon 请求失败兜底 | 否 |
| FP-UI-132 | UI | page-dsl-schema | coupon 领取按钮 | 否 |
| FP-UI-133 | UI | page-dsl-schema | coupon 绑定 data_source.type=coupon | 否 |
| FP-UI-134 | UI | page-dsl-schema | video 首次渲染 | 否 |
| FP-UI-135 | UI | page-dsl-schema | video 无 src 空态 | 否 |
| FP-UI-136 | UI | page-dsl-schema | video 播放 | 否 |
| FP-UI-137 | UI | page-dsl-schema | video 封面 | 否 |
| FP-UI-138 | UI | page-dsl-schema | countdown 首次渲染 | 否 |
| FP-UI-139 | UI | page-dsl-schema | countdown 缺 target_time | 否 |
| FP-UI-140 | UI | page-dsl-schema | countdown 到达目标时间显示 ended_text | 否 |
| FP-UI-141 | UI | page-dsl-schema | countdown 格式 d/dh/dhm/dhms | 否 |
| FP-UI-142 | UI | page-dsl-schema | float_button 首次渲染 | 否 |
| FP-UI-143 | UI | page-dsl-schema | float_button 缺 icon_url | 否 |
| FP-UI-144 | UI | page-dsl-schema | float_button 点击跳转 | 否 |
| FP-UI-145 | UI | page-dsl-schema | float_button 四角位置 | 否 |
| FP-UI-146 | UI | page-dsl-schema | rich_text 首次渲染 | 否 |
| FP-UI-147 | UI | page-dsl-schema | rich_text 空 content | 否 |
| FP-UI-148 | UI | page-dsl-schema | divider 首次渲染 | 否 |
| FP-UI-149 | UI | page-dsl-schema | spacer 首次渲染 | 否 |
| FP-UI-150 | UI | page-dsl-schema | 数据源 type 必填 | 否 |
| FP-UI-151 | UI | page-dsl-schema | 数据源 query 必填 | 否 |
| FP-UI-152 | UI | page-dsl-schema | product query：category_id | 否 |
| FP-UI-153 | UI | page-dsl-schema | product query：product_type | 否 |
| FP-UI-154 | UI | page-dsl-schema | product query：status=on_sale | 否 |
| FP-UI-155 | UI | page-dsl-schema | product query：sort_by | 否 |
| FP-UI-156 | UI | page-dsl-schema | product query：sort_order | 否 |
| FP-UI-157 | UI | page-dsl-schema | product query：limit | 否 |
| FP-UI-158 | UI | page-dsl-schema | content query：category_id | 否 |
| FP-UI-159 | UI | page-dsl-schema | content query：type | 否 |
| FP-UI-160 | UI | page-dsl-schema | content query：is_recommended | 否 |
| FP-UI-161 | UI | page-dsl-schema | content query：sort_by | 否 |
| FP-UI-162 | UI | page-dsl-schema | content query：limit | 否 |
| FP-UI-163 | UI | page-dsl-schema | activity query：type | 否 |
| FP-UI-164 | UI | page-dsl-schema | activity query：status=registering | 否 |
| FP-UI-165 | UI | page-dsl-schema | activity query：is_recommended | 否 |
| FP-UI-166 | UI | page-dsl-schema | activity query：limit | 否 |
| FP-UI-167 | UI | page-dsl-schema | coupon query：type | 否 |
| FP-UI-168 | UI | page-dsl-schema | coupon query：status=active | 否 |
| FP-UI-169 | UI | page-dsl-schema | coupon query：limit | 否 |
| FP-UI-170 | UI | page-dsl-schema | 跳转 type=page → wx.navigateTo | 否 |
| FP-UI-171 | UI | page-dsl-schema | 跳转 type=webview | 否 |
| FP-UI-172 | UI | page-dsl-schema | 跳转 type=miniapp | 否 |
| FP-UI-173 | UI | page-dsl-schema | 跳转 type=phone → 拨号 | 否 |
| FP-UI-174 | UI | page-dsl-schema | 跳转 type=none | 否 |
| FP-UI-175 | UI | page-dsl-schema | 跳转缺 type | 否 |
| FP-UI-176 | UI | page-dsl-schema | 跳转缺 target | 否 |
| FP-UI-177 | UI | page-dsl-schema | 跳转附带 params | 否 |
| FP-UI-178 | UI | page-dsl-schema | 未知组件 type 跳过并记日志（§10.5） | 否 |
| FP-UI-179 | UI | page-dsl-schema | data_source 为空时用 props 静态数据（§10.3） | 否 |
| FP-UI-180 | UI | page-dsl-schema | data_source 非空时先请求再渲染（§10.2） | 否 |
| FP-UI-181 | UI | page-dsl-schema | 小程序只拉已发布版本 DSL（§11.4） | 否 |
| FP-UI-182 | UI | page-dsl-schema | 装修器未登录不可用 | 否 |
| FP-UI-183 | UI | page-dsl-schema | 列表→装修器 id 参数传递 | 否 |
| FP-UI-184 | UI | page-dsl-schema | 装修器→版本页 id 参数传递 | 否 |
| FP-UI-185 | UI | page-dsl-schema | 发布结果路径与小程序打开路径一致 | 否 |

### D. DB（database-model §5）

| FP 编号 | 模块 | 来源契约 | 描述 | 排除 |
| --- | --- | --- | --- | --- |
| FP-DB-001 | DB | database-model | `uk_page_version(page_id, version)` 冲突写入被拒绝 | 否 |
| FP-DB-002 | DB | database-model | 删除页面对版本记录的外键/级联 | 否 |
| FP-DB-003 | DB | database-model | `mp_page.path` 索引查询 | 否 |
| FP-DB-004 | DB | database-model | `dsl_content` 必须为合法 JSON | 否 |
| FP-DB-005 | DB | database-model | `current_version` 与已发布版本一致 | 否 |

---

## 实现多出、暂不编号（待契约变更）

搜索、图片、分类导航、限时秒杀、公告栏、活动列表、预约服务、图文组合、品牌介绍、资质证书、联系方式、表单入口、AI 入口、标题栏。

按 page-dsl-schema §1.5：新增组件类型必须先走契约变更，故上列 **不计入 268**。

---

## 全系统扩展指引（B 轨）

完整扩展清单见 [`feature-inventory-system-extension.md`](feature-inventory-system-extension.md)。

- 扩展点数：314（API 171 / UI 38 / ORDER 40 / DB 22 / AI 20 / PAY 23）
- 状态：**总控已确认（2026-08-15）**；可进入用例设计与分批执行。
- 装修器范围 A 分母仍为 **268**；范围 B 扩展分母 **314**；合计 **582**。
- 同步批准：允许创建低于 content_ops 的测试账号及可禁用账号（见 `agent-team/testing/credentials-qa-accounts.md`）。
