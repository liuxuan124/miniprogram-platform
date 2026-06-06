package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 操作日志实体
 */
@Data
@TableName("mp_operation_log")
public class OperationLog {

    /**
     * 主键ID
     */
    private Long id;

    /**
     * 操作人ID
     */
    private Long userId;

    /**
     * 操作人用户名
     */
    private String username;

    /**
     * 操作描述
     */
    private String operation;

    /**
     * 请求方法(类名.方法名)
     */
    private String method;

    /**
     * 请求参数
     */
    private String params;

    /**
     * 请求IP
     */
    private String ip;

    /**
     * 执行时长(ms)
     */
    private Long duration;

    /**
     * 状态: 1=成功, 0=失败
     */
    private Integer status;

    /**
     * 错误信息
     */
    private String errorMsg;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}
