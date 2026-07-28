package com.miniprogram.dto.system;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WxPayPrivateKeyUploadVO {

    private Boolean uploaded;
    private String certSerialNo;
}
