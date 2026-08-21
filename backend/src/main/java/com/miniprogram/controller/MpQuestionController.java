package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.QuestionCreateDTO;
import com.miniprogram.dto.QuestionDetailDTO;
import com.miniprogram.dto.QuestionQueryDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "小程序-问答", description = "用户提问与公开问答列表")
@RestController
@RequestMapping("/api/v1/mp/questions")
@RequiredArgsConstructor
public class MpQuestionController {

    private final QuestionService questionService;

    @Operation(summary = "公开问答列表")
    @GetMapping
    public R<PageResult<QuestionDetailDTO>> listAnswered(QuestionQueryDTO queryDTO) {
        queryDTO.setStatus("answered");
        return R.ok(questionService.listQuestions(queryDTO));
    }

    @Operation(summary = "问答详情")
    @GetMapping("/{id}")
    public R<QuestionDetailDTO> detail(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(questionService.getQuestionDetail(id, userId));
    }

    @Operation(summary = "我的提问")
    @GetMapping("/my")
    public R<PageResult<QuestionDetailDTO>> myQuestions(QuestionQueryDTO queryDTO) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        queryDTO.setUserId(userId);
        return R.ok(questionService.listQuestions(queryDTO));
    }

    @Operation(summary = "提交问题")
    @PostMapping
    public R<QuestionDetailDTO> create(@Valid @RequestBody QuestionCreateDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(questionService.createQuestion(userId, dto));
    }
}
