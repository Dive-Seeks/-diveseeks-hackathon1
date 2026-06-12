import { Injectable } from '@nestjs/common';
import { VisionFile } from './vision.types';
import { VisionService } from './vision.service';

@Injectable()
export class VisionWizardService {
  constructor(private readonly visionService: VisionService) {}

  generateQuestions(): string[] {
    return [
      'What does this project do? (description)',
      'What is your tech stack? (locked and forbidden tools)',
      'What are your top 3 goals? (features to build)',
      'What will you NEVER do in this project? (constraints)',
      'What decisions are you still unsure about? (open questions)',
    ];
  }

  async processWizardAnswers(
    projectId: string,
    answers: string[],
    autoDetectedStack: {
      frontend: string[];
      backend: string[];
      infra: string[];
    },
  ): Promise<VisionFile> {
    const vision: VisionFile = {
      projectId,
      name: `Project ${projectId}`,
      description: answers[0],
      techStack: {
        locked: autoDetectedStack.backend.concat(autoDetectedStack.frontend), // Simplified for MVP
        forbidden: this.extractForbidden(answers[1]),
        frontend: autoDetectedStack.frontend,
        backend: autoDetectedStack.backend,
        infra: autoDetectedStack.infra,
      },
      goals: this.extractGoals(answers[2]),
      constraints: this.extractList(answers[3]),
      openQuestions: this.extractList(answers[4]),
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      version: 1,
    };

    return this.visionService.updateVision(projectId, vision);
  }

  private extractForbidden(answer: string): string[] {
    // Basic extraction heuristic
    return answer
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private extractGoals(answer: string): any[] {
    const lines = answer.split('\n').filter(Boolean);
    return lines.map((line, index) => ({
      id: `G${index + 1}`,
      title: line.trim(),
      description: `Description for ${line.trim()}`,
      status: 'not_started',
      progress: 0,
      tasks: [],
    }));
  }

  private extractList(answer: string): string[] {
    return answer
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
