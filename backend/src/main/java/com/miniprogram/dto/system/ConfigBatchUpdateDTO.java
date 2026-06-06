package com.miniprogram.dto.system;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 批量更新配置 DTO
 */
@Data
@Schema(description = "批量更新配置请求")
public class ConfigBatchUpdateDTO {

    @Valid
    @NotEmpty(message = "配置列表不能为空")
    @Schema(description = "配置项列表")
    private List<ConfigItemDTO> configs;
}
