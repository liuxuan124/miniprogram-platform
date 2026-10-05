package com.miniprogram.mapper;

import com.miniprogram.entity.FileItem;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

public interface FileItemMapper extends com.miniprogram.mapper.BaseMapper<FileItem> {

    /**
     * 从回收站恢复：把 deleted 归零。
     * 走原生 @Update 而非 MyBatis-Plus 逻辑删除通道——后者会自动追加 deleted=0 条件，
     * 导致永远匹配不到已删记录。
     * status 原样保留（published 恢复后直接上架，draft 仍为草稿）。
     */
    @Update("UPDATE mp_file_item SET deleted = 0, update_time = NOW() WHERE id = #{id} AND deleted = 1")
    int restoreDeleted(@Param("id") Long id);

    /**
     * 查已软删文件（回收站列表）。
     * 必须用原生 @Select：MP 的 @TableLogic 会在任何 Wrapper 查询后自动追加 deleted=0，
     * 与「查 deleted=1」互相矛盾，永远返回空。
     */
    @Select("<script>"
            + "SELECT * FROM mp_file_item WHERE deleted = 1"
            + "<if test='keyword != null and keyword != \"\"'>"
            + " AND name LIKE CONCAT('%', #{keyword}, '%')"
            + "</if>"
            + " ORDER BY update_time DESC"
            + "</script>")
    List<FileItem> selectDeleted(@Param("keyword") String keyword);
}
