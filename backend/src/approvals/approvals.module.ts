import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Approval } from './entities/approval.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Approval]), JwtModule.register({})],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
