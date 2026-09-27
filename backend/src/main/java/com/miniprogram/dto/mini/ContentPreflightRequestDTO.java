package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "内容发布预检（勾选 change_id）")
public class ContentPreflightRequestDTO {

    @Schema(description = "待检 change_id，如 site:*、page:12；空=全部待发布")
    private List<String> changeIds = new ArrayList<>();
}
