import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialistDocument } from './entities/specialist-document.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { SpecialistDocumentsService } from './specialist-documents.service';
import { SpecialistDocumentsController } from './specialist-documents.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpecialistDocument, AgentEpisode]),
    CommonModule,
  ],
  controllers: [SpecialistDocumentsController],
  providers: [SpecialistDocumentsService],
  exports: [SpecialistDocumentsService],
})
export class SpecialistDocumentsModule {}
