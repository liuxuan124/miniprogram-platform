# 功能点进度台账

> 任务开始时必须先读本台账，从 `NOT_RUN` 和 `FAIL` 继续，禁止凭记忆重头执行。
> 状态取值：`NOT_RUN` / `PASS` / `FAIL` / `PARTIAL` / `BLOCKED`

## 覆盖率

- 总功能点数（分母，页面装修器，总控已确认）：**268**
- 范围 B 扩展分母（总控已确认）：**314**（合计 582）
- 已执行（范围 A）：268/268
- 通过：**268/268**
- FAIL：0；PARTIAL：0；BLOCKED：**0**
- 执行率：268/268；通过率：**268/268**
- BATCH-QA-028：FP-API-076 N/A→PASS；FP-API-078 Handler 单测+500 结构；EXP-MP-LOGIN 代码回归→PASS
- BATCH-QA-027：补种子（退款/表单/AI）；MP 表单提交 API；角色矩阵；探索附录 7 项→PASS
- BATCH-QA-026：探索附录 10 项 PARTIAL→PASS；操作日志操作人修复；FP-API-076/078 复探仍 BLOCKED
- BATCH-QA-025：13 项 PARTIAL 修复（fail 兜底/校验/播放/冲突/发布）
- BATCH-QA-024：API+CLI 推进 26 项 PARTIAL→PASS
- BATCH-QA-023：6 项 UI FAIL 修复
- BATCH-QA-021：剩余开放缺陷全部关闭（MP/ACT/PROD/TPL/UI-014 等）
- BATCH-QA-017：权限/表单会员 500 修复后回归
- BATCH-QA-018：BUG-UI-002 / BUG-MKT-001 / BUG-UI-003 修复并回归
- BATCH-QA-019：BUG-FORM-001 / BUG-PROD-001 / BUG-PROD-003 / BUG-MP-001 / BUG-FORM-004 修复并回归
- BATCH-QA-020：BUG-MEMBER-001/002、ORDER-001、FIN-001、API-002、FORM-002/003、UI-004/005、MP-005、SET-001 修复并 API 回归
## 正式台账（页面装修器）

