import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabularyToken } from './entities/vocabulary.entity';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyToken)
    private readonly vocabularyRepo: Repository<VocabularyToken>,
  ) {}

  async trackTokens(
    tokens: { token: string; tokenId: number }[],
    domain?: string,
  ): Promise<void> {
    if (!tokens.length) return;

    const counts = new Map<string, { tokenId: number; count: number }>();
    for (const { token, tokenId } of tokens) {
      const existing = counts.get(token);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(token, { tokenId, count: 1 });
      }
    }

    const entries = Array.from(counts.entries());

    await this.vocabularyRepo.query(
      `INSERT INTO vocabulary (token, "tokenId", frequency, domain)
       VALUES ${entries
         .map(
           (_, i) =>
             `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`,
         )
         .join(', ')}
       ON CONFLICT (token) DO UPDATE SET 
         frequency = vocabulary.frequency + EXCLUDED.frequency,
         domain = COALESCE(EXCLUDED.domain, vocabulary.domain),
         "lastSeenAt" = CURRENT_TIMESTAMP`,
      entries.flatMap(([token, { tokenId, count }]) => [
        token,
        tokenId,
        count,
        domain || null,
      ]),
    );
  }
}
