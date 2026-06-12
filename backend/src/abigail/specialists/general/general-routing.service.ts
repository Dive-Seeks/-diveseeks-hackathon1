import { Injectable } from '@nestjs/common';
import { TaskDomainClassifierService } from '../task-domain-classifier.service';

@Injectable()
export class GeneralRoutingService {
  constructor(private readonly classifier: TaskDomainClassifierService) {}

  route(message: string): string {
    return this.classifier.classify(message, 'general').specialist;
  }
}
