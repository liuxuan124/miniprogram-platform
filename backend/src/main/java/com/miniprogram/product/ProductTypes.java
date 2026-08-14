package com.miniprogram.product;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 商品类型：physical / digital / service
 */
public final class ProductTypes {

    public static final String PHYSICAL = "physical";
    public static final String DIGITAL = "digital";
    public static final String SERVICE = "service";

    public static final List<String> ALL = List.of(PHYSICAL, DIGITAL, SERVICE);

    private ProductTypes() {
    }

    public static String normalizeOne(String raw) {
        if (raw == null || raw.isBlank()) return PHYSICAL;
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if (DIGITAL.equals(v) || SERVICE.equals(v) || PHYSICAL.equals(v)) return v;
        return PHYSICAL;
    }

    public static List<String> normalizeList(List<String> raw) {
        Set<String> set = new LinkedHashSet<>();
        if (raw != null) {
            for (String item : raw) {
                if (item == null || item.isBlank()) continue;
                // 兼容逗号分隔
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
