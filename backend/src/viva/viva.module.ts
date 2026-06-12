import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VivaController } from './viva.controller';
import { VivaService } from './viva.service';
import { Business } from '../setup-business/entities/business.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Business])],
  controllers: [VivaController],
  providers: [VivaService],
})
export class VivaModule {}
