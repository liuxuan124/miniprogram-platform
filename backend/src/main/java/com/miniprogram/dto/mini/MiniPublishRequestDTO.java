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
}
