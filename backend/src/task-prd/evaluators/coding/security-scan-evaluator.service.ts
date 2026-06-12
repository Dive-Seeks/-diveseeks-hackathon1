import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class SecurityScanEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'security-scan-evaluator';
  readonly supportedFlags = ['requiresSecurityClean'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'Felix specialist (read-only mode) returns no high-severity findings';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // Check for security-related tool calls or messages indicating findings
    const securityMessages = output.messages.filter(
      (m) =>
        m.toLowerCase().includes('security') ||
        m.toLowerCase().includes('vulnerability'),
    );
    const highSeverity = securityMessages.some(
      (m) =>
        m.toLowerCase().includes('high') ||
        m.toLowerCase().includes('critical'),
    );
    return {
      satisfied: !highSeverity,
      evidence: { securityMessages: securityMessages.length, highSeverity },
      error: highSeverity
        ? 'High-severity security findings detected'
        : undefined,
    };
  }
}
