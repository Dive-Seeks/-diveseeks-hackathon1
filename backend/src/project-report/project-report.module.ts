import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PROJECT_REPORT_QUEUE } from '../abigail/workflow-queue/workflow-queue.constants';
import { ProjectReport } from './entities/project-report.entity';
import { SpecialistDocument } from '../specialist-documents/entities/specialist-document.entity';
import { TaskPrdRequirement } from '../task-prd/entities/task-prd-requirement.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';
import { GatewaysModule } from '../gateways/gateways.module';
import { ProjectReportController } from './project-report.controller';
import { ProjectReportProcessor } from './project-report.processor';
import { ProjectReportAssemblerService } from './project-report-assembler.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: PROJECT_REPORT_QUEUE }),
    TypeOrmModule.forFeature([
      ProjectReport,
      SpecialistDocument,
      TaskPrdRequirement,
      TaskSession,
      TCETask,
      DiveSeeksProject,
    ]),
    GatewaysModule,
  ],
  controllers: [ProjectReportController],
  providers: [ProjectReportProcessor, ProjectReportAssemblerService],
})
export class ProjectReportModule {}
