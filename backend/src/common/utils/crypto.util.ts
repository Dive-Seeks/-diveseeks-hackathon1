import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// In a real application, the encryption key should be stored securely in environment variables or a secret manager.
// For this implementation, we will use a fallback for demonstration purposes.
const RAW_KEY =
  process.env.ENCRYPTION_KEY || 'a-very-secure-32-byte-key-12345678';
// Ensure the key is exactly 32 bytes
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
