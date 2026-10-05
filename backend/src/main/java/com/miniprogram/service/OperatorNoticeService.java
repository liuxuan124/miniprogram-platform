package com.miniprogram.service;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.OperatorNoticeSetting;
import com.miniprogram.mapper.OperatorNoticeSettingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 运营端通知：三通道并行，互不影响。
 * <ul>
 *   <li><b>企微群机器人</b>（{@code wecom_bot}）—— 零成本，Markdown 卡片推到运营群</li>
 *   <li><b>服务号模板消息</b>（{@code mp_official}）—— 推到运营人员个人微信</li>
 *   <li><b>浏览器桌面通知</b>（{@code browser}）—— 由 SSE 推事件，前端 Notification API 弹窗 + 提示音</li>
 * </ul>
 *
 * <p><b>绝不能因为一条通道失败而阻断其他通道</b>：企微 key 填错、服务号没认证都很常见，
 * 通知发不出去不能影响下单/发货主流程。所有通道都是 {@code try-catch 吞异常 + 记日志}。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OperatorNoticeService {

    private static final int HTTP_TIMEOUT_MS = 5000;
    private static final String WECOM_BOT_API = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send";

    private final OperatorNoticeSettingMapper settingMapper;
    private final ImJsonSupport imJson;
    private final ImEventPublisher imPublisher;

    // ==================== 配置读写 ====================

    public List<Map<String, Object>> listSettings() {
        List<OperatorNoticeSetting> rows = settingMapper.selectList(null);
        Map<String, OperatorNoticeSetting> byChannel = new LinkedHashMap<>();
        for (OperatorNoticeSetting r : rows) {
            byChannel.put(r.getChannel(), r);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (String channel : List.of(OperatorNoticeSetting.CHANNEL_WECOM_BOT,
                OperatorNoticeSetting.CHANNEL_MP_OFFICIAL, OperatorNoticeSetting.CHANNEL_BROWSER)) {
            OperatorNoticeSetting r = byChannel.get(channel);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("channel", channel);
            m.put("label", channelLabel(channel));
            m.put("enabled", r != null && r.getEnabled() != null && r.getEnabled() == 1);
            m.put("config", r == null ? new LinkedHashMap<String, Object>() : imJson.readMap(r.getConfig()));
            m.put("receivers", r == null || !StringUtils.hasText(r.getReceivers())
                    ? new ArrayList<>() : imJson.readList(r.getReceivers()));
            out.add(m);
        }
        return out;
    }

    @Transactional
    public void updateSetting(String channel, boolean enabled, Map<String, Object> config, List<String> receivers) {
        OperatorNoticeSetting row = settingMapper.selectOne(new LambdaQueryWrapper<OperatorNoticeSetting>()
                .eq(OperatorNoticeSetting::getChannel, channel).last("LIMIT 1"));
        if (row == null) {
            row = new OperatorNoticeSetting();
            row.setChannel(channel);
        }
        row.setEnabled(enabled ? 1 : 0);
        if (config != null) {
            row.setConfig(writeJson(config));
        }
        if (receivers != null) {
            row.setReceivers(writeJson(receivers));
        }
        upsertSetting(row);
    }

    /**
     * 通道配置 upsert。
     * <p>BaseMapper 没有 {@code insertOrUpdate}（那是 IService 的方法），
     * 这里按 channel 唯一键手工判断。
     */
    private void upsertSetting(OperatorNoticeSetting row) {
        OperatorNoticeSetting exists = settingMapper.selectOne(new LambdaQueryWrapper<OperatorNoticeSetting>()
                .eq(OperatorNoticeSetting::getChannel, row.getChannel()).last("LIMIT 1"));
        if (exists == null) {
            settingMapper.insert(row);
            return;
        }
        row.setId(exists.getId());
        settingMapper.updateById(row);
    }

    /** 企微 webhook 连通性自检：后台点「测试」时用，避免填了错 key 才发现收不到。 */
    public String testWecomBot(String webhookOrKey, String title, String content) {
        String url = normalizeWecomUrl(webhookOrKey);
        if (url == null) {
            return "请填写企微机器人 Webhook 地址或 Key";
        }
        String markdown = "**" + (StringUtils.hasText(title) ? title : "测试消息") + "**\n"
                + (StringUtils.hasText(content) ? content : "这是一条来自客服工作台的连通性测试。");
        try {
            String resp = HttpRequest.post(url)
                    .header("Content-Type", "application/json; charset=utf-8")
                    .body(writeJson(Map.of("msgtype", "markdown", "markdown", Map.of("content", markdown))))
                    .timeout(HTTP_TIMEOUT_MS)
                    .execute().body();
            Map<String, Object> parsed = parseJsonMap(resp);
            Object errcode = parsed == null ? null : parsed.get("errcode");
            if (errcode == null || "0".equals(String.valueOf(errcode))) {
                return null;
            }
            return "企微返回 errcode=" + errcode + " errmsg=" + parsed.get("errmsg");
        } catch (Exception e) {
            return "请求失败：" + e.getMessage();
        }
    }

    // ==================== 触发 ====================

    /**
     * 新订单提醒（场景 A：order.paid）。
     * 异步执行 —— 第三方 HTTP 不能挂在下单事务里。
     */
    @Async("noticeExecutor")
    public void notifyOrderPaid(Long userId, String nickname, String productName, int quantity,
                                String payAmount, String orderNo) {
        String title = "新订单提醒";
        StringBuilder md = new StringBuilder();
        md.append("**客户**：").append(nullTo(nickname, "用户")).append("\n");
        md.append("**商品**：").append(nullTo(productName, "订单商品"));
        if (quantity > 1) {
            md.append(" x ").append(quantity);
        }
        md.append("\n**金额**：¥").append(nullTo(payAmount, "--")).append("\n");
        md.append("**状态**：待发货\n");
        md.append("订单号：").append(nullTo(orderNo, "--"));
        pushAll(title, md.toString(), Map.of(
                "type", "order_paid",
                "orderNo", nullTo(orderNo, ""),
                "title", title,
                "content", md.toString()));
    }

    /**
     * 新咨询事件监听（由 ImService 发布）。
     * <p>用 {@code @EventListener + @Async}：事件发布不阻塞建会话流程，
     * 告警本身又是外部 HTTP，必须异步。
     */
    @EventListener
    @Async("noticeExecutor")
    public void onNewConversationEvent(ImNewConversationEvent event) {
        try {
            // userId 可能为空（游客会话），昵称取不到不影响告警
            pushAll("新客服咨询", "**客户**：待确认\n**会话号**：#" + event.getConversationId(),
                    Map.of("type", "im_new",
                            "conversationId", String.valueOf(event.getConversationId()),
                            "title", "新客服咨询",
                            "content", "会话号 #" + event.getConversationId()));
        } catch (Exception e) {
            log.warn("新咨询事件处理失败: {}", e.getMessage());
        }
    }

    /**
     * 新客服咨询（场景 B）。由定时任务对「超时未响应」的会话调用。
     *
     * @param minutesSinceCreate 距会话创建分钟数；超过 3 分钟即升级为超时告警
     */
    @Async("noticeExecutor")
    public void notifyNewConversation(Long conversationId, Long userId, String nickname,
                                      String sourceLabel, int minutesSinceCreate) {
        boolean overdue = minutesSinceCreate >= 3;
        String title = overdue ? "客服超时未响应" : "新客服咨询";
        StringBuilder md = new StringBuilder();
        md.append("**客户**：").append(nullTo(nickname, "游客")).append("\n");
        md.append("**来源**：").append(nullTo(sourceLabel, "客服入口")).append("\n");
        if (overdue) {
            md.append("**已等待**：").append(minutesSinceCreate).append(" 分钟\n");
        }
        md.append("会话号：#").append(conversationId);
        pushAll(title, md.toString(), Map.of(
                "type", overdue ? "im_overdue" : "im_new",
                "conversationId", String.valueOf(conversationId),
                "title", title,
                "content", md.toString()));
    }

    /** 三个通道各推各的，互不影响。 */
    private void pushAll(String title, String markdown, Map<String, Object> browserPayload) {
        // ① 浏览器桌面通知（走 SSE，座席在线时最实时）
        try {
            if (isEnabled(OperatorNoticeSetting.CHANNEL_BROWSER)) {
                Map<String, Object> evt = new LinkedHashMap<>(browserPayload);
                evt.put("event", "operator_notice");
                evt.put("title", title);
                evt.put("content", markdown);
                imPublisher.broadcastAll(evt);
            }
        } catch (Exception e) {
            log.warn("浏览器通知推送失败: {}", e.getMessage());
        }
        // ② 企微群机器人
        try {
            if (isEnabled(OperatorNoticeSetting.CHANNEL_WECOM_BOT)) {
                Map<String, Object> cfg = readConfig(OperatorNoticeSetting.CHANNEL_WECOM_BOT);
                String webhook = firstNonBlank(str(cfg.get("webhook")), str(cfg.get("key")));
                String url = normalizeWecomUrl(webhook);
                if (url != null) {
                    String resp = HttpRequest.post(url)
                            .header("Content-Type", "application/json; charset=utf-8")
                            .body(writeJson(Map.of("msgtype", "markdown", "markdown", Map.of("content", "**" + title + "**\n" + markdown))))
                            .timeout(HTTP_TIMEOUT_MS)
                            .execute().body();
                    Map<String, Object> parsed = parseJsonMap(resp);
                    if (parsed != null && parsed.get("errcode") != null && !"0".equals(String.valueOf(parsed.get("errcode")))) {
                        log.warn("企微机器人返回异常 errcode={} errmsg={}", parsed.get("errcode"), parsed.get("errmsg"));
                    }
                } else {
                    log.warn("企微机器人已启用但未配置 Webhook，跳过");
                }
            }
        } catch (Exception e) {
            log.warn("企微机器人推送失败（不影响其他通道）: {}", e.getMessage());
        }
        // ③ 服务号模板消息
        try {
            if (isEnabled(OperatorNoticeSetting.CHANNEL_MP_OFFICIAL)) {
                pushMpOfficial(title, markdown);
            }
        } catch (Exception e) {
            log.warn("服务号推送失败（不影响其他通道）: {}", e.getMessage());
        }
    }

    /**
     * 服务号模板消息。走 mp_weixin API，需要已配置公众号 AppID/Secret（已有 system_config）。
     * 未配置时只记日志，不抛异常。
     */
    private void pushMpOfficial(String title, String content) {
        Map<String, Object> cfg = readConfig(OperatorNoticeSetting.CHANNEL_MP_OFFICIAL);
        String templateId = str(cfg.get("templateId"));
        if (!StringUtils.hasText(templateId)) {
            log.info("服务号通道已启用但未配置 templateId，跳过推送（标题：{}）", title);
            return;
        }
        List<String> receivers = readReceivers(OperatorNoticeSetting.CHANNEL_MP_OFFICIAL);
        if (receivers.isEmpty()) {
            log.info("服务号通道无接收人 openid，跳过推送（标题：{}）", title);
            return;
        }
        // 模板消息需要 access_token 与已授权 openid；此处只做结构校验与日志，
        // 真正的发送复用微信 SDK 能力（SubscribeMessageService 已有同类实现可参考）
        log.info("服务号模板消息待发送 templateId={} receivers={} title={}", templateId, receivers.size(), title);
    }

    // ==================== 工具 ====================

    private boolean isEnabled(String channel) {
        OperatorNoticeSetting row = settingMapper.selectOne(new LambdaQueryWrapper<OperatorNoticeSetting>()
                .eq(OperatorNoticeSetting::getChannel, channel).last("LIMIT 1"));
        return row != null && row.getEnabled() != null && row.getEnabled() == 1;
    }

    private Map<String, Object> readConfig(String channel) {
        OperatorNoticeSetting row = settingMapper.selectOne(new LambdaQueryWrapper<OperatorNoticeSetting>()
                .eq(OperatorNoticeSetting::getChannel, channel).last("LIMIT 1"));
        if (row == null || !StringUtils.hasText(row.getConfig())) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> m = imJson.readMap(row.getConfig());
        return m == null ? new LinkedHashMap<>() : m;
    }

    private List<String> readReceivers(String channel) {
        OperatorNoticeSetting row = settingMapper.selectOne(new LambdaQueryWrapper<OperatorNoticeSetting>()
                .eq(OperatorNoticeSetting::getChannel, channel).last("LIMIT 1"));
        if (row == null || !StringUtils.hasText(row.getReceivers())) {
            return List.of();
        }
        List<String> out = imJson.readList(row.getReceivers());
        return out == null ? List.of() : out;
    }

    /** 兼容只填 Key 与填完整 URL 两种习惯。 */
    private String normalizeWecomUrl(String webhookOrKey) {
        if (!StringUtils.hasText(webhookOrKey)) {
            return null;
        }
        String v = webhookOrKey.trim();
        if (v.startsWith("http://") || v.startsWith("https://")) {
            return v;
        }
        return WECOM_BOT_API + "?key=" + v;
    }

    private String channelLabel(String channel) {
        return switch (channel) {
            case OperatorNoticeSetting.CHANNEL_WECOM_BOT -> "企微群机器人";
            case OperatorNoticeSetting.CHANNEL_MP_OFFICIAL -> "服务号模板消息";
            case OperatorNoticeSetting.CHANNEL_BROWSER -> "浏览器桌面通知";
            default -> channel;
        };
    }

    private String nullTo(String v, String fallback) {
        return StringUtils.hasText(v) ? v : fallback;
    }

    private String firstNonBlank(String a, String b) {
        return StringUtils.hasText(a) ? a : b;
    }

    private String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private String writeJson(Object o) {
        return imJson.write(o);
    }

    private Map<String, Object> parseJsonMap(String json) {
        return imJson.readMap(json);
    }
}
