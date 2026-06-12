import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentIssue } from './entities/agent-issue.entity';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentIssue])],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
