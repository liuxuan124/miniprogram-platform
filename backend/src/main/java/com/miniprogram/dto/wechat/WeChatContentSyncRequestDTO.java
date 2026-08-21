package com.miniprogram.dto.wechat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 公众号已发布图文同步请求
 */
@Data
public class WeChatContentSyncRequestDTO {

    @Schema(description = "导入后归属的内容分类 ID，为空则不设置")
    private Long categoryId;

    @Schema(description = "是否以「已发布」状态入库，默认 true")
    private Boolean publish;
}
