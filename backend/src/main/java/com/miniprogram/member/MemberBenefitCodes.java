package com.miniprogram.member;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 会员固定权益码。
 */
public final class MemberBenefitCodes {

    public static final String MEMBER_DISCOUNT = "member_discount";
    public static final String POINTS_BOOST = "points_boost";
    public static final String EXCLUSIVE_COUPON = "exclusive_coupon";
    public static final String BIRTHDAY_GIFT = "birthday_gift";

    public static final Set<String> ALL = Set.of(
            MEMBER_DISCOUNT, POINTS_BOOST, EXCLUSIVE_COUPON, BIRTHDAY_GIFT
    );

    private MemberBenefitCodes() {
    }

    public static List<String> normalize(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyList();
        }
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String item : raw) {
            if (item == null || item.isBlank()) continue;
            String code = item.trim();
            if (ALL.contains(code)) {
                result.add(code);
            }
        }
        return result.stream().collect(Collectors.toList());
    }

    public static boolean has(List<String> benefits, String code) {
        return benefits != null && benefits.contains(code);
    }

    public static List<String> knownLabels() {
        return Arrays.asList(MEMBER_DISCOUNT, POINTS_BOOST, EXCLUSIVE_COUPON, BIRTHDAY_GIFT);
    }
}
