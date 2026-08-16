# BUG-MEMBER-002

- 编号：`BUG-MEMBER-002`
- 类型：数据不一致
- 关联功能点 ID：EXP-MEMBER-LEVEL, EXP-MEMBER-POINTS
- 严重度：P2
- 所属模块与页面：会员管理 / 会员等级、积分日志
- 指派 Agent：backend-agent
- 指派依据：会员列表已有等级与积分，等级统计与积分流水未体现
- 状态：回归通过
- 复现概率：当前环境必现

## 从登录开始的完整复现路径

1. 登录后打开「会员管理」列表（BATCH-QA-003：张小明，金卡，积分 1280）
2. 打开「会员等级」`/member/level`
3. 打开「积分管理」`/member/points`

## 实际现象

- 会员列表：张小明为金卡会员，积分 1280
- 会员等级：Lv.1～Lv.4 **会员数全部为 0**（含金卡 Lv.3）
- 积分日志：**暂无数据 / 共 0 条**
- 各等级积分区间均为「N ~ 无上限」，档位重叠（作为观察记录，不单独编号）

## 预期现象及依据

等级「会员数」应统计当前属于该等级的会员；积分余额有变动应有对应流水，或明确说明积分来自不可审计的种子写入。

## 影响范围

会员等级运营核对、积分对账。与 BUG-MEMBER-001（订单数对不上）同属会员主数据不可采信。

## 证据

- `agent-team/testing/evidence/BATCH-QA-003/10-module-snapshots.md`（会员列表）
- `agent-team/testing/evidence/BATCH-QA-004/05-member-level.json`
- `agent-team/testing/evidence/BATCH-QA-004/06-member-points.json`
- `agent-team/testing/evidence/BATCH-QA-004/11-observations.md`
