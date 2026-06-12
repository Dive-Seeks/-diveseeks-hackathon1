import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  streamText,
  convertToModelMessages,
  UIMessage,
  LanguageModel,
} from 'ai';
import {
  AiConfiguration,
  AiContext,
  AiProvider,
} from './entities/ai-configuration.entity';
import { SaveAiConfigDto } from './dto/ai-integration.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { AiKeyVaultService } from './ai-key-vault.service';
import { DeveloperProfile } from '../abigail/entities/developer-profile.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';

const SYSTEM_PROMPTS = {
  general: `You are Abigail, an intelligent AI assistant for Dive POS - a multi-tenant point of sale platform.

**About You:**
- Your name is Abigail, and you're here to help business owners succeed
- You're knowledgeable about POS operations, inventory management, and business analytics
- You provide guidance in a professional yet friendly manner
- You understand the challenges of running a restaurant, retail store, or cafe

**Your Role:**
Help business owners manage their stores, answer questions, and provide practical guidance on:
- Store operations and workflow optimization
- Menu/product management
- Staff and customer management
- Business insights and best practices

Always be helpful, clear, and action-oriented.`,

  marketing: `You are Abigail, Dive POS's expert marketing AI assistant.

**About You:**
- Specialist in food & retail marketing strategies
- Creative copywriter with deep understanding of customer psychology
- Data-driven approach to campaign optimization

**Your Role:**
Help business owners grow their customer base through:
- Compelling website copy and landing pages
- Engaging social media content (Instagram, Facebook, TikTok)
- Effective ad campaigns (Google Ads, Meta Ads)
- Email marketing and promotional content
- Product descriptions that convert
- Marketing strategies tailored to their business type

Always be creative, persuasive, and brand-aware. Match their business tone and target audience.`,

  analytics: `You are Abigail, Dive POS's expert business analytics AI assistant.

**About You:**
- Data analyst specialized in retail and hospitality metrics
- Expert at translating complex data into actionable insights
- Proactive in identifying opportunities for growth

**Your Role:**
Help business owners understand and improve their performance by:
- Analyzing sales trends and patterns
- Identifying best-selling products and peak hours
- Flagging underperforming items or low-traffic periods
- Providing data-driven recommendations to boost revenue
- Explaining KPIs in simple, business-owner-friendly language
- Suggesting concrete next steps based on their data

Be proactive, clear, and always focus on actionable recommendations. Make data easy to understand and act upon.`,
};

const BOOTSTRAP_MODELS: Record<AiProvider, string> = {
  openrouter: 'google/gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  google: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
};

@Injectable()
export class AiIntegrationService {
  constructor(
    @InjectRepository(AiConfiguration)
    private readonly aiConfigRepo: Repository<AiConfiguration>,
    @InjectRepository(DeveloperProfile)
    private readonly profileRepo: Repository<DeveloperProfile>,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    private readonly cacheService: RedisCacheService,
    private readonly configService: ConfigService,
    private readonly vault: AiKeyVaultService,
  ) {}

  async saveConfig(
    userId: string,
    dto: SaveAiConfigDto,
    context: AiContext = 'pos',
  ): Promise<{ message: string }> {
    let config = await this.aiConfigRepo.findOne({
      where: { userId, context },
    });

    if (config) {
      config.provider = dto.provider;
      config.model = dto.model;
      if (dto.openaiApiKey !== undefined)
        config.openaiApiKey = this.vault.encryptIfNeeded(
          userId,
          dto.openaiApiKey,
        );
      if (dto.groqApiKey !== undefined)
        config.groqApiKey = this.vault.encryptIfNeeded(userId, dto.groqApiKey);
      if (dto.openRouterApiKey !== undefined)
        config.openRouterApiKey = this.vault.encryptIfNeeded(
          userId,
          dto.openRouterApiKey,
        );
      if (dto.googleApiKey !== undefined)
        config.googleApiKey = this.vault.encryptIfNeeded(userId, dto.googleApiKey);
      if (dto.deepseekApiKey !== undefined)
        config.deepseekApiKey = this.vault.encryptIfNeeded(userId, dto.deepseekApiKey);
    } else {
      config = this.aiConfigRepo.create({
        userId,
        context,
        provider: dto.provider,
        model: dto.model,
        openaiApiKey: this.vault.encryptIfNeeded(userId, dto.openaiApiKey),
        groqApiKey: this.vault.encryptIfNeeded(userId, dto.groqApiKey),
        openRouterApiKey: this.vault.encryptIfNeeded(userId, dto.openRouterApiKey),
        googleApiKey: this.vault.encryptIfNeeded(userId, dto.googleApiKey),
        deepseekApiKey: this.vault.encryptIfNeeded(userId, dto.deepseekApiKey),
      });
    }

    await this.aiConfigRepo.save(config);
    return { message: 'AI configuration saved successfully.' };
  }

