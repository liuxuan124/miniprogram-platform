# 部署指南

## 1. 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| JDK | 17 | 17.0.x |
| MySQL | 8.0 | 8.0.35+ |
| Redis | 6.0 | 7.x |
| Node.js | 18 | 18.x LTS |
| Nginx | 1.20 | 1.24+ |
| Docker | 20.10 | 24.x |
| Docker Compose | 2.0 | 2.20+ |

## 2. 后端部署

### 2.1 Maven打包

```bash
cd backend
mvn clean package -DskipTests
# 产物: target/miniprogram-platform-1.0.0.jar
```

### 2.2 运行

```bash
java -jar target/miniprogram-platform-1.0.0.jar \
  --spring.profiles.active=prod \
  --spring.datasource.url=jdbc:mysql://localhost:3306/mp_platform \
  --spring.datasource.password=YOUR_PASSWORD \
  --spring.data.redis.host=localhost \
  --wx.appid=YOUR_APPID \
  --wx.secret=YOUR_SECRET \
  --xunfei.app-id=YOUR_XUNFEI_APPID \
  --xunfei.api-key=YOUR_XUNFEI_KEY
```

### 2.3 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| SPRING_PROFILES_ACTIVE | Spring Profile (prod) | 是 |
| SPRING_DATASOURCE_URL | MySQL连接地址 | 是 |
| SPRING_DATASOURCE_PASSWORD | MySQL密码 | 是 |
| SPRING_DATA_REDIS_HOST | Redis地址 | 是 |
| SPRING_DATA_REDIS_PASSWORD | Redis密码 | 否 |
| WX_APPID | 微信AppID | 是 |
| WX_SECRET | 微信AppSecret | 是 |
| WX_MCH_ID | 微信支付商户号 | 是 |
| WX_API_KEY | 微信支付API密钥 | 是 |
| XUNFEI_APP_ID | 讯飞应用ID | 是 |
| XUNFEI_API_KEY | 讯飞API密钥 | 是 |
| STORAGE_TYPE | 存储类型(local/oss/cos) | 否 |
| STORAGE_BUCKET | 存储桶名 | 否 |
| JWT_SECRET | JWT签名密钥 | 是 |

## 3. 前端部署(管理后台)

### 3.1 构建

```bash
cd admin
npm install
npm run build
# 产物: dist/
```

### 3.2 Nginx配置

```nginx
server {
    listen 80;
    server_name admin.example.com;

    root /var/www/admin/dist;
    index index.html;

    # 前端路由 history 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket (AI对话)
    location /ws/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
```

## 4. 小程序部署

1. 使用微信开发者工具打开 `miniapp/` 目录
2. 修改 `app.js` 中的 `BASE_URL` 为生产环境地址
3. 修改 `project.config.json` 中的 `appid`
4. 替换 TabBar 图标为正式图标
5. 点击"上传" → 填写版本号和备注
6. 登录微信公众平台 → 版本管理 → 提交审核
7. 审核通过后 → 发布上线

## 5. Docker部署(推荐)

```bash
# 1. 配置环境变量
cp deploy/.env.example deploy/.env
# 编辑 .env 填入实际配置

# 2. 一键部署
cd deploy
docker compose up -d

# 3. 查看状态
docker compose ps
docker compose logs -f backend
```

详见 `deploy/` 目录下的 Docker Compose 配置。

## 6. 数据库初始化

Flyway自动迁移，启动后端服务时自动执行V1~V10迁移脚本。

如需手动初始化：
```bash
mysql -u root -p mp_platform < backend/src/main/resources/db/migration/V1__init_user_tables.sql
# 依次执行 V2~V10
```

## 7. 健康检查

```bash
# 后端健康检查
curl http://localhost:8080/actuator/health

# 数据库连接检查
curl http://localhost:8080/actuator/health/db

# Redis连接检查
curl http://localhost:8080/actuator/health/redis
```
