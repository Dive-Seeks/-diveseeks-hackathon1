import { TaskSession } from '../entities/task-session.entity';
import { z } from 'zod';

export const SpecialistOutputSchema = z.object({
  result: z.string(),
  outcome: z.enum(['success', 'needs_review', 'fail']),
  filesChanged: z.array(z.string()).optional(),
  errorPatterns: z.array(z.string()).optional(),
});

export type SpecialistOutput = z.infer<typeof SpecialistOutputSchema>;

export interface ToolUsageReport {
  specialistId: string;
  taskSessionId: string;
  toolsUsed: {
    toolName: string;
    callCount: number;
    outcome: 'success' | 'fail' | 'partial';
  }[];
  taskOutcome: 'success' | 'fail' | 'needs_review';
  errorPatterns?: string[];
  duration: number;
}

export interface ExecutionResult {
  result: string;
  report: ToolUsageReport;
}

export interface ISpecialist {
  id: string;
  execute(session: TaskSession, issueId?: string): Promise<ExecutionResult>;
}
