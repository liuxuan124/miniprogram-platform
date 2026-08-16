# BUG-MP-002

- 编号：`BUG-MP-002`
- 类型：导航展示不一致
- 关联功能点 ID：EXP-LINE1-MP
- 严重度：P2
- 所属模块与页面：小程序 / 自定义 tabBar
- 指派 Agent：miniapp-agent
- 指派依据：模拟器底栏文案与 `app.json` 注册的 tab 不一致，内容页高亮也不对
- 状态：回归通过
- 复现概率：本次模拟器必现

## 从登录开始的完整复现路径

1. 打开 `miniapp` 模拟器首页
2. automator `switchTab('/pages/content-list/content-list')`
3. automator `switchTab('/pages/mine/mine')`

## 实际现象

- `app.json` tabBar 为：首页 / 内容 / 我的
- 模拟器底栏显示：首页 / 分类 / 购物车 / 我的，且分类、购物车、我的图标均为相同房屋轮廓
- 内容中心页（`pages/content-list/content-list`）已打开，底栏仍高亮「首页」
- 「我的」页打开后，底栏高亮也不稳定（一次为首页，一次为购物车）

## 预期现象及依据

当前页应对应底栏选中项；底栏项应与小程序包内 tab 配置一致，或明确展示后台下发的导航且选中正确。

## 影响范围

自定义 tabBar；用户从底栏进入「内容」与商城相关入口的感知。

## 证据

- `agent-team/testing/evidence/BATCH-QA-007/01-home.png`
- `agent-team/testing/evidence/BATCH-QA-007/06-content-list.png`
- `agent-team/testing/evidence/BATCH-QA-007/07-mine.png`
- `agent-team/testing/evidence/BATCH-QA-007/09-form.png`
