package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 创建预约 DTO
 */
@Data
@Schema(description = "创建预约参数")
public class AppointmentCreateDTO {

    @NotNull(message = "预约服务ID不能为空")
    @Schema(description = "预约服务ID")
    private Long serviceId;

    @NotNull(message = "预约时段ID不能为空")
    @Schema(description = "预约时段ID")
    private Long slotId;

    @NotBlank(message = "联系人姓名不能为空")
    @Schema(description = "联系人姓名")
    private String contactName;

    @NotBlank(message = "联系人电话不能为空")
    @Schema(description = "联系人电话")
    private String contactPhone;

    @Schema(description = "备注")
    private String remark;
}
