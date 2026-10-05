package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.ImMessage;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ImCardService;
import com.miniprogram.service.ImService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序买家端 IM。
 *
 * <p><b>为什么用 HTTP 轮询而不是 SSE</b>：{@code wx.request} 不支持 text/event-stream，
 * SSE 在小程序端无法使用。轮询按 {@code afterSeq} 游标增量拉取 —— 带宽与 SSE 推送等效
 * （只传新消息），且天然适配小程序后台切换（切回前台时立刻补拉）。
 *
 * <p>轮询间隔由端上控制（前台 3s / 静默暂停），不在后端做长轮询，避免占满 Tomcat 线程。
 */
@Slf4j
@Tag(name = "小程序-在线客服IM")
@RestController
@RequestMapping("/api/v1/mp/im")
@RequiredArgsConstructor
public class MpImController {

    private final ImService imService;
    private final ImCardService imCardService;

    /**
     * 打开或复用会话。
     *
     * @param source chat 客服入口 / product 商品详情页 / order 订单页 / mine 个人中心
     * @param sourceRef 来源定位（商品 id / 订单号）
     */
    @PostMapping("/conversation")
    @Operation(summary = "打开会话")
    public R<Map<String, Object>> open(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String source = str(body.get("source"), "chat");
        String sourceRef = str(body.get("sourceRef"), null);
        var conv = imService.openConversation(userId, source, sourceRef, null);
        Map<String, Object> out = imService.toConversationMap(conv);
        out.put("messages", imService.listMessages(conv.getId(), null, 50));
        out.put("agentTyping", false);
        return R.ok(out);
    }

    @GetMapping("/conversation")
    @Operation(summary = "我的当前会话")
    public R<Map<String, Object>> current(@RequestParam(required = false) String source) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String src = StringUtils.hasText(source) ? source.trim() : "chat";
        var conv = imService.openConversation(userId, src, null, null);
        return R.ok(imService.conversationDetail(conv.getId()));
    }

    /**
     * 增量拉取消息。端上每次带上已收到的最大 seq。
     * 拉到的客服消息会顺带标记为已读。
     */
    @GetMapping("/conversation/{id}/messages")
    @Operation(summary = "增量拉取消息（按 seq 游标）")
    public R<Map<String, Object>> messages(@PathVariable Long id,
                                           @RequestParam(required = false) Integer afterSeq,
                                           @RequestParam(defaultValue = "50") int limit) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        // 只能看自己的会话
        var conv = imService.requireConversation(id);
        if (conv.getUserId() == null || !userId.equals(conv.getUserId())) {
            throw new BusinessException(403, "无权查看该会话");
        }
        List<Map<String, Object>> messages = imService.listMessages(id, afterSeq, limit);
        imService.markReadByUser(id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("messages", messages);
        out.put("agentTyping", imService.isAgentTyping(id));
        out.put("status", conv.getStatus());
        out.put("statusLabel", statusLabel(conv.getStatus()));
        return R.ok(out);
    }

    @PostMapping("/conversation/{id}/messages")
    @Operation(summary = "买家发消息（text / image）")
    public R<Map<String, Object>> send(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        var conv = imService.requireConversation(id);
        if (conv.getUserId() == null || !userId.equals(conv.getUserId())) {
            throw new BusinessException(403, "无权在该会话发言");
        }
        String type = str(body.get("msgType"), ImMessage.TYPE_TEXT);
        String text = str(body.get("text"), "");
        Map<String, Object> payload = null;
        if (ImMessage.TYPE_IMAGE.equals(type)) {
            String url = str(body.get("imageUrl"), "");
            if (!StringUtils.hasText(url)) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "图片消息需指定 imageUrl");
            }
            payload = new LinkedHashMap<>();
            payload.put("url", url);
        } else if (!ImMessage.TYPE_TEXT.equals(type)) {
            // 买家只能发文本与图片；商品卡/物流卡只能客服发
            throw new BusinessException(ErrorCode.PARAM_ERROR, "不支持的消息类型：" + type);
        }
        // 昵称由 ImService.toConversationMap 在列表侧补齐，这里不重复查 user 表
        ImMessage msg = imService.send(id, "user", userId, null, type, payload, text);
        return R.ok(imService.toMessageMap(msg));
    }

    @PostMapping("/conversation/{id}/close")
    @Operation(summary = "买家结束会话")
    public R<Void> close(@PathVariable Long id) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        var conv = imService.requireConversation(id);
        if (conv.getUserId() == null || !userId.equals(conv.getUserId())) {
            throw new BusinessException(403, "无权结束该会话");
        }
        imService.close(id);
        return R.ok(null);
    }

    /** 客服名片（右栏「联系客服」时展示）。 */
    @GetMapping("/agents")
    @Operation(summary = "在线客服列表")
    public R<List<Map<String, Object>>> agents() {
        return R.ok(imService.listAgents());
    }

    private String statusLabel(String s) {
        if ("waiting".equals(s)) return "等待客服接入";
        if ("active".equals(s)) return "客服服务中";
        if ("closed".equals(s)) return "会话已结束";
        return s;
    }

    private String str(Object v, String fallback) {
        if (v == null) {
            return fallback;
        }
        String s = String.valueOf(v);
        return StringUtils.hasText(s) ? s : fallback;
    }
}
