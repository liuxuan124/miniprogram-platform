# 微信小程序多场景搭建与运营系统 — 项目移交文档

## 项目概述

本项目是一套面向微信生态的多场景搭建与运营系统，支持零代码页面搭建、内容管理、商品订单、会员营销、表单预约、AI智能推荐、数据统计等7大核心能力。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Spring Boot 3.2.5 + Java 17 + MyBatis-Plus + MySQL 8.x + Redis |
| 管理后台 | Vue3 + Element Plus + Vite + TypeScript |
| 小程序端 | 微信小程序原生 + DSL渲染引擎 |
| AI | 讯飞星火大模型 |
| 部署 | Docker + Docker Compose + Nginx |

## 文档目录

| 文档 | 说明 |
|------|------|
| [系统架构](architecture.md) | 三层架构、模块划分、第三方集成 |
| [API接口文档](api-reference.md) | 管理端+小程序端全部API端点 |
| [部署指南](deployment-guide.md) | 环境要求、部署步骤、Docker部署 |
| [数据库设计](database-schema.md) | V1~V10迁移脚本、表结构、关系图 |
| [小程序开发指南](miniapp-guide.md) | DSL引擎、页面路由、微信登录/支付 |
| [运维手册](operations.md) | 巡检、监控、故障排查、备份恢复 |
| [待办事项](pending-items.md) | 未完成任务、资质审核、上线计划 |

## 移交检查清单

- [x] 源代码完整提交
- [x] 数据库迁移脚本(V1~V10)
- [x] API接口文档
- [x] 部署脚本(Docker Compose)
- [x] 性能测试脚本(Locust)
- [x] 集成测试代码
- [ ] 微信小程序资质审核 (需人工)
- [ ] ICP备案 (需人工)
- [ ] 微信支付商户资质 (需人工)
- [ ] 生产环境部署
- [ ] 上线试运行
