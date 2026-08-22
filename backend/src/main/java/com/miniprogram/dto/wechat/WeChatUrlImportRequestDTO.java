package com.miniprogram.dto.wechat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 公众号文章链接导入请求
 */
@Data
public class WeChatUrlImportRequestDTO {

    @Schema(description = "公众号文章链接列表（mp.weixin.qq.com/s/...）")
    private List<String> urls = new ArrayList<>();

    @Schema(description = "导入后归属的内容分类 ID，为空则不设置")
    private Long categoryId;

    @Schema(description = "是否以「已发布」状态入库，默认 false（草稿）")
    private Boolean publish;
}
