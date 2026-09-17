package com.miniprogram.service.pageai;

import com.miniprogram.dto.pageai.AiPagePipelineDtos;

public interface AiPagePipelineService {

    AiPagePipelineDtos.Result run(AiPagePipelineDtos.Request request);
}
