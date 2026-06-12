import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GithubService } from './github.service';
import { ConnectRepoDto } from './dto/connect-repo.dto';

@ApiTags('github')
@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(private readonly githubService: GithubService) {}

  /** Start OAuth flow — returns { url } for frontend to redirect to */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('oauth/start')
  async oauthStart(@Req() req: Request) {
    const teamId: string = (req.user as any).tenantId;
    const url = await this.githubService.getOAuthUrl(teamId);
    return { url };
  }

  /** OAuth callback — GitHub redirects here after user authorizes */
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendBase = process.env.FRONTEND_URL ?? 'http://localhost:7777';

    if (error) {
      return res.redirect(
        `${frontendBase}/coding/onboarding/github?error=oauth_denied`,
      );
    }

    try {
      await this.githubService.handleOAuthCallback(code, state);
      return res.redirect(
        `${frontendBase}/coding/onboarding/vision?github=connected`,
      );
    } catch (err: any) {
      this.logger.error(`OAuth callback error: ${err.message}`);
      return res.redirect(
        `${frontendBase}/coding/onboarding/github?error=oauth_failed`,
      );
    }
  }

  /** GitHub connection status for current tenant */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('status')
  async getStatus(@Req() req: Request) {
    const teamId: string = (req.user as any).tenantId;
    return this.githubService.getInstallationStatus(teamId);
  }

  /** List repos from GitHub for current tenant */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('repos')
  async listRepos(@Req() req: Request) {
    const teamId: string = (req.user as any).tenantId;
    return this.githubService.listRepos(teamId);
  }

  /** Get repos already connected (from DB) */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('repos/connected')
  async getConnectedRepos(@Req() req: Request) {
    const teamId: string = (req.user as any).tenantId;
    return this.githubService.getConnectedRepos(teamId);
  }

  /** Connect a GitHub repo to a project */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('repos/connect')
  async connectRepo(@Req() req: Request, @Body() dto: ConnectRepoDto) {
    const teamId: string = (req.user as any).tenantId;
    return this.githubService.connectRepo(teamId, dto);
  }

  /** Disconnect a repo */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('repos/:repoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnectRepo(@Req() req: Request, @Param('repoId') repoId: string) {
    const teamId: string = (req.user as any).tenantId;
    await this.githubService.disconnectRepo(teamId, repoId);
  }

  /** Webhook endpoint — public, always returns 200 immediately */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request) {
    this.logger.log('GitHub webhook received');
    return { received: true };
  }
}
