package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_content_favorite")
public class ContentFavorite {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long contentId;
    private Long userId;
    private LocalDateTime createTime;
}
