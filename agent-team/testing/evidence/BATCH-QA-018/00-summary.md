# BATCH-QA-018 证据摘要

## 修复项

- **BUG-UI-002**：禁止 `/pages/index/index-\d+` 创建/更新/发布；新建时若首页已占用则禁用「首页」并提示；历史脏数据 page4 改为自定义路径
- **BUG-MKT-001**：折扣存值 `0.9` 展示为 `9折`（后台列表/装修器/小程序券组件）
- **BUG-UI-003**：删除组件二次确认；已发布页不做自动保存，离开有确认

## API

| 操作 | 结果 |
| --- | --- |
| `POST /pages` path=`/pages/index/index-2` type=1 | `code=300204` 路径不在小程序包内 |
| `PUT /pages/4` path=`/pages/index/index-2` | 预期 `300204`（见 api-results / 本批复测） |
| 优惠券 id=2 | 接口仍存 `value=0.9`；UI 展示 `9折` |

## UI 截图

- `01-coupon-list.png`：会员九折券 → **9折**
- `02-create-page-home-disabled.png`：首页选项禁用 + tip（见 `results-round3.json`）
- `03-delete-confirm.png`：删除组件确认框
- `04-leave-confirm.png`：未保存离开确认

## 数据清理

- page id=4：下架后改为 type=3、path=`/pages/custom/qa-batch001`（避免继续以 index-2 冒充首页）
