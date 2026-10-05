package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserNotice;
import com.miniprogram.mapper.NoticeSceneConfigMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.mapper.UserNoticeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserNoticeService {

    private final UserNoticeMapper userNoticeMapper;
    private final OrderItemMapper orderItemMapper;
    private final NoticeSceneConfigMapper noticeSceneConfigMapper;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    /**
     * 场景开关读取结果缓存。
     * ⚠️ 缓存必须在方法入口快照，不能「查完开关再写库」——同一事务内反复查库
     * 会让批量群发时的开关变更要等下次请求才生效，运营会以为「关了还在发」。
     */
    private volatile Map<String, Boolean> sceneSwitchCache;

    private static final long SCENE_CACHE_TTL_MS = 30_000L;

    private volatile long sceneCacheAt = 0L;

    public void notifyOrderCreated(Order order) {
        create(
                order.getUserId(),
                "order_created:" + order.getOrderNo(),
                "order_created",
                "订单已提交",
                "「" + productName(order.getId()) + "」待支付 ¥" + order.getPayAmount(),
                orderLink(order.getId())
        );
    }

    public void notifyOrderPaid(Order order) {
        if (isVirtualDelivered(order)) {
            notifyVirtualDelivered(order);
            return;
        }
        create(
                order.getUserId(),
                "order_paid:" + order.getOrderNo(),
                "order_paid",
                "支付成功",
                "「" + productName(order.getId()) + "」已支付 ¥" + order.getPayAmount() + "，可在订单中查看",
                orderLink(order.getId())
        );
    }

    public void notifyVirtualDelivered(Order order) {
        create(
                order.getUserId(),
                "order_delivered:" + order.getOrderNo(),
                "order_delivered",
                "商品已自动发货",
                "「" + productName(order.getId()) + "」已到账，点开即可查看内容并咨询客服",
                chatLink(order.getId())
        );
    }

    public void notifyOrderShipped(Order order) {
        boolean virtual = "virtual".equalsIgnoreCase(order.getFulfillmentType());
        create(
                order.getUserId(),
                "order_shipped:" + order.getOrderNo(),
                "order_shipped",
                virtual ? "虚拟商品已发货" : "订单已发货",
                "「" + productName(order.getId()) + "」" + (virtual ? "已发货，点开客服对话查看说明" : "已发货，请查看物流"),
                virtual ? chatLink(order.getId()) : orderLink(order.getId())
        );
    }

    public List<UserNotice> list(Long userId) {
        return userNoticeMapper.selectList(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .orderByDesc(UserNotice::getCreatedAt)
                .last("LIMIT 50"));
    }

    public long unreadCount(Long userId) {
        return userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getIsRead, 0));
    }

    public void markRead(Long userId, Long id) {
        userNoticeMapper.update(null, new LambdaUpdateWrapper<UserNotice>()
                .eq(UserNotice::getId, id)
                .eq(UserNotice::getUserId, userId)
                .set(UserNotice::getIsRead, 1));
    }

    public void markAllRead(Long userId) {
        userNoticeMapper.update(null, new LambdaUpdateWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getIsRead, 0)
                .set(UserNotice::getIsRead, 1));
    }

    public void notifyUser(Long userId, String scene, String title, String content) {
        create(userId, scene + ":" + userId + ":" + System.currentTimeMillis(), scene, title, content, null);
    }

    /**
     * 运营群发：按目标用户列表逐条写入。
     * <p>群发与场景开关无关（运营主动动作），但仍走 bizKey 幂等，
     * 同一 campaign 重发不会产生重复。
     *
     * @return 实际写入条数
     */
    public int broadcast(List<Long> userIds, String campaignId, String title, String content, String link) {
        if (userIds == null || userIds.isEmpty()) {
            return 0;
        }
        int written = 0;
        for (Long userId : userIds) {
            if (userId == null) {
                continue;
            }
            if (create(userId, "campaign:" + campaignId + ":" + userId, "manual", title, content, link)) {
                written++;
            }
        }
        return written;
    }

    /** 某场景当前是否开启。缓存 30s，运营改开关后最多半分钟生效。 */
    public boolean isSceneEnabled(String scene) {
        if (!StringUtils.hasText(scene)) {
            return true;
        }
        Map<String, Boolean> snapshot = sceneSwitchSnapshot();
        Boolean enabled = snapshot.get(scene);
        // 表里没登记的场景一律放行，避免新场景因漏配 seed 而静默不发
        return enabled == null || enabled;
    }

    /**
     * 场景 → 用户偏好分组。
     * <p>用户只关心「订单类 / 会员类 / 星球类 / 运营推广」四组，
     * 让他逐个场景开关既难用也看不出效果。
     */
    private static String preferenceGroup(String scene) {
        if (!StringUtils.hasText(scene)) {
            return null;
        }
        return switch (scene) {
            case "order_created", "order_paid", "order_shipped", "order_delivered", "order_recall" -> "order";
            case "membership_gift", "support_reply", "feedback_reply" -> "member";
            case "segment_reach", "ops_reach", "manual" -> "ops";
            default -> null;
        };
    }

    /**
     * 用户是否愿意收该分组的站内信。
     * <p>⚠️ 缺项一律视为<b>开启</b>：新增分组时老用户不该被静默静音，
     * 那会表现为「用户说没收到通知」且运营查不出原因。
     */
    public boolean isUserGroupEnabled(Long userId, String scene) {
        String group = preferenceGroup(scene);
        if (group == null || userId == null) {
            return true;
        }
        try {
            String raw = userMapper.selectById(userId).getNotifyPreference();
            if (!StringUtils.hasText(raw)) {
                return true;
            }
            Map<String, Object> pref = objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
            Object v = pref.get(group);
            return !(v instanceof Boolean b) || b;
        } catch (Exception e) {
            // 解析失败按开启处理，不要因为一个脏 JSON 吞掉通知
            log.warn("读取用户通知偏好失败，按开启处理 userId={}: {}", userId, e.getMessage());
            return true;
        }
    }

    /** 读用户偏好（端上设置页用），缺项补 true */
    public Map<String, Boolean> getUserPreference(Long userId) {
        Map<String, Boolean> out = new LinkedHashMap<>();
        out.put("order", true);
        out.put("member", true);
        out.put("planet", true);
        out.put("ops", true);
        if (userId == null) {
            return out;
        }
        try {
            User u = userMapper.selectById(userId);
            if (u == null || !StringUtils.hasText(u.getNotifyPreference())) {
                return out;
            }
            Map<String, Object> pref = objectMapper.readValue(
                    u.getNotifyPreference(), new TypeReference<Map<String, Object>>() {});
            for (String key : out.keySet()) {
                Object v = pref.get(key);
                if (v instanceof Boolean b) {
                    out.put(key, b);
                }
            }
        } catch (Exception e) {
            log.warn("读取用户通知偏好失败 userId={}: {}", userId, e.getMessage());
        }
        return out;
    }

    @Transactional
    public void saveUserPreference(Long userId, Map<String, Boolean> preference) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN, "未登录");
        }
        if (preference == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "偏好内容必填");
        }
        Map<String, Boolean> clean = new LinkedHashMap<>();
        for (String key : List.of("order", "member", "planet", "ops")) {
            Boolean v = preference.get(key);
            clean.put(key, v == null || v);
        }
        User u = userMapper.selectById(userId);
        if (u == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "用户不存在");
        }
        u.setNotifyPreference(writePreference(clean));
        userMapper.updateById(u);
    }

    private String writePreference(Map<String, Boolean> pref) {
        try {
            return objectMapper.writeValueAsString(pref);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "通知偏好保存失败");
        }
    }

    private Map<String, Boolean> sceneSwitchSnapshot() {
        long now = System.currentTimeMillis();
        Map<String, Boolean> cached = sceneSwitchCache;
        if (cached != null && now - sceneCacheAt < SCENE_CACHE_TTL_MS) {
            return cached;
        }
        Map<String, Boolean> loaded = new HashMap<>();
        try {
            List<com.miniprogram.entity.NoticeSceneConfig> rows = noticeSceneConfigMapper.selectList(null);
            for (com.miniprogram.entity.NoticeSceneConfig row : rows) {
                if (row != null && StringUtils.hasText(row.getScene())) {
                    loaded.put(row.getScene(), row.getEnabled() != null && row.getEnabled() != 0);
                }
            }
        } catch (Exception e) {
            // 迁移未执行时表不存在 → 视为全部开启，不能因为配置表缺失就停止发通知
            log.warn("读取通知场景开关失败，本次按全部开启处理: {}", e.getMessage());
        }
        sceneSwitchCache = loaded;
        sceneCacheAt = now;
        return loaded;
    }

    /** 配置变更后立即失效缓存，避免运营等 30s */
    public void evictSceneSwitchCache() {
        sceneSwitchCache = null;
        sceneCacheAt = 0L;
    }

    /**
     * @return true 表示确实写入了一行
     */
    private boolean create(Long userId, String bizKey, String scene, String title, String content, String link) {
        if (userId == null || !StringUtils.hasText(bizKey)) return false;
        if (!isSceneEnabled(scene)) {
            log.debug("通知场景已被运营关闭，跳过 scene={} userId={}", scene, userId);
            return false;
        }
        if (!isUserGroupEnabled(userId, scene)) {
            log.debug("用户关闭了该类通知，跳过 scene={} userId={}", scene, userId);
            return false;
        }
        UserNotice row = new UserNotice();
        row.setUserId(userId);
        row.setBizKey(bizKey);
        row.setScene(scene);
        row.setTitle(title);
        row.setContent(content);
        row.setLink(link);
        row.setIsRead(0);
        row.setCreatedAt(LocalDateTime.now());
        try {
            userNoticeMapper.insert(row);
            return true;
        } catch (DuplicateKeyException e) {
            return false;
        } catch (Exception e) {
            log.warn("写入站内通知失败 scene={} userId={}", scene, userId, e);
            return false;
        }
    }

    private String productName(Long orderId) {
        try {
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, orderId)
                    .last("LIMIT 1"));
            if (items != null && !items.isEmpty() && StringUtils.hasText(items.get(0).getProductName())) {
                return items.get(0).getProductName();
            }
        } catch (Exception e) {
            log.debug("读取订单商品名失败 orderId={}", orderId);
        }
        return "订单商品";
    }

    private boolean isVirtualDelivered(Order order) {
        return order != null
                && StringUtils.hasText(order.getVirtualDeliveryContent())
                && ("completed".equals(order.getStatus()) || "shipped".equals(order.getStatus()));
    }

    private String orderLink(Long orderId) {
        return "/pkg-trade/order-detail/order-detail?id=" + orderId;
    }

    private String chatLink(Long orderId) {
        return "/pkg-user/service-chat/service-chat?orderId=" + orderId;
    }
}
