package com.miniprogram.entitlement.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EntitlementCheckResult {
    private boolean allowed;
    private String reason;
    private int previewPercent;
    private String previewBody;
    private List<EntitlementUnlockOption> unlockOptions;
}
