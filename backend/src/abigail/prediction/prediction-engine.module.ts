import { Module, forwardRef } from '@nestjs/common';
import { PredictionEngineService } from './prediction-engine.service';
import { AbigailModule } from '../abigail.module';

@Module({
  imports: [forwardRef(() => AbigailModule)],
  providers: [PredictionEngineService],
  exports: [PredictionEngineService],
})
export class PredictionEngineModule {}
