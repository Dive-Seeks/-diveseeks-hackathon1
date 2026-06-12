import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import {
  ImagePromptSchema,
  SourceMode,
} from '../entities/generated-image.entity';

const STYLE_PRESETS: Record<string, Partial<ImagePromptSchema>> = {
  premium: {
    style: 'Michelin-star food photography',
    lighting: 'soft natural window lighting',
    camera: '50mm lens, shallow depth of field',
    quality: '8k, ultra realistic, cinematic',
  },
  fastFood: {
    style: 'commercial fast food photography',
    lighting: 'bright studio lighting',
    camera: 'top-down shot',
    quality: 'high detail, vibrant colors',
  },
};

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);

  constructor(private readonly aiRouter: AiProviderRouter) {}

  private getModel() {
    return this.aiRouter.getModel('specialist');
  }

  async analyzeText(
    itemName: string,
    cuisineType?: string,
    preset?: string,
  ): Promise<ImagePromptSchema> {
    this.logger.log(`Analyzing text input: ${itemName}`);

    const model = this.getModel();
    const result = await generateText({
      model,
      system: `You are an expert food photographer's assistant. Given a dish name and optional cuisine type, 
extract a detailed food photography schema. Return ONLY valid JSON matching this exact format:
{
  "subject": "dish name",
  "ingredients": ["ingredient1", "ingredient2"],
  "style": "",
  "lighting": "",
  "background": "",
  "camera": "",
  "quality": "",
  "presentationNotes": "describe ideal plating and garnish",
  "negativeHints": "blurry, low quality, distorted, cartoon, anime, sketch",
  "sourceMode": "text"
}
Leave style/lighting/camera/quality empty strings — they will be filled by preset.
Focus on extracting accurate ingredients and creating vivid presentationNotes.`,
      prompt: `Dish: "${itemName}"${cuisineType ? `\nCuisine: ${cuisineType}` : ''}
Return ONLY the JSON object, no markdown fences.`,
    });

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const schema: ImagePromptSchema = JSON.parse(cleaned);
      return this.applyPreset(schema, preset || 'premium');
    } catch (err) {
      this.logger.warn(
        'Failed to parse Gemini response, using fallback schema',
      );
      return this.applyPreset(
        {
          subject: itemName,
          ingredients: [],
          style: '',
          lighting: '',
          background: 'clean white background',
          camera: '',
          quality: '',
          presentationNotes: `beautifully plated ${itemName}`,
          negativeHints:
            'blurry, low quality, distorted, cartoon, anime, sketch',
          sourceMode: SourceMode.TEXT,
        },
        preset || 'premium',
      );
    }
  }

  async analyzeSinglePhoto(
    imageBase64: string,
    itemName: string,
    preset?: string,
  ): Promise<ImagePromptSchema> {
    this.logger.log(`Analyzing single photo for: ${itemName}`);

    const model = this.getModel();
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert food photographer. Analyze this photo of "${itemName}" and extract:
- The exact dish subject
- Visible ingredients
- Presentation style and plating details
- Background and setting

Return ONLY valid JSON:
{
  "subject": "dish name as seen",
  "ingredients": ["visible ingredient1", "visible ingredient2"],
  "style": "",
  "lighting": "",
  "background": "describe the actual background",
  "camera": "",
  "quality": "",
  "presentationNotes": "detailed plating description from the photo",
  "negativeHints": "blurry, low quality, distorted, cartoon, anime, sketch",
  "sourceMode": "single_photo"
}
Leave style/lighting/camera/quality empty — they will be filled by preset. No markdown fences.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
    });

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const schema: ImagePromptSchema = JSON.parse(cleaned);
      return this.applyPreset(schema, preset || 'premium');
    } catch {
      this.logger.warn('Failed to parse vision response, using fallback');
      return this.applyPreset(
        {
          subject: itemName,
          ingredients: [],
          style: '',
          lighting: '',
          background: 'clean restaurant setting',
          camera: '',
          quality: '',
          presentationNotes: `photo-realistic ${itemName}`,
          negativeHints: 'blurry, low quality, distorted',
          sourceMode: SourceMode.SINGLE_PHOTO,
        },
        preset || 'premium',
      );
    }
  }

  async analyzeTwoPhotos(
    dishImageBase64: string,
    styleRefBase64: string,
    itemName: string,
  ): Promise<ImagePromptSchema> {
    this.logger.log(`Analyzing two photos for: ${itemName}`);

    const model = this.getModel();
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert food photographer. You have TWO images:
1. First image: The actual dish "${itemName}" — extract SUBJECT details (ingredients, plating, presentation)
2. Second image: A STYLE REFERENCE — extract STYLE details (lighting, background, camera angle, color grading)

Fuse the subject from image 1 with the style from image 2.

Return ONLY valid JSON:
{
  "subject": "dish name",
  "ingredients": ["ingredient1", "ingredient2"],
  "style": "extracted from style reference",
  "lighting": "extracted from style reference",
  "background": "extracted from style reference",
  "camera": "extracted from style reference (angle, lens feel)",
  "quality": "8k, ultra realistic",
  "presentationNotes": "plating from dish photo",
  "negativeHints": "blurry, low quality, distorted, cartoon, anime, sketch",
  "sourceMode": "two_photos"
}
No markdown fences.`,
            },
            {
              type: 'image',
              image: dishImageBase64,
            },
            {
              type: 'image',
              image: styleRefBase64,
            },
          ],
        },
      ],
    });

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleaned) as ImagePromptSchema;
    } catch {
      this.logger.warn('Failed to parse two-photo response, using fallback');
      return {
        subject: itemName,
        ingredients: [],
        style: 'Michelin-star food photography',
        lighting: 'soft natural window lighting',
        background: 'clean white background',
        camera: '50mm lens, shallow depth of field',
        quality: '8k, ultra realistic, cinematic',
        presentationNotes: `beautifully plated ${itemName}`,
        negativeHints: 'blurry, low quality, distorted',
        sourceMode: SourceMode.TWO_PHOTOS,
      };
    }
  }

  private applyPreset(
    schema: ImagePromptSchema,
    presetName: string,
  ): ImagePromptSchema {
    const preset = STYLE_PRESETS[presetName] || STYLE_PRESETS.premium;
    return {
      ...schema,
      style: schema.style || preset.style || '',
      lighting: schema.lighting || preset.lighting || '',
      camera: schema.camera || preset.camera || '',
      quality: schema.quality || preset.quality || '',
    };
  }
}
