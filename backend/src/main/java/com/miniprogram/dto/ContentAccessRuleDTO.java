package com.miniprogram.dto;

import lombok.Data;

import java.util.List;

@Data
public class ContentAccessRuleDTO {
    /** OR 条件：free, login, member, planet, product, points */
    private List<String> grants;
    private String previewMode;
    private Integer previewValue;
    private Long payProductId;
    private String planetId;
}
