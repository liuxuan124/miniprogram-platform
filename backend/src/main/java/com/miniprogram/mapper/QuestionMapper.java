package com.miniprogram.mapper;

import com.miniprogram.entity.Question;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface QuestionMapper extends BaseMapper<Question> {

    // update_time 显式自赋值钉住，避免浏览计数污染「更新时间」（同 QA P1-05）
    @Update("UPDATE mp_question SET view_count = IFNULL(view_count,0) + 1, update_time = update_time WHERE id = #{id}")
    int incrementViewCount(@Param("id") Long id);
}
