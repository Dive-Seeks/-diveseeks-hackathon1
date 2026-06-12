import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CredentialVaultService {
  private readonly masterKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    this.masterKey =
      this.configService.get<string>('API_FUSION_MASTER_KEY') || '';
    if (!this.masterKey) {
      // For development, use a fallback if not provided, but warn loudly
      console.error(
        'CRITICAL: API_FUSION_MASTER_KEY not found in environment. Encryption will use a default key which is NOT SECURE.',
      );
      this.masterKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
  }

  private deriveKey(tenantId: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(this.masterKey, 'hex'),
        Buffer.from(tenantId),
        'api-fusion-v1',
        32,
      ),
    );
  }

  encrypt(
    tenantId: string,
    credentials: object,
  ): { iv: string; authTag: string; ciphertext: string } {
    const key = this.deriveKey(tenantId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext,
    };
  }

  decrypt(
    tenantId: string,
    encrypted: { iv: string; authTag: string; ciphertext: string },
  ): object {
    const key = this.deriveKey(tenantId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encrypted.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
