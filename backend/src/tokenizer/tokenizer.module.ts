import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenizerService } from './tokenizer.service';
import { VocabularyService } from './vocabulary.service';
import { VocabularyToken } from './entities/vocabulary.entity';
import { WebChunk } from './entities/web-chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VocabularyToken, WebChunk])],
  providers: [TokenizerService, VocabularyService],
  exports: [TokenizerService, VocabularyService, TypeOrmModule],
})
export class TokenizerModule {}
