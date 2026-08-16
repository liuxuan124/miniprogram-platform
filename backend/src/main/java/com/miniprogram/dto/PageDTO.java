package com.miniprogram.dto;

import com.miniprogram.common.BusinessException;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 分页查询基础 DTO
 */
@Data
@Schema(description = "分页查询参数")
public class PageDTO {

    @Schema(description = "页码，从 1 开始。兼容 current")
    private Long page;

    @Schema(description = "每页数量，默认 20，最大 100。兼容 size")
    private Long pageSize;

    /** Spring MVC 查询参数 page_size 绑定（JSON 仍走 pageSize） */
    public void setPage_size(Long pageSize) {
        this.pageSize = pageSize;
    }

    public Long getPage_size() {
        return pageSize;
    }

    @Schema(description = "当前页码（兼容字段）", example = "1")
    private Long current = 1L;

    @Schema(description = "每页大小（兼容字段）", example = "20")
    private Long size = 20L;

    @Schema(description = "排序字段")
    private String orderBy;

    @Schema(description = "排序方向 asc/desc", example = "desc")
    private String orderDir = "desc";

    /**
     * 将 page/page_size 与 current/size 归一化，默认 20，超过 100 拒绝
     */
    public void normalize() {
        if (page == null && current != null) {
            page = current;
        }
        if (pageSize == null && size != null) {
            pageSize = size;
        }
        if (page == null || page < 1) {
            page = 1L;
        }
        if (pageSize == null || pageSize < 1) {
            pageSize = 20L;
        }
        if (pageSize > 100) {
            throw new BusinessException(100101, "每页数量不能超过 100");
        }
        current = page;
        size = pageSize;
    }
}
