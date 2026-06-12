import { Injectable, OnModuleInit } from '@nestjs/common';
import { Tiktoken, encoding_for_model } from 'tiktoken';
import { createHash } from 'crypto';

@Injectable()
export class TokenizerService implements OnModuleInit {
  private encoder: Tiktoken;
  private _memoCache = new Map<string, { value: number; expiresAt: number }>();
  private readonly MEMO_TTL = 24 * 60 * 60 * 1000;
  private readonly MEMO_MAX = 1000;

  onModuleInit() {
    // cl100k_base = GPT-4 / Claude compatible encoding
    this.encoder = encoding_for_model('gpt-4');
  }

  countTokens(text: string): number {
    const key = createHash('sha256').update(text).digest('hex');
    const cached = this._memoCache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.value;

    const count = this.encoder.encode(text).length;
    if (this._memoCache.size >= this.MEMO_MAX) {
      const oldest = this._memoCache.keys().next().value;
      if (oldest !== undefined) this._memoCache.delete(oldest);
    }
    this._memoCache.set(key, {
      value: count,
      expiresAt: Date.now() + this.MEMO_TTL,
    });
    return count;
  }

  chunk(text: string, maxTokens = 512, overlap = 64): string[] {
    const tokens = this.encoder.encode(text);
    const chunks: string[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + maxTokens, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push(new TextDecoder().decode(this.encoder.decode(chunkTokens)));
      start += maxTokens - overlap;
    }

    return chunks;
  }

  encode(text: string): Uint32Array {
    return this.encoder.encode(text);
  }

  decodeSingle(tokenId: number): string {
    return new TextDecoder().decode(
      this.encoder.decode(new Uint32Array([tokenId])),
    );
  }

  fitToWindow(texts: string[], maxTokens: number): string[] {
    // Greedy packing — fit as many chunks as possible under budget
    const result: string[] = [];
    let used = 0;

    for (const text of texts) {
      const count = this.countTokens(text);
      if (used + count > maxTokens) break;
      result.push(text);
      used += count;
    }

    return result;
  }
}
