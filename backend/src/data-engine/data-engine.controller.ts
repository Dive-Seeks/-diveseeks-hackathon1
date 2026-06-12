import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataEngineService } from './data-engine.service';
import { WikiLintService } from './pipeline/wiki-lint.service';
import { CreateRepoDto } from './dto/create-repo.dto';
import { ResolveContradictionDto } from './dto/resolve-contradiction.dto';
import { QueryRepoDto } from './dto/query-repo.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';

@Controller('data-engine')
@UseGuards(JwtAuthGuard)
export class DataEngineController {
  constructor(
    private readonly svc: DataEngineService,
    private readonly wikiLint: WikiLintService,
  ) {}

  @Post('repos')
  createRepo(@Body() dto: CreateRepoDto, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.createRepo(tenantId, dto);
  }

  @Get('repos')
  listRepos(@Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.listRepos(tenantId);
  }

  @Get('repos/:repoId')
  getRepo(@Param('repoId', ParseUUIDPipe) repoId: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.getRepo(tenantId, repoId);
  }

  @Post('repos/:repoId/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.uploadDocument(tenantId, repoId, file);
  }

  @Get('repos/:repoId/contradictions')
  getContradictions(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.getContradictions(tenantId, repoId);
  }

  @Patch('repos/:repoId/contradictions/resolve')
  resolveContradiction(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @Body() dto: ResolveContradictionDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.resolveContradiction(tenantId, repoId, dto);
  }

  @Post('repos/:repoId/query')
  queryRepo(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @Body() dto: QueryRepoDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.queryRepo(tenantId, repoId, dto);
  }

  @Get('repos/:repoId/pages')
  listPages(@Param('repoId', ParseUUIDPipe) repoId: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.listPages(tenantId, repoId);
  }

  @Post('repos/:repoId/lint')
  lintRepo(@Param('repoId', ParseUUIDPipe) repoId: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.wikiLint.lint(repoId, tenantId);
  }

  @Get('repos/:repoId/schema')
  getSchema(@Param('repoId', ParseUUIDPipe) repoId: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.getRepoSchema(tenantId, repoId);
  }

  @Put('repos/:repoId/schema')
  updateSchema(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @Body() dto: UpdateSchemaDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.updateRepoSchema(tenantId, repoId, dto.schema);
  }

  @Get('repos/:repoId/documents')
  listDocuments(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.svc.listDocuments(tenantId, repoId);
  }
}
