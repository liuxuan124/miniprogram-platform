package com.miniprogram.product;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 商品类型：physical / digital / service / membership / ebook / column / resource_pack
 * digital 保留兼容；ebook/column/resource_pack 为暖色原型细分类。
 */
public final class ProductTypes {

    public static final String PHYSICAL = "physical";
    public static final String DIGITAL = "digital";
    public static final String SERVICE = "service";
    public static final String MEMBERSHIP = "membership";
    public static final String EBOOK = "ebook";
    public static final String COLUMN = "column";
    public static final String RESOURCE_PACK = "resource_pack";

    public static final List<String> ALL = List.of(
            PHYSICAL, DIGITAL, SERVICE, MEMBERSHIP, EBOOK, COLUMN, RESOURCE_PACK
    );

    public static final List<String> VIRTUAL = List.of(
            DIGITAL, MEMBERSHIP, EBOOK, COLUMN, RESOURCE_PACK
    );

    private ProductTypes() {
    }

    public static String normalizeOne(String raw) {
        if (raw == null || raw.isBlank()) return PHYSICAL;
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if (ALL.contains(v)) return v;
        return PHYSICAL;
    }

    public static boolean isMembership(String productType, String productTypesJson) {
        if (MEMBERSHIP.equalsIgnoreCase(productType)) return true;
        return productTypesJson != null && productTypesJson.toLowerCase(Locale.ROOT).contains(MEMBERSHIP);
    }

    public static boolean isVirtual(String productType) {
        String n = normalizeOne(productType);
        return VIRTUAL.contains(n);
    }

    public static boolean isVirtual(String productType, String productTypesJson) {
        if (isVirtual(productType)) return true;
        if (productTypesJson == null) return false;
        String lower = productTypesJson.toLowerCase(Locale.ROOT);
        for (String v : VIRTUAL) {
            if (lower.contains(v)) return true;
        }
        return false;
    }

    public static List<String> normalizeList(List<String> raw) {
        Set<String> set = new LinkedHashSet<>();
        if (raw != null) {
            for (String item : raw) {
                if (item == null || item.isBlank()) continue;
                for (String part : item.split("[,|，]")) {
                    String n = normalizeOne(part);
                    if (ALL.contains(n)) set.add(n);
                }
            }
        }
        if (set.isEmpty()) set.add(PHYSICAL);
        return new ArrayList<>(set);
    }

    public static String primaryOf(List<String> types) {
        List<String> list = normalizeList(types);
        return list.get(0);
    }

    public static boolean contains(List<String> types, String type) {
        return normalizeList(types).contains(normalizeOne(type));
    }
}
