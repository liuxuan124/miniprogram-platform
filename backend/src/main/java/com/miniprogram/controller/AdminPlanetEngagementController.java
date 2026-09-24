package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.PlanetCheckinTheme;
import com.miniprogram.entity.PlanetHomework;
import com.miniprogram.mapper.PlanetCheckinThemeMapper;
import com.miniprogram.mapper.PlanetHomeworkMapper;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/planet-engagement")
@RequiredArgsConstructor
public class AdminPlanetEngagementController {

    private final PlanetCheckinThemeMapper planetCheckinThemeMapper;
    private final PlanetHomeworkMapper planetHomeworkMapper;

    @PostMapping("/checkin/themes")
    @PreAuthorize("hasAuthority('content:create')")
    @Operation(summary = "创建打卡主题")
    public R<PlanetCheckinTheme> createTheme(@RequestBody PlanetCheckinTheme body) {
        body.setId(null);
        body.setCreatedAt(LocalDateTime.now());
        body.setUpdatedAt(LocalDateTime.now());
        if (body.getStatus() == null) body.setStatus("active");
        planetCheckinThemeMapper.insert(body);
        return R.ok(body);
    }

    @PostMapping("/homework")
    @PreAuthorize("hasAuthority('content:create')")
    @Operation(summary = "创建作业")
    public R<PlanetHomework> createHomework(@RequestBody PlanetHomework body) {
        body.setId(null);
        body.setCreatedAt(LocalDateTime.now());
        if (body.getStatus() == null) body.setStatus("active");
        planetHomeworkMapper.insert(body);
        return R.ok(body);
    }
}
