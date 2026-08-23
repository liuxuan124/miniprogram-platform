package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.contentagent.ContentAgentApplyResultVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskItemVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskVO;
import com.miniprogram.dto.contentagent.CreateContentAgentTaskDTO;
import com.miniprogram.dto.contentagent.ReviewContentAgentItemsDTO;

import java.util.List;
import java.util.Map;

public interface ContentAgentTaskService {

    ContentAgentTaskVO createTask(CreateContentAgentTaskDTO dto, Long operatorId);

    ContentAgentTaskVO getTask(Long taskId);

    ContentAgentTaskVO getRunning();

    PageResult<ContentAgentTaskItemVO> listItems(Long taskId, String reviewStatus, Long current, Long size);

    void reviewItems(Long taskId, ReviewContentAgentItemsDTO dto);

    ContentAgentApplyResultVO applyAccepted(Long taskId);

    void rollbackContent(Long contentId, Long versionId);

    List<Map<String, Object>> listTaskTypes();
}
