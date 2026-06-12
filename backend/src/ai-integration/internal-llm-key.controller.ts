import {
  Controller,
  Get,
  Param,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InternalLlmKeyService } from './internal-llm-key.service';

@Controller('internal/llm-key')
export class InternalLlmKeyController {
  constructor(private readonly service: InternalLlmKeyService) {}

  @Get(':userId')
  async getKey(
    @Param('userId') userId: string,
    @Headers('x-internal-secret') secret?: string,
  ) {
    if (
      !process.env.INTERNAL_API_SECRET ||
      secret !== process.env.INTERNAL_API_SECRET
    ) {
      throw new ForbiddenException('internal access only');
    }
    const resolved = await this.service.resolve(userId);
    if (!resolved) throw new NotFoundException('no llm config for user');
    return resolved;
  }
}
