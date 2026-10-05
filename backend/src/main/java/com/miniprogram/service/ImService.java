package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.ImAgentPresence;
import com.miniprogram.entity.ImConversation;
import com.miniprogram.entity.ImMessage;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.ImAgentPresenceMapper;
import com.miniprogram.mapper.ImConversationMapper;
import com.miniprogram.mapper.ImMessageMapper;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 客服 IM 核心服务：会话 + 消息 + SSE 推送。
 *
 * <p><b>为什么 SSE 而不是 WebSocket</b>：客服端跑在浏览器（{@code EventSource} 原生支持，
 * 零前端依赖）；小程序端 {@code wx.request} 不支持 SSE，改用 HTTP 轮询（同一个
 * {@link #listMessages} 接口按 seq 续传）。当前单商家客服量级下够用，后续要升级
 * WebSocket 时只需替换推送通道，消息存储层不用动。
 *
 * <p><b>断线重连不丢消息</b>：每条消息在会话内有单调递增的 {@code seq}，SSE 端点与轮询
 * 接口都接受 {@code afterSeq} 参数，只返回比它新的。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImService {

    /** SSE 连接超时：0 = 永不超时，靠心跳保活。生产由 Nginx 决定实际存活时长。 */
    private static final int MAX_MESSAGES_ONCE = 100;
    private static final int MAX_TEXT_LEN = 1000;
    private static final int MAX_PREVIEW_LEN = 200;

    private final ImConversationMapper conversationMapper;
    private final ImMessageMapper messageMapper;
    private final ImAgentPresenceMapper presenceMapper;
    private final UserMapper userMapper;
    private final ImJsonSupport imJson;
    private final ImEventPublisher imPublisher;
    /**
     * 可选依赖：单元测试无 ApplicationContext 时为 null。
     * 用 ObjectProvider 而不是直接注入 final 字段 —— 直接注入在无上下文时会启动失败。
     */
    private final ObjectProvider<ApplicationEventPublisher> eventPublisherProvider;

    /** conversationId → 正在输入的座席（用于回执，不入库） */
    private final Map<Long, Long> typingAgents = new ConcurrentHashMap<>();

    // ==================== 会话 ====================

    /**
     * 买家发起咨询：同一用户 + 同一来源有未结束会话就复用，避免刷屏式重复会话。
     */
    @Transactional
    public ImConversation openConversation(Long userId, String source, String sourceRef, Long ticketId) {
        String src = StringUtils.hasText(source) ? source.trim() : "chat";
        if (userId != null) {
            ImConversation existing = conversationMapper.selectOne(new LambdaQueryWrapper<ImConversation>()
                    .eq(ImConversation::getUserId, userId)
                    .eq(ImConversation::getSource, src)
                    .in(ImConversation::getStatus, "waiting", "active")
                    .orderByDesc(ImConversation::getLastMessageAt)
                    .last("LIMIT 1"));
            if (existing != null) {
                if (StringUtils.hasText(sourceRef)) {
                    existing.setSourceRef(sourceRef.trim());
                }
                conversationMapper.updateById(existing);
                return existing;
            }
        }
        ImConversation row = new ImConversation();
        row.setUserId(userId);
        row.setStatus("waiting");
        row.setSource(src);
        row.setSourceRef(StringUtils.hasText(sourceRef) ? sourceRef.trim() : null);
        row.setTicketId(ticketId);
        row.setUserUnread(0);
        row.setAgentUnread(0);
        row.setPinned(0);
        row.setCreateTime(LocalDateTime.now());
        row.setUpdateTime(LocalDateTime.now());
        conversationMapper.insert(row);
        // 新咨询 → 运营告警（场景 B）。
        // ⚠️ 必须用 ApplicationEvent 而不能直接调 OperatorNoticeService：
        //    告警侧要通过 ImEventPublisher 反向推 SSE 给座席，若这里直接依赖它，
        //    就形成 ImService ⇄ OperatorNoticeService 构造器循环依赖，
        //    Spring Boot 3 默认 allow-circular-references=false，启动直接失败。
        if (eventPublisherProvider != null) {
            try {
                ApplicationEventPublisher ep = eventPublisherProvider.getIfAvailable();
                if (ep != null) {
                    ep.publishEvent(new ImNewConversationEvent(row.getId(), userId, src));
                }
            } catch (Exception e) {
                log.warn("新咨询事件发布失败 convId={}: {}", row.getId(), e.getMessage());
            }
        }
        return row;
    }

    /** 客服接入：waiting → active，同时占用座席。 */
    @Transactional
    public void accept(Long conversationId, Long agentId, String agentName) {
        ImConversation c = requireConversation(conversationId);
        c.setStatus("active");
        c.setAgentId(agentId);
        c.setAgentName(agentName);
        c.setUpdateTime(LocalDateTime.now());
        conversationMapper.updateById(c);
        refreshAgentActiveCount(agentId);
    }

    @Transactional
    public void close(Long conversationId) {
        ImConversation c = requireConversation(conversationId);
        c.setStatus("closed");
        c.setUpdateTime(LocalDateTime.now());
        conversationMapper.updateById(c);
        if (c.getAgentId() != null) {
            refreshAgentActiveCount(c.getAgentId());
        }
    }

    /** 转接：换座席后原座席的 active 计数要减，新座席要加。 */
    @Transactional
    public void transfer(Long conversationId, Long newAgentId, String newAgentName) {
        ImConversation c = requireConversation(conversationId);
        Long prevAgent = c.getAgentId();
        c.setAgentId(newAgentId);
        c.setAgentName(newAgentName);
        c.setStatus("active");
        c.setUpdateTime(LocalDateTime.now());
        conversationMapper.updateById(c);
        if (prevAgent != null && !prevAgent.equals(newAgentId)) {
            refreshAgentActiveCount(prevAgent);
        }
        refreshAgentActiveCount(newAgentId);
    }

    @Transactional
    public void pin(Long conversationId, boolean pinned) {
        ImConversation c = requireConversation(conversationId);
        c.setPinned(pinned ? 1 : 0);
        conversationMapper.updateById(c);
    }

    public ImConversation requireConversation(Long id) {
        ImConversation c = conversationMapper.selectById(id);
        if (c == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "会话不存在");
        }
        return c;
    }

    // ==================== 消息 ====================

    /**
     * 发消息。这是所有写入的**唯一入口** —— 商品卡/物流卡/系统事件/纯文本都走这里，
     * 保证 seq 分配、未读计数、SSE 推送三件事永远一致。
     *
     * @param senderRole user / agent / system
     * @param msgType 见 {@link ImMessage} 的 TYPE_* 常量
     * @param payload 富媒体结构（text 类型传 null，正文走 textContent）
     */
    @Transactional
    public ImMessage send(Long conversationId, String senderRole, Long senderId, String senderName,
                          String msgType, Map<String, Object> payload, String textContent) {
        ImConversation c = requireConversation(conversationId);
        String type = StringUtils.hasText(msgType) ? msgType.trim() : ImMessage.TYPE_TEXT;
        String role = StringUtils.hasText(senderRole) ? senderRole.trim() : "user";
        String text = StringUtils.hasText(textContent) ? textContent.trim() : "";

        int nextSeq = nextSeq(conversationId);

        ImMessage msg = new ImMessage();
        msg.setConversationId(conversationId);
        msg.setSeq(nextSeq);
        msg.setSenderRole(role);
        msg.setSenderId(senderId);
        msg.setSenderName(senderName);
        msg.setMsgType(type);
        msg.setPayload(payload == null || payload.isEmpty() ? null : writeJson(payload));
        msg.setTextContent(text.length() > MAX_TEXT_LEN ? text.substring(0, MAX_TEXT_LEN) : text);
        boolean fromUser = "user".equals(role);
        msg.setReadByUser(fromUser ? 1 : 0);
        msg.setReadByAgent(fromUser ? 0 : 1);
        msg.setCreateTime(LocalDateTime.now());
        messageMapper.insert(msg);

        // 会话摘要：卡片类型只取一个可读标识，别把 JSON 塞进 last_message_text
        c.setLastMessageType(type);
        c.setLastMessageText(previewOf(type, text, payload));
        c.setLastMessageAt(msg.getCreateTime());
        if (fromUser) {
            c.setAgentUnread(nz(c.getAgentUnread()) + 1);
        } else {
            c.setUserUnread(nz(c.getUserUnread()) + 1);
            // 客服首次响应落时间，供「超 N 分钟未响应」告警判定
            if (c.getFirstReplyAt() == null) {
                c.setFirstReplyAt(msg.getCreateTime());
            }
        }
        c.setUpdateTime(LocalDateTime.now());
        conversationMapper.updateById(c);

        typingAgents.remove(conversationId);
        imPublisher.publish(c.getAgentId(), toAgentPayload(c, msg));
        return msg;
    }

    /**
     * 会话内下一个 seq。
     * <p>取该会话 seq 最大的那条 +1。⚠️ 不能用 {@code selectCount} 近似 —— 那是消息
     * 总数，删过消息后与 max(seq) 不一致，会导致新消息 seq 与旧消息撞号，
     * 前端按 {@code gt(seq, afterSeq)} 续传时会漏消息（且不报错）。
     */
    private int nextSeq(Long conversationId) {
        ImMessage last = messageMapper.selectOne(new LambdaQueryWrapper<ImMessage>()
                .eq(ImMessage::getConversationId, conversationId)
                .orderByDesc(ImMessage::getSeq)
                .orderByDesc(ImMessage::getId)
                .last("LIMIT 1"));
        return (last != null && last.getSeq() != null ? last.getSeq() : 0) + 1;
    }

    /** 按 seq 游标拉取（断线重连续传）。 */
    public List<Map<String, Object>> listMessages(Long conversationId, Integer afterSeq, Integer limit) {
        LambdaQueryWrapper<ImMessage> w = new LambdaQueryWrapper<ImMessage>()
                .eq(ImMessage::getConversationId, conversationId)
                .orderByAsc(ImMessage::getSeq)
                .orderByAsc(ImMessage::getId);
        if (afterSeq != null && afterSeq >= 0) {
            w.gt(ImMessage::getSeq, afterSeq);
        }
        w.last("LIMIT " + (limit == null || limit <= 0 ? MAX_MESSAGES_ONCE : Math.min(limit, MAX_MESSAGES_ONCE)));
        return messageMapper.selectList(w).stream().map(this::toMessageMap).toList();
    }

    /** 买家已读回执。 */
    @Transactional
    public void markReadByUser(Long conversationId) {
        messageMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<ImMessage>()
                .eq(ImMessage::getConversationId, conversationId)
                .eq(ImMessage::getReadByUser, 0)
                .set(ImMessage::getReadByUser, 1));
        conversationMapper.update(null, new LambdaUpdateWrapper<ImConversation>()
                .eq(ImConversation::getId, conversationId)
                .set(ImConversation::getUserUnread, 0));
    }

    /** 客服已读回执：同时清会话红点。 */
    @Transactional
    public void markReadByAgent(Long conversationId) {
        messageMapper.update(null, new LambdaUpdateWrapper<ImMessage>()
                .eq(ImMessage::getConversationId, conversationId)
                .eq(ImMessage::getReadByAgent, 0)
                .set(ImMessage::getReadByAgent, 1));
        conversationMapper.update(null, new LambdaUpdateWrapper<ImConversation>()
                .eq(ImConversation::getId, conversationId)
                .set(ImConversation::getAgentUnread, 0));
    }

    public void setTyping(Long conversationId, boolean typing) {
        if (typing) {
            typingAgents.put(conversationId, System.currentTimeMillis());
        } else {
            typingAgents.remove(conversationId);
        }
    }

    public boolean isAgentTyping(Long conversationId) {
        Long at = typingAgents.get(conversationId);
        if (at == null) {
            return false;
        }
        // 超过 8 秒视为已停止，避免崩溃残留导致永远显示「正在输入」
        if (System.currentTimeMillis() - at > 8000L) {
            typingAgents.remove(conversationId);
            return false;
        }
        return true;
    }

    // ==================== 会话列表 ====================

    /**
     * 后台会话列表。
     *
     * @param tab all / waiting 待接入 / active 服务中 / closed 已结束
     * @param keyword 按昵称 / 手机号 / 最后一条消息内容模糊搜
     */
    public List<Map<String, Object>> listConversations(String tab, String keyword) {
        LambdaQueryWrapper<ImConversation> w = new LambdaQueryWrapper<ImConversation>()
                // 置顶优先，其次按最后一条消息时间倒序
                .orderByDesc(ImConversation::getPinned)
                .orderByDesc(ImConversation::getLastMessageAt)
                .orderByDesc(ImConversation::getId);
        if ("waiting".equals(tab) || "active".equals(tab) || "closed".equals(tab)) {
            w.eq(ImConversation::getStatus, tab);
        }
        // waiting 之外默认隐藏 waiting（"全部" 应含所有未结束 + 已结束）
        List<ImConversation> rows = conversationMapper.selectList(w);
        List<Map<String, Object>> out = new ArrayList<>();
        String kw = StringUtils.hasText(keyword) ? keyword.trim().toLowerCase(Locale.ROOT) : "";
        for (ImConversation c : rows) {
            Map<String, Object> m = toConversationMap(c);
            if (StringUtils.hasText(kw) && !matchKeyword(m, kw)) {
                continue;
            }
            out.add(m);
        }
        return out;
    }

    private boolean matchKeyword(Map<String, Object> m, String kw) {
        for (String key : new String[]{"nickname", "phone", "lastMessageText", "sourceLabel"}) {
            Object v = m.get(key);
            if (v != null && String.valueOf(v).toLowerCase(Locale.ROOT).contains(kw)) {
                return true;
            }
        }
        return false;
    }

    public Map<String, Object> conversationDetail(Long conversationId) {
        ImConversation c = requireConversation(conversationId);
        Map<String, Object> m = toConversationMap(c);
        m.put("messages", listMessages(conversationId, null, MAX_MESSAGES_ONCE));
        m.put("agentTyping", isAgentTyping(conversationId));
        return m;
    }

    // ==================== 座席状态 ====================

    @Transactional
    public void setPresence(Long agentId, String agentName, String state) {
        String s = StringUtils.hasText(state) ? state.trim() : "offline";
        ImAgentPresence row = presenceMapper.selectById(agentId);
        if (row == null) {
            row = new ImAgentPresence();
            row.setAgentId(agentId);
            row.setActiveCount(0);
        }
        row.setAgentName(agentName);
        row.setState(s);
        row.setLastSeenAt(LocalDateTime.now());
        row.setUpdateTime(LocalDateTime.now());
        upsertPresence(row);
    }

    /** 座席状态 upsert（BaseMapper 无 insertOrUpdate，按主键 agentId 判断）。 */
    private void upsertPresence(ImAgentPresence row) {
        ImAgentPresence exists = presenceMapper.selectById(row.getAgentId());
        if (exists == null) {
            presenceMapper.insert(row);
            return;
        }
        row.setUpdateTime(LocalDateTime.now());
        presenceMapper.updateById(row);
    }

    public List<Map<String, Object>> listAgents() {
        List<ImAgentPresence> rows = presenceMapper.selectList(
                new LambdaQueryWrapper<ImAgentPresence>().orderByDesc(ImAgentPresence::getLastSeenAt));
        List<Map<String, Object>> out = new ArrayList<>();
        for (ImAgentPresence p : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agentId", p.getAgentId());
            m.put("agentName", p.getAgentName());
            m.put("state", p.getState());
            m.put("activeCount", p.getActiveCount());
            m.put("lastSeenAt", p.getLastSeenAt());
            m.put("online", isAgentOnline(p));
            out.add(m);
        }
        out.sort(Comparator.comparingInt(m -> "online".equals(m.get("state")) ? 0
                : "busy".equals(m.get("state")) ? 1 : 2));
        return out;
    }

    private boolean isAgentOnline(ImAgentPresence p) {
        if (p.getLastSeenAt() == null) {
            return false;
        }
        // 90 秒无心跳按离线算：浏览器被强制关闭时不会有 onCompletion
        return p.getLastSeenAt().isAfter(LocalDateTime.now().minusSeconds(90));
    }

    private void refreshAgentActiveCount(Long agentId) {
        if (agentId == null) {
            return;
        }
        long active = conversationMapper.selectCount(new LambdaQueryWrapper<ImConversation>()
                .eq(ImConversation::getAgentId, agentId)
                .eq(ImConversation::getStatus, "active"));
        ImAgentPresence row = presenceMapper.selectById(agentId);
        if (row == null) {
            row = new ImAgentPresence();
            row.setAgentId(agentId);
        }
        row.setActiveCount((int) active);
        // 有人管的服务中会话 > 5 条自动转忙碌，别让坐席自己记得点
        row.setState(active >= 5 ? "busy" : row.getState() == null ? "online" : row.getState());
        row.setUpdateTime(LocalDateTime.now());
        upsertPresence(row);
    }

    /** 超时未响应的开放会话（供运营告警扫描）。 */
    public List<ImConversation> listStaleWaiting(int minutes) {
        return conversationMapper.selectList(new LambdaQueryWrapper<ImConversation>()
                .in(ImConversation::getStatus, "waiting", "active")
                .isNull(ImConversation::getFirstReplyAt)
                .lt(ImConversation::getCreateTime, LocalDateTime.now().minusMinutes(minutes))
                .last("LIMIT 50"));
    }

    // ==================== 转换 ====================

    private Map<String, Object> toAgentPayload(ImConversation c, ImMessage msg) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("event", "message");
        data.put("conversationId", c.getId());
        data.put("agentId", c.getAgentId());
        data.put("status", c.getStatus());
        data.put("agentUnread", c.getAgentUnread());
        data.put("userUnread", c.getUserUnread());
        data.put("message", toMessageMap(msg));
        data.put("conversation", toConversationMap(c));
        return data;
    }

    public Map<String, Object> toMessageMap(ImMessage m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("conversationId", m.getConversationId());
        map.put("seq", m.getSeq());
        map.put("senderRole", m.getSenderRole());
        map.put("senderId", m.getSenderId());
        map.put("senderName", m.getSenderName());
        map.put("msgType", m.getMsgType());
        map.put("text", m.getTextContent());
        map.put("payload", readJsonMap(m.getPayload()));
        map.put("readByUser", m.getReadByUser() != null && m.getReadByUser() == 1);
        map.put("readByAgent", m.getReadByAgent() != null && m.getReadByAgent() == 1);
        map.put("createTime", m.getCreateTime());
        return map;
    }

    public Map<String, Object> toConversationMap(ImConversation c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("userId", c.getUserId());
        m.put("agentId", c.getAgentId());
        m.put("agentName", c.getAgentName());
        m.put("status", c.getStatus());
        m.put("statusLabel", statusLabel(c.getStatus()));
        m.put("source", c.getSource());
        m.put("sourceLabel", sourceLabel(c.getSource()));
        m.put("sourceRef", c.getSourceRef());
        m.put("ticketId", c.getTicketId());
        m.put("lastMessageType", c.getLastMessageType());
        m.put("lastMessageText", c.getLastMessageText());
        m.put("lastMessageAt", c.getLastMessageAt());
        m.put("userUnread", c.getUserUnread());
        m.put("agentUnread", c.getAgentUnread());
        m.put("pinned", c.getPinned() != null && c.getPinned() == 1);
        m.put("createTime", c.getCreateTime());
        m.put("updateTime", c.getUpdateTime());
        if (c.getUserId() != null) {
            User u = userMapper.selectById(c.getUserId());
            if (u != null) {
                m.put("nickname", u.getNickname());
                m.put("avatar", u.getAvatarUrl());
                m.put("phone", u.getPhone());
                m.put("memberExpireAt", u.getMemberExpireAt());
                m.put("memberLabel", memberLabel(u));
            }
        }
        if (m.get("nickname") == null) {
            m.put("nickname", "游客");
            m.put("memberLabel", "");
        }
        return m;
    }

    /** 会员标签：SVIP / 会员 / 普通。端上直接读这个字段显示角标。 */
    private String memberLabel(User u) {
        if (u.getMemberExpireAt() == null || !u.getMemberExpireAt().isAfter(LocalDateTime.now())) {
            return "";
        }
        long days = java.time.Duration.between(LocalDateTime.now(), u.getMemberExpireAt()).toDays();
        return days >= 365 ? "SVIP" : "会员";
    }

    private String statusLabel(String s) {
        if ("waiting".equals(s)) return "待接入";
        if ("active".equals(s)) return "服务中";
        if ("closed".equals(s)) return "已结束";
        return s;
    }

    private String sourceLabel(String s) {
        if ("product".equals(s)) return "商品详情页";
        if ("order".equals(s)) return "订单页";
        if ("mine".equals(s)) return "个人中心";
        if ("system".equals(s)) return "系统推送";
        return "客服入口";
    }

    /** 卡片类型的预览文案：别把 JSON 塞进列表。 */
    private String previewOf(String type, String text, Map<String, Object> payload) {
        String base;
        if (ImMessage.TYPE_PRODUCT_CARD.equals(type) && payload != null) {
            base = "[商品] " + str(payload.get("title"));
        } else if (ImMessage.TYPE_LOGISTICS_CARD.equals(type) && payload != null) {
            base = "[物流] " + str(payload.get("expressName")) + " " + str(payload.get("trackingNo"));
        } else if (ImMessage.TYPE_IMAGE.equals(type)) {
            base = "[图片]";
        } else if (ImMessage.TYPE_SYSTEM_EVENT.equals(type)) {
            base = "[系统] " + (StringUtils.hasText(text) ? text : str(payload == null ? null : payload.get("title")));
        } else {
            base = text;
        }
        if (base == null) {
            return "";
        }
        String oneLine = base.replaceAll("\\s+", " ").trim();
        return oneLine.length() > MAX_PREVIEW_LEN ? oneLine.substring(0, MAX_PREVIEW_LEN) : oneLine;
    }

    private String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private String writeJson(Map<String, Object> payload) {
        String out = imJson.writeMapOrNull(payload);
        if (out == null) {
            log.warn("消息 payload 序列化失败，退化为纯文本");
        }
        return out;
    }

    public Map<String, Object> readJsonMap(String json) {
        return imJson.readMap(json);
    }

    public <T> List<T> readJsonList(String json) {
        return imJson.readList(json);
    }
}
