package com.miniprogram.dto.module;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "创建模块版本DTO")
public class CreateModuleVersionDTO {

    @NotBlank(message = "模块类型不能为空")
    @Schema(description = "模块类型: content/product/activity/coupon/member_level/form_template/appointment_service/system_config")
    private String moduleType;

    @NotNull(message = "目标ID不能为空")
    @Schema(description = "关联的业务数据ID")
    private Long targetId;

    @Schema(description = "版本数据快照JSON")
    private String versionData;

    @Schema(description = "变更摘要")
    private String changeSummary;
}