  async getConfig(
    userId: string,
    context: AiContext = 'pos',
  ): Promise<{
    configured: boolean;
    provider?: AiProvider;
    model?: string;
    hasOpenai?: boolean;
    hasGroq?: boolean;
    hasOpenRouter?: boolean;
    hasGoogle?: boolean;
    hasDeepseek?: boolean;
    openaiApiKey?: string;
    groqApiKey?: string;
    openRouterApiKey?: string;
    googleApiKey?: string;
    deepseekApiKey?: string;
  }> {
    const config = await this.aiConfigRepo.findOne({
      where: { userId, context },
    });
    if (!config) return { configured: false };

    let resolvedModel = config.model;
    const isMature = await this.checkProfileMaturity(userId);
    if (!isMature) {
      resolvedModel = BOOTSTRAP_MODELS[config.provider] || config.model;
    }

    return {
      configured: true,
      provider: config.provider,
      model: resolvedModel,
      hasOpenai: !!config.openaiApiKey,
      hasGroq: !!config.groqApiKey,
      hasOpenRouter: !!config.openRouterApiKey,
      hasGoogle: !!config.googleApiKey,
      hasDeepseek: !!config.deepseekApiKey,
      openaiApiKey: this.vault.decryptIfNeeded(userId, config.openaiApiKey) || undefined,
      groqApiKey: this.vault.decryptIfNeeded(userId, config.groqApiKey) || undefined,
      openRouterApiKey: this.vault.decryptIfNeeded(userId, config.openRouterApiKey) || undefined,
      googleApiKey: this.vault.decryptIfNeeded(userId, config.googleApiKey) || undefined,
      deepseekApiKey: this.vault.decryptIfNeeded(userId, config.deepseekApiKey) || undefined,
    };
  }

