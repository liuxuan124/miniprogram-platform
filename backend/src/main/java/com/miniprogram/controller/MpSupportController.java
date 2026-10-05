package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.entity.SupportMessage;
import com.miniprogram.entity.SupportTicket;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.SupportMessageMapper;
import com.miniprogram.mapper.SupportTicketMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序 › 在线客服工单（写入侧）。
 *
 * <p><b>补的是什么缺口</b>：后台 {@code /member/support} 的「会话收件箱」早就存在，
 * 但后端只有 {@code GET /support/tickets}（读）、{@code POST /reply}、{@code PUT /status}，
 * <b>从来没有创建接口</b>，端上 service-chat 页也只是本地假数据 + AI 兜底。
 * 结果是收件箱永远空、运营看不到任何真实咨询。
 *
 * <p>建单策略：同一用户 + 同一来源若已有 {@code open} 工单，则复用该单追加消息，
 * 避免用户每点一次「在线咨询」就开一张新单把收件箱刷爆。
 */
@Slf4j
@Tag(name = "小程序-在线客服")
@RestController
@RequestMapping("/api/v1/mp/support")
@RequiredArgsConstructor
public class MpSupportController {

    private static final int MAX_CONTENT = 1000;
    private static final int MAX_SOURCE = 16;

    private final SupportTicketMapper supportTicketMapper;
    private final SupportMessageMapper supportMessageMapper;
    private final UserMapper userMapper;

    /**
     * 发起咨询（建单或追加到已有开放工单）。
     *
     * @param source chat=在线客服 / order=订单咨询
     * @param orderId 关联订单（虚拟商品资料解锁咨询用）
     */
    @PostMapping("/tickets")
    @Operation(summary = "发起在线咨询")
    @Transactional
    public R<Map<String, Object>> createTicket(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String content = trimTo(body.get("content"), MAX_CONTENT);
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(400, "请填写咨询内容");
        }
        String source = trimTo(body.get("source"), MAX_SOURCE);
        if (!StringUtils.hasText(source)) {
            source = "chat";
        }
        Long orderId = longOrNull(body.get("orderId"));

        User user = userMapper.selectById(userId);
        String whoName = user != null && StringUtils.hasText(user.getNickname()) ? user.getNickname() : "用户";

        SupportTicket ticket = findOpenTicket(userId, source);
        boolean reused = ticket != null;
        if (!reused) {
            ticket = new SupportTicket();
            ticket.setUserId(userId);
            ticket.setWhoName(whoName);
            ticket.setStatus("open");
            ticket.setSource(source);
            ticket.setOrderId(orderId);
            ticket.setUnread(1);
            ticket.setLastText(content);
            ticket.setCreateTime(LocalDateTime.now());
            ticket.setUpdateTime(LocalDateTime.now());
            supportTicketMapper.insert(ticket);
        } else {
            // 复用：刷新最近正文与时间，并补上本次可能带的订单号
            ticket.setLastText(content);
            ticket.setUpdateTime(LocalDateTime.now());
            ticket.setUnread(1);
            if (orderId != null) {
                ticket.setOrderId(orderId);
            }
            if (!StringUtils.hasText(ticket.getWhoName())) {
                ticket.setWhoName(whoName);
            }
            supportTicketMapper.updateById(ticket);
        }

        SupportMessage msg = new SupportMessage();
        msg.setTicketId(ticket.getId());
        msg.setSender("user");
        msg.setContent(content);
        msg.setCreateTime(LocalDateTime.now());
        supportMessageMapper.insert(msg);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ticketId", ticket.getId());
        out.put("status", ticket.getStatus());
        out.put("reused", reused);
        return R.ok(out);
    }

    /** 我的咨询会话详情（含往来消息），端上客服页拉历史用 */
    @GetMapping("/tickets")
    @Operation(summary = "我的咨询会话")
    public R<Map<String, Object>> myTickets() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        List<SupportTicket> tickets = supportTicketMapper.selectList(new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getUserId, userId)
                .orderByDesc(SupportTicket::getUpdateTime)
                .last("LIMIT 20"));
        List<Map<String, Object>> records = new ArrayList<>();
        for (SupportTicket t : tickets) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("status", t.getStatus());
            m.put("source", t.getSource());
            m.put("orderId", t.getOrderId());
            m.put("unread", t.getUnread() != null && t.getUnread() != 0);
            m.put("lastText", t.getLastText());
            m.put("lastReply", t.getLastReply());
            m.put("createTime", t.getCreateTime());
            m.put("updateTime", t.getUpdateTime());
            m.put("messages", listMessages(t.getId()));
            records.add(m);
        }
        return R.ok(Map.of("total", records.size(), "records", records));
    }

    @GetMapping("/tickets/{id}/messages")
    @Operation(summary = "会话消息明细")
    public R<List<Map<String, Object>>> messages(@PathVariable Long id) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        SupportTicket ticket = supportTicketMapper.selectById(id);
        if (ticket == null) {
            return R.ok(List.of());
        }
        // 只能看自己的单 —— 未登录/非本人一律拒绝，不泄露别人的会话内容
        if (!userId.equals(ticket.getUserId())) {
            throw new BusinessException(403, "无权查看该会话");
        }
        return R.ok(listMessages(id));
    }

    private List<Map<String, Object>> listMessages(Long ticketId) {
        List<SupportMessage> rows = supportMessageMapper.selectList(new LambdaQueryWrapper<SupportMessage>()
                .eq(SupportMessage::getTicketId, ticketId)
                .orderByAsc(SupportMessage::getId)
                .last("LIMIT 200"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (SupportMessage m : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", m.getId());
            map.put("sender", m.getSender());
            map.put("content", m.getContent());
            map.put("createTime", m.getCreateTime());
            out.add(map);
        }
        return out;
    }

    private SupportTicket findOpenTicket(Long userId, String source) {
        return supportTicketMapper.selectOne(new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getUserId, userId)
                .eq(SupportTicket::getStatus, "open")
                .eq(SupportTicket::getSource, source)
                .orderByDesc(SupportTicket::getUpdateTime)
                .last("LIMIT 1"));
    }

    private String trimTo(Object value, int max) {
        if (value == null) {
            return null;
        }
        String v = String.valueOf(value).trim();
        if (v.isEmpty()) {
            return null;
        }
        return v.length() > max ? v.substring(0, max) : v;
    }

    private Long longOrNull(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        String s = String.valueOf(value).trim();
        if (s.isEmpty() || "null".equals(s)) {
            return null;
        }
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
