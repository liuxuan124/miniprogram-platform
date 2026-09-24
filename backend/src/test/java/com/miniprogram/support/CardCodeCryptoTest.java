package com.miniprogram.support;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CardCodeCryptoTest {

    private final CardCodeCrypto crypto = new CardCodeCrypto();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(crypto, "encryptionKey", "test-key-for-unit");
    }

    @Test
    void roundTripEncryptDecrypt() {
        String plain = "ABCD-1234-EFGH";
        String enc = crypto.encrypt(plain);
        assertTrue(enc.startsWith("enc:v1:"));
        assertEquals(plain, crypto.decrypt(enc));
    }

    @Test
    void legacyPlainPassthrough() {
        assertEquals("legacy-code", crypto.decrypt("legacy-code"));
    }
}
