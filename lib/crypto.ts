/**
 * Simple AES-GCM encryption/decryption utility for client-side use.
 * In a real-world scenario, you would use a more robust key management system.
 */

const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
  "dive-pos-default-secret-key-32chars!!";

/**
 * Encrypts a string using AES-GCM.
 */
export async function encrypt(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Import the key
    const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts a base64 string using AES-GCM.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  try {
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Masks sensitive data for preview.
 */
export function maskSensitiveData(
  value: string,
  visibleChars: number = 4,
): string {
  if (!value) return "";
  if (value.length <= visibleChars) return "*".repeat(value.length);

  const maskedLength = value.length - visibleChars;
  return "*".repeat(maskedLength) + value.slice(-visibleChars);
}
