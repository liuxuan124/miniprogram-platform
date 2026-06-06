-- =====================================================
-- V11: 用户模块表
-- =====================================================

-- 小程序用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `openid` varchar(64) NOT NULL COMMENT '微信openid',
  `unionid` varchar(64) DEFAULT NULL COMMENT '微信unionid',
  `name` varchar(100) DEFAULT NULL COMMENT '用户昵称',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `source` varchar(20) DEFAULT 'search' COMMENT '来源渠道：share/scan/search/ad',
  `last_visit` datetime DEFAULT NULL COMMENT '最近访问时间',
  `order_count` int(11) DEFAULT 0 COMMENT '订单数',
  `form_count` int(11) DEFAULT 0 COMMENT '表单提交数',
  `act_count` int(11) DEFAULT 0 COMMENT '活动报名数',
  `status` tinyint(4) DEFAULT 1 COMMENT '状态 1正常 0禁用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_phone` (`phone`),
  KEY `idx_source` (`source`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户表';
