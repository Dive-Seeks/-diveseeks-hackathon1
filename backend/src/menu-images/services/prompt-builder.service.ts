import { Injectable, Logger } from '@nestjs/common';
import { ImagePromptSchema } from '../entities/generated-image.entity';

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  buildDallePrompt(schema: ImagePromptSchema): string {
    const parts: string[] = [];

    // Core subject
    parts.push(`Professional food photography of ${schema.subject}`);

    // Ingredients context
    if (schema.ingredients?.length > 0) {
      parts.push(`featuring ${schema.ingredients.join(', ')}`);
    }

    // Presentation
    if (schema.presentationNotes) {
      parts.push(schema.presentationNotes);
    }

    // Style
    if (schema.style) {
      parts.push(schema.style);
    }

    // Lighting
    if (schema.lighting) {
      parts.push(schema.lighting);
    }

    // Background
    if (schema.background) {
      parts.push(`on ${schema.background}`);
    }

    // Camera
    if (schema.camera) {
      parts.push(`shot with ${schema.camera}`);
    }

    // Quality
    if (schema.quality) {
      parts.push(schema.quality);
    }

    const positivePrompt = parts.join('. ');

    // Append negative hints as a natural instruction
    const negativeHints =
      schema.negativeHints ||
      'blurry, low quality, distorted, cartoon, anime, sketch';
    const finalPrompt = `${positivePrompt}. Avoid: ${negativeHints}`;

    this.logger.log(`Built DALL-E prompt (${finalPrompt.length} chars)`);
    return finalPrompt;
  }

  serializeSchema(schema: ImagePromptSchema): string {
    return [
      schema.subject,
      schema.ingredients?.join(', ') || '',
      schema.style,
      schema.lighting,
      schema.background,
      schema.camera,
      schema.presentationNotes,
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
