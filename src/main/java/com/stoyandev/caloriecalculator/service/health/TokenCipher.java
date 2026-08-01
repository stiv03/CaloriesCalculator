package com.stoyandev.caloriecalculator.service.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-GCM encryption for secrets at rest (the Google refresh token). The key
 * comes from the {@code google.health.token-enc-key} property (base64 of a
 * 16/24/32-byte key). Output format: base64( iv[12] || ciphertext+tag ).
 */
@Component
public class TokenCipher {

    private static final int IV_LEN = 12;          // GCM standard nonce length
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public TokenCipher(@Value("${google.health.token-enc-key}") String base64Key) {
        byte[] raw = Base64.getDecoder().decode(base64Key.trim());
        if (raw.length != 16 && raw.length != 24 && raw.length != 32) {
            throw new IllegalStateException(
                "google.health.token-enc-key must decode to 16, 24, or 32 bytes (got " + raw.length + ")");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct).array();
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Token encryption failed", e);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] all = Base64.getDecoder().decode(stored);
            byte[] iv = new byte[IV_LEN];
            byte[] ct = new byte[all.length - IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            System.arraycopy(all, IV_LEN, ct, 0, ct.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Token decryption failed", e);
        }
    }
}
