package com.miniprogram.dto.system;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WxPayConfigTestVO {

    private Boolean connected;
    private String environment;
    private String message;
}
