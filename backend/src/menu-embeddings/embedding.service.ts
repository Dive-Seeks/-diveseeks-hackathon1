import { Injectable, Logger } from '@nestjs/common';
import { MenuEmbeddingsService } from './menu-embeddings.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly menuEmbeddings: MenuEmbeddingsService) {}

  async embed(text: string): Promise<number[]> {
    this.logger.log(`Computing embedding for text (${text.length} chars)`);
    return this.menuEmbeddings.embedText(text);
  }

  async search(params: {
    queryEmbedding: number[];
    tenantId?: string | null;
    limit?: number;
  }) {
    return this.menuEmbeddings.similarDishes({
      queryEmbedding: params.queryEmbedding,
      tenantId: params.tenantId,
      sourceType: 'generated_image',
      limit: params.limit || 6,
      minSimilarity: 0.3,
    });
  }
}
