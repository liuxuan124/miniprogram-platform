
---

# 全系统扩展功能点清单（待总控确认）

> 状态：**总控已确认**（2026-08-15，用户「批准和允许」）。可进入用例设计与分批执行。
> 产出批次：BATCH-QA-014 同期文档（交付前终测 B 轨）
> 编号续接：API 自 079、UI 自 186、DB 自 006；ORDER/PAY/AI 新开。
> 已确认的页面装修器 268 **保留为范围 A**；本扩展为范围 B 正式分母。

## 扩展汇总

| 项 | 值 |
| --- | --- |
| 扩展功能点数 | 314 |
| 分布 | API 171 / UI 38 / ORDER 40 / DB 22 / AI 20 / PAY 23 |
| 与装修器合计（已批准） | 582 = 268 + 314 |
| 明确排除 | 实现多出的 14 个 DSL 组件（仍待契约变更）；探索批 EXP-* 不转正为 FP |
| 排除理由 | page-dsl-schema §1.5；EXP 非正式分母 |
| 总控确认时间 | 2026-08-15 |
| 总控确认人 | 会话确认（用户「批准和允许」） |

## 仍待总控裁决（继承原清单）

1. 多出 14 种组件是否变更 page-dsl-schema 后纳入。
2. page.type 字符串与库表 1/2/3 映射是否唯一合法。
3. 草稿乐观锁错误码是否统一为 HTTP 409 / 300409（当前复测仍见 400/100101）。

## 扩展功能点明细

