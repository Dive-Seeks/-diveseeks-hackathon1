import { Injectable, Logger } from '@nestjs/common';
import { LanguageModel } from 'ai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { AiConfiguration } from './entities/ai-configuration.entity';
import { AiKeyVaultService } from './ai-key-vault.service';

@Injectable()
export class UserLlmResolverService {
  private readonly logger = new Logger(UserLlmResolverService.name);

  constructor(
    @InjectRepository(AiConfiguration)
    private readonly aiConfigRepo: Repository<AiConfiguration>,
    private readonly vault: AiKeyVaultService,
  ) {}

  /**
   * Resolve the per-user LanguageModel from their stored BYOK key.
   * Returns null when: userId undefined, no record found, or resolution fails.
   * Callers should fall back to router.getModel() when null is returned.
   */
  async resolveModel(
    userId: string | undefined,
    specialistId?: string,
  ): Promise<LanguageModel | null> {
    if (!userId) return null;

    try {
      // 1. Try specialist-specific key first
      if (specialistId) {
        const specificConfig = await this.aiConfigRepo.findOne({
          where: { userId, context: 'coding', specialistId },
        });
        if (specificConfig) {
          this.logger.log(
            `[UserModel] Using specialist-specific key for ${specialistId} userId=${userId}`,
          );
          const model = this.buildModelFromConfig(specificConfig, userId);
          if (model) return model;
        }
      }

      // 2. Fall back to team-wide key (specialistId IS NULL)
      const config = await this.aiConfigRepo.findOne({
        where: { userId, context: 'coding', specialistId: null as any },
      });
      if (!config) {
        this.logger.warn(
          `[UserModel] No BYOK found for userId=${userId} specialist=${specialistId ?? 'any'} — using platform model`,
        );
        return null;
      }
      this.logger.log(
        `[UserModel] Using team-wide key for userId=${userId} (no specialist-specific key for ${specialistId ?? 'any'})`,
      );
      return this.buildModelFromConfig(config, userId);
    } catch (err) {
      this.logger.error(
        `[UserModel] Failed to resolve user model for ${userId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private normalizeModelName(provider: string, model: string): string {
    if (provider === 'google') {
      const googleRemap: Record<string, string> = {
        'gemini-2.0-flash-001': 'gemini-2.5-flash',
        'gemini-2.0-flash': 'gemini-2.5-flash',
        'gemini-2.0-flash-exp': 'gemini-2.5-flash',
        // Gemini 1.5 series retired from v1beta — remap to living equivalents
        'gemini-1.5-flash-001': 'gemini-2.5-flash',
        'gemini-1.5-flash': 'gemini-2.5-flash',
        'gemini-1.5-pro-001': 'gemini-2.5-pro',
        'gemini-1.5-pro': 'gemini-2.5-pro',
        'gemini-pro': 'gemini-2.5-pro',
      };
      return googleRemap[model] ?? model;
    }
    return model;
  }

  private buildModelFromConfig(
    config: AiConfiguration,
    userId: string,
  ): LanguageModel | null {
    const model = this.normalizeModelName(config.provider, config.model);
    switch (config.provider) {
      case 'openai': {
        const key = this.vault.decryptIfNeeded(userId, config.openaiApiKey);
        if (!key) {
          this.logger.warn(`[UserModel] openai key missing for user ${userId}`);
          return null;
        }
        return createOpenAI({ apiKey: key })(model);
      }
      case 'groq': {
        const key = this.vault.decryptIfNeeded(userId, config.groqApiKey);
        if (!key) {
          this.logger.warn(`[UserModel] groq key missing for user ${userId}`);
          return null;
        }
        return createGroq({ apiKey: key })(model);
      }
      case 'openrouter': {
        const key = this.vault.decryptIfNeeded(userId, config.openRouterApiKey);
        if (!key) {
          this.logger.warn(
            `[UserModel] openrouter key missing for user ${userId}`,
          );
          return null;
        }
        return createOpenRouter({ apiKey: key })(model);
      }
      case 'google': {
        const key = this.vault.decryptIfNeeded(userId, config.googleApiKey);
        if (!key) {
          this.logger.warn(`[UserModel] google key missing for user ${userId}`);
          return null;
        }
        return createGoogleGenerativeAI({ apiKey: key })(model);
      }
      default:
        this.logger.warn(
          `[UserModel] Unknown provider "${config.provider}" for user ${userId}`,
        );
        return null;
    }
  }
}
