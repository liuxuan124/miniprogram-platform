package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 保存草稿 DTO
 */
@Data
@Schema(description = "保存草稿参数")
public class PageDraftDTO {

    @NotNull(message = "DSL内容不能为空")
    @Schema(description = "页面DSL内容（JSON字符串）")
    private String dslContent;

    @Schema(description = "客户端最后已知版本号，用于并发冲突检测。传入时若与服务器版本不符则拒绝保存；不传则跳过检查（向后兼容）")
    private Integer expectedVersion;
}
