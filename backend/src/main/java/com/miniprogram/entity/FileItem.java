package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_file_item")
@Schema(description = "文件库文件项")
public class FileItem extends BaseEntity {

    @Schema(description = "租户ID")
    private Long tenantId;

    private String name;

    private String summary;

    private Long groupId;

    /** 相对 uploadDir 的存储路径，如 protected/files/2026-08-22/xxx.pdf */
    private String storageKey;

    private String mimeType;

    private String fileType;

    private Long size;

    /** draft / published */
    private String status;

    /** normal / premium */
    private String qualityTier;

    /** free / login / member / level / column_buyer / planet_member */
    private String readMode;

    /** column_buyer 绑定商品；空则任一专栏/电子书/资料包已购可开 */
    private Long boundProductId;

    private Integer previewPercent;

    /** none / first_page / pages / percent / full */
    private String previewMode;

    private Integer previewValue;

    private Integer pageCount;

    private Integer allowForward;

    private Integer watermark;

    private Long minReadLevelId;

    private Integer allowDownload;

    /** none / all / member / level */
    private String downloadAudience;

    private Long minDownloadLevelId;
}
