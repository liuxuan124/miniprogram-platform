package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_content_access_rule")
public class ContentAccessRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long contentId;
    private String grantsJson;
    private String previewMode;
    private Integer previewValue;
    private Long payProductId;
    private String planetId;
    private Integer categoryDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
