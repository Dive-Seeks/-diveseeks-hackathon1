import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { A2ARunnerService } from './a2a-runner.service';
import { A2ARunnerProcessor } from './a2a-runner.processor';
import { A2ARunnerController } from './a2a-runner.controller';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { AbigailModule } from '../abigail/abigail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceListing]),
    BullModule.registerQueue({
      name: 'a2a-runner',
    }),
    AbigailModule,
  ],
  controllers: [A2ARunnerController],
  providers: [A2ARunnerService, A2ARunnerProcessor],
  exports: [A2ARunnerService],
})
export class A2ARunnerModule {}
