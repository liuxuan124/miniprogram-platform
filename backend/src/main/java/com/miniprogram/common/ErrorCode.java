package com.miniprogram.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 错误码枚举
 */
@Getter
@AllArgsConstructor
public enum ErrorCode {

    // ==================== 通用错误 1000-1999 ====================
    PARAM_ERROR(1001, "参数错误"),
    PARAM_MISSING(1002, "参数缺失"),
    PARAM_TYPE_ERROR(1003, "参数类型错误"),

    // ==================== 认证错误 1100-1199（契约对齐） ====================
    NOT_LOGIN(110101, "未登录"),
    TOKEN_EXPIRED(110102, "Token已过期"),
    ACCOUNT_DISABLED(110103, "账号已禁用"),
    WX_LOGIN_FAILED(110201, "微信登录失败"),

    // ==================== 权限错误 2000-2999 ====================
    ACCESS_DENIED(200301, "无操作权限"),
    ROLE_NOT_FOUND(3002, "角色不存在"),

    // ==================== 业务错误 2000-2099（契约对齐） ====================
    ADMIN_NOT_FOUND(200401, "管理员不存在"),
    USERNAME_EXISTS(200501, "用户名已存在"),

    // ==================== 旧版兼容（保留） ====================
    TOKEN_INVALID(2001, "Token无效或已过期"),
    TOKEN_MISSING(2002, "缺少Token"),
    LOGIN_FAILED(2003, "登录失败"),
    ACCOUNT_LOCKED(2005, "账号已被锁定"),
    PASSWORD_ERROR(2006, "密码错误"),

    // ==================== 业务错误 4000-4999 ====================
    DATA_NOT_FOUND(4001, "数据不存在"),
    DATA_DUPLICATE(4002, "数据已存在"),
    DATA_SAVE_FAILED(4003, "数据保存失败"),
    DATA_UPDATE_FAILED(4004, "数据更新失败"),
    DATA_DELETE_FAILED(4005, "数据删除失败"),

    // ==================== 小程序相关 5000-5999 ====================
    MINIAPP_NOT_FOUND(5001, "小程序不存在"),
    MINIAPP_TEMPLATE_NOT_FOUND(5002, "模板不存在"),
    MINIAPP_PUBLISH_FAILED(5003, "小程序发布失败"),
    WECHAT_API_ERROR(5004, "微信接口调用失败"),

    // ==================== 页面搭建相关 3000-3999 ====================
    PAGE_NOT_FOUND(300401, "页面不存在"),
    PAGE_ALREADY_PUBLISHED(300201, "页面已发布不可删除"),
    PAGE_VERSION_NOT_FOUND(300402, "页面版本不存在"),
    PAGE_DSL_INVALID(300202, "DSL内容格式错误"),
    PAGE_PATH_DUPLICATE(300203, "页面路径已存在"),

    // ==================== 内容管理相关 7000-7999 ====================
    CONTENT_NOT_FOUND(400401, "内容不存在"),
    CONTENT_STATUS_ERROR(400201, "内容状态错误"),
    CONTENT_CATEGORY_NOT_FOUND(400402, "内容分类不存在"),
    CONTENT_CATEGORY_HAS_CONTENT(400203, "分类下有内容不可删除"),

    // ==================== AI推荐相关 8000-8999 ====================
    AI_CONVERSATION_NOT_FOUND(1000401, "对话不存在"),
    AI_SERVICE_ERROR(1000201, "AI服务异常"),

    // ==================== 表单相关 8000-8099 ====================
    FORM_NOT_FOUND(800401, "表单不存在"),
    FORM_DISABLED(800201, "表单已停用"),
    FORM_DATA_INVALID(800202, "表单提交数据校验失败"),

    // ==================== 预约相关 9000-9099 ====================
    APPOINTMENT_SERVICE_NOT_FOUND(900401, "预约服务不存在"),
    APPOINTMENT_SLOT_FULL(900201, "预约时段已满"),
    APPOINTMENT_NOT_FOUND(900402, "预约不存在"),
    APPOINTMENT_STATUS_ERROR(900202, "预约状态错误"),

    // ==================== 商品相关 5000-5099（契约对齐） ====================
    PRODUCT_NOT_FOUND(500401, "商品不存在"),
    PRODUCT_STATUS_ERROR(500201, "商品状态错误"),
    PRODUCT_CATEGORY_NOT_FOUND(500402, "商品分类不存在"),
    PRODUCT_CATEGORY_HAS_PRODUCT(500203, "分类下有商品不可删除"),

    // ==================== 订单相关 6000-6099（契约对齐） ====================
    ORDER_NOT_FOUND(600401, "订单不存在"),
    ORDER_STATUS_ERROR(600201, "订单状态错误"),
    ORDER_STOCK_INSUFFICIENT(600202, "库存不足"),

    // ==================== 支付相关 7000-7099（契约对齐） ====================
    PAYMENT_NOT_FOUND(700401, "支付记录不存在"),
    PAYMENT_STATUS_ERROR(700201, "支付状态错误"),

    // ==================== 文件相关 6000-6999 ====================
    FILE_UPLOAD_FAILED(6001, "文件上传失败"),
    FILE_NOT_FOUND(6002, "文件不存在"),
    FILE_TYPE_NOT_ALLOWED(6003, "文件类型不允许"),

    // ==================== 数据统计相关 1200-1299 ====================
    STATISTICS_PARAM_ERROR(1200201, "统计参数错误"),

    // ==================== 版本发布相关 3100-3199 ====================
    RELEASE_NOT_FOUND(310001, "版本发布记录不存在"),
    RELEASE_ALREADY_PUBLISHED(310002, "版本已发布"),
    RELEASE_NOT_PUBLISHED(310003, "版本未发布"),
    RELEASE_SEMVER_DUPLICATE(310004, "版本号已存在"),
    RELEASE_ROLLBACK_FAILED(310005, "版本回滚失败"),
    RELEASE_PROMOTE_FAILED(310006, "模板发布失败"),
    RELEASE_DELETE_FORBIDDEN(310007, "无法删除已发布的版本"),

    // ==================== 系统设置相关 1300-1399（契约对齐） ====================
    SYSTEM_CONFIG_NOT_FOUND(1300401, "配置不存在"),
    SYSTEM_CONFIG_VALUE_INVALID(1300201, "配置值校验失败");

    private final int code;
    private final String message;
}
