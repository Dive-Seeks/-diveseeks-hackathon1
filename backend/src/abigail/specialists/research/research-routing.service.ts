import { Injectable } from '@nestjs/common';
import { TaskDomainClassifierService } from '../task-domain-classifier.service';

@Injectable()
export class ResearchRoutingService {
  constructor(private readonly classifier: TaskDomainClassifierService) {}

  route(message: string): string {
    return this.classifier.classify(message, 'research').specialist;
  }
}
