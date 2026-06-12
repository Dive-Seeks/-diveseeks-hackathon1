import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface EncryptedBlob {
  iv: string;
  authTag: string;
  ciphertext: string;
}

@Injectable()
export class AiKeyVaultService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: string;

  constructor(private readonly configService: ConfigService) {
    this.masterKey =
      this.configService.get<string>('BRAIN_VAULT_MASTER_KEY') ??
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }

  private deriveKey(userId: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(this.masterKey, 'hex'),
        Buffer.from(userId),
        'ai-key-vault-v1',
        32,
      ),
    );
  }

  encrypt(userId: string, plaintext: string): string {
    const key = this.deriveKey(userId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const blob: EncryptedBlob = {
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext,
    };
    return JSON.stringify(blob);
  }

  decrypt(userId: string, stored: string): string {
    const blob: EncryptedBlob = JSON.parse(stored);
    const key = this.deriveKey(userId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(blob.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(blob.authTag, 'hex'));

    let plain = decipher.update(blob.ciphertext, 'hex', 'utf8');
    plain += decipher.final('utf8');
    return plain;
  }

  // Detects whether a stored value is an encrypted blob or legacy plaintext.
  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    try {
      const parsed = JSON.parse(value);
      return (
        typeof parsed === 'object' &&
        typeof parsed.iv === 'string' &&
        typeof parsed.authTag === 'string' &&
        typeof parsed.ciphertext === 'string'
      );
    } catch {
      return false;
    }
  }

  // Encrypts a key if not already encrypted; returns null passthrough.
  encryptIfNeeded(
    userId: string,
    value: string | null | undefined,
  ): string | null {
    if (!value) return null;
    if (this.isEncrypted(value)) return value;
    return this.encrypt(userId, value);
  }

  // Decrypts a key if encrypted; returns plaintext passthrough for legacy rows.
  decryptIfNeeded(
    userId: string,
    value: string | null | undefined,
  ): string | null {
    if (!value) return null;
    if (this.isEncrypted(value)) return this.decrypt(userId, value);
    return value; // legacy plaintext — will be re-encrypted on next write
  }
}
