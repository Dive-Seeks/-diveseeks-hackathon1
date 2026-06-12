import { Provider } from '@nestjs/common';
import { SPECIALIST_EXECUTOR } from './specialist-executor.types';
import { RoutingSpecialistExecutor } from './routing-specialist.executor';

export const specialistExecutorProvider: Provider = {
  provide: SPECIALIST_EXECUTOR,
  useExisting: RoutingSpecialistExecutor,
};
