package com.miniprogram.member;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 会员固定权益码。normalize 必须保留前端勾选的暖阁码，否则保存会被剥掉。
 */
public final class MemberBenefitCodes {

    public static final String MEMBER_DISCOUNT = "member_discount";
    public static final String POINTS_BOOST = "points_boost";
    public static final String EXCLUSIVE_COUPON = "exclusive_coupon";
    public static final String BIRTHDAY_GIFT = "birthday_gift";
    public static final String FILE_UNLOCK_ALL = "file_unlock_all";
    public static final String PLANET_EXCLUSIVE = "planet_exclusive";
    public static final String MEMBER_PRICE = "member_price";
    public static final String COLUMN_FREE = "column_free";
    public static final String ARTICLE_FREE = "article_free";
    public static final String COMMUNITY_ENTRY = "community_entry";

    public static final Set<String> ALL = Set.of(
            MEMBER_DISCOUNT, POINTS_BOOST, EXCLUSIVE_COUPON, BIRTHDAY_GIFT,
            FILE_UNLOCK_ALL, PLANET_EXCLUSIVE, MEMBER_PRICE, COLUMN_FREE,
            ARTICLE_FREE, COMMUNITY_ENTRY
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
        return Arrays.asList(
                FILE_UNLOCK_ALL, COLUMN_FREE, ARTICLE_FREE, MEMBER_DISCOUNT, MEMBER_PRICE,
                PLANET_EXCLUSIVE, COMMUNITY_ENTRY, POINTS_BOOST, EXCLUSIVE_COUPON, BIRTHDAY_GIFT
        );
    }
}
