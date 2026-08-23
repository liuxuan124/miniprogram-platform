package com.miniprogram.service.contentagent;

import com.miniprogram.mapper.AgentTaskMapper;
import com.miniprogram.service.impl.ContentAgentTaskServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class ContentAgentTaskRunner {

    private final ContentAgentTaskServiceImpl taskService;

    public ContentAgentTaskRunner(@Lazy ContentAgentTaskServiceImpl taskService) {
        this.taskService = taskService;
    }

    @Async("importExecutor")
    public void run(Long taskId, List<String> types, List<Long> contentIds,
                    String freeformPrompt, String targetFormat) {
        taskService.executeTask(taskId, types, contentIds, freeformPrompt, targetFormat);
    }
}
