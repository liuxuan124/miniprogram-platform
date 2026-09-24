package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.PlanetCheckinRecord;
import com.miniprogram.entity.PlanetCheckinTheme;
import com.miniprogram.entity.PlanetHomework;
import com.miniprogram.entity.PlanetHomeworkSubmission;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.PlanetEngagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "小程序-星球打卡作业")
@RestController
@RequestMapping("/api/v1/mp/planet-engagement")
@RequiredArgsConstructor
public class MpPlanetEngagementController {

    private final PlanetEngagementService planetEngagementService;

    @GetMapping("/checkin/themes")
    @Operation(summary = "打卡主题列表")
    public R<List<PlanetCheckinTheme>> themes(@RequestParam(required = false) String planetId) {
        return R.ok(planetEngagementService.listThemes(planetId));
    }

    @Data
    public static class CheckinBody {
        private Long themeId;
        private String content;
        private String imagesJson;
    }

    @PostMapping("/checkin")
    @Operation(summary = "提交打卡")
    public R<PlanetCheckinRecord> checkin(@RequestBody CheckinBody body) {
        return R.ok(planetEngagementService.checkin(
                SecurityUtils.getCurrentUserId(),
                body != null ? body.getThemeId() : null,
                body != null ? body.getContent() : null,
                body != null ? body.getImagesJson() : null));
    }

    @GetMapping("/homework")
    @Operation(summary = "作业列表")
    public R<List<PlanetHomework>> homework(@RequestParam(required = false) String planetId) {
        return R.ok(planetEngagementService.listHomework(planetId));
    }

    @Data
    public static class HomeworkSubmitBody {
        private Long homeworkId;
        private String body;
        private String attachmentsJson;
    }

    @PostMapping("/homework/submit")
    @Operation(summary = "提交作业")
    public R<PlanetHomeworkSubmission> submitHomework(@RequestBody HomeworkSubmitBody body) {
        return R.ok(planetEngagementService.submitHomework(
                SecurityUtils.getCurrentUserId(),
                body != null ? body.getHomeworkId() : null,
                body != null ? body.getBody() : null,
                body != null ? body.getAttachmentsJson() : null));
    }
}
