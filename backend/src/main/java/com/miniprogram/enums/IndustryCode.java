package com.miniprogram.enums;

import lombok.Getter;

@Getter
public enum IndustryCode {

    CLOTHING("clothing", "服装鞋包"),
    FOOD("food", "食品饮料"),
    DIGITAL("digital", "数码家电"),
    HOME("home", "家居日用"),
    BEAUTY("beauty", "美妆护肤"),
    EDUCATION("education", "教育培训"),
    SPORTS("sports", "运动户外"),
    TRAVEL("travel", "旅游出行"),
    FURNITURE("furniture", "家装建材"),
    MEDICAL("medical", "医疗健康"),
    WEDDING("wedding", "婚庆服务"),
    PET("pet", "宠物生活");

    private final String code;
    private final String label;

    IndustryCode(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public static IndustryCode fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (IndustryCode ic : values()) {
            if (ic.code.equals(code)) {
                return ic;
            }
        }
        return null;
    }
}
