package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_question")
public class Question extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private Long userId;
    private String body;
    private String images;
    /** pending | answered | rejected | hidden */
    private String status;
    private Integer viewCount;
}
