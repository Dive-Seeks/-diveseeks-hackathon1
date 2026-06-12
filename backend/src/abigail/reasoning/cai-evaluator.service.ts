import { Injectable } from '@nestjs/common';
import { CaiEvaluationResult, CaiBlockReason } from './reasoning.types';

@Injectable()
export class CaiEvaluatorService {
  private readonly JAILBREAK_PATTERNS = [
    /ignore previous instructions/i,
    /pretend you are/i,
    /you are now/i,
    /disregard your/i,
    /override your/i,
    /forget all previous/i,
  ];

  private readonly SANDBOX_ESCAPE_PATTERNS = [
    /run.*on.*host/i,
    /outside.*sandbox/i,
    /bypass.*docker/i,
    /execute.*on.*server/i,
    /rm -rf/i,
    /drop table/i,
    /delete database/i,
  ];

  private readonly SOFTWARE_DOMAIN_KEYWORDS = [
    'code',
    'function',
    'api',
    'endpoint',
    'component',
    'test',
    'deploy',
    'database',
    'fix',
    'bug',
    'error',
    'build',
    'review',
    'frontend',
    'backend',
    'query',
    'migration',
    'auth',
    'security',
  ];

  evaluate(message: string, tenantId: string): CaiEvaluationResult {
    const flags: string[] = [];
    let hardBlocked = false;
    let blockReason: CaiBlockReason | undefined;

    // CAI-011: Jailbreak detection
    if (this.JAILBREAK_PATTERNS.some((p) => p.test(message))) {
      hardBlocked = true;
      blockReason = {
        injectorId: 'CAI-011',
        enforcement: 'HARD_BLOCK',
        message: 'Prompt injection or jailbreak attempt detected.',
      };
      flags.push('CAI-011');
    }

    // CAI-005: Sandbox escape attempt
    if (
      !hardBlocked &&
      this.SANDBOX_ESCAPE_PATTERNS.some((p) => p.test(message))
    ) {
      hardBlocked = true;
      blockReason = {
        injectorId: 'CAI-005',
        enforcement: 'HARD_BLOCK',
        message: 'Request attempts to execute code outside the sandbox.',
      };
      flags.push('CAI-005');
    }

    // CAI-010: Off-topic drift — simple domain keyword check
    const lower = message.toLowerCase();
    const hasDomainKeyword = this.SOFTWARE_DOMAIN_KEYWORDS.some((k) =>
      lower.includes(k),
    );
    if (!hardBlocked && !hasDomainKeyword && message.length > 20) {
      flags.push('CAI-010'); // Soft flag — routing will get low confidence anyway
    }

    // CAI-015: Loop guard is enforced via prompt constraints and token limits

    return { hardBlocked, blockReason, activeFlags: flags };
  }
}
