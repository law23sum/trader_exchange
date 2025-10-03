package com.tradeexchange.common;

import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Locale;

@Component
public class PasswordService {
  private static final int SALT_BYTES = 16;
  private static final int KEY_LENGTH = 64;
  private static final int N = 16384;
  private static final int R = 8;
  private static final int P = 1;
  private final SecureRandom random = new SecureRandom();

  public String hashPassword(String password) {
    if (password == null) password = "";
    byte[] salt = new byte[SALT_BYTES];
    random.nextBytes(salt);
    byte[] hash = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8), salt, N, R, P, KEY_LENGTH);
    return "s2:" + toHex(salt) + ":" + toHex(hash);
  }

  public boolean verifyPassword(String stored, String attempt) {
    if (stored == null) return false;
    if (stored.startsWith("s2:")) {
      String[] parts = stored.split(":", 3);
      if (parts.length != 3) return false;
      byte[] salt = fromHex(parts[1]);
      byte[] expected = fromHex(parts[2]);
      byte[] actual = SCrypt.generate((attempt == null ? "" : attempt).getBytes(StandardCharsets.UTF_8), salt, N, R, P, KEY_LENGTH);
      return MessageDigest.isEqual(expected, actual);
    }
    return stored.equals(attempt == null ? "" : attempt);
  }

  private static String toHex(byte[] data) {
    StringBuilder sb = new StringBuilder(data.length * 2);
    for (byte b : data) {
      sb.append(String.format(Locale.ROOT, "%02x", b));
    }
    return sb.toString();
  }

  private static byte[] fromHex(String hex) {
    if (hex == null) return new byte[0];
    int len = hex.length();
    byte[] out = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      out[i / 2] = (byte) Integer.parseInt(hex.substring(i, i + 2), 16);
    }
    return out;
  }
}
