package com.miniprogram.service;

import com.miniprogram.dto.miniapp.PushPreviewDTO;
import com.miniprogram.dto.miniapp.PushPreviewResultVO;

public interface MiniappWxUploadService {

    PushPreviewResultVO pushPreview(Long releaseId, PushPreviewDTO dto);

    PushPreviewResultVO getLastPushStatus();
}
