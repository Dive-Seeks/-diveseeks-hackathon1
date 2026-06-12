import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContinuationRegistry } from './entities/continuation-registry.entity';
import { ErrorRegistry } from './entities/error-registry.entity';
import { SolutionRegistry } from './entities/solution-registry.entity';
import { KnowledgeRegistrarService } from './knowledge-registrar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContinuationRegistry,
      ErrorRegistry,
      SolutionRegistry,
    ]),
  ],
  providers: [KnowledgeRegistrarService],
  exports: [KnowledgeRegistrarService],
})
export class KnowledgeRegistrarModule {}
