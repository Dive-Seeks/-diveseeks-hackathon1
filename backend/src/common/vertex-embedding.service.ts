import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { embed, embedMany } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { createOpenAI } from '@ai-sdk/openai';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { RedisCacheService } from './cache/redis-cache.service';

const EMBEDDING_MODEL = 'text-embedding-005'; // Vertex AI — 768-dim
const OPENAI_EMBED_MODEL = 'text-embedding-3-small'; // OpenAI fallback — 768-dim via dimensions param
const REDIS_TTL = 60 * 60 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = 'embed:v:768:';

@Injectable()
export class VertexEmbeddingService {
  private readonly logger = new Logger(VertexEmbeddingService.name);
  private readonly useVertex: boolean;
  private readonly l1 = new Map<string, number[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    const project = this.config.get<string>('GOOGLE_CLOUD_PROJECT');
    const location = this.config.get<string>('GOOGLE_CLOUD_LOCATION');
    const credentials = this.config.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );
    // Env vars alone aren't enough — a configured-but-missing key file would
    // make every embed call fail (ENOENT) before falling back. Check once here.
    this.useVertex = !!(
      project &&
      location &&
      credentials &&
      fs.existsSync(credentials)
    );
    if (project && credentials && !fs.existsSync(credentials)) {
      this.logger.warn(
        `GOOGLE_APPLICATION_CREDENTIALS file not found at "${credentials}" — using OpenAI embedding fallback`,
      );
    }
    if (this.useVertex) {
      this.logger.log(
        `Vertex AI embedding enabled — project: ${project}, location: ${location}, model: ${EMBEDDING_MODEL}`,
      );
    } else {
      this.logger.warn(
        `Vertex AI not configured — falling back to OpenAI ${OPENAI_EMBED_MODEL} (768-dim)`,
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const key = `${CACHE_KEY_PREFIX}${hash}`;

    // L1 — in-memory (zero latency)
    if (this.l1.has(hash)) return this.l1.get(hash)!;

    // L2 — Redis (survives restarts)
    const cached = await this.cache.get<number[]>(key);
    if (cached) {
      this.l1.set(hash, cached);
      return cached;
    }

    // Miss — call API
    const result = await this.callEmbedApi(text);
    await this.cache.set(key, result, REDIS_TTL);
    this.l1.set(hash, result);
    if (this.l1.size > 10000) this.l1.clear();
    return result;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const toFetch: { text: string; index: number; hash: string }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const hash = crypto.createHash('md5').update(texts[i]).digest('hex');
      const key = `${CACHE_KEY_PREFIX}${hash}`;

      if (this.l1.has(hash)) {
        results[i] = this.l1.get(hash)!;
        continue;
      }
      const cached = await this.cache.get<number[]>(key);
      if (cached) {
        this.l1.set(hash, cached);
        results[i] = cached;
        continue;
      }
      toFetch.push({ text: texts[i], index: i, hash });
    }

    if (toFetch.length === 0) return results;

    const newEmbeddings = await this.callEmbedBatchApi(
      toFetch.map((f) => f.text),
    );
    for (let i = 0; i < toFetch.length; i++) {
      const { index, hash } = toFetch[i];
      const vec = newEmbeddings[i];
      const key = `${CACHE_KEY_PREFIX}${hash}`;
      await this.cache.set(key, vec, REDIS_TTL);
      this.l1.set(hash, vec);
      results[index] = vec;
    }
    if (this.l1.size > 10000) this.l1.clear();
    return results;
  }

  // Extracted for testability
  async callEmbedApi(text: string): Promise<number[]> {
    if (this.useVertex) {
      try {
        const vertex = createVertex({
          project: this.config.get<string>('GOOGLE_CLOUD_PROJECT')!,
          location: this.config.get<string>('GOOGLE_CLOUD_LOCATION')!,
          googleAuthOptions: {
            keyFilename: this.config.get<string>(
              'GOOGLE_APPLICATION_CREDENTIALS',
            )!,
          },
        });
        const { embedding } = await embed({
          model: vertex.embeddingModel(EMBEDDING_MODEL),
          value: text,
        });
        return embedding;
      } catch (err) {
        this.logger.warn(
          `Vertex embed failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    // Gemini fallback produces 3072-dim — use OpenAI text-embedding-3-small with
    // dimensions:768 to stay consistent with the vector(768) DB schema.
    const openai = createOpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
    const { embedding } = await embed({
      model: openai.embedding(OPENAI_EMBED_MODEL),
      value: text,
      // text-embedding-3-small supports truncated dimensions via providerOptions
      providerOptions: { openai: { dimensions: 768 } },
    });
    return embedding;
  }

  private async callEmbedBatchApi(texts: string[]): Promise<number[][]> {
    if (this.useVertex) {
      try {
        const vertex = createVertex({
          project: this.config.get<string>('GOOGLE_CLOUD_PROJECT')!,
          location: this.config.get<string>('GOOGLE_CLOUD_LOCATION')!,
          googleAuthOptions: {
            keyFilename: this.config.get<string>(
              'GOOGLE_APPLICATION_CREDENTIALS',
            )!,
          },
        });
        const { embeddings } = await embedMany({
          model: vertex.embeddingModel(EMBEDDING_MODEL),
          values: texts,
        });
        return embeddings;
      } catch (err) {
        this.logger.warn(
          `Vertex embedMany failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    const openai = createOpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
    const { embeddings } = await embedMany({
      model: openai.embedding(OPENAI_EMBED_MODEL),
      values: texts,
      providerOptions: { openai: { dimensions: 768 } },
    });
    return embeddings;
  }
}