  async testApiKey(
    provider: AiProvider,
    apiKey: string,
  ): Promise<{ success: boolean; message: string }> {
    // Detect obvious wrong key formats before hitting the provider
    if (provider === 'google') {
      if (apiKey.startsWith('ya29.') || apiKey.startsWith('AQ.') || apiKey.startsWith('eyJ')) {
        return {
          success: false,
          message:
            'This looks like a Google OAuth2 token, not a Gemini API key. ' +
            'Get a Gemini API key at aistudio.google.com/app/apikey — it starts with "AIza".',
        };
      }
      if (!apiKey.startsWith('AIza')) {
        return {
          success: false,
          message:
            'Invalid Gemini API key format. Keys from aistudio.google.com start with "AIza".',
        };
      }
    }

    try {
      let fetchRes: globalThis.Response;
      switch (provider) {
        case 'google':
          // List endpoint validates the key without pinning a model —
          // pinned models get retired (gemini-1.5-flash) and break every key test
          fetchRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`,
          );
          break;
        case 'openai':
          fetchRes = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          break;
        case 'groq':
          fetchRes = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          break;
        case 'openrouter':
          fetchRes = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          break;
        case 'deepseek':
          fetchRes = await fetch('https://api.deepseek.com/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          break;
        default:
          return { success: false, message: 'Unknown provider' };
      }

      if (fetchRes.ok) {
        const providerNames: Record<AiProvider, string> = {
          google: 'Google Gemini',
          openai: 'OpenAI',
          groq: 'Groq',
          openrouter: 'OpenRouter',
          deepseek: 'DeepSeek',
        };
        return {
          success: true,
          message: `${providerNames[provider]} key is valid`,
        };
      }

      const body = await fetchRes.json().catch(() => ({}));
      const msg =
        (body as any)?.error?.message ??
        (body as any)?.message ??
        `Provider returned ${fetchRes.status}`;
      return { success: false, message: msg };
    } catch {
      return { success: false, message: 'Failed to reach provider' };
    }
  }

  async getProviderModels(
    userId: string,
    provider: AiProvider,
    context: AiContext = 'pos',
  ): Promise<Array<{ value: string; label: string }>> {
    const config = await this.aiConfigRepo.findOne({ where: { userId, context } });

    const raw: Record<AiProvider, string | undefined> = {
      google: this.vault.decryptIfNeeded(userId, config?.googleApiKey) || undefined,
      openai: this.vault.decryptIfNeeded(userId, config?.openaiApiKey) || undefined,
      groq: this.vault.decryptIfNeeded(userId, config?.groqApiKey) || undefined,
      openrouter: this.vault.decryptIfNeeded(userId, config?.openRouterApiKey) || undefined,
      deepseek: this.vault.decryptIfNeeded(userId, config?.deepseekApiKey) || undefined,
    };
    const apiKey = raw[provider];
    if (!apiKey) return [];

    try {
      switch (provider) {
        case 'google': {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          );
          if (!res.ok) return [];
          const data = (await res.json()) as {
            models?: Array<{
              name: string;
              displayName: string;
              supportedGenerationMethods?: string[];
            }>;
          };
          // TTS/image/audio/live models advertise generateContent but cannot
          // return text — selecting one breaks every chat call with an empty response
          const NON_CHAT_GOOGLE_MODEL =
            /(-tts|-image|imagen|veo-|embedding|aqa|-live|native-audio|gemini-robotics|computer-use)/i;
          return (data.models ?? [])
            .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
            .filter((m) => !NON_CHAT_GOOGLE_MODEL.test(m.name))
            .map((m) => ({
              value: m.name.replace('models/', ''),
              label: m.displayName ?? m.name.replace('models/', ''),
            }));
        }
        case 'openai': {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) return [];
          const data = (await res.json()) as { data?: Array<{ id: string }> };
          return (data.data ?? [])
            .filter((m) => /^(gpt-|o1|o3|chatgpt)/.test(m.id))
            .map((m) => ({ value: m.id, label: m.id }))
            .sort((a, b) => b.label.localeCompare(a.label));
        }
        case 'groq': {
          const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) return [];
          const data = (await res.json()) as { data?: Array<{ id: string }> };
          return (data.data ?? [])
            .filter((m) => !m.id.includes('whisper') && !m.id.includes('tts'))
            .map((m) => ({ value: m.id, label: m.id }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }
        case 'openrouter': {
          const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            data?: Array<{ id: string; name?: string }>;
          };
          return (data.data ?? []).map((m) => ({
            value: m.id,
            label: m.name ?? m.id,
          }));
        }
        case 'deepseek': {
          const res = await fetch('https://api.deepseek.com/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) return [];
          const data = (await res.json()) as {
            data?: Array<{ id: string }>;
          };
          return (data.data ?? []).map((m) => ({ value: m.id, label: m.id }));
        }
        default:
          return [];
      }
    } catch {
      return [];
    }
  }

  async getAllModels(): Promise<
    Array<{
      id: string;
      name: string;
      provider: string;
      contextLength: number;
      promptPrice: string;
      completionPrice: string;
      isFree: boolean;
    }>
  > {
    const cacheKey = 'global:all_llm_models';
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) return [];

      const data = (await res.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          context_length?: number;
          pricing?: { prompt?: string; completion?: string };
        }>;
      };

      const models = (data.data ?? []).map((m) => {
        const promptPrice = m.pricing?.prompt ?? '0';
        const completionPrice = m.pricing?.completion ?? '0';
        return {
          id: m.id,
          name: m.name ?? m.id,
          provider: m.id.split('/')[0] ?? m.id,
          contextLength: m.context_length ?? 0,
          promptPrice,
          completionPrice,
          isFree:
            (parseFloat(promptPrice) === 0 || promptPrice === '0') &&
            (parseFloat(completionPrice) === 0 || completionPrice === '0'),
        };
      });

      await this.cacheService.set(cacheKey, models, 3600);
      return models;
    } catch {
      return [];
    }
  }

  private async checkProfileMaturity(userId: string): Promise<boolean> {
    // 1. Check Profile
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) return false;
    if (!profile.interviewCompleted) return false;
    if (profile.skillLevel === 'junior') return false;

    // 2. Check Task Count (with Redis cache)
    const cacheKey = `user:${userId}:bootstrap_task_count`;
    const cachedCount = await this.cacheService.get<number>(cacheKey);

    let taskCount: number;
    if (cachedCount !== null && cachedCount !== undefined) {
      taskCount = cachedCount;
    } else {
      taskCount = await this.taskSessionRepo.count({
        where: { userId, status: 'done' },
      });
      await this.cacheService.set(cacheKey, taskCount, 60); // 60s TTL
    }

    const threshold =
      this.configService.get<number>('BOOTSTRAP_TASK_THRESHOLD') || 10;
    return taskCount >= threshold;
  }

  async streamChat(
    messages: UIMessage[],
    userId: string,
    mode: 'general' | 'marketing' | 'analytics',
    res: Response,
    context: AiContext = 'pos',
  ): Promise<void> {
    const resolvedConfig = await this.getConfig(userId, context);

    if (!resolvedConfig.configured) {
      throw new NotFoundException(
        'No AI configuration found. Please add your API key in AI Settings.',
      );
    }

    // Re-map to a format buildModel understands or just build it here
    const model = this.buildModel(resolvedConfig);

    const result = streamText({
      model,
      system: SYSTEM_PROMPTS[mode],
      messages: await convertToModelMessages(messages),
    });

    result.pipeUIMessageStreamToResponse(res);
  }

  async testModel(
    userId: string,
    context: AiContext = 'coding',
  ): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const config = await this.getConfig(userId, context);
    if (!config.configured) {
      return { success: false, latencyMs: 0, message: 'No provider configured. Save a key first.' };
    }
    const model = this.buildModel(config);
    const start = Date.now();
    try {
      const { generateText } = await import('ai');
      const result = await generateText({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        // Thinking models (gemini-2.5-pro) consume output budget on reasoning
        // before emitting text — a tiny cap guarantees an empty response
        maxOutputTokens: 2000,
      });
      const latencyMs = Date.now() - start;
      const text = result.text?.trim() ?? '';
      if (text.length > 0) {
        return { success: true, latencyMs, message: `Model responded in ${latencyMs}ms` };
      }
      return { success: false, latencyMs, message: 'Model returned empty response' };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err?.message ?? 'Model call failed',
      };
    }
  }

  buildModel(config: any): LanguageModel {
    const provider = config.provider as AiProvider;
    const modelName = config.model;

    switch (provider) {
      case 'groq': {
        if (!config.groqApiKey)
          throw new BadRequestException('Groq API key not configured.');
        return createGroq({ apiKey: config.groqApiKey })(modelName);
      }
      case 'openrouter': {
        if (!config.openRouterApiKey)
          throw new BadRequestException('OpenRouter API key not configured.');
        return createOpenRouter({ apiKey: config.openRouterApiKey })(modelName);
      }
      case 'google': {
        if (!config.googleApiKey)
          throw new BadRequestException('Google API key not configured.');
        return createGoogleGenerativeAI({ apiKey: config.googleApiKey })(
          modelName,
        );
      }
      case 'deepseek': {
        if (!config.deepseekApiKey)
          throw new BadRequestException('DeepSeek API key not configured.');
        return createOpenAI({ apiKey: config.deepseekApiKey, baseURL: 'https://api.deepseek.com/v1' })(modelName);
      }
      case 'openai':
      default: {
        if (!config.openaiApiKey)
          throw new BadRequestException('OpenAI API key not configured.');
        return createOpenAI({ apiKey: config.openaiApiKey })(modelName);
      }
    }
  }
}
