package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.entity.Channel;
import com.miniprogram.service.ChannelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "小程序-渠道解析")
@RestController
@RequestMapping("/api/v1/mp/channel")
@RequiredArgsConstructor
public class MpChannelController {

    private final ChannelService service;

    @Operation(summary = "解析渠道码（小程序入口鉴权用）")
    @GetMapping
    public R<Map<String, Object>> resolve(@RequestParam(required = false) String ch) {
        if (!StringUtils.hasText(ch)) {
            return R.ok(new HashMap<>());
        }
        Channel c = service.resolveByKey(ch);
        if (c == null) {
            throw new BusinessException(404001, "渠道码不存在");
        }
        Map<String, Object> vo = new HashMap<>();
        vo.put("channelId", c.getId());
        vo.put("channelKey", c.getChannelKey());
        vo.put("channelName", c.getChannelName());
        vo.put("channelType", c.getChannelType());
        return R.ok(vo);
    }
}