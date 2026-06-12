import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingKnowledge } from './accounting-knowledge.entity';

@UseGuards(JwtAuthGuard)
@Controller('accounting/knowledge')
export class AccountingKnowledgeController {
  constructor(
    @InjectRepository(AccountingKnowledge)
    private knowledgeRepo: Repository<AccountingKnowledge>,
  ) {}

  @Get()
  async findAll(
    @Query('domain') domain?: string,
    @Query('businessType') businessType?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const where: any = { isDeleted: false };
    if (domain) where.domain = domain;
    if (businessType) where.businessType = businessType;
    if (activeOnly === 'true') where.active = true;

    return this.knowledgeRepo.find({ where });
  }

  @Patch(':id/review')
  async markReviewed(
    @Param('id') id: string,
    @Body('reviewedBy') reviewedBy: string,
  ) {
    const knowledge = await this.knowledgeRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!knowledge) return null;

    knowledge.reviewedBy = reviewedBy;
    knowledge.reviewedAt = new Date();
    knowledge.active = true; // Reviewing implies activating it
    return this.knowledgeRepo.save(knowledge);
  }

  @Patch(':id/toggle')
  async toggleActive(@Param('id') id: string) {
    const knowledge = await this.knowledgeRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!knowledge) return null;

    knowledge.active = !knowledge.active;
    return this.knowledgeRepo.save(knowledge);
  }
}
