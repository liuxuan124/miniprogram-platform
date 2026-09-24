package com.miniprogram.service;

public interface UserConsentService {

    void recordConsent(Long userId, String consentType, String version, boolean agreed, String ip, String userAgent);

    boolean hasAgreed(Long userId, String consentType, String version);
}
