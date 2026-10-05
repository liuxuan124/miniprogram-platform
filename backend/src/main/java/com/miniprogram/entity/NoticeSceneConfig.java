package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("mp_notice_scene_config")
public class NoticeSceneConfig implements Serializable {
    private static final long serialVersionUID = 1L;

    private String scene;
    private String label;
    /** 0=关闭后不再产生该场景站内信 */
    private Integer enabled;
    private Integer sortNo;
}
