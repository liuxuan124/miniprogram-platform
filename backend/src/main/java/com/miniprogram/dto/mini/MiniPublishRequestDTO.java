package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "一次发布请求（可选勾选）")
public class MiniPublishRequestDTO {

    @Schema(description = "仅发布这些页面 ID；null=全部脏页（兼容旧客户端）；[]=本次不发页")
    private List<Long> pageIds;

    @Schema(description = "是否提升站点/导航草稿；默认 true；未勾选站点改动时传 false")
    private Boolean includeSite;

    @Schema(description = "本次改了什么（选填）；空则后端按改动项自动生成")
    private String notes;

    @Schema(description = "幂等键（可选）；同一键短窗口内重复请求直接拒绝")
    private String clientRequestId;
}
