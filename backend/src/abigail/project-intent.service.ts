import { Injectable } from '@nestjs/common';
import type { ProjectChatIntent } from './project-lifecycle.types';

export interface ProjectIntentResult {
  intent: ProjectChatIntent;
  confidence: number;
  needsProjectInspection: boolean;
}

@Injectable()
export class ProjectIntentService {
  classify(message: string): ProjectIntentResult {
    const text = message.trim().toLowerCase();

    if (/\b(cancel|stop|terminate)\b/.test(text)) {
      return {
        intent: 'cancel',
        confidence: 0.9,
        needsProjectInspection: false,
      };
    }
    if (/\b(approve|approved|looks good|ship it)\b/.test(text)) {
      return {
        intent: 'approve',
        confidence: 0.9,
        needsProjectInspection: false,
      };
    }
    if (/\b(finish|complete|mark complete|close project)\b/.test(text)) {
      return {
        intent: 'complete',
        confidence: 0.85,
        needsProjectInspection: true,
      };
    }
    if (/\b(update|change|revise|improve|make better|edit)\b/.test(text)) {
      return {
        intent: 'update',
        confidence: 0.85,
        needsProjectInspection: true,
      };
    }
    if (/\b(run|start|continue|resume)\b/.test(text)) {
      return { intent: 'run', confidence: 0.8, needsProjectInspection: true };
    }
    if (/[?]$|\b(what|why|how|when|where)\b/.test(text)) {
      return {
        intent: 'question',
        confidence: 0.75,
        needsProjectInspection: false,
      };
    }
    return { intent: 'normal', confidence: 0.5, needsProjectInspection: false };
  }
}
