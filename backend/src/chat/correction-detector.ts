import { Injectable } from '@nestjs/common';

@Injectable()
export class CorrectionDetector {
  isCorrection(content: string): boolean {
    const text = content.toLowerCase();
    const keywords = [
      'no',
      'fix',
      'wrong',
      'change',
      'update',
      'instead',
      'actually',
      'incorrect',
    ];
    return keywords.some((kw) => text.includes(kw));
  }
}
