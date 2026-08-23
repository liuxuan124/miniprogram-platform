package com.miniprogram.dto.contentagent;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReviewContentAgentItemsDTO {

    @NotEmpty(message = "请选择要审核的明细")
    private List<Long> itemIds;

    /** accept / reject */
    @NotEmpty(message = "请指定审核动作")
    private String action;

    private String rejectReason;
}