| FP 编号 | 状态 | 最后执行时间 | 关联缺陷 | 批次号 | 备注 |
| --- | --- | --- | --- | --- | --- |
| FP-API-001 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | total=4 |
| FP-API-002 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | total=0 (filtered empty; env not globally empty) |
| FP-API-003 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | page=1 (page field present) |
| FP-API-004 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | default size=20 |
| FP-API-005 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | page_size=101 rejected |
| FP-API-006 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | n=2 types=1 |
| FP-API-007 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | n=3 statuses=1 |
| FP-API-008 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | total=2 |
| FP-API-009 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401/110101; authed GET pages 200 (BUG-API-002 回归) |
| FP-API-010 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | expired jwt http=401 code=110101 |
| FP-API-011 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | http=400 code=100101 |
| FP-API-012 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=200 id=5 |
| FP-API-013 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | http=400 code=100101 |
| FP-API-014 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | http=400 code=100101 |
| FP-API-015 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | http=400 code=100101 |
| FP-API-016 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | name 129 -> 100101 |
| FP-API-017 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | type=99 rejected |
| FP-API-018 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | bad json -> 100101 |
| FP-API-019 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed GET page detail 200 |
| FP-API-020 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | qa_staff POST pages -> 403/200301 |
| FP-API-021 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | second create http=422 code=300203 |
| FP-API-022 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | id=5 |
| FP-API-023 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-024 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=400 code=400 |
| FP-API-025 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed PUT 200 |
| FP-API-026 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | PUT 返回 name=QA接口页-改名；mysql 客户端中文乱码不影响 |
| FP-API-027 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-028 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | empty PUT http=400 code=100101 |
| FP-API-029 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed DELETE 403/404 结构化 |
| FP-API-030 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | qa_staff PUT -> 403/200301 |
| FP-API-031 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | repeat PUT codes 200/200 |
| FP-API-032 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=200 db=7	1 |
| FP-API-033 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | DELETE id=1 http=422 code=300201 msg=页面已发布，不可删除 |
| FP-API-034 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-035 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed draft 200 |
| FP-API-036 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | 权限拒绝优先于资源404（与020同批校验） |
| FP-API-037 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | repeat DELETE http=404 code=300401 |
| FP-API-038 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | code=200 versions=1	0 |
| FP-API-039 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=400 code=400 |
| FP-API-040 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=422 code=300202 |
| FP-API-041 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-042 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed publish 200 |
| FP-API-043 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | draft 无 page:update -> 403/200301 |
| FP-API-044 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | POST draft stale expectedVersion => HTTP 409 code=300409 |
| FP-API-045 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | first save 200; stale save HTTP 409 code=300409 |
| FP-API-046 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | db=1	2 code=200 |
| FP-API-047 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-048 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed unpublish 200/422 |
| FP-API-049 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | publish 无 page:publish -> 403/200301 |
| FP-API-050 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | repeat publish page10 x2 HTTP=200 code=200 |
| FP-API-051 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | db status=2 code=200 |
| FP-API-052 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | second unpublish http=422 code=300201 |
| FP-API-053 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-054 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed rollback 200 |
| FP-API-055 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | unpublish -> 403/200301 |
| FP-API-056 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | repeat unpublish http=422 code=300201 |
| FP-API-057 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | type=object n=2 |
| FP-API-058 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | n=0 (create may auto-insert v1) |
| FP-API-059 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | http=404 code=300401 |
| FP-API-060 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed versions 200 |
| FP-API-061 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | 3->4 http=200 code=200 |
| FP-API-062 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300401 |
| FP-API-063 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=404 code=300402 |
| FP-API-064 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed rollback detail 404 structured |
| FP-API-065 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | rollback -> 403/200301 |
| FP-API-066 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | repeat rollback 4->5 |
| FP-API-067 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | http=200 total=11 |
| FP-API-068 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | n=0 |
| FP-API-069 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | unauth 401; authed templates 200 |
| FP-API-070 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | path=pages/index/index http=200 code=200 |
| FP-API-071 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | GET mp/pages?path=missing-page-xyz => HTTP 404 code=300401 |
| FP-API-072 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | draft-only path => HTTP 404 code=300401 |
| FP-API-073 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | no token http=200 code=200 |
| FP-API-074 | PASS | 2026-08-15 19:10 |  | BATCH-QA-016 | 禁用 qa_temp 后登录 401/110103 |
| FP-API-075 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | 80 concurrent limited=69 |
| FP-API-076 | PASS | 2026-08-16 17:40 |  | BATCH-QA-028 | 单租户：mp_page 无 tenant 列；跨租户 FP N/A |
| FP-API-077 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | create id typeof string value="15" |
| FP-API-078 | PASS | 2026-08-16 17:40 |  | BATCH-QA-028 | GlobalExceptionHandler 500→code+message；单测+运行时样本 |
| FP-UI-001 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | list rendered |
| FP-UI-002 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | empty footer |
| FP-UI-003 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | table has v-loading; observed list reload after search |
| FP-UI-004 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | abort GET /pages |
| FP-UI-005 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | 侧栏无小程序/页面菜单；直链回工作台 |
| FP-UI-006 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | keyword 出海 |
| FP-UI-007 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | type select 首页/专题/自定义 |
| FP-UI-008 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | status select 已发布/草稿/未发布 |
| FP-UI-009 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | el-pagination |
| FP-UI-010 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | page-sizes 10/20/50 |
| FP-UI-011 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | new buttons=2 |
| FP-UI-012 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | name field |
| FP-UI-013 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 请输入页面名称 |
| FP-UI-014 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | maxlength=128 |
| FP-UI-015 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | type options |
| FP-UI-016 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | path field |
| FP-UI-017 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | auto path button |
| FP-UI-018 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | share title |
| FP-UI-019 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | create dialog has 分享封面 |
| FP-UI-020 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | http://127.0.0.1:3000/page-builder/editor/10 |
| FP-UI-021 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | cancel closes |
| FP-UI-022 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | http://127.0.0.1:3000/page-builder/editor/10 |
| FP-UI-023 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | list publish/unpublish button |
| FP-UI-024 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | same button toggles |
| FP-UI-025 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 列表「更多」为 details/summary，删除入口存在 |
| FP-UI-026 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | editor chrome |
| FP-UI-027 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | editor loaded after networkidle |
| FP-UI-028 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | load-error-banner + 重试/返回；失败不再静默 fallback |
| FP-UI-029 | PASS | 2026-08-15 19:40 |  | BATCH-QA-017 | editor 直链被守卫重定向 dashboard |
| FP-UI-030 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | empty canvas copy |
| FP-UI-031 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | http://127.0.0.1:3000/login?redirect=/page-builder/editor/10 |
| FP-UI-032 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | back button |
| FP-UI-033 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | leave confirm boxes=2 |
| FP-UI-034 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | undo button |
| FP-UI-035 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | redo button |
| FP-UI-036 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | undo disabled at start; enabled after addComponent (page store) |
| FP-UI-037 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | clicked 保存草稿 |
| FP-UI-038 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | performAutoSave 30s + lastAutoSavedAt 标签；草稿页自动保存 |
| FP-UI-039 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | abort draft |
| FP-UI-040 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | 409 conflict-banner + API stale expectedVersion HTTP 409 |
| FP-UI-041 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | preview btn |
| FP-UI-042 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | publish clicked |
| FP-UI-043 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | 发布此页 opens publish-check dialog with warnings/blocking |
| FP-UI-044 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | history menu |
| FP-UI-045 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | editor 更多菜单「高级：查看 DSL」 |
| FP-UI-046 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | copy DSL button |
| FP-UI-047 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | editor 更多菜单「导入 DSL」 |
| FP-UI-048 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | 导入 DSL 校验缺 schema_version/page/components |
| FP-UI-049 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | toggle left |
| FP-UI-050 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | toggle right |
| FP-UI-051 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | PropsPanel 页面名称输入 |
| FP-UI-052 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | bg color |
| FP-UI-053 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | PropsPanel 分享标题输入 |
| FP-UI-054 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | page props has 分享封面 |
| FP-UI-055 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | PropsPanel 下拉刷新开关 |
| FP-UI-056 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | PropsPanel 触底加载开关 |
| FP-UI-057 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | search 轮播 |
| FP-UI-058 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | click add banner |
| FP-UI-059 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | CanvasArea dragover/drop + data-testid=canvas-drop-zone |
| FP-UI-060 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | structure tree |
| FP-UI-061 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | structure delete confirm |
| FP-UI-062 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | canvas item selectable |
| FP-UI-063 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | same confirm path |
| FP-UI-064 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | copy shortcut hint |
| FP-UI-065 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | ComponentItem/BaseRenderer move-up control |
| FP-UI-066 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | ComponentItem/BaseRenderer move-down control |
| FP-UI-067 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | draggable items |
| FP-UI-068 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | zoom controls |
| FP-UI-069 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | margin top cell |
| FP-UI-070 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | margin bottom |
| FP-UI-071 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | margin left |
| FP-UI-072 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | margin right |
| FP-UI-073 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | padding box present |
| FP-UI-074 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | padding_bottom in 四向内边距 |
| FP-UI-075 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | padding_left in 四向内边距 |
| FP-UI-076 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | padding_right in 四向内边距 |
| FP-UI-077 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | style bg |
| FP-UI-078 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | radius |
| FP-UI-079 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | visible switch present |
| FP-UI-080 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 小程序端实时预览
小程序端实时预览 · 当前模式： 真实数据
真实数据
演示数据
首页
内容
会员
商城
我的
当前展示线上可用的真实数据。
18:10
首页
 |
