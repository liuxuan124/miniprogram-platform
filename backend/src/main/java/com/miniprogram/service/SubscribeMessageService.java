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
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscribeMessageService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SubscribeTemplateMapper templateMapper;
    private final SubscribeLogMapper logMapper;
    private final UserMapper userMapper;
    private final WxMiniappTokenService wxMiniappTokenService;
    private final SystemConfigService systemConfigService;
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
        Map<String, Object> payload = data == null ? Map.of() : data;
        try {
            row.setPayload(objectMapper.writeValueAsString(payload));
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
            body.put("page", resolvePage(scene, payload));
            body.put("data", toWxData(scene, payload));
            body.put("miniprogram_state", resolveMiniState());
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

    private String resolveMiniState() {
        String state = systemConfigService.getConfigValue("subscribe_miniprogram_state");
        if ("developer".equals(state) || "trial".equals(state) || "formal".equals(state)) {
            return state;
        }
        return "trial";
    }

    private String resolvePage(String scene, Map<String, Object> data) {
        Object page = data.get("page");
        if (page != null && StringUtils.hasText(String.valueOf(page))) {
            return String.valueOf(page).replaceFirst("^/", "");
        }
        Object orderId = data.get("orderId");
        if (orderId != null && ("order_status".equals(scene) || "order_shipped".equals(scene))) {
            return "pkg-trade/order-detail/order-detail?id=" + orderId;
        }
        if ("coupon_expire".equals(scene)) return "pkg-user/coupon-list/coupon-list";
        if ("appointment_remind".equals(scene)) return "pkg-user/my-appointments/my-appointments";
        if ("activity_remind".equals(scene)) return "pkg-extra/activity-list/activity-list";
        return "pages/mine/mine";
    }

    private Map<String, Object> toWxData(String scene, Map<String, Object> data) {
        Map<String, String> fields = new LinkedHashMap<>();
        if ("order_status".equals(scene)) {
            fields.put("thing12", clip(str(data, "productName", "商品"), 20));
            fields.put("amount2", money(str(data, "amount", "0.00")));
            fields.put("character_string3", clip(str(data, "orderNo", "-"), 32));
            fields.put("time4", str(data, "time", now()));
            fields.put("phrase11", clip(str(data, "statusText", "支付成功"), 5));
        } else if ("order_shipped".equals(scene)) {
            fields.put("thing5", clip(str(data, "productName", "商品"), 20));
            fields.put("character_string7", clip(str(data, "orderNo", "-"), 32));
            fields.put("time3", str(data, "time", now()));
            fields.put("phrase12", clip(str(data, "statusText", "发货中"), 5));
            fields.put("thing8", clip(str(data, "remark", "请在订单或客服中查看"), 20));
        } else if ("coupon_expire".equals(scene)) {
            fields.put("thing2", clip(str(data, "couponName", "优惠券"), 20));
            fields.put("time13", str(data, "time", now()));
            fields.put("thing1", clip(str(data, "tip", "优惠券即将过期"), 20));
        } else if ("appointment_remind".equals(scene)) {
            fields.put("thing1", clip(str(data, "title", "预约项目"), 20));
            fields.put("date2", str(data, "time", now()));
            fields.put("thing3", clip(str(data, "place", "线上服务"), 20));
        } else if ("activity_remind".equals(scene)) {
            fields.put("thing1", clip(str(data, "title", "活动"), 20));
            fields.put("time2", str(data, "time", now()));
            fields.put("thing3", clip(str(data, "tip", "活动即将开始"), 20));
        } else {
            int i = 1;
            for (Map.Entry<String, Object> e : data.entrySet()) {
                if ("page".equals(e.getKey()) || "orderId".equals(e.getKey())) continue;
                String key = e.getKey().matches("^[a-z_]+\\d+$") ? e.getKey() : ("thing" + i++);
                fields.put(key, clip(String.valueOf(e.getValue()), 20));
                if (fields.size() >= 5) break;
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        fields.forEach((k, v) -> out.put(k, Map.of("value", v)));
        return out;
    }

    private String str(Map<String, Object> data, String key, String fallback) {
        Object v = data.get(key);
        if (v == null || !StringUtils.hasText(String.valueOf(v))) return fallback;
        return String.valueOf(v);
    }

    private String money(String raw) {
        String v = raw.replace("¥", "").replace("元", "").trim();
        return v + "元";
    }

    private String clip(String raw, int max) {
        String v = raw == null ? "" : raw.trim();
        return v.length() <= max ? v : v.substring(0, max);
    }

    private String now() {
        return LocalDateTime.now().format(TIME_FMT);
    }
}
