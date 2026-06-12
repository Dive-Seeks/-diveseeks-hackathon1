import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  McpCredential,
  McpCredentialStatus,
} from './entities/mcp-credential.entity';

@Injectable()
export class McpVaultService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: string;

  constructor(
    @InjectRepository(McpCredential)
    private readonly credRepo: Repository<McpCredential>,
    private readonly configService: ConfigService,
  ) {
    this.masterKey =
      this.configService.get<string>('BRAIN_VAULT_MASTER_KEY') ??
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }

  // ── Key derivation (per-MCP, isolated from API fusion vault) ──────────────

  private deriveKey(mcpId: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(this.masterKey, 'hex'),
        Buffer.from(mcpId),
        'mcp-vault-v1',
        32,
      ),
    );
  }

  private encrypt(
    mcpId: string,
    plaintext: string,
  ): { iv: string; authTag: string; ciphertext: string } {
    const key = this.deriveKey(mcpId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext,
    };
  }

  private decrypt(
    mcpId: string,
    encrypted: { iv: string; authTag: string; ciphertext: string },
  ): string {
    const key = this.deriveKey(mcpId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encrypted.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let plain = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    plain += decipher.final('utf8');
    return plain;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async storeKey(mcpId: string, llmApiKey: string): Promise<McpCredential> {
    const existing = await this.credRepo.findOne({
      where: { mcpId, status: McpCredentialStatus.ACTIVE },
    });
    if (existing) {
      // Rotate: mark old as rotated, create new
      await this.credRepo.update(existing.id, {
        status: McpCredentialStatus.ROTATED,
      });
      const encryptedKey = this.encrypt(mcpId, llmApiKey);
      return this.credRepo.save(
        this.credRepo.create({
          mcpId,
          encryptedKey,
          rotatedFromId: existing.id,
        }),
      );
    }

    const encryptedKey = this.encrypt(mcpId, llmApiKey);
    return this.credRepo.save(this.credRepo.create({ mcpId, encryptedKey }));
  }

  async retrieveKey(mcpId: string): Promise<string> {
    const cred = await this.credRepo.findOne({
      where: { mcpId, status: McpCredentialStatus.ACTIVE },
    });
    if (!cred)
      throw new NotFoundException(`No active LLM key for MCP "${mcpId}"`);
    return this.decrypt(mcpId, cred.encryptedKey);
  }

  async revokeKey(mcpId: string): Promise<void> {
    const cred = await this.credRepo.findOne({
      where: { mcpId, status: McpCredentialStatus.ACTIVE },
    });
    if (!cred) return;
    await this.credRepo.update(cred.id, {
      status: McpCredentialStatus.REVOKED,
      revokedAt: new Date(),
    });
  }

  async hasKey(mcpId: string): Promise<boolean> {
    const count = await this.credRepo.count({
      where: { mcpId, status: McpCredentialStatus.ACTIVE },
    });
    return count > 0;
  }
}
