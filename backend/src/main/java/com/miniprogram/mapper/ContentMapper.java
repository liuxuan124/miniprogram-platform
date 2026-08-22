package com.miniprogram.mapper;

import com.miniprogram.entity.Content;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 内容文章 Mapper
 */
public interface ContentMapper extends BaseMapper<Content> {

    @Update("UPDATE mp_content SET like_count = GREATEST(IFNULL(like_count,0) + #{delta}, 0) WHERE id = #{id}")
    int adjustLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Update("UPDATE mp_content SET favorite_count = GREATEST(IFNULL(favorite_count,0) + #{delta}, 0) WHERE id = #{id}")
    int adjustFavoriteCount(@Param("id") Long id, @Param("delta") int delta);
}
