import { Injectable } from '@nestjs/common';
import { SpecialistId } from './entities/task-session.entity';
import { SAFE_PAIRS } from './reasoning/reasoning.types';

@Injectable()
export class RoutingService {
  mapIntent(message: string): {
    specialist: SpecialistId;
    costTier: string;
    alwaysAlso?: SpecialistId;
    branchType: string;
  } {
    const lowerMsg = message.toLowerCase();
    let result: {
      specialist: SpecialistId;
      costTier: string;
      alwaysAlso?: SpecialistId;
      branchType: string;
    };

    if (this.containsAny(lowerMsg, ['backend', 'api', 'database', 'sql'])) {
      result = {
        specialist: 'rex',
        costTier: 'medium',
        alwaysAlso: 'kai',
        branchType: 'feat',
      };
    } else if (
      this.containsAny(lowerMsg, ['frontend', 'ui', 'component', 'css'])
    ) {
      result = {
        specialist: 'nova',
        costTier: 'medium',
        alwaysAlso: 'kai',
        branchType: 'feat',
      };
    } else if (
      this.containsAny(lowerMsg, ['test', 'spec', 'coverage', 'e2e'])
    ) {
      result = { specialist: 'sage', costTier: 'low', branchType: 'test' };
    } else if (
      this.containsAny(lowerMsg, ['deploy', 'docker', 'ci', 'server'])
    ) {
      result = { specialist: 'atlas', costTier: 'medium', branchType: 'feat' };
    } else if (this.containsAny(lowerMsg, ['bug', 'error', 'crash', 'fix'])) {
      result = {
        specialist: 'pixel',
        costTier: 'low',
        alwaysAlso: 'kai',
        branchType: 'fix',
      };
    } else if (this.containsAny(lowerMsg, ['architecture', 'design', 'plan'])) {
      result = { specialist: 'orion', costTier: 'high', branchType: 'feat' };
    } else if (this.containsAny(lowerMsg, ['docs', 'readme', 'changelog'])) {
      result = { specialist: 'luma', costTier: 'low', branchType: 'docs' };
    } else if (
      this.containsAny(lowerMsg, ['menu', 'product', 'category', 'price'])
    ) {
      result = { specialist: 'nova', costTier: 'medium', branchType: 'feat' };
    } else if (
      this.containsAny(lowerMsg, ['marketing', 'seo', 'promo', 'ad'])
    ) {
      result = { specialist: 'nova', costTier: 'medium', branchType: 'feat' };
    } else if (this.containsAny(lowerMsg, ['security', 'auth', 'owasp'])) {
      result = {
        specialist: 'felix',
        costTier: 'medium',
        alwaysAlso: 'vex',
        branchType: 'security',
      };
    } else if (
      this.containsAny(lowerMsg, ['xss', 'csrf', 'injection', 'pentest'])
    ) {
      result = {
        specialist: 'vex',
        costTier: 'medium',
        alwaysAlso: 'felix',
        branchType: 'security',
      };
    } else if (this.containsAny(lowerMsg, ['review', 'audit', 'check'])) {
      result = { specialist: 'kai', costTier: 'low', branchType: 'chore' };
    } else {
      // Default fallback
      result = {
        specialist: 'rex',
        costTier: 'medium',
        alwaysAlso: 'kai',
        branchType: 'feat',
      };
    }

    // RUNTIME ASSERTION: Safe Pairs Only
    if (result.alwaysAlso) {
      const expectedPair = SAFE_PAIRS[result.specialist];
      if (expectedPair && result.alwaysAlso !== expectedPair) {
        throw new Error(
          `UNSAFE DISPATCH: Specialist ${result.specialist} cannot be paired with ${result.alwaysAlso}. Correct pair is ${expectedPair}.`,
        );
      }
    }

    return result;
  }

  private containsAny(message: string, keywords: string[]): boolean {
    return keywords.some((k) => message.includes(k));
  }
}
