package com.miniprogram.support;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** 财务金额：库内用分，接口层可带元字段兼容 */
public final class FinanceMoneyHelper {

    private FinanceMoneyHelper() {
    }

    public static long yuanToCents(BigDecimal yuan) {
        if (yuan == null) {
            return 0L;
        }
        return yuan.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    public static BigDecimal centsToYuan(Long cents) {
        if (cents == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public static void syncAmountColumns(BigDecimal yuanField, Long centsField, java.util.function.Consumer<Long> setCents,
                                         java.util.function.Consumer<BigDecimal> setYuan) {
        if (centsField != null && centsField > 0) {
            setYuan.accept(centsToYuan(centsField));
        } else if (yuanField != null) {
            long c = yuanToCents(yuanField);
            setCents.accept(c);
            setYuan.accept(centsToYuan(c));
        }
    }
}
