# TASK-MP-002 派发指令
# 派发时间: 2026-05-11
# 派发方: controller-agent

task_id: TASK-MP-002
title: 搭建小程序项目骨架与登录流程
owner: miniapp-agent
status: 开发中
priority: P0
phase: 03-foundation-development

## 输入契约（已冻结，必须遵守）
- agent-team/contracts/page-dsl-schema.md — 页面 DSL Schema
- agent-team/contracts/api-contract.md — API 接口规范

## 参考方案
- agent-team/receipts/TASK-MP-001-receipt.yaml — 小程序骨架与动态渲染方案

## 交付要求
1. 微信小程序项目骨架（原生 / uni-app）
2. 微信登录流程（wx.login → 后端换 Token）
3. 动态渲染引擎基础框架（DSL 解析器 + 组件映射注册机制）
4. 全局请求封装（Token 自动携带、错误处理）
5. 全局状态管理（用户信息、Token）
6. 首页占位（可从后端拉取页面 DSL 渲染）
7. TabBar 配置

## 验收标准
- [ ] 小程序可在开发者工具中启动
- [ ] 微信登录流程可走通（需后端 BE-005 配合）
- [ ] 动态渲染引擎可解析简单 DSL 并渲染
- [ ] API 请求自动携带 Token
- [ ] TabBar 正常显示

## 技术栈约束
- 微信小程序原生 或 uni-app（需与 MP-001 方案一致）
- 如使用 uni-app: Vue 3 + Vite
- 需兼容微信小程序平台

## 回执要求
完成后提交回执到: agent-team/receipts/receipt-TASK-MP-002.yaml
回执必须包含:
- 项目目录结构
- 已实现的功能清单
- 动态渲染引擎架构说明
- 待解决问题（如有）

## 联调说明
登录接口需与 TASK-BE-005 的后端骨架联调，请与 backend-agent 对齐接口格式。
