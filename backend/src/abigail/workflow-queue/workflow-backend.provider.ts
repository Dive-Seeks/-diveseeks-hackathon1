import { Provider } from '@nestjs/common';
import {
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from './workflow-orchestrator.interface';
import { BullMqOrchestrator } from './workflow-queue.service';
import { AdkOrchestrator } from './adk-orchestrator.service';

export function selectWorkflowOrchestrator(
  flag: string | undefined,
  bullmq: WorkflowOrchestrator,
  adk: WorkflowOrchestrator,
): WorkflowOrchestrator {
  return flag === 'adk' ? adk : bullmq;
}

export const workflowBackendProvider: Provider = {
  provide: WORKFLOW_ORCHESTRATOR,
  inject: [BullMqOrchestrator, AdkOrchestrator],
  useFactory: (bullmq: BullMqOrchestrator, adk: AdkOrchestrator) =>
    selectWorkflowOrchestrator(process.env.WORKFLOW_BACKEND, bullmq, adk),
};
