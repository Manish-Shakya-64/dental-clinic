import { describe, it, expect } from "@jest/globals";
import { encryptField, decryptField } from "../src/utils/encryption.js";

describe("field encryption (AES-256-GCM)", () => {
  it("round-trips plaintext through encrypt then decrypt", () => {
    const plaintext = "patient@example.com";
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const plaintext = "0411000001";
    const first = encryptField(plaintext);
    const second = encryptField(plaintext);

    expect(first).not.toBe(second);
    expect(decryptField(first)).toBe(plaintext);
    expect(decryptField(second)).toBe(plaintext);
  });

  it("throws when the ciphertext or auth tag has been tampered with", () => {
    const encrypted = encryptField("sensitive clinical note");
    const [iv, tag, ciphertext] = encrypted.split(":");

    const tamperedCiphertext = Buffer.from(ciphertext, "base64");
    tamperedCiphertext[0] ^= 0xff;
    const tampered = `${iv}:${tag}:${tamperedCiphertext.toString("base64")}`;

    expect(() => decryptField(tampered)).toThrow();
  });
});
