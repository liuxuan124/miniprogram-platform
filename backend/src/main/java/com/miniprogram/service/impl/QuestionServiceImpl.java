package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Answer;
import com.miniprogram.entity.MiniProgramUser;
import com.miniprogram.entity.Question;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.AnswerMapper;
import com.miniprogram.mapper.MiniProgramUserMapper;
import com.miniprogram.mapper.QuestionMapper;
import com.miniprogram.service.QuestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionServiceImpl extends BaseServiceImpl<QuestionMapper, Question> implements QuestionService {

    private final AnswerMapper answerMapper;
    private final MiniProgramUserMapper miniProgramUserMapper;
    private final AdminUserMapper adminUserMapper;
    private final ObjectMapper objectMapper;

    @Override
    public PageResult<QuestionDetailDTO> listQuestions(QuestionQueryDTO queryDTO) {
        LambdaQueryWrapper<Question> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(queryDTO.getStatus()), Question::getStatus, queryDTO.getStatus());
        wrapper.eq(queryDTO.getUserId() != null, Question::getUserId, queryDTO.getUserId());
        wrapper.orderByDesc(Question::getCreateTime);

        var page = this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                queryDTO.getCurrent(), queryDTO.getSize()), wrapper);
        List<QuestionDetailDTO> records = page.getRecords().stream().map(this::toDetailDTO).toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public QuestionDetailDTO getQuestionDetail(Long id, Long viewerUserId) {
        Question question = getExistingQuestion(id);
        if ("pending".equals(question.getStatus())) {
            if (viewerUserId == null || !viewerUserId.equals(question.getUserId())) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED, "问题待回答");
            }
        } else if ("hidden".equals(question.getStatus()) || "rejected".equals(question.getStatus())) {
            if (viewerUserId == null || !viewerUserId.equals(question.getUserId())) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED, "无权查看该问题");
            }
        }
        question.setViewCount((question.getViewCount() == null ? 0 : question.getViewCount()) + 1);
        this.updateById(question);
        return toDetailDTO(question);
    }

    @Override
    public QuestionDetailDTO getAdminQuestionDetail(Long id) {
        return toDetailDTO(getExistingQuestion(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuestionDetailDTO createQuestion(Long userId, QuestionCreateDTO dto) {
        Question entity = new Question();
        entity.setUserId(userId);
        entity.setBody(dto.getBody().trim());
        entity.setImages(toJsonString(dto.getImages()));
        entity.setStatus("pending");
        entity.setViewCount(0);
        this.save(entity);
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuestionDetailDTO answerQuestion(Long questionId, Long adminUserId, AnswerCreateDTO dto) {
        Question question = getExistingQuestion(questionId);
        if (!"pending".equals(question.getStatus()) && !"answered".equals(question.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "当前状态不可回答");
        }
        Answer existing = answerMapper.selectOne(new LambdaQueryWrapper<Answer>().eq(Answer::getQuestionId, questionId));
        Answer answer = existing != null ? existing : new Answer();
        answer.setQuestionId(questionId);
        answer.setAdminUserId(adminUserId);
        answer.setContent(dto.getContent());
        answer.setAttachments(toAttachmentsJson(dto.getAttachments()));
        answer.setPublishedAt(LocalDateTime.now());
        if (existing != null) answerMapper.updateById(answer);
        else answerMapper.insert(answer);

        question.setStatus("answered");
        this.updateById(question);
        return toDetailDTO(question);
    }

    @Override
    public QuestionDetailDTO rejectQuestion(Long questionId) {
        Question question = getExistingQuestion(questionId);
        question.setStatus("rejected");
        this.updateById(question);
        return toDetailDTO(question);
    }

    @Override
    public QuestionDetailDTO hideQuestion(Long questionId) {
        Question question = getExistingQuestion(questionId);
        question.setStatus("hidden");
        this.updateById(question);
        return toDetailDTO(question);
    }

    private Question getExistingQuestion(Long id) {
        Question entity = this.getById(id);
        if (entity == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "问题不存在");
        return entity;
    }

    private QuestionDetailDTO toDetailDTO(Question entity) {
        QuestionDetailDTO dto = new QuestionDetailDTO();
        dto.setId(entity.getId());
        dto.setUserId(entity.getUserId());
        dto.setBody(entity.getBody());
        dto.setImages(parseStringList(entity.getImages()));
        dto.setStatus(entity.getStatus());
        dto.setViewCount(entity.getViewCount());
        dto.setCreateTime(entity.getCreateTime());
        MiniProgramUser user = entity.getUserId() != null ? miniProgramUserMapper.selectById(entity.getUserId()) : null;
        dto.setUserNickname(user != null ? user.getNickname() : "用户");

        Answer answer = answerMapper.selectOne(new LambdaQueryWrapper<Answer>().eq(Answer::getQuestionId, entity.getId()));
        if (answer != null) {
            AnswerDetailDTO answerDTO = new AnswerDetailDTO();
            answerDTO.setId(answer.getId());
            answerDTO.setQuestionId(answer.getQuestionId());
            answerDTO.setAdminUserId(answer.getAdminUserId());
            answerDTO.setContent(answer.getContent());
            answerDTO.setAttachments(parseAttachments(answer.getAttachments()));
            answerDTO.setPublishedAt(answer.getPublishedAt());
            AdminUser admin = answer.getAdminUserId() != null ? adminUserMapper.selectById(answer.getAdminUserId()) : null;
            answerDTO.setAdminName(admin != null ? admin.getUsername() : "博主");
            dto.setAnswer(answerDTO);
        }
        return dto;
    }

    private List<String> parseStringList(String json) {
        if (!StringUtils.hasText(json)) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private String toJsonString(List<String> values) {
        if (values == null || values.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private List<ContentAttachmentDTO> parseAttachments(String json) {
        if (!StringUtils.hasText(json)) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<ContentAttachmentDTO>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private String toAttachmentsJson(List<ContentAttachmentDTO> attachments) {
        if (attachments == null || attachments.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
