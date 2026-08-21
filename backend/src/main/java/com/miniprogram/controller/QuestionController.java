package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AnswerCreateDTO;
import com.miniprogram.dto.QuestionDetailDTO;
import com.miniprogram.dto.QuestionQueryDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "管理后台-问答", description = "问答收件箱与博主回答")
@RestController
@RequestMapping("/api/v1/admin/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @Operation(summary = "问答列表")
    @GetMapping
    public R<PageResult<QuestionDetailDTO>> list(QuestionQueryDTO queryDTO) {
        return R.ok(questionService.listQuestions(queryDTO));
    }

    @Operation(summary = "问答详情")
    @GetMapping("/{id}")
    public R<QuestionDetailDTO> detail(@PathVariable Long id) {
        return R.ok(questionService.getAdminQuestionDetail(id));
    }

    @Operation(summary = "回答问题")
    @PostMapping("/{id}/answer")
    public R<QuestionDetailDTO> answer(@PathVariable Long id, @Valid @RequestBody AnswerCreateDTO dto) {
        Long adminUserId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(questionService.answerQuestion(id, adminUserId, dto));
    }

    @Operation(summary = "驳回问题")
    @PutMapping("/{id}/reject")
    public R<QuestionDetailDTO> reject(@PathVariable Long id) {
        return R.ok(questionService.rejectQuestion(id));
    }

    @Operation(summary = "下架问答")
    @PutMapping("/{id}/hide")
    public R<QuestionDetailDTO> hide(@PathVariable Long id) {
        return R.ok(questionService.hideQuestion(id));
    }
}
