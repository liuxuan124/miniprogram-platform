# TASK-BE-005 派发指令
# 派发时间: 2026-05-11
# 派发方: controller-agent

task_id: TASK-BE-005
title: 搭建后端项目骨架与基础设施
owner: backend-agent
status: 开发中
priority: P0
phase: 03-foundation-development

## 输入契约（已冻结，必须遵守）
- agent-team/contracts/database-model.md — 数据库模型
- agent-team/contracts/api-contract.md — API 接口规范

## 交付要求
1. Spring Boot 项目骨架（Maven/Gradle）
2. 数据库连接配置与 Flyway/Liquibase 迁移脚本
3. 统一异常处理（GlobalExceptionHandler）
4. 统一鉴权拦截器（JWT）
5. 统一响应格式（符合 api-contract.md）
6. 健康检查接口 (/actuator/health)
7. Swagger/OpenAPI 文档集成
8. CORS 配置

## 验收标准
- [ ] 项目可启动，无编译错误
- [ ] 健康检查接口返回 200
- [ ] 统一异常处理可捕获并格式化异常
- [ ] JWT 鉴权拦截器可拦截未授权请求
- [ ] 数据库迁移脚本可执行
- [ ] API 文档可访问

## 技术栈约束
- Java 17+
- Spring Boot 3.x
- MySQL 8.x
- Redis（缓存/Session）
- MyBatis-Plus 或 JPA

## 回执要求
完成后提交回执到: agent-team/receipts/receipt-TASK-BE-005.yaml
回执必须包含:
- 项目目录结构
- 已实现的功能清单
- 启动验证截图或日志
- 待解决问题（如有）
