package com.miniprogram.service;

import com.miniprogram.dto.wechat.ImportTaskVO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;

/**
 * 公众号导入异步任务（Redis 进度）
 */
public interface ImportTaskService {

    /**
     * 尝试启动任务。若已有进行中任务则返回该任务（justCreated=false）。
     * Redis 不可用时抛异常，由调用方降级同步。
     */
    ImportTaskVO tryStart(String type, Long operatorId);

    void markRunning(String taskId);

    void updateProgress(String taskId, int processed, int total, String currentTitle);

    void finish(String taskId, WeChatContentSyncResultVO result);

    void fail(String taskId, String error);

    ImportTaskVO get(String taskId);

    ImportTaskVO getRunning();
}