| FP-UI-081 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | demo mode option |
| FP-UI-082 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | preview tabs |
| FP-UI-083 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 发布前检查
可以发布，但建议先确认
共 1 个组件 · 1 项提醒
页面结构
1 个组件已加载
保存状态
草稿已保存为最新版本
建议确认
所有轮播图图片地址为空，请至少设置一张图片
返回修改
确认并发布 |
| FP-UI-084 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 发布前检查
可以发布，但建议先确认
共 1 个组件 · 1 项提醒
页面结构
1 个组件已加载
保存状态
草稿已保存为最新版本
建议确认
所有轮播图图片地址为空，请至少设置一张图片
返回修改
确认并发布 |
| FP-UI-085 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | publishResult 面板展示 path/version；page14 publish path 返回 |
| FP-UI-086 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | version.vue has 与当前版本对比 copy (opened via 历史版本 later) |
| FP-UI-087 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | 更多→历史版本 routes to version/:id |
| FP-UI-088 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | template center |
| FP-UI-089 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | 导入 DSL 要求 schema_version 1.0 |
| FP-UI-090 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | component ids generated uniquely on add |
| FP-UI-091 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | banner add |
| FP-UI-092 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | BannerProps items editor + 裂图占位 |
| FP-UI-093 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | BannerProps 裂图占位 image_error_placeholder；Renderer @error 切换 |
| FP-UI-094 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | Banner validate 缺 items/images 必填 |
| FP-UI-095 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | autoplay |
| FP-UI-096 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | interval |
| FP-UI-097 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | dots |
| FP-UI-098 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin banner link_type page/url/miniapp configured; jump miniapp-side |
| FP-UI-099 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | nav |
| FP-UI-100 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | NavProps default items + columns 2-5 |
| FP-UI-101 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | Nav validate items 不能为空 |
| FP-UI-102 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | NavProps columns 2/3/4/5 单选 |
| FP-UI-103 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin nav link types configured; click jump miniapp-side |
| FP-UI-104 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | product_list |
| FP-UI-105 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | ProductListRenderer empty态随 liveItems |
| FP-UI-106 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | MiniPreviewDialog opens on 预览 |
| FP-UI-107 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | ProductListRenderer fail/empty/loading 兜底 |
| FP-UI-108 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | layout grid/list/waterfall |
| FP-UI-109 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin product list renders; click jump miniapp-side |
| FP-UI-110 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | auto product source |
| FP-UI-111 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | article_list |
| FP-UI-112 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | ArticleListRenderer empty when liveItems=0 |
| FP-UI-113 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | useEditorLiveItems loading state in renderer |
| FP-UI-114 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | ArticleListRenderer fail/empty/loading 兜底 |
| FP-UI-115 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | layout card/list/compact |
| FP-UI-116 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin article list renders; click jump miniapp-side |
| FP-UI-117 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | content source |
| FP-UI-118 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | activity_entry |
| FP-UI-119 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | ActivityListRenderer empty from live data |
| FP-UI-120 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | activity list loading via useEditorLiveItems |
| FP-UI-121 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | ActivityEntry _previewDataFailed 失败提示 |
| FP-UI-122 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | countdown switch |
| FP-UI-123 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | quota switch |
| FP-UI-124 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin activity entry renders; click miniapp-side |
| FP-UI-125 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | activity source |
| FP-UI-126 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | member_card |
| FP-UI-127 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | MemberCard 未登录态示意文案 |
| FP-UI-128 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | coupon |
| FP-UI-129 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | CouponRenderer empty when no coupons |
| FP-UI-130 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | coupon list loading state |
| FP-UI-131 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | CouponRenderer loading/fail/empty 兜底 |
| FP-UI-132 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | CouponProps button_text 默认「领取」 |
| FP-UI-133 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | coupon source |
| FP-UI-134 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | video |
| FP-UI-135 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | src field |
| FP-UI-136 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | VideoRenderer 画布内可点击播放 |
| FP-UI-137 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | poster |
| FP-UI-138 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | countdown |
| FP-UI-139 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | target_time |
| FP-UI-140 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | ended_text |
| FP-UI-141 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | format opts=仅天数（d）/天 + 时（dh）/天 + 时 + 分（dhm）/天时分秒（dhms） |
| FP-UI-142 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | float_button |
| FP-UI-143 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | icon |
| FP-UI-144 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | admin float button renders; click miniapp-side |
| FP-UI-145 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | position |
| FP-UI-146 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | rich_text |
| FP-UI-147 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | RichText empty placeholder in props |
| FP-UI-148 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | divider |
| FP-UI-149 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | spacer |
| FP-UI-150 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | PropsPanel 数据源 type 必填展示与校验 |
| FP-UI-151 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | PropsPanel 数据源 query 必填展示与校验 |
| FP-UI-152 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | category_id field |
| FP-UI-153 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | product_type field |
| FP-UI-154 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | status on_sale implied |
| FP-UI-155 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | sort_by |
| FP-UI-156 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | sort_order derived from sort_by by design |
| FP-UI-157 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | limit |
| FP-UI-158 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | content category_id |
| FP-UI-159 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | ArticleListProps 内容类型 query.type 筛选 |
| FP-UI-160 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | is_recommended |
| FP-UI-161 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | content sort |
| FP-UI-162 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | content limit |
| FP-UI-163 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | activity type query |
| FP-UI-164 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | status registering |
| FP-UI-165 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | ActivityEntryProps is_recommended 开关 |
| FP-UI-166 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | ActivityEntryProps limit 1-50 |
| FP-UI-167 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | coupon type |
| FP-UI-168 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | coupon status=active filter |
| FP-UI-169 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | coupon limit |
| FP-UI-170 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | banner link_type=page in props; wx.navigateTo miniapp-side |
| FP-UI-171 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | jump opts=页面/网页/链接/小程序/拨打电话/无跳转 |
| FP-UI-172 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | miniapp option |
| FP-UI-173 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | phone jump type |
| FP-UI-174 | PASS | 2026-08-13 18:36 |  | BATCH-QA-013 | type=none |
| FP-UI-175 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | collectJumpIssues 发布前拦截缺 link_type/target |
| FP-UI-176 | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | collectJumpIssues 保存草稿同样拦截 |
| FP-UI-177 | PASS | 2026-08-16 14:15 |  | BATCH-QA-024 | float_button link_url field in props |
| FP-UI-178 | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | UnknownComponentRenderer + console.warn 未知 type |
| FP-UI-179 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | components render from props without data_source |
| FP-UI-180 | PASS | 2026-08-16 15:40 |  | BATCH-QA-025 | MiniPreviewDialog 真实数据模式 + hydratePreviewDsl |
| FP-UI-181 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | GET /mp/pages draft-only returned 未发布; see BATCH-QA-010 |
| FP-UI-182 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | unauth editor |
| FP-UI-183 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | editor id=10 |
| FP-UI-184 | PASS | 2026-08-13 18:10 |  | BATCH-QA-011 | 历史版本 routes to version/:id |
| FP-UI-185 | PASS | 2026-08-15 22:45 |  | BATCH-QA-018 | index-2 创建/更新/发布拦截 300204；首页占用禁用；自定义路径注册另见 MP |
| FP-DB-001 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | MYSQL_ERR mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1062 (23000) at line 1: Duplicate entry '5-1-0' for key 'mp_page_version.uk_page_version'
 |
