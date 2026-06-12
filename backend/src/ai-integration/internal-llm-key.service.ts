import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConfiguration } from './entities/ai-configuration.entity';
import { AiKeyVaultService } from './ai-key-vault.service';

export interface ResolvedUserKey {
  provider: 'google' | 'openai' | 'groq' | 'openrouter' | 'deepseek';
  model: string;
  apiKey: string;
}

@Injectable()
export class InternalLlmKeyService {
  constructor(
    @InjectRepository(AiConfiguration)
    private readonly aiConfigRepo: Repository<AiConfiguration>,
    private readonly vault: AiKeyVaultService,
  ) {}

  async resolve(userId: string): Promise<ResolvedUserKey | null> {
    const config = await this.aiConfigRepo.findOne({
      where: { userId, context: 'coding' },
    });
    if (!config) return null;
    const raw =
      config.provider === 'google'
        ? config.googleApiKey
        : config.provider === 'openai'
          ? config.openaiApiKey
          : config.provider === 'groq'
            ? config.groqApiKey
            : config.provider === 'openrouter'
              ? config.openRouterApiKey
              : config.provider === 'deepseek'
                ? config.deepseekApiKey
                : null;
    if (!raw) return null;
    const apiKey = this.vault.decryptIfNeeded(userId, raw);
    if (!apiKey) return null;
    return { provider: config.provider, model: config.model, apiKey };
  }
}
