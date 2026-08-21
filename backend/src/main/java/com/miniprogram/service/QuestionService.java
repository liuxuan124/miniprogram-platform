package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;

public interface QuestionService {
    PageResult<QuestionDetailDTO> listQuestions(QuestionQueryDTO queryDTO);

    QuestionDetailDTO getQuestionDetail(Long id, Long viewerUserId);

    QuestionDetailDTO getAdminQuestionDetail(Long id);

    QuestionDetailDTO createQuestion(Long userId, QuestionCreateDTO dto);

    QuestionDetailDTO answerQuestion(Long questionId, Long adminUserId, AnswerCreateDTO dto);

    QuestionDetailDTO rejectQuestion(Long questionId);

    QuestionDetailDTO hideQuestion(Long questionId);
}
