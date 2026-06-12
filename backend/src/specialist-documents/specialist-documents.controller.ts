import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { SpecialistDocumentsService } from './specialist-documents.service';
import { CreateSpecialistDocumentDto } from './dto/create-specialist-document.dto';
import { UpdateSpecialistDocumentDto } from './dto/update-specialist-document.dto';

@UseGuards(JwtAuthGuard)
@Controller('specialist-documents')
export class SpecialistDocumentsController {
  constructor(
    private readonly service: SpecialistDocumentsService,
    private readonly tenantCls: TenantClsService,
  ) {}

  @Get(':projectId')
  async findAll(@Param('projectId') projectId: string) {
    const tenantId = this.resolveTenantId();
    return { data: await this.service.findAllGrouped(tenantId, projectId) };
  }

  @Get(':projectId/docs/:docId/related')
  async findRelated(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
  ) {
    const tenantId = this.resolveTenantId();
    return { data: await this.service.findRelated(tenantId, projectId, docId) };
  }

  @Get(':projectId/:specialistId')
  async findBySpecialist(
    @Param('projectId') projectId: string,
    @Param('specialistId') specialistId: string,
  ) {
    const tenantId = this.resolveTenantId();
    return {
      data: await this.service.findBySpecialist(
        tenantId,
        projectId,
        specialistId,
      ),
    };
  }

  @Post(':projectId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSpecialistDocumentDto,
  ) {
    const tenantId = this.resolveTenantId();
    return { data: await this.service.create(tenantId, projectId, dto) };
  }

  @Patch(':projectId/:docId')
  async update(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
    @Body() dto: UpdateSpecialistDocumentDto,
  ) {
    const tenantId = this.resolveTenantId();
    return { data: await this.service.update(tenantId, projectId, docId, dto) };
  }

  @Delete(':projectId/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
  ) {
    const tenantId = this.resolveTenantId();
    await this.service.remove(tenantId, projectId, docId);
  }

  private resolveTenantId(): string {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId)
      throw new InternalServerErrorException('Tenant context missing');
    return tenantId;
  }
}