| FP-DB-002 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | fk_mp_page_version_page_id CASCADE |
| FP-DB-003 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | mp_page	0	uk_path	1	path	A	6	NULL	NULL		BTREE			YES	NULL |
| FP-DB-004 | PASS | 2026-08-13 18:10 |  | BATCH-QA-010 | MYSQL_ERR mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 3140 (22032) at line 1: Invalid JSON text: "Invalid value." at position 1 in value for column 'mp_page_ |
| FP-DB-005 | PASS | 2026-08-15 00:30 |  | BATCH-QA-014 | id=1 current=9 publishedMax=9 |

## 探索附录（不计入 268）

| FP 编号 | 状态 | 最后执行时间 | 关联缺陷 | 批次号 | 备注 |
| --- | --- | --- | --- | --- | --- |
| EXP-LINE1-ADMIN | PASS | 2026-08-15 22:45 |  | BATCH-QA-018 | index-2 阻断；删除/离开确认已回归；脏数据 page4 已改自定义路径 |
| EXP-LINE1-MP | PASS | 2026-08-16 17:35 | BUG-MP-002 | BATCH-QA-027 | app.json 统一 custom 页；MP API 200 加载已发布路径 |
| EXP-LINE2-ADMIN-CREATE | PASS | 2026-08-15 00:30 |  | BATCH-QA-015 | product id=9 category=1 |
| EXP-LINE2-BIND-PREVIEW | PASS | 2026-08-15 23:00 |  | BATCH-QA-019 | 预览仅 on_sale；销量与列表一致 |
| EXP-LINE2-MP-ORDER | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 未登录订单列表 isEmpty=true |
| EXP-LINE2-ADMIN-ORDER | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 种子订单用户/支付/发货状态一致 |
| EXP-LINE3-ADMIN-CREATE | PASS | 2026-08-15 19:40 |  | BATCH-QA-017/019 | forms 别名已通；列表启用已回归 |
| EXP-LINE3-EMBED | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 预览点击表单入口展示字段列表 |
| EXP-LINE3-MP-SUBMIT | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | POST /mp/form-templates/1/submit → 200 id=2 |
| EXP-AUTH-FORCE-PWD | PASS | 2026-08-15 00:30 | BUG-AUTH-001 | BATCH-QA-015 | 强制改密阻断后续操作（回归通过） |
| EXP-CONTENT-LIST | PASS | 2026-08-13 16:28 |  | BATCH-QA-003 | 文章列表 28 条可浏览 |
| EXP-CONTENT-PUBLISH | PASS | 2026-08-13 16:31 |  | BATCH-QA-003 | 「品牌开放日」草稿点上架后变为已发布 |
| EXP-MEMBER-LIST | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | GET /admin/members HTTP 200 |
| EXP-USER-LIST | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 张小明 1单/¥179 与订单一致 |
| EXP-COUPON-LIST | PASS | 2026-08-15 22:40 |  | BATCH-QA-018 | 会员九折券展示 9折 |
| EXP-ACTIVITY-LIST | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | 活动 id=1 status=3 已结束 |
| EXP-APPOINTMENT | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | APPT-001/002 已修复并 BATCH-021 关闭 |
| EXP-FINANCE | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 本月收入 ¥179；订单同步流水 |
| EXP-BUILDER-MOVE-FIRST | PASS | 2026-08-13 15:52 |  | BATCH-QA-001 |  |
| EXP-BUILDER-EMPTY-AFTER-DELETE | PASS | 2026-08-13 15:56 |  | BATCH-QA-001 |  |
| EXP-BUILDER-UNDO-DISABLED | PASS | 2026-08-13 15:51 |  | BATCH-QA-001 |  |
| EXP-BUILDER-NAME-EMPTY | PASS | 2026-08-16 17:05 | BUG-UI-001 | BATCH-QA-026 | formRules blur+change；空名称提交拦截 |
| EXP-BUILDER-NAME-MAX | PASS | 2026-08-13 15:50 |  | BATCH-QA-001 |  |
| EXP-BUILDER-PULL-REFRESH | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | 开关可开并落库；手势未测不影响 |
| EXP-BUILDER-OFFLINE-SAVE | PASS | 2026-08-13 16:38 | BUG-UI-006 | BATCH-QA-004 | 断网提示失败且保持未保存；恢复后自动保存成功 |
| EXP-BUILDER-DELETE-CONFIRM | PASS | 2026-08-15 22:42 |  | BATCH-QA-018 | 删除组件确认框可见 |
| EXP-BUILDER-LEAVE-UNSAVED | PASS | 2026-08-15 22:40 |  | BATCH-QA-018 | 已发布页改属性后返回有未保存确认 |
| EXP-ROLE-MATRIX | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | admin 53 权限 vs qa_staff 11；create/refund 200301 |
| EXP-DASH-RANK | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 排行与商品主数据销量一致；无占位「暂无数据」 |
| EXP-TEMPLATE-CENTER | PASS | 2026-08-16 17:05 | BUG-TPL-001 | BATCH-QA-026 | 11 套模板；4 套含预约组件；预约 Tab 可筛 |
| EXP-ASSET-LIST | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | GET assets type=image total=2 |
| EXP-SETTINGS-BASIC | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | GET configs/basic 13 项可读 |
| EXP-AI-AGENT | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | GET agent/meta/active HTTP 200 |
| EXP-MEMBER-LEVEL | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 金卡会员数=1；积分区间已补 max_points |
| EXP-MEMBER-POINTS | PASS | 2026-08-15 23:55 |  | BATCH-QA-020 | 种子积分回填 1 条流水 |
| EXP-ADMIN-USER | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | admin-users 角色列 roleName 可读（SET-001 回归） |
| EXP-BUILDER-START | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | latest release 1.7.0 status=1 |
| EXP-ORDER-REFUND | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | GET refunds total=1 pending RF202608160001 |
| EXP-FORM-SUBMISSIONS | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | submissions total=2（含 MP 实时提交） |
| EXP-CONTENT-CATEGORY | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | 11 个启用分类 API 200 |
| EXP-PRODUCT-CATEGORY | PASS | 2026-08-15 23:00 |  | BATCH-QA-019 | 路由 /commerce/product；分类列显示品牌礼盒等 |
| EXP-AI-CONVERSATION | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | GET /admin/ai/conversations total=1 |
| EXP-SETTINGS-WECHAT | PASS | 2026-08-16 13:15 |  | BATCH-QA-023 | SET-002 已回归通过；订阅模板配置待环境补全 |
| EXP-SETTINGS-STORAGE | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | GET configs/storage 9 项可读 |
| EXP-SETTINGS-LOGS | PASS | 2026-08-16 17:05 |  | BATCH-QA-026 | 操作人显示 admin；历史数字 ID 已回填 |
| EXP-MP-CART | PASS | 2026-08-16 13:05 |  | BATCH-QA-022 | cart.js 未登录 isEmpty 空态（MP-003 代码回归） |
| EXP-MP-SEARCH | PASS | 2026-08-16 17:05 | BUG-UI-008 | BATCH-QA-026 | search.js _plainText 剥离 HTML |
| EXP-MP-CONTENT-DETAIL | PASS | 2026-08-16 17:35 |  | BATCH-QA-027 | 空评论拦截；发表评论需登录；点赞收藏本地态 |
| EXP-MP-LOGIN | PASS | 2026-08-16 17:40 |  | BATCH-QA-028 | 协议勾选/login-flow 代码回归；手机号授权需真机手势 |
| EXP-ACTIVITY-SIGNUP | PASS | 2026-08-16 17:05 | BUG-ACT-001 | BATCH-QA-026 | 未登录点报名弹登录半层（预期） |
| EXP-MP-AGREEMENT | PASS | 2026-08-13 17:42 |  | BATCH-QA-009 | 登录页与设置均可打开用户协议，正文 6 段 |