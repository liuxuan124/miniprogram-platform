package com.miniprogram.compliance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.Product;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * iOS 虚拟商品支付策略（默认阻断普通微信支付，待运营确认是否接虚拟支付通道）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IosVirtualPayPolicyService {

    public static final int ERR_IOS_VIRTUAL_BLOCKED = 600302;

    private static final String CONFIG_KEY = "commerce_ios_virtual_pay";

    private final SystemConfigService systemConfigService;
    private final ComplianceAuditService complianceAuditService;
    private final ObjectMapper objectMapper;

    public record PurchaseGate(boolean canPurchase, boolean virtualGoods, String blockReason, String iosStrategy) {}

    public boolean isVirtualGoods(Product product) {
        if (product == null) {
            return false;
        }
        return ProductTypes.isVirtual(product.getProductType(), product.getProductTypes())
                || ProductTypes.isMembership(product.getProductType(), product.getProductTypes());
    }

    public PurchaseGate evaluateProduct(String clientPlatform, Product product) {
        boolean virtual = isVirtualGoods(product);
        if (!virtual) {
            return new PurchaseGate(true, false, null, readConfig().iosStrategy());
        }
        if (!isIos(clientPlatform)) {
            return new PurchaseGate(true, true, null, readConfig().iosStrategy());
        }
        IosVirtualPayConfig cfg = readConfig();
        if ("virtual_payment".equals(cfg.iosStrategy())) {
            // 占位：未接米大师前仍阻断普通支付，避免误开
            return new PurchaseGate(false, true, cfg.blockMessage() + "（虚拟支付通道尚未接入）", cfg.iosStrategy());
        }
        if ("block_wx_pay".equals(cfg.iosStrategy()) || !StringUtils.hasText(cfg.iosStrategy())) {
            return new PurchaseGate(false, true, cfg.blockMessage(), cfg.iosStrategy());
        }
        return new PurchaseGate(false, true, cfg.blockMessage(), cfg.iosStrategy());
    }

    public void assertCanCreateOrder(Long userId, String clientPlatform, List<Product> products) {
        if (products == null || products.isEmpty() || !isIos(clientPlatform)) {
            return;
        }
        for (Product p : products) {
            if (!isVirtualGoods(p)) {
                continue;
            }
            PurchaseGate gate = evaluateProduct(clientPlatform, p);
            if (!gate.canPurchase()) {
                complianceAuditService.log(
                        "ios_virtual_pay_blocked",
                        "order",
                        p.getId() == null ? null : String.valueOf(p.getId()),
                        userId,
                        clientPlatform,
                        "block",
                        gate.blockReason(),
                        Map.of("productId", p.getId(), "strategy", gate.iosStrategy())
                );
                throw new BusinessException(ERR_IOS_VIRTUAL_BLOCKED, gate.blockReason());
            }
        }
    }

    public void assertCanWxPayOrder(Long userId, String clientPlatform, List<Product> products) {
        assertCanCreateOrder(userId, clientPlatform, products);
    }

    public Map<String, Object> publicSnapshot() {
        IosVirtualPayConfig cfg = readConfig();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("iosStrategy", cfg.iosStrategy());
        m.put("blockMessage", cfg.blockMessage());
        m.put("userConfirmRequired", cfg.userConfirmRequired());
        return m;
    }

    public IosVirtualPayConfig readConfig() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (!StringUtils.hasText(raw)) {
                return IosVirtualPayConfig.defaults();
            }
            Map<String, Object> map = objectMapper.readValue(raw, new TypeReference<>() {});
            return IosVirtualPayConfig.from(map);
        } catch (Exception e) {
            log.warn("parse commerce_ios_virtual_pay failed", e);
            return IosVirtualPayConfig.defaults();
        }
    }

    public void saveConfig(Map<String, Object> body) {
        IosVirtualPayConfig current = readConfig();
        IosVirtualPayConfig next = IosVirtualPayConfig.from(body != null ? body : Map.of());
        if (!StringUtils.hasText(next.iosStrategy())) {
            next = new IosVirtualPayConfig(
                    current.iosStrategy(),
                    next.blockMessage() != null ? next.blockMessage() : current.blockMessage(),
                    next.allowPhysicalOnIos(),
                    next.userConfirmRequired(),
                    next.note()
            );
        }
        try {
            String json = objectMapper.writeValueAsString(next.toMap());
            systemConfigService.batchUpdateConfigs(batch(CONFIG_KEY, json, "commerce", "iOS 虚拟支付策略"));
        } catch (Exception e) {
            throw new IllegalStateException("保存 iOS 虚拟支付配置失败", e);
        }
    }

    private static com.miniprogram.dto.system.ConfigBatchUpdateDTO batch(
            String key, String value, String group, String desc) {
        com.miniprogram.dto.system.ConfigItemDTO item = new com.miniprogram.dto.system.ConfigItemDTO();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup(group);
        item.setDescription(desc);
        com.miniprogram.dto.system.ConfigBatchUpdateDTO dto = new com.miniprogram.dto.system.ConfigBatchUpdateDTO();
        dto.setConfigs(List.of(item));
        return dto;
    }

    public static boolean isIos(String clientPlatform) {
        if (!StringUtils.hasText(clientPlatform)) {
            return false;
        }
        String p = clientPlatform.trim().toLowerCase(Locale.ROOT);
        return "ios".equals(p) || p.contains("iphone") || p.contains("ipad");
    }

    public record IosVirtualPayConfig(
            String iosStrategy,
            String blockMessage,
            boolean allowPhysicalOnIos,
            boolean userConfirmRequired,
            String note
    ) {
        static IosVirtualPayConfig defaults() {
            return new IosVirtualPayConfig(
                    "block_wx_pay",
                    "根据微信小程序规则，iOS 端暂不支持直接购买此类虚拟商品，请使用 Android 或联系客服。",
                    true,
                    true,
                    "待用户确认是否接入 wx.requestVirtualPayment"
            );
        }

        static IosVirtualPayConfig from(Map<String, Object> map) {
            IosVirtualPayConfig d = defaults();
            if (map == null || map.isEmpty()) {
                return d;
            }
            String strategy = str(map.get("iosStrategy"), d.iosStrategy());
            String msg = str(map.get("blockMessage"), d.blockMessage());
            boolean physical = bool(map.get("allowPhysicalOnIos"), d.allowPhysicalOnIos());
            boolean confirm = bool(map.get("userConfirmRequired"), d.userConfirmRequired());
            String note = str(map.get("note"), d.note());
            return new IosVirtualPayConfig(strategy, msg, physical, confirm, note);
        }

        Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("iosStrategy", iosStrategy);
            m.put("blockMessage", blockMessage);
            m.put("allowPhysicalOnIos", allowPhysicalOnIos);
            m.put("userConfirmRequired", userConfirmRequired);
            m.put("note", note);
            return m;
        }

        private static String str(Object o, String def) {
            if (o == null) return def;
            String s = String.valueOf(o).trim();
            return s.isEmpty() ? def : s;
        }

        private static boolean bool(Object o, boolean def) {
            if (o == null) return def;
            if (o instanceof Boolean b) return b;
            return "true".equalsIgnoreCase(String.valueOf(o)) || "1".equals(String.valueOf(o));
        }
    }
}
