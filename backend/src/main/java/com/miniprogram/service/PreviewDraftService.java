package com.miniprogram.service;

import com.miniprogram.dto.PreviewDraftCreateDTO;
import com.miniprogram.dto.PreviewDraftCreateVO;
import com.miniprogram.dto.PreviewDraftVO;

/**
 * 装修器临时草稿预览（Redis 短时快照，关预览即删）
 */
public interface PreviewDraftService {

    PreviewDraftCreateVO create(PreviewDraftCreateDTO dto);

    PreviewDraftVO getByToken(String token);

    void delete(String token);
}
