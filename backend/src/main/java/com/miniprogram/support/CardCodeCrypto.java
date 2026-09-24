package com.miniprogram.support;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 卡密 AES-GCM 加解密。存量明文（无 enc:v1: 前缀）解密时原样返回。
 */
@Component
public class CardCodeCrypto {

    private static final String PREFIX = "enc:v1:";
    private static final int GCM_TAG = 128;
    private static final int IV_LEN = 12;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.card-code-encryption-key:${JWT_SECRET:}}")
    private String encryptionKey;

    public String encrypt(String plain) {
        if (!StringUtils.hasText(plain)) {
            return plain;
        }
        String trimmed = plain.trim();
        if (trimmed.startsWith(PREFIX)) {
            return trimmed;
        }
        byte[] key = deriveKey();
        try {
            byte[] iv = new byte[IV_LEN];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(GCM_TAG, iv));
            byte[] cipherBytes = cipher.doFinal(trimmed.getBytes(StandardCharsets.UTF_8));
            byte[] packed = new byte[iv.length + cipherBytes.length];
            System.arraycopy(iv, 0, packed, 0, iv.length);
            System.arraycopy(cipherBytes, 0, packed, iv.length, cipherBytes.length);
            return PREFIX + Base64.getEncoder().encodeToString(packed);
        } catch (Exception e) {
            throw new IllegalStateException("卡密加密失败", e);
        }
    }

    public String decrypt(String stored) {
        if (!StringUtils.hasText(stored)) {
            return stored;
        }
        String s = stored.trim();
        if (!s.startsWith(PREFIX)) {
            return s;
        }
        byte[] key = deriveKey();
        try {
            byte[] packed = Base64.getDecoder().decode(s.substring(PREFIX.length()));
            if (packed.length <= IV_LEN) {
                throw new IllegalArgumentException("invalid cipher blob");
            }
            byte[] iv = new byte[IV_LEN];
            byte[] cipherBytes = new byte[packed.length - IV_LEN];
            System.arraycopy(packed, 0, iv, 0, IV_LEN);
            System.arraycopy(packed, IV_LEN, cipherBytes, 0, cipherBytes.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(GCM_TAG, iv));
            return new String(cipher.doFinal(cipherBytes), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("卡密解密失败", e);
        }
    }

    private byte[] deriveKey() {
        String raw = StringUtils.hasText(encryptionKey) ? encryptionKey : "dev-card-code-key-change-me";
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
