import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuEmbedding } from './menu-embeddings.entity';
import { MenuEmbeddingsService } from './menu-embeddings.service';
import { MenuEmbeddingsController } from './menu-embeddings.controller';
import { MenuEmbeddingsSeeder } from './menu-embeddings.seeder';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEmbedding])],
  providers: [MenuEmbeddingsService, MenuEmbeddingsSeeder, EmbeddingService],
  controllers: [MenuEmbeddingsController],
  exports: [MenuEmbeddingsService, EmbeddingService],
})
export class MenuEmbeddingsModule {}