| FP 编号 | 模块 | 来源契约 | 描述 | 排除 |
| --- | --- | --- | --- | --- |
| FP-API-079 | API | api-contract §7.1 | POST /admin/auth/login 成功 | 否 |
| FP-API-080 | API | api-contract §7.1 | POST /admin/auth/login 错误口令 | 否 |
| FP-API-081 | API | api-contract §7.1 | POST /admin/auth/refresh 成功 | 否 |
| FP-API-082 | API | api-contract §7.1 | POST /admin/auth/refresh Token 无效 110101/110102 | 否 |
| FP-API-083 | API | api-contract §7.1 | POST /admin/auth/logout 成功 | 否 |
| FP-API-084 | API | api-contract §7.1 | GET /admin/auth/profile 成功 | 否 |
| FP-API-085 | API | api-contract §7.1 | GET /admin/auth/profile 未登录 | 否 |
| FP-API-086 | API | api-contract §7.1 | PUT /admin/auth/password 成功 | 否 |
| FP-API-087 | API | api-contract §7.1 | PUT /admin/auth/password 旧密码错误 | 否 |
| FP-API-088 | API | api-contract §7.1 | POST /mp/auth/login 成功 | 否 |
| FP-API-089 | API | api-contract §7.1 | POST /mp/auth/login code 无效 110201 | 否 |
| FP-API-090 | API | api-contract §7.1 | POST /mp/auth/phone 成功 | 否 |
| FP-API-091 | API | api-contract §7.1 | POST /mp/auth/phone 未登录 | 否 |
| FP-API-092 | API | api-contract §7.2 | GET /admin/admin-users 成功 | 否 |
| FP-API-093 | API | api-contract §7.2 | GET /admin/admin-users 非超管 200301 | 否 |
| FP-API-094 | API | api-contract §7.2 | POST /admin/admin-users 成功 | 否 |
| FP-API-095 | API | api-contract §7.2 | POST /admin/admin-users 用户名冲突 200501 | 否 |
| FP-API-096 | API | api-contract §7.2 | PUT /admin/admin-users/{id} 成功 | 否 |
| FP-API-097 | API | api-contract §7.2 | DELETE /admin/admin-users/{id} 成功 | 否 |
| FP-API-098 | API | api-contract §7.2 | DELETE /admin/admin-users/{id} 不存在 200401 | 否 |
| FP-API-099 | API | api-contract §7.2 | GET /admin/roles 成功 | 否 |
| FP-API-100 | API | api-contract §7.2 | POST /admin/roles 成功 | 否 |
| FP-API-101 | API | api-contract §7.2 | PUT /admin/roles/{id} 成功 | 否 |
| FP-API-102 | API | api-contract §7.2 | PUT /admin/roles/{id}/permissions 成功 | 否 |
| FP-API-103 | API | api-contract §7.2 | GET /admin/permissions 成功 | 否 |
| FP-API-104 | API | api-contract §7.2 | GET /admin/users 成功 | 否 |
| FP-API-105 | API | api-contract §7.2 | GET /admin/users/{id} 成功 | 否 |
| FP-API-106 | API | api-contract §7.2 | GET /admin/users/{id} 不存在 | 否 |
| FP-API-107 | API | api-contract §7.2 | POST /admin/users/export 成功 | 否 |
| FP-API-108 | API | api-contract §7.2 | 上述需登录接口未登录 110101 | 否 |
| FP-API-109 | API | api-contract §7.3 | GET /admin/members 成功 | 否 |
| FP-API-110 | API | api-contract §7.3 | GET /admin/members/{id} 成功 | 否 |
| FP-API-111 | API | api-contract §7.3 | PUT /admin/members/{id}/tags 成功 | 否 |
| FP-API-112 | API | api-contract §7.3 | GET /admin/member-level-rules 成功 | 否 |
| FP-API-113 | API | api-contract §7.3 | PUT /admin/member-level-rules/{id} 超管成功 | 否 |
| FP-API-114 | API | api-contract §7.3 | PUT /admin/member-level-rules/{id} 非超管拒绝 | 否 |
| FP-API-115 | API | api-contract §7.3 | GET /admin/coupons 成功 | 否 |
| FP-API-116 | API | api-contract §7.3 | POST /admin/coupons 成功 | 否 |
| FP-API-117 | API | api-contract §7.3 | PUT /admin/coupons/{id} 成功 | 否 |
| FP-API-118 | API | api-contract §7.3 | PATCH /admin/coupons/{id}/status 启停 | 否 |
| FP-API-119 | API | api-contract §7.3 | GET /mp/members/me 成功 | 否 |
| FP-API-120 | API | api-contract §7.3 | GET /mp/members/me 未登录 | 否 |
| FP-API-121 | API | api-contract §7.3 | GET /mp/coupons 可领列表 | 否 |
| FP-API-122 | API | api-contract §7.3 | POST /mp/coupons/{id}/claim 领取成功 | 否 |
| FP-API-123 | API | api-contract §7.3 | POST /mp/coupons/{id}/claim 重复领取 | 否 |
| FP-API-124 | API | api-contract §7.3 | GET /mp/coupons/mine 成功 | 否 |
| FP-API-125 | API | api-contract §7.5 | GET /admin/contents 成功 | 否 |
| FP-API-126 | API | api-contract §7.5 | POST /admin/contents 成功 | 否 |
| FP-API-127 | API | api-contract §7.5 | GET /admin/contents/{id} 成功 | 否 |
| FP-API-128 | API | api-contract §7.5 | PUT /admin/contents/{id} 成功 | 否 |
| FP-API-129 | API | api-contract §7.5 | DELETE /admin/contents/{id} 成功 | 否 |
| FP-API-130 | API | api-contract §7.5 | PATCH /admin/contents/{id}/status 上下架 | 否 |
| FP-API-131 | API | api-contract §7.5 | PATCH /admin/contents/{id}/recommend | 否 |
| FP-API-132 | API | api-contract §7.5 | GET /admin/content-categories 成功 | 否 |
| FP-API-133 | API | api-contract §7.5 | POST /admin/content-categories 成功 | 否 |
| FP-API-134 | API | api-contract §7.5 | PUT /admin/content-categories/{id} 成功 | 否 |
| FP-API-135 | API | api-contract §7.5 | DELETE /admin/content-categories/{id} 成功 | 否 |
| FP-API-136 | API | api-contract §7.5 | GET /mp/contents 公开列表 | 否 |
| FP-API-137 | API | api-contract §7.5 | GET /mp/contents/{id} 公开详情 | 否 |
| FP-API-138 | API | api-contract §7.5 | GET /mp/content-categories 公开分类 | 否 |
| FP-API-139 | API | api-contract §7.5 | content_ops 写接口未登录/角色不足 | 否 |
| FP-API-140 | API | api-contract §7.6 | GET /admin/products 成功 | 否 |
| FP-API-141 | API | api-contract §7.6 | POST /admin/products 成功 | 否 |
| FP-API-142 | API | api-contract §7.6 | GET /admin/products/{id} 成功 | 否 |
| FP-API-143 | API | api-contract §7.6 | PUT /admin/products/{id} 成功 | 否 |
| FP-API-144 | API | api-contract §7.6 | DELETE /admin/products/{id} 成功 | 否 |
| FP-API-145 | API | api-contract §7.6 | PATCH /admin/products/{id}/status 上下架 | 否 |
| FP-API-146 | API | api-contract §7.6 | GET /admin/product-categories 成功 | 否 |
| FP-API-147 | API | api-contract §7.6 | POST /admin/product-categories 成功 | 否 |
| FP-API-148 | API | api-contract §7.6 | PUT /admin/product-categories/{id} 成功 | 否 |
| FP-API-149 | API | api-contract §7.6 | GET /admin/orders 成功 | 否 |
| FP-API-150 | API | api-contract §7.6 | GET /admin/orders/{id} 成功 | 否 |
| FP-API-151 | API | api-contract §7.6 | POST /admin/orders/{id}/ship 发货 | 否 |
| FP-API-152 | API | api-contract §7.6 | POST /admin/orders/{id}/verify 核销 | 否 |
| FP-API-153 | API | api-contract §7.6 | POST /admin/orders/{id}/confirm-service | 否 |
| FP-API-154 | API | api-contract §7.6 | POST /admin/refunds/{id}/audit | 否 |
| FP-API-155 | API | api-contract §7.6 | POST /admin/orders/export | 否 |
| FP-API-156 | API | api-contract §7.6 | GET /mp/products 公开列表 | 否 |
| FP-API-157 | API | api-contract §7.6 | GET /mp/products/{id} 公开详情 | 否 |
| FP-API-158 | API | api-contract §7.6 | GET /mp/cart 登录成功 | 否 |
| FP-API-159 | API | api-contract §7.6 | POST /mp/cart/items 添加 | 否 |
| FP-API-160 | API | api-contract §7.6 | PUT /mp/cart/items/{id} 更新 | 否 |
| FP-API-161 | API | api-contract §7.6 | DELETE /mp/cart/items/{id} 删除 | 否 |
| FP-API-162 | API | api-contract §7.6 | POST /mp/orders 创建 | 否 |
| FP-API-163 | API | api-contract §7.6 | GET /mp/orders 我的订单 | 否 |
| FP-API-164 | API | api-contract §7.6 | GET /mp/orders/{id} 详情 | 否 |
| FP-API-165 | API | api-contract §7.6 | POST /mp/orders/{id}/pay 发起支付 | 否 |
| FP-API-166 | API | api-contract §7.6 | POST /mp/orders/{id}/cancel 取消 | 否 |
| FP-API-167 | API | api-contract §7.6 | POST /mp/orders/{id}/refund 申请退款 | 否 |
| FP-API-168 | API | api-contract §7.6 | 库存不足下单 500601 | 否 |
| FP-API-169 | API | api-contract §7.6 | 非法状态操作 500201 | 否 |
| FP-API-170 | API | api-contract §7.6 | 购物车/订单未登录 110101 | 否 |
| FP-API-171 | API | api-contract §7.7 | POST /payment/wechat/notify 验签成功 | 否 |
| FP-API-172 | API | api-contract §7.7 | POST /payment/wechat/notify 验签失败 510702 | 否 |
| FP-API-173 | API | api-contract §7.7 | POST /payment/wechat/refund-notify 成功 | 否 |
| FP-API-174 | API | api-contract §7.7 | POST /payment/wechat/refund-notify 验签失败 | 否 |
| FP-API-175 | API | api-contract §7.8 | GET /admin/forms 成功 | 否 |
| FP-API-176 | API | api-contract §7.8 | POST /admin/forms 成功 | 否 |
| FP-API-177 | API | api-contract §7.8 | GET /admin/forms/{id} 成功 | 否 |
| FP-API-178 | API | api-contract §7.8 | PUT /admin/forms/{id} 成功 | 否 |
| FP-API-179 | API | api-contract §7.8 | PATCH /admin/forms/{id}/status | 否 |
| FP-API-180 | API | api-contract §7.8 | GET /admin/forms/{id}/submissions | 否 |
| FP-API-181 | API | api-contract §7.8 | POST /admin/forms/{id}/submissions/{sid}/audit | 否 |
| FP-API-182 | API | api-contract §7.8 | POST /mp/forms/{id}/submit 成功 | 否 |
| FP-API-183 | API | api-contract §7.8 | POST /mp/forms/{id}/submit 未登录 | 否 |
| FP-API-184 | API | api-contract §7.9 | GET /admin/activities 成功 | 否 |
| FP-API-185 | API | api-contract §7.9 | POST /admin/activities 成功 | 否 |
| FP-API-186 | API | api-contract §7.9 | GET /admin/activities/{id} 成功 | 否 |
| FP-API-187 | API | api-contract §7.9 | PUT /admin/activities/{id} 成功 | 否 |
| FP-API-188 | API | api-contract §7.9 | DELETE /admin/activities/{id} 成功 | 否 |
| FP-API-189 | API | api-contract §7.9 | GET /admin/activities/{id}/registrations | 否 |
| FP-API-190 | API | api-contract §7.9 | POST registrations/{rid}/audit | 否 |
| FP-API-191 | API | api-contract §7.9 | POST registrations/{rid}/checkin | 否 |
| FP-API-192 | API | api-contract §7.9 | GET /mp/activities 公开列表 | 否 |
| FP-API-193 | API | api-contract §7.9 | GET /mp/activities/{id} 公开详情 | 否 |
| FP-API-194 | API | api-contract §7.9 | POST /mp/activities/{id}/register 报名 | 否 |
| FP-API-195 | API | api-contract §7.9 | 报名未登录 | 否 |
| FP-API-196 | API | api-contract §7.10 | GET /admin/service-items 成功 | 否 |
| FP-API-197 | API | api-contract §7.10 | POST /admin/service-items 成功 | 否 |
| FP-API-198 | API | api-contract §7.10 | PUT /admin/service-items/{id} 成功 | 否 |
| FP-API-199 | API | api-contract §7.10 | GET /admin/booking-slots 成功 | 否 |
| FP-API-200 | API | api-contract §7.10 | POST /admin/booking-slots/batch | 否 |
| FP-API-201 | API | api-contract §7.10 | PUT /admin/booking-slots/{id} | 否 |
| FP-API-202 | API | api-contract §7.10 | GET /admin/bookings 成功 | 否 |
| FP-API-203 | API | api-contract §7.10 | POST /admin/bookings/{id}/confirm | 否 |
| FP-API-204 | API | api-contract §7.10 | POST /admin/bookings/{id}/cancel | 否 |
| FP-API-205 | API | api-contract §7.10 | GET /mp/service-items 公开 | 否 |
| FP-API-206 | API | api-contract §7.10 | GET /mp/service-items/{id}/slots | 否 |
| FP-API-207 | API | api-contract §7.10 | POST /mp/bookings 提交预约 | 否 |
| FP-API-208 | API | api-contract §7.10 | GET /mp/bookings 我的预约 | 否 |
| FP-API-209 | API | api-contract §7.10 | 预约写接口未登录 | 否 |
| FP-API-210 | API | api-contract §7.11 | GET /admin/ai/agents 成功 | 否 |
| FP-API-211 | API | api-contract §7.11 | POST /admin/ai/agents 超管成功 | 否 |
| FP-API-212 | API | api-contract §7.11 | GET /admin/ai/agents/{id} 成功 | 否 |
| FP-API-213 | API | api-contract §7.11 | PUT /admin/ai/agents/{id} 成功 | 否 |
| FP-API-214 | API | api-contract §7.11 | POST /admin/ai/agents/{id}/test-connection | 否 |
| FP-API-215 | API | api-contract §7.11 | GET /admin/ai/agents/{id}/versions | 否 |
| FP-API-216 | API | api-contract §7.11 | POST /admin/ai/agents/{id}/versions | 否 |
| FP-API-217 | API | api-contract §7.11 | PUT versions/{version} | 否 |
| FP-API-218 | API | api-contract §7.11 | POST versions/{version}/publish | 否 |
| FP-API-219 | API | api-contract §7.11 | POST versions/{version}/rollback | 否 |
| FP-API-220 | API | api-contract §7.11 | POST /admin/ai/agents/{id}/sandbox | 否 |
| FP-API-221 | API | api-contract §7.11 | GET knowledge-bases | 否 |
| FP-API-222 | API | api-contract §7.11 | POST knowledge-bases 上传 | 否 |
| FP-API-223 | API | api-contract §7.11 | PATCH recall-weight | 否 |
| FP-API-224 | API | api-contract §7.11 | POST recall-test | 否 |
| FP-API-225 | API | api-contract §7.11 | GET monitor | 否 |
| FP-API-226 | API | api-contract §7.11 | GET conversations | 否 |
| FP-API-227 | API | api-contract §7.11 | POST /mp/ai/chat 成功 | 否 |
| FP-API-228 | API | api-contract §7.11 | GET /mp/ai/sessions | 否 |
| FP-API-229 | API | api-contract §7.11 | GET /mp/ai/sessions/{id}/messages | 否 |
| FP-API-230 | API | api-contract §7.11 | POST /mp/ai/feedback | 否 |
| FP-API-231 | API | api-contract §7.11 | AI 模型失败 900701 | 否 |
| FP-API-232 | API | api-contract §7.11 | MP AI 未登录 | 否 |
| FP-API-233 | API | api-contract §7.12 | GET /admin/assets 成功 | 否 |
| FP-API-234 | API | api-contract §7.12 | POST /admin/assets/upload 成功 | 否 |
| FP-API-235 | API | api-contract §7.12 | GET /admin/assets/{id} 成功 | 否 |
| FP-API-236 | API | api-contract §7.12 | DELETE /admin/assets/{id} 成功 | 否 |
| FP-API-237 | API | api-contract §7.13 | GET /admin/configs 超管成功 | 否 |
| FP-API-238 | API | api-contract §7.13 | PUT /admin/configs/{key} | 否 |
| FP-API-239 | API | api-contract §7.13 | POST /admin/configs/payment/test | 否 |
| FP-API-240 | API | api-contract §7.13 | GET /admin/configs/navigation | 否 |
| FP-API-241 | API | api-contract §7.13 | PUT /admin/configs/navigation | 否 |
| FP-API-242 | API | api-contract §7.13 | GET /admin/configs/plugins | 否 |
| FP-API-243 | API | api-contract §7.13 | PATCH plugins/{code}/toggle | 否 |
| FP-API-244 | API | api-contract §7.13 | GET /admin/operation-logs | 否 |
| FP-API-245 | API | api-contract §7.13 | GET /admin/data-dicts | 否 |
| FP-API-246 | API | api-contract §7.14 | GET /admin/dashboard/overview | 否 |
| FP-API-247 | API | api-contract §7.14 | GET /admin/dashboard/trends | 否 |
| FP-API-248 | API | api-contract §7.14 | GET /admin/dashboard/todos | 否 |
| FP-API-249 | API | api-contract §7.14 | GET /admin/dashboard/rankings | 否 |
| FP-ORDER-001 | ORDER | order-state-machine §1.5 | 合法迁移: 待支付→待发货(实物支付成功) | 否 |
| FP-ORDER-002 | ORDER | order-state-machine §1.5 | 合法迁移: 待支付→待核销(数字支付成功) | 否 |
| FP-ORDER-003 | ORDER | order-state-machine §1.5 | 合法迁移: 待支付→待确认(服务支付成功) | 否 |
| FP-ORDER-004 | ORDER | order-state-machine §1.5 | 合法迁移: 待支付→已取消(用户取消) | 否 |
| FP-ORDER-005 | ORDER | order-state-machine §1.5 | 合法迁移: 待支付→已取消(超时取消) | 否 |
| FP-ORDER-006 | ORDER | order-state-machine §1.5 | 合法迁移: 待发货→已发货(发货) | 否 |
| FP-ORDER-007 | ORDER | order-state-machine §1.5 | 合法迁移: 待发货→退款待审核(申请退款) | 否 |
| FP-ORDER-008 | ORDER | order-state-machine §1.5 | 合法迁移: 已发货→已完成(确认收货/自动) | 否 |
| FP-ORDER-009 | ORDER | order-state-machine §1.5 | 合法迁移: 已发货→退款待审核(申请退款) | 否 |
| FP-ORDER-010 | ORDER | order-state-machine §1.5 | 合法迁移: 待核销→已完成(核销) | 否 |
| FP-ORDER-011 | ORDER | order-state-machine §1.5 | 合法迁移: 待核销→退款待审核(申请退款) | 否 |
| FP-ORDER-012 | ORDER | order-state-machine §1.5 | 合法迁移: 待确认→已完成(服务确认) | 否 |
| FP-ORDER-013 | ORDER | order-state-machine §1.5 | 合法迁移: 待确认→退款待审核(申请退款) | 否 |
| FP-ORDER-014 | ORDER | order-state-machine §1.5 | 合法迁移: 已完成→退款待审核(售后退款) | 否 |
| FP-ORDER-015 | ORDER | order-state-machine §1.5 禁止 | 非法迁移须拒绝: 已取消后再变更订单状态 | 否 |
| FP-ORDER-016 | ORDER | order-state-machine §1.5 禁止 | 非法迁移须拒绝: 已完成后再非退款变更状态 | 否 |
| FP-ORDER-017 | ORDER | order-state-machine §1.5 禁止 | 非法迁移须拒绝: 待支付发货/核销/确认 | 否 |
| FP-ORDER-018 | ORDER | order-state-machine §1.5 禁止 | 非法迁移须拒绝: 已发货再次发货 | 否 |
| FP-ORDER-019 | ORDER | order-state-machine §1.5 禁止 | 非法迁移须拒绝: 非待支付状态用户取消支付单 | 否 |
| FP-ORDER-020 | ORDER | order-state-machine §1.5 | 待支付 允许操作集合校验 | 否 |
| FP-ORDER-021 | ORDER | order-state-machine §1.5 | 待支付 禁止操作集合校验 | 否 |
| FP-ORDER-022 | ORDER | order-state-machine §1.5 | 待发货 允许操作集合校验 | 否 |
| FP-ORDER-023 | ORDER | order-state-machine §1.5 | 待发货 禁止操作集合校验 | 否 |
| FP-ORDER-024 | ORDER | order-state-machine §1.5 | 已发货 允许操作集合校验 | 否 |
| FP-ORDER-025 | ORDER | order-state-machine §1.5 | 已发货 禁止操作集合校验 | 否 |
| FP-ORDER-026 | ORDER | order-state-machine §1.5 | 待核销 允许操作集合校验 | 否 |
| FP-ORDER-027 | ORDER | order-state-machine §1.5 | 待核销 禁止操作集合校验 | 否 |
| FP-ORDER-028 | ORDER | order-state-machine §1.5 | 待确认 允许操作集合校验 | 否 |
| FP-ORDER-029 | ORDER | order-state-machine §1.5 | 待确认 禁止操作集合校验 | 否 |
| FP-ORDER-030 | ORDER | order-state-machine §1.5 | 已完成 允许操作集合校验 | 否 |
| FP-ORDER-031 | ORDER | order-state-machine §1.5 | 已完成 禁止操作集合校验 | 否 |
| FP-ORDER-032 | ORDER | order-state-machine §1.5 | 已取消 允许操作集合校验 | 否 |
| FP-ORDER-033 | ORDER | order-state-machine §1.5 | 已取消 禁止操作集合校验 | 否 |
| FP-ORDER-034 | ORDER | order-state-machine §3.4 | 支付超时自动关单 | 否 |
| FP-ORDER-035 | ORDER | order-state-machine §2 | 退款申请创建待审核 | 否 |
| FP-ORDER-036 | ORDER | order-state-machine §2 | 退款审核通过→退款中 | 否 |
| FP-ORDER-037 | ORDER | order-state-machine §2 | 退款审核拒绝 | 否 |
| FP-ORDER-038 | ORDER | order-state-machine §2 | 退款成功全额→订单已取消 | 否 |
| FP-ORDER-039 | ORDER | order-state-machine §2 | 退款成功部分→订单保持原状态 | 否 |
| FP-ORDER-040 | ORDER | order-state-machine §2 | 退款回调失败人工处理 | 否 |
| FP-PAY-001 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 支付下单成功 | 否 |
| FP-PAY-002 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 支付成功回调 | 否 |
| FP-PAY-003 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 支付失败 | 否 |
| FP-PAY-004 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 用户取消支付 | 否 |
| FP-PAY-005 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 支付超时 | 否 |
| FP-PAY-006 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调正常处理 | 否 |
| FP-PAY-007 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调重复推送幂等 | 否 |
| FP-PAY-008 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调乱序 | 否 |
| FP-PAY-009 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调丢失后主动查单补偿 | 否 |
| FP-PAY-010 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调签名校验失败 | 否 |
| FP-PAY-011 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调金额不一致 | 否 |
| FP-PAY-012 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 回调订单不存在 | 否 |
| FP-PAY-013 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 全额退款 | 否 |
| FP-PAY-014 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 部分退款 | 否 |
| FP-PAY-015 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 重复退款 | 否 |
| FP-PAY-016 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 退款失败 | 否 |
| FP-PAY-017 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 退款回调成功 | 否 |
| FP-PAY-018 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 订阅消息授权 | 否 |
| FP-PAY-019 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 订阅消息发送 | 否 |
| FP-PAY-020 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 拒绝授权 | 否 |
| FP-PAY-021 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 模板参数超长截断 | 否 |
| FP-PAY-022 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 微信支付下单失败 510701 | 否 |
| FP-PAY-023 | PAY | order-state-machine §3-5 + SOP 支付枚举 | 并发支付同行锁仅一笔有效 | 否 |
| FP-AI-001 | AI | ai-recommendation-contract | 正常推荐输出 product_recommend | 否 |
| FP-AI-002 | AI | ai-recommendation-contract | 正常推荐输出 article_recommend | 否 |
| FP-AI-003 | AI | ai-recommendation-contract | 正常推荐输出 activity_recommend | 否 |
| FP-AI-004 | AI | ai-recommendation-contract | 输入为空降级 | 否 |
| FP-AI-005 | AI | ai-recommendation-contract | 冷启动用户推荐 | 否 |
| FP-AI-006 | AI | ai-recommendation-contract | 无历史数据推荐 | 否 |
| FP-AI-007 | AI | ai-recommendation-contract | 上游超时降级 | 否 |
| FP-AI-008 | AI | ai-recommendation-contract | 上游返回异常降级 | 否 |
| FP-AI-009 | AI | ai-recommendation-contract | 上游返回空列表降级 | 否 |
| FP-AI-010 | AI | ai-recommendation-contract | 过滤已下架商品 | 否 |
| FP-AI-011 | AI | ai-recommendation-contract | 过滤无库存商品 | 否 |
| FP-AI-012 | AI | ai-recommendation-contract | member_benefit 输出 | 否 |
| FP-AI-013 | AI | ai-recommendation-contract | order_status 输出 | 否 |
| FP-AI-014 | AI | ai-recommendation-contract | transfer_human 触发 | 否 |
| FP-AI-015 | AI | ai-recommendation-contract | 工具 search_products | 否 |
| FP-AI-016 | AI | ai-recommendation-contract | 工具 recommend_products | 否 |
| FP-AI-017 | AI | ai-recommendation-contract | 工具 search_articles | 否 |
| FP-AI-018 | AI | ai-recommendation-contract | 工具 query_order_status | 否 |
| FP-AI-019 | AI | ai-recommendation-contract | 工具 transfer_to_human | 否 |
| FP-AI-020 | AI | ai-recommendation-contract | 工具 search_knowledge | 否 |
| FP-DB-006 | DB | database-model | uk admin.username 冲突 | 否 |
| FP-DB-007 | DB | database-model | uk role.code 冲突 | 否 |
| FP-DB-008 | DB | database-model | uk permission.code 冲突 | 否 |
| FP-DB-009 | DB | database-model | uk_role_perm 冲突 | 否 |
| FP-DB-010 | DB | database-model | uk user.openid 冲突 | 否 |
| FP-DB-011 | DB | database-model | uk member.user_id 冲突 | 否 |
| FP-DB-012 | DB | database-model | uk member_level.level 冲突 | 否 |
| FP-DB-013 | DB | database-model | uk_sku_code 冲突 | 否 |
| FP-DB-014 | DB | database-model | uk_user_sku 购物车冲突 | 否 |
| FP-DB-015 | DB | database-model | uk order_no 冲突 | 否 |
| FP-DB-016 | DB | database-model | uk payment.order_id 冲突 | 否 |
| FP-DB-017 | DB | database-model | uk refund_no 冲突 | 否 |
| FP-DB-018 | DB | database-model | uk_activity_user 冲突 | 否 |
| FP-DB-019 | DB | database-model | uk_slot 时段冲突 | 否 |
| FP-DB-020 | DB | database-model | uk_agent_version 冲突 | 否 |
| FP-DB-021 | DB | database-model | uk config_key 冲突 | 否 |
| FP-DB-022 | DB | database-model | uk_dict_item 冲突 | 否 |
| FP-DB-023 | DB | database-model | uk payment.idempotency_key 冲突 | 否 |
| FP-DB-024 | DB | database-model | uk refund.idempotency_key 冲突 | 否 |
| FP-DB-025 | DB | database-model | SKU 库存并发扣减 | 否 |
| FP-DB-026 | DB | database-model | 订单金额与明细一致性 | 否 |
| FP-DB-027 | DB | database-model | 交易日志禁止 UPDATE/DELETE | 否 |
| FP-UI-186 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 工作台首次进入 | 否 |
| FP-UI-187 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 工作台加载失败态 | 否 |
| FP-UI-188 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 登录页首次进入 | 否 |
| FP-UI-189 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 强制改密流程 | 否 |
| FP-UI-190 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 商品列表首次进入 | 否 |
| FP-UI-191 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 商品列表空态 | 否 |
| FP-UI-192 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 商品列表失败态 | 否 |
| FP-UI-193 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 商品编辑保存 | 否 |
| FP-UI-194 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 订单列表首次进入 | 否 |
| FP-UI-195 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 订单详情首次进入 | 否 |
| FP-UI-196 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 订单发货操作 | 否 |
| FP-UI-197 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 退款审核操作 | 否 |
| FP-UI-198 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 会员列表首次进入 | 否 |
| FP-UI-199 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 会员详情首次进入 | 否 |
| FP-UI-200 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 优惠券列表首次进入 | 否 |
| FP-UI-201 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 优惠券创建 | 否 |
| FP-UI-202 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 内容列表首次进入 | 否 |
| FP-UI-203 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 内容发布 | 否 |
| FP-UI-204 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 表单列表首次进入 | 否 |
| FP-UI-205 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 表单提交记录 | 否 |
| FP-UI-206 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 活动列表首次进入 | 否 |
| FP-UI-207 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 活动报名审核 | 否 |
| FP-UI-208 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 预约服务列表首次进入 | 否 |
| FP-UI-209 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 预约确认/取消 | 否 |
| FP-UI-210 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 素材库首次进入 | 否 |
| FP-UI-211 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 系统配置页首次进入 | 否 |
| FP-UI-212 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 角色权限页首次进入 | 否 |
| FP-UI-213 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 管理员列表首次进入 | 否 |
| FP-UI-214 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序首页渲染 | 否 |
| FP-UI-215 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序商品详情 | 否 |
| FP-UI-216 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序购物车 | 否 |
| FP-UI-217 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序下单页 | 否 |
| FP-UI-218 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序订单列表空态 | 否 |
| FP-UI-219 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序订单列表失败态 | 否 |
| FP-UI-220 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序未登录拦截 | 否 |
| FP-UI-221 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序内容列表 | 否 |
| FP-UI-222 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序活动报名 | 否 |
| FP-UI-223 | UI | page-dsl-schema + 后台/小程序主路径（扩展） | 小程序AI对话入口 | 否 |
