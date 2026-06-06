package com.miniprogram.dto.system;

import com.miniprogram.dto.PageDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 操作日志查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "操作日志查询参数")
public class OperationLogQueryDTO extends PageDTO {

    @Schema(description = "操作人用户名")
    private String username;

    @Schema(description = "操作描述(模糊搜索)")
    private String operation;

    @Schema(description = "状态: 1=成功, 0=失败")
    private Integer status;

    @Schema(description = "开始时间")
    private String startTime;

    @Schema(description = "结束时间")
    private String endTime;
}
