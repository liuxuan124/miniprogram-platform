package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.PlanetCheckinRecord;
import com.miniprogram.entity.PlanetCheckinTheme;
import com.miniprogram.entity.PlanetHomework;
import com.miniprogram.entity.PlanetHomeworkSubmission;
import com.miniprogram.mapper.PlanetCheckinRecordMapper;
import com.miniprogram.mapper.PlanetCheckinThemeMapper;
import com.miniprogram.mapper.PlanetHomeworkMapper;
import com.miniprogram.mapper.PlanetHomeworkSubmissionMapper;
import com.miniprogram.service.PlanetEngagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanetEngagementServiceImpl implements PlanetEngagementService {

    private final PlanetCheckinThemeMapper planetCheckinThemeMapper;
    private final PlanetCheckinRecordMapper planetCheckinRecordMapper;
    private final PlanetHomeworkMapper planetHomeworkMapper;
    private final PlanetHomeworkSubmissionMapper planetHomeworkSubmissionMapper;

    @Override
    public List<PlanetCheckinTheme> listThemes(String planetId) {
        return planetCheckinThemeMapper.selectList(new LambdaQueryWrapper<PlanetCheckinTheme>()
                .eq(StringUtils.hasText(planetId), PlanetCheckinTheme::getPlanetId, planetId)
                .eq(PlanetCheckinTheme::getStatus, "active")
                .orderByDesc(PlanetCheckinTheme::getId));
    }

    @Override
    public PlanetCheckinRecord checkin(Long userId, Long themeId, String content, String imagesJson) {
        PlanetCheckinTheme theme = planetCheckinThemeMapper.selectById(themeId);
        if (theme == null || !"active".equals(theme.getStatus())) {
            throw new BusinessException(404001, "打卡主题不存在");
        }
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Long today = planetCheckinRecordMapper.selectCount(new LambdaQueryWrapper<PlanetCheckinRecord>()
                .eq(PlanetCheckinRecord::getThemeId, themeId)
                .eq(PlanetCheckinRecord::getUserId, userId)
                .ge(PlanetCheckinRecord::getCreatedAt, start));
        if (today != null && today > 0) {
            throw new BusinessException(400001, "今日已打卡");
        }
        PlanetCheckinRecord row = new PlanetCheckinRecord();
        row.setThemeId(themeId);
        row.setUserId(userId);
        row.setContent(content);
        row.setImagesJson(imagesJson);
        row.setAuditStatus("approved");
        row.setCreatedAt(LocalDateTime.now());
        planetCheckinRecordMapper.insert(row);
        return row;
    }

    @Override
    public List<PlanetHomework> listHomework(String planetId) {
        return planetHomeworkMapper.selectList(new LambdaQueryWrapper<PlanetHomework>()
                .eq(StringUtils.hasText(planetId), PlanetHomework::getPlanetId, planetId)
                .eq(PlanetHomework::getStatus, "active")
                .orderByDesc(PlanetHomework::getId));
    }

    @Override
    public PlanetHomeworkSubmission submitHomework(Long userId, Long homeworkId, String body, String attachmentsJson) {
        PlanetHomework hw = planetHomeworkMapper.selectById(homeworkId);
        if (hw == null || !"active".equals(hw.getStatus())) {
            throw new BusinessException(404001, "作业不存在");
        }
        PlanetHomeworkSubmission existing = planetHomeworkSubmissionMapper.selectOne(
                new LambdaQueryWrapper<PlanetHomeworkSubmission>()
                        .eq(PlanetHomeworkSubmission::getHomeworkId, homeworkId)
                        .eq(PlanetHomeworkSubmission::getUserId, userId)
                        .last("LIMIT 1"));
        if (existing != null) {
            existing.setBody(body);
            existing.setAttachmentsJson(attachmentsJson);
            existing.setAuditStatus("pending");
            planetHomeworkSubmissionMapper.updateById(existing);
            return existing;
        }
        PlanetHomeworkSubmission row = new PlanetHomeworkSubmission();
        row.setHomeworkId(homeworkId);
        row.setUserId(userId);
        row.setBody(body);
        row.setAttachmentsJson(attachmentsJson);
        row.setAuditStatus("pending");
        row.setCreatedAt(LocalDateTime.now());
        planetHomeworkSubmissionMapper.insert(row);
        return row;
    }
}
