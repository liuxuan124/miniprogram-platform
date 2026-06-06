# TASK-ADMIN-002 派发指令
# 派发时间: 2026-05-11
# 派发方: controller-agent

task_id: TASK-ADMIN-002
title: 搭建管理后台项目骨架
owner: admin-agent
status: 开发中
priority: P0
phase: 03-foundation-development

## 输入契约（已冻结，必须遵守）
- agent-team/contracts/api-contract.md — API 接口规范
- agent-team/contracts/database-model.md — 数据库模型（权限相关表）

## 参考方案
- agent-team/receipts/TASK-ADMIN-001-receipt.yaml — 后台框架与菜单权限方案

## 交付要求
1. Vue3 + Element Plus 项目骨架（Vite 构建）
2. 路由框架（vue-router，动态路由）
3. 菜单框架（按权限动态渲染，参考 ADMIN-001 方案）
4. 登录页面与 JWT Token 管理
5. 权限指令（v-permission）
6. Axios 封装（统一错误处理、Token 刷新）
7. 布局组件（侧边栏 + 顶栏 + 内容区）
8. 首页仪表盘占位

## 验收标准
- [ ] 项目可启动，无编译错误
- [ ] 登录页面可显示
- [ ] 登录后菜单按权限渲染
- [ ] 无权限页面显示 403
- [ ] API 请求自动携带 Token
- [ ] Token 过期自动跳转登录

## 技术栈约束
- Vue 3 + Composition API
- Element Plus
- Vite
- Pinia（状态管理）
- vue-router 4
- Axios

## 回执要求
完成后提交回执到: agent-team/receipts/TASK-ADMIN-002-receipt.yaml
回执必须包含:
- 项目目录结构
- 已实现的功能清单
- 页面截图或路由列表
- 待解决问题（如有）
