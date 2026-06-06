-- 微信小程序多场景搭建与运营系统 - 认证与权限管理表
-- 任务编号: TASK-BE-006
-- 创建时间: 2026-05-11

USE miniprogram_dev;

-- ==================== 后台管理员表 ====================
CREATE TABLE IF NOT EXISTS mp_admin_user (
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    username        VARCHAR(64)     NOT NULL                 COMMENT '登录账号',
    password_hash   VARCHAR(255)    NOT NULL                 COMMENT '密码哈希',
    real_name       VARCHAR(64)     DEFAULT NULL             COMMENT '真实姓名',
    phone           VARCHAR(20)     DEFAULT NULL             COMMENT '手机号',
    avatar_url      VARCHAR(512)    DEFAULT NULL             COMMENT '头像地址',
    role_id         BIGINT          NOT NULL                 COMMENT '关联角色ID',
    status          TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 1=启用 0=禁用',
    last_login_at   DATETIME        DEFAULT NULL             COMMENT '最后登录时间',
    create_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by       BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by       BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted         INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    KEY idx_role_id (role_id),
    KEY idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台管理员表';

-- ==================== 角色表 ====================
CREATE TABLE IF NOT EXISTS mp_role (
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    code            VARCHAR(64)     NOT NULL                 COMMENT '角色编码',
    name            VARCHAR(64)     NOT NULL                 COMMENT '角色名称',
    description     VARCHAR(255)    DEFAULT NULL             COMMENT '角色描述',
    status          TINYINT         NOT NULL DEFAULT 1       COMMENT '状态 1=启用 0=禁用',
    create_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by       BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by       BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted         INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- ==================== 权限点表 ====================
CREATE TABLE IF NOT EXISTS mp_permission (
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    code            VARCHAR(128)    NOT NULL                 COMMENT '权限编码',
    name            VARCHAR(64)     NOT NULL                 COMMENT '权限名称',
    module          VARCHAR(64)     NOT NULL                 COMMENT '所属模块',
    type            TINYINT         NOT NULL                 COMMENT '类型 1=菜单 2=按钮 3=接口',
    parent_id       BIGINT          DEFAULT 0                COMMENT '父权限ID',
    sort_order      INT             DEFAULT 0                COMMENT '排序',
    create_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by       BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by       BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted         INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code),
    KEY idx_module (module),
    KEY idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限点表';

-- ==================== 角色权限关联表 ====================
CREATE TABLE IF NOT EXISTS mp_role_permission (
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    role_id         BIGINT          NOT NULL                 COMMENT '角色ID',
    permission_id   BIGINT          NOT NULL                 COMMENT '权限ID',
    create_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by       BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by       BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted         INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_perm (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- ==================== 小程序用户表 ====================
CREATE TABLE IF NOT EXISTS mp_user (
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    openid          VARCHAR(128)    NOT NULL                 COMMENT '微信OpenID',
    union_id        VARCHAR(128)    DEFAULT NULL             COMMENT '微信UnionID',
    nickname        VARCHAR(128)    DEFAULT NULL             COMMENT '昵称',
    avatar_url      VARCHAR(512)    DEFAULT NULL             COMMENT '头像',
    phone           VARCHAR(20)     DEFAULT NULL             COMMENT '手机号（授权后获取）',
    gender          TINYINT         DEFAULT 0                COMMENT '性别 0=未知 1=男 2=女',
    source_channel  VARCHAR(64)     DEFAULT NULL             COMMENT '来源渠道',
    last_visit_at   DATETIME        DEFAULT NULL             COMMENT '最近访问时间',
    member_id       BIGINT          DEFAULT NULL             COMMENT '关联会员ID',
    create_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by       BIGINT          DEFAULT NULL             COMMENT '创建人ID',
    update_by       BIGINT          DEFAULT NULL             COMMENT '更新人ID',
    deleted         INT             NOT NULL DEFAULT 0       COMMENT '逻辑删除 0-未删除 1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_openid (openid),
    KEY idx_union_id (union_id),
    KEY idx_phone (phone),
    KEY idx_member_id (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户表';


-- ==================== 初始化默认角色 ====================
INSERT INTO mp_role (id, code, name, description, status) VALUES
(1, 'super_admin', '超级管理员', '拥有系统所有权限', 1),
(2, 'content_ops', '内容运营', '负责内容发布与管理', 1),
(3, 'biz_ops', '业务运营', '负责商品、订单、活动等业务管理', 1),
(4, 'service_staff', '客服人员', '负责用户服务与咨询处理', 1);


-- ==================== 初始化权限点 ====================
-- --- 仪表盘模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(100, 'dashboard', '仪表盘', 'dashboard', 1, 0, 1),
(101, 'dashboard:view', '查看仪表盘', 'dashboard', 2, 100, 1);

-- --- 用户管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(200, 'user', '用户管理', 'user', 1, 0, 2),
(201, 'user:list', '用户列表', 'user', 2, 200, 1),
(202, 'user:detail', '用户详情', 'user', 2, 200, 2);

-- --- 管理员管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(300, 'admin', '管理员管理', 'admin', 1, 0, 3),
(301, 'admin:list', '管理员列表', 'admin', 2, 300, 1),
(302, 'admin:create', '创建管理员', 'admin', 2, 300, 2),
(303, 'admin:update', '更新管理员', 'admin', 2, 300, 3),
(304, 'admin:delete', '删除管理员', 'admin', 2, 300, 4);

-- --- 角色管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(400, 'role', '角色管理', 'role', 1, 0, 4),
(401, 'role:list', '角色列表', 'role', 2, 400, 1),
(402, 'role:create', '创建角色', 'role', 2, 400, 2),
(403, 'role:update', '更新角色', 'role', 2, 400, 3),
(404, 'role:permission', '设置角色权限', 'role', 2, 400, 4);

-- --- 权限管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(500, 'permission', '权限管理', 'permission', 1, 0, 5),
(501, 'permission:tree', '权限树', 'permission', 2, 500, 1);

-- --- 页面搭建模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(600, 'page', '页面搭建', 'page', 1, 0, 6),
(601, 'page:list', '页面列表', 'page', 2, 600, 1),
(602, 'page:create', '创建页面', 'page', 2, 600, 2),
(603, 'page:update', '更新页面', 'page', 2, 600, 3),
(604, 'page:delete', '删除页面', 'page', 2, 600, 4),
(605, 'page:publish', '发布页面', 'page', 2, 600, 5);

-- --- 内容管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(700, 'content', '内容管理', 'content', 1, 0, 7),
(701, 'content:list', '内容列表', 'content', 2, 700, 1),
(702, 'content:create', '创建内容', 'content', 2, 700, 2),
(703, 'content:update', '更新内容', 'content', 2, 700, 3),
(704, 'content:delete', '删除内容', 'content', 2, 700, 4),
(705, 'content:publish', '发布内容', 'content', 2, 700, 5);

-- --- 商品管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(800, 'product', '商品管理', 'product', 1, 0, 8),
(801, 'product:list', '商品列表', 'product', 2, 800, 1),
(802, 'product:create', '创建商品', 'product', 2, 800, 2),
(803, 'product:update', '更新商品', 'product', 2, 800, 3),
(804, 'product:delete', '删除商品', 'product', 2, 800, 4),
(805, 'product:publish', '上架/下架', 'product', 2, 800, 5);

-- --- 订单管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(900, 'order', '订单管理', 'order', 1, 0, 9),
(901, 'order:list', '订单列表', 'order', 2, 900, 1),
(902, 'order:detail', '订单详情', 'order', 2, 900, 2),
(903, 'order:ship', '发货', 'order', 2, 900, 3),
(904, 'order:refund', '退款', 'order', 2, 900, 4);

-- --- 活动管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(1000, 'activity', '活动管理', 'activity', 1, 0, 10),
(1001, 'activity:list', '活动列表', 'activity', 2, 1000, 1),
(1002, 'activity:create', '创建活动', 'activity', 2, 1000, 2),
(1003, 'activity:update', '更新活动', 'activity', 2, 1000, 3),
(1004, 'activity:delete', '删除活动', 'activity', 2, 1000, 4);

-- --- 会员管理模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(1100, 'member', '会员管理', 'member', 1, 0, 11),
(1101, 'member:list', '会员列表', 'member', 2, 1100, 1),
(1102, 'member:detail', '会员详情', 'member', 2, 1100, 2),
(1103, 'member:update', '更新会员', 'member', 2, 1100, 3);

-- --- 系统设置模块 ---
INSERT INTO mp_permission (id, code, name, module, type, parent_id, sort_order) VALUES
(1200, 'system', '系统设置', 'system', 1, 0, 12),
(1201, 'system:config', '系统配置', 'system', 2, 1200, 1),
(1202, 'system:log', '操作日志', 'system', 2, 1200, 2),
(1203, 'system:dict', '数据字典', 'system', 2, 1200, 3);


-- ==================== 初始化角色权限关联 ====================
-- 超级管理员(super_admin)拥有所有权限
INSERT INTO mp_role_permission (role_id, permission_id)
SELECT 1, id FROM mp_permission;

-- 内容运营(content_ops)权限
INSERT INTO mp_role_permission (role_id, permission_id) VALUES
(2, 100), (2, 101),  -- 仪表盘
(2, 200), (2, 201), (2, 202),  -- 用户管理
(2, 600), (2, 601), (2, 602), (2, 603), (2, 604), (2, 605),  -- 页面搭建
(2, 700), (2, 701), (2, 702), (2, 703), (2, 704), (2, 705),  -- 内容管理
(2, 1000), (2, 1001), (2, 1002), (2, 1003), (2, 1004);  -- 活动管理

-- 业务运营(biz_ops)权限
INSERT INTO mp_role_permission (role_id, permission_id) VALUES
(3, 100), (3, 101),  -- 仪表盘
(3, 200), (3, 201), (3, 202),  -- 用户管理
(3, 800), (3, 801), (3, 802), (3, 803), (3, 804), (3, 805),  -- 商品管理
(3, 900), (3, 901), (3, 902), (3, 903), (3, 904),  -- 订单管理
(3, 1000), (3, 1001), (3, 1002), (3, 1003), (3, 1004),  -- 活动管理
(3, 1100), (3, 1101), (3, 1102), (3, 1103);  -- 会员管理

-- 客服人员(service_staff)权限
INSERT INTO mp_role_permission (role_id, permission_id) VALUES
(4, 100), (4, 101),  -- 仪表盘
(4, 200), (4, 201), (4, 202),  -- 用户管理
(4, 900), (4, 901), (4, 902),  -- 订单管理（只读）
(4, 1100), (4, 1101), (4, 1102);  -- 会员管理（只读）


-- 注意：默认超级管理员账号由 DataInitializer 在应用启动时自动创建（admin / admin123）
