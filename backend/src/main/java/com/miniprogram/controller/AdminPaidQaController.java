package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.PaidQaService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/paid-qa")
@RequiredArgsConstructor
public class AdminPaidQaController {

    private final PaidQaService paidQaService;

    @Data
    public static class AnswerBody {
        private String answerBody;
    }

    @PostMapping("/{id}/answer")
    @PreAuthorize("hasAuthority('content:update')")
    @Operation(summary = "回答付费提问")
    public R<Void> answer(@PathVariable Long id, @RequestBody AnswerBody body) {
        paidQaService.answerQuestion(SecurityUtils.getCurrentUserId(), id,
                body != null ? body.getAnswerBody() : null);
        return R.ok();
    }
}
