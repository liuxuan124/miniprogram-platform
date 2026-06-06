# 运维手册

## 1. 日常巡检

### 1.1 每日巡检项

| 检查项 | 命令/方法 | 正常标准 |
|--------|-----------|----------|
| 后端服务状态 | `curl http://localhost:8080/actuator/health` | status: UP |
| MySQL连接 | `mysql -u root -p -e "SELECT 1"` | 查询成功 |
| Redis连接 | `redis-cli ping` | PONG |
| 磁盘空间 | `df -h` | 使用率 < 80% |
| 内存使用 | `free -h` | 使用率 < 85% |
| 错误日志 | `tail -100 /var/log/app/error.log` | 无FATAL/ERROR |
| 定时任务 | 检查统计日报是否生成 | 每日1:00执行 |

### 1.2 每周巡检项

| 检查项 | 说明 |
|--------|------|
| 慢查询日志 | 分析MySQL慢查询，优化索引 |
| API响应时间 | P99 < 500ms |
| 错误率 | < 0.1% |
| 数据库备份 | 验证备份文件可恢复 |
| 证书过期 | HTTPS证书有效期 > 30天 |

## 2. 监控指标

### 2.1 JVM指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| jvm.memory.used | JVM内存使用 | > 80% |
| jvm.gc.pause | GC停顿时间 | P99 > 500ms |
| jvm.threads.live | 活跃线程数 | > 200 |
| jvm.threads.deadlock | 死锁线程 | > 0 |

### 2.2 API指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| http.server.requests | 请求延迟P99 | > 1000ms |
| error_rate | 错误率 | > 1% |
| qps | 每秒请求数 | 根据容量规划 |
| active_connections | 活跃连接数 | > 500 |

### 2.3 数据库指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| connections.active | 活跃连接 | > 80% 最大连接数 |
| slow_queries | 慢查询数 | > 10/分钟 |
| replication_lag | 主从延迟 | > 5s |
| disk_usage | 磁盘使用 | > 80% |

### 2.4 Redis指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| used_memory | 内存使用 | > 80% maxmemory |
| connected_clients | 连接数 | > 500 |
| blocked_clients | 阻塞客户端 | > 10 |
| keyspace_hits_rate | 命中率 | < 90% |

## 3. 常见问题排查

### 3.1 服务启动失败

```bash
# 查看日志
docker compose logs backend --tail 200

# 常见原因:
# 1. MySQL未就绪 → 等待健康检查通过
# 2. Redis未就绪 → 检查Redis服务
# 3. 端口冲突 → 检查8080端口占用
# 4. 配置错误 → 检查环境变量
```

### 3.2 接口响应慢

```bash
# 1. 检查JVM内存
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# 2. 检查数据库慢查询
mysql -e "SELECT * FROM information_schema.processlist WHERE time > 5;"

# 3. 检查Redis延迟
redis-cli --latency

# 4. 查看线程dump
kill -3 <pid>  # 生成thread dump
```

### 3.3 微信登录失败

```
1. 检查AppID/AppSecret配置
2. 检查服务器IP白名单(微信公众平台)
3. 检查网络连通性(服务器→微信API)
4. 检查code是否过期(5分钟有效期)
```

### 3.4 支付回调失败

```
1. 检查回调URL是否HTTPS
2. 检查回调URL是否可从外网访问
3. 检查签名验证逻辑
4. 查看微信支付商户平台通知记录
```

### 3.5 AI对话无响应

```
1. 检查讯飞API额度
2. 检查WebSocket连接
3. 查看后端AI服务日志
4. 验证API Key有效性
```

## 4. 备份恢复

### 4.1 数据库备份

```bash
# 全量备份(每日)
mysqldump -u root -p mp_platform > backup/mp_platform_$(date +%Y%m%d).sql

# 压缩备份
mysqldump -u root -p mp_platform | gzip > backup/mp_platform_$(date +%Y%m%d).sql.gz

# 自动备份(crontab)
0 2 * * * /opt/scripts/backup-db.sh
```

### 4.2 数据恢复

```bash
# 恢复全量备份
mysql -u root -p mp_platform < backup/mp_platform_20250120.sql

# 恢复压缩备份
gunzip < backup/mp_platform_20250120.sql.gz | mysql -u root -p mp_platform
```

### 4.3 Redis备份

```bash
# Redis自动持久化(AOF+RDB)
# 手动触发BGSAVE
redis-cli BGSAVE

# 备份文件位置
cp /var/lib/redis/dump.rdb backup/redis_$(date +%Y%m%d).rdb
```

## 5. 日志查看

```bash
# 后端日志
docker compose logs -f backend
docker compose logs backend --since 1h
docker compose logs backend --tail 500

# Nginx日志
docker compose logs -f admin
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MySQL慢查询日志
docker compose exec mysql cat /var/log/mysql/slow.log

# 应用日志(如果挂载了日志目录)
tail -f /var/log/app/app.log
grep "ERROR" /var/log/app/app.log | tail -50
```

## 6. 应急处理

### 6.1 服务宕机

```bash
# 重启单个服务
docker compose restart backend

# 重启所有服务
docker compose restart

# 强制重建
docker compose up -d --force-recreate backend
```

### 6.2 数据库故障

```bash
# 检查MySQL状态
docker compose exec mysql mysqladmin -u root -p ping

# 修复表
docker compose exec mysql mysqlcheck -u root -p --auto-repair mp_platform

# 从备份恢复
# (见4.2节)
```

### 6.3 磁盘满

```bash
# 查找大文件
du -sh /* | sort -rh | head -20

# 清理Docker
docker system prune -a --volumes

# 清理日志
find /var/log -name "*.log" -mtime +7 -delete

# 清理MySQL binlog
mysql -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);"
```
