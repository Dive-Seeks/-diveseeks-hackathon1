import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Octokit } from '@octokit/rest';
import * as crypto from 'crypto';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { AiKeyVaultService } from '../ai-integration/ai-key-vault.service';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import { GithubInstallation } from './entities/github-installation.entity';
import { GithubRepo } from './entities/github-repo.entity';
import { GithubSourceDocument } from './entities/source-document.entity';
import { ConnectRepoDto } from './dto/connect-repo.dto';
import { GITHUB_INDEX_QUEUE, GithubIndexJobs } from './github.queue';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
    private readonly vault: AiKeyVaultService,
    private readonly vertexEmbed: VertexEmbeddingService,
    @InjectRepository(GithubInstallation)
    private readonly installRepo: Repository<GithubInstallation>,
    @InjectRepository(GithubRepo)
    private readonly repoRepo: Repository<GithubRepo>,
    @InjectRepository(GithubSourceDocument)
    private readonly sourceDocRepo: Repository<GithubSourceDocument>,
    @InjectQueue(GITHUB_INDEX_QUEUE)
    private readonly indexQueue: Queue,
  ) {
    this.clientId = this.config.getOrThrow<string>('GITHUB_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow<string>('GITHUB_CLIENT_SECRET');
    this.callbackUrl = this.config.getOrThrow<string>(
      'GITHUB_OAUTH_CALLBACK_URL',
    );
  }

  /** Step 1 of OAuth: generate state + return GitHub authorize URL */
  async getOAuthUrl(teamId: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    await this.cache.set(`github:oauth:state:${state}`, teamId, 600); // 10 min TTL
    const scope = 'repo,read:user';
    return `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.callbackUrl)}&scope=${scope}&state=${state}`;
  }

  /** Step 2 of OAuth: exchange code, store encrypted token */
  async handleOAuthCallback(code: string, state: string): Promise<string> {
    const teamId = await this.cache.get<string>(`github:oauth:state:${state}`);
    if (!teamId)
      throw new UnauthorizedException('Invalid or expired OAuth state');
    await this.cache.del(`github:oauth:state:${state}`);

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.callbackUrl,
        }),
      },
    );
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
    };
    if (!tokenData.access_token) {
      throw new BadRequestException(
        `GitHub OAuth failed: ${tokenData.error ?? 'no token returned'}`,
      );
    }

    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();

    const encryptedToken = this.vault.encrypt(teamId, tokenData.access_token);
    await this.installRepo.upsert(
      {
        teamId,
        githubUserId: String(ghUser.id),
        githubLogin: ghUser.login,
        accessToken: encryptedToken,
        tokenScope: tokenData.scope ?? 'repo,read:user',
        revokedAt: null,
      },
      ['teamId'],
    );

    this.logger.log(`GitHub connected for team ${teamId} as ${ghUser.login}`);
    return teamId;
  }

  /** List repos accessible to the tenant's GitHub token */
  async listRepos(teamId: string): Promise<
    Array<{
      fullName: string;
      defaultBranch: string;
      private: boolean;
      language: string | null;
      description: string | null;
    }>
  > {
    const installation = await this.getInstallation(teamId);
    const octokit = this.makeOctokit(teamId, installation.accessToken);
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });
    return data.map((r) => ({
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      private: r.private,
      language: r.language ?? null,
      description: r.description ?? null,
    }));
  }

  /** Connect a repo to a project — register webhook (best-effort) + enqueue index */
  async connectRepo(teamId: string, dto: ConnectRepoDto): Promise<GithubRepo> {
    const installation = await this.getInstallation(teamId);

    const existing = await this.repoRepo.findOne({
      where: { teamId, repoFullName: dto.repoFullName, deletedAt: null as any },
    });
    if (existing)
      throw new BadRequestException('This repo is already connected');

    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const encryptedWebhookSecret = this.vault.encrypt(teamId, webhookSecret);

    const octokit = this.makeOctokit(teamId, installation.accessToken);
    const [owner, repo] = dto.repoFullName.split('/');

    const backendUrl = `http://localhost:7771`;
    const webhookUrl = `${backendUrl}/api/github/webhook`;

    let webhookId: number | null = null;
    try {
      const { data: hook } = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          secret: webhookSecret,
          content_type: 'json',
        },
        events: ['push'],
        active: true,
      });
      webhookId = hook.id;
    } catch (err: any) {
      this.logger.warn(
        `Could not register webhook for ${dto.repoFullName}: ${err.message}`,
      );
    }

    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    const githubRepo = this.repoRepo.create({
      teamId,
      installationId: installation.id,
      projectId: dto.projectId,
      repoFullName: dto.repoFullName,
      defaultBranch: repoData.default_branch,
      webhookId,
      webhookSecret: encryptedWebhookSecret,
      indexStatus: 'pending',
    });
    await this.repoRepo.save(githubRepo);

    await this.indexQueue.add(
      GithubIndexJobs.INDEX_REPO,
      { repoId: githubRepo.id },
      {
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );

    this.logger.log(
      `Repo ${dto.repoFullName} connected for team ${teamId}, index job enqueued`,
    );
    return githubRepo;
  }

  /** Disconnect a repo — remove webhook, delete source docs, soft-delete row */
  async disconnectRepo(teamId: string, repoId: string): Promise<void> {
    const githubRepo = await this.repoRepo.findOne({
      where: { id: repoId, teamId, deletedAt: null as any },
    });
    if (!githubRepo) throw new NotFoundException('Repo not found');

    if (githubRepo.webhookId) {
      try {
        const installation = await this.getInstallation(teamId);
        const octokit = this.makeOctokit(teamId, installation.accessToken);
        const [owner, repo] = githubRepo.repoFullName.split('/');
        await octokit.rest.repos.deleteWebhook({
          owner,
          repo,
          hook_id: githubRepo.webhookId,
        });
      } catch (err: any) {
        this.logger.warn(
          `Could not delete webhook for ${githubRepo.repoFullName}: ${err.message}`,
        );
      }
    }

    if (githubRepo.projectId) {
      await this.sourceDocRepo.delete({ projectId: githubRepo.projectId });
    }

    await this.repoRepo.update(repoId, {
      deletedAt: new Date(),
      indexStatus: 'stale',
    });

    this.logger.log(
      `Repo ${githubRepo.repoFullName} disconnected for team ${teamId}`,
    );
  }

  /** Get repos currently connected for a team */
  async getConnectedRepos(teamId: string): Promise<GithubRepo[]> {
    return this.repoRepo.find({ where: { teamId, deletedAt: null as any } });
  }

  /** Check if a team has an active GitHub installation */
  async getInstallationStatus(
    teamId: string,
  ): Promise<{ connected: boolean; login?: string }> {
    const installation = await this.installRepo.findOne({
      where: { teamId, revokedAt: null as any },
    });
    if (!installation) return { connected: false };
    return { connected: true, login: installation.githubLogin };
  }

  /** Decrypt a stored token — used by indexer for git clone URLs */
  decryptToken(teamId: string, encryptedToken: string): string {
    return this.vault.decryptIfNeeded(teamId, encryptedToken) ?? '';
  }

  async searchCode(
    query: string,
    projectId: string,
    topK = 8,
  ): Promise<
    Array<{ filePath: string; content: string; language: string | null }>
  > {
    const embedding = await this.vertexEmbed.embed(query);
    const vecString = `[${embedding.join(',')}]`;
    const rows = await this.sourceDocRepo
      .createQueryBuilder('sd')
      .where('sd.projectId = :projectId', { projectId })
      .andWhere('sd.embedding IS NOT NULL')
      .orderBy('CAST(sd.embedding AS vector) <=> CAST(:vec AS vector)', 'ASC')
      .setParameter('vec', vecString)
      .limit(topK)
      .getMany();
    return rows.map((r) => ({
      filePath: r.filePath,
      content: r.content,
      language: r.language,
    }));
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  async getInstallation(teamId: string): Promise<GithubInstallation> {
    const installation = await this.installRepo.findOne({
      where: { teamId, revokedAt: null as any },
    });
    if (!installation)
      throw new NotFoundException(
        'No GitHub connection found. Please connect GitHub first.',
      );
    return installation;
  }

  makeOctokit(teamId: string, encryptedToken: string): Octokit {
    const token = this.vault.decryptIfNeeded(teamId, encryptedToken);
    return new Octokit({ auth: token });
  }
}
