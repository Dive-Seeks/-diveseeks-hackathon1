import { GroupDef } from './pipeline-step.interface';

const NO_RETRY = { maxRetries: 0, backoffMs: 0 };
const RETRY_1_2S = { maxRetries: 1, backoffMs: 2000 };
const RETRY_1_3S = { maxRetries: 1, backoffMs: 3000 };
const RETRY_2_5S = { maxRetries: 2, backoffMs: 5000 };

export const PIPELINE_GRAPH: GroupDef[] = [
  {
    key: 'INTENT',
    steps: [
      {
        key: 'intent_classify',
        group: 'INTENT',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'FAIL_FAST',
        checkpointAfter: false,
      },
      {
        key: 'cold_start_detect',
        group: 'INTENT',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
    ],
  },
  {
    key: 'CONTEXT',
    steps: [
      {
        key: 'vision_load',
        group: 'CONTEXT',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'ESCALATE',
        checkpointAfter: false,
      },
      {
        key: 'git_context',
        group: 'CONTEXT',
        parallel: true,
        retryPolicy: RETRY_1_2S,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'knowledge_fetch',
        group: 'CONTEXT',
        parallel: true,
        retryPolicy: RETRY_1_2S,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'chat_history',
        group: 'CONTEXT',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'skills_plugins',
        group: 'CONTEXT',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: true,
      },
    ],
  },
  {
    key: 'PRD',
    steps: [
      {
        key: 'prd_generation',
        group: 'PRD',
        parallel: false,
        retryPolicy: RETRY_1_3S,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'constitution_check',
        group: 'PRD',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'FAIL_FAST',
        checkpointAfter: false,
      },
      {
        key: 'issue_creation',
        group: 'PRD',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
    ],
  },
  {
    key: 'SPECIALIST',
    steps: [
      {
        key: 'specialist_run',
        group: 'SPECIALIST',
        parallel: false,
        retryPolicy: RETRY_2_5S,
        failureMode: 'ESCALATE',
        checkpointAfter: true,
      },
    ],
  },
  {
    key: 'POST',
    steps: [
      {
        key: 'memory_bridge',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'trajectory_write',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'discipline_score',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'spec_kit_audit',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'weight_outcome',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'goal_progress',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'snapshot_record',
        group: 'POST',
        parallel: true,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
    ],
  },
  {
    key: 'EMIT',
    steps: [
      {
        key: 'emit_complete',
        group: 'EMIT',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
      {
        key: 'cycle_publish',
        group: 'EMIT',
        parallel: false,
        retryPolicy: NO_RETRY,
        failureMode: 'DEGRADE',
        checkpointAfter: false,
      },
    ],
  },
];

export const STEP_TO_GROUP: Record<string, string> = {};
for (const group of PIPELINE_GRAPH) {
  for (const step of group.steps) {
    STEP_TO_GROUP[step.key] = group.key;
  }
}

export const STEP_DEFS: Record<
  string,
  import('./pipeline-step.interface').StepDef
> = {};
for (const group of PIPELINE_GRAPH) {
  for (const step of group.steps) {
    STEP_DEFS[step.key] = step;
  }
}
