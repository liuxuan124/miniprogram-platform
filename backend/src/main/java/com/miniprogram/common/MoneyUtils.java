package com.miniprogram.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 金额换算：全链路统一 HALF_UP 到分。
 */
public final class MoneyUtils {

    private MoneyUtils() {}

    public static BigDecimal normalizeYuan(BigDecimal amount) {
        if (amount == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static int toCents(BigDecimal yuan) {
        return normalizeYuan(yuan).movePointRight(2).setScale(0, RoundingMode.HALF_UP).intValueExact();
    }

    public static long toCentsLong(BigDecimal yuan) {
        return normalizeYuan(yuan).movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
