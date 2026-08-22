package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.SubscribeLog;
import com.miniprogram.entity.SubscribeTemplate;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.SubscribeLogMapper;
import com.miniprogram.mapper.SubscribeTemplateMapper;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 订阅消息：落库 + 调用微信 subscribeMessage.send。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscribeMessageService {

    private final SubscribeTemplateMapper templateMapper;
    private final SubscribeLogMapper logMapper;
    private final UserMapper userMapper;
    private final WxMiniappTokenService wxMiniappTokenService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public void enqueue(Long userId, String scene, String bizId, Map<String, Object> data) {
        if (userId == null || !StringUtils.hasText(scene)) return;
        SubscribeTemplate tpl = templateMapper.selectOne(new LambdaQueryWrapper<SubscribeTemplate>()
                .eq(SubscribeTemplate::getScene, scene)
                .eq(SubscribeTemplate::getEnabled, 1)
                .last("LIMIT 1"));
        SubscribeLog row = new SubscribeLog();
        row.setUserId(userId);
        row.setScene(scene);
        row.setBizId(bizId);
        row.setCreateTime(LocalDateTime.now());
        if (tpl == null || !StringUtils.hasText(tpl.getTemplateId())) {
            row.setStatus("skipped");
            row.setErrorMsg("模板未配置");
            logMapper.insert(row);
            return;
        }
        row.setTemplateId(tpl.getTemplateId());
        try {
            row.setPayload(objectMapper.writeValueAsString(data == null ? Map.of() : data));
        } catch (Exception e) {
            row.setPayload("{}");
        }

        User user = userMapper.selectById(userId);
        if (user == null || !StringUtils.hasText(user.getOpenid())) {
            row.setStatus("failed");
            row.setErrorMsg("用户无 openid");
            logMapper.insert(row);
            return;
        }

        try {
            String accessToken = wxMiniappTokenService.getAccessToken();
            String url = "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + accessToken;
            Map<String, Object> body = new HashMap<>();
            body.put("touser", user.getOpenid());
            body.put("template_id", tpl.getTemplateId());
            body.put("page", "pages/order-list/order-list");
            body.put("data", toWxData(data));
            body.put("miniprogram_state", "formal");
            body.put("lang", "zh_CN");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            Map<?, ?> respBody = resp.getBody();
            Object errcode = respBody == null ? null : respBody.get("errcode");
            if (errcode != null && ((Number) errcode).intValue() != 0) {
                row.setStatus("failed");
                row.setErrorMsg(String.valueOf(respBody.get("errmsg")));
            } else {
                row.setStatus("sent");
            }
        } catch (Exception e) {
            row.setStatus("failed");
            row.setErrorMsg(e.getMessage());
            log.warn("订阅消息发送失败 scene={} userId={}", scene, userId, e);
        }
        logMapper.insert(row);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toWxData(Map<String, Object> data) {
        Map<String, Object> out = new HashMap<>();
        if (data == null) return out;
        int i = 1;
        for (Map.Entry<String, Object> e : data.entrySet()) {
            String key = e.getKey().matches("^(thing|phrase|character_string|amount|date|time)\\d+$")
                    ? e.getKey()
                    : ("thing" + i++);
            out.put(key, Map.of("value", String.valueOf(e.getValue())));
            if (i > 5) break;
        }
        return out;
    }
}
