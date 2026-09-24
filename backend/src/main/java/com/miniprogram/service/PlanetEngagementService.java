package com.miniprogram.service;

import com.miniprogram.entity.PlanetCheckinRecord;
import com.miniprogram.entity.PlanetCheckinTheme;
import com.miniprogram.entity.PlanetHomework;
import com.miniprogram.entity.PlanetHomeworkSubmission;

import java.util.List;

public interface PlanetEngagementService {
    List<PlanetCheckinTheme> listThemes(String planetId);

    PlanetCheckinRecord checkin(Long userId, Long themeId, String content, String imagesJson);

    List<PlanetHomework> listHomework(String planetId);

    PlanetHomeworkSubmission submitHomework(Long userId, Long homeworkId, String body, String attachmentsJson);
}
