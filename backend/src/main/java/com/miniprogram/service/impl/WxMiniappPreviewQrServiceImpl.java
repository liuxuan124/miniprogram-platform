package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.WxMiniappPreviewQrService;
import com.miniprogram.service.WxMiniappTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WxMiniappPreviewQrServiceImpl implements WxMiniappPreviewQrService {

    private static final String API = "https://api.weixin.qq.com/wxa/getwxacodeunlimit";

    private final WxMiniappTokenService wxMiniappTokenService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public byte[] createUnlimitedQrPng(String scene, String page) {
        if (!StringUtils.hasText(scene) || scene.length() > 32) {
            return null;
        }
        String normalizedPage = StringUtils.hasText(page) ? page.trim() : "pages/index/index";
        if (normalizedPage.startsWith("/")) {
            normalizedPage = normalizedPage.substring(1);
        }
        try {
            String accessToken = wxMiniappTokenService.getAccessToken();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("scene", scene.trim());
            body.put("page", normalizedPage);
            body.put("check_path", false);
            body.put("env_version", "trial");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
            ResponseEntity<byte[]> resp = restTemplate.postForEntity(
                    API + "?access_token=" + accessToken, entity, byte[].class);
            byte[] bytes = resp.getBody();
            if (bytes == null || bytes.length == 0) {
                return null;
            }
            if (bytes.length < 200 && bytes[0] == '{') {
                log.warn("微信小程序码接口返回 JSON: {}", new String(bytes));
                return null;
            }
            return bytes;
        } catch (Exception e) {
            log.warn("生成体验版预览小程序码失败: {}", e.getMessage());
            return null;
        }
    }
}
