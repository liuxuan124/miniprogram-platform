package com.miniprogram.mapper;

import com.miniprogram.entity.Content;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 内容文章 Mapper
 */
public interface ContentMapper extends BaseMapper<Content> {

    // 注意：mp_content.update_time 是 ON UPDATE CURRENT_TIMESTAMP，
    // 任何 UPDATE 都会刷新它。计数类自增必须显式 update_time = update_time 钉住，
    // 否则点赞/收藏/浏览会污染列表的「更新时间」（QA P1-05）。

    @Update("UPDATE mp_content SET like_count = GREATEST(IFNULL(like_count,0) + #{delta}, 0), update_time = update_time WHERE id = #{id}")
    int adjustLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Update("UPDATE mp_content SET favorite_count = GREATEST(IFNULL(favorite_count,0) + #{delta}, 0), update_time = update_time WHERE id = #{id}")
    int adjustFavoriteCount(@Param("id") Long id, @Param("delta") int delta);

    @Update("UPDATE mp_content SET view_count = IFNULL(view_count,0) + 1, update_time = update_time WHERE id = #{id}")
    int incrementViewCount(@Param("id") Long id);
}
