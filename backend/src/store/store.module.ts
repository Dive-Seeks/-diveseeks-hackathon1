import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Business } from '../setup-business/entities/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
