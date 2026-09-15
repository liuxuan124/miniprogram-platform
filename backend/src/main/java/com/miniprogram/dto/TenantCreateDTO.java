package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "创建租户")
public class TenantCreateDTO {

    @NotBlank
    @Size(max = 64)
    @Pattern(regexp = "^[a-z][a-z0-9_]{1,62}$", message = "编码需小写字母开头，仅含小写字母/数字/下划线")
    @Schema(description = "租户编码")
    private String code;

    @NotBlank
    @Size(max = 128)
    @Schema(description = "租户名称")
    private String name;

    @Schema(description = "业态代码，默认 content_ip")
    private String industryCode;
}
