import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as path from 'path';
import * as fs from 'fs';
import { simpleGit } from 'simple-git';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import { GithubRepo } from './entities/github-repo.entity';
import { GithubInstallation } from './entities/github-installation.entity';
import { GithubSourceDocument } from './entities/source-document.entity';
import { GithubService } from './github.service';
import { GITHUB_INDEX_QUEUE, GithubIndexJobs } from './github.queue';

const INDEXED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rb',
  '.java',
  '.cs',
  '.php',
  '.rs',
  '.swift',
  '.vue',
  '.svelte',
  '.json',
  '.yaml',
  '.yml',
  '.md',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
]);
const MAX_FILE_BYTES = 100 * 1024;
const CHUNK_WORDS = 400; // ≈ 512 tokens
const OVERLAP_WORDS = 50; // ≈ 64 tokens
const EMBED_BATCH_SIZE = 20;

function detectLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rb': 'ruby',
    '.java': 'java',
    '.cs': 'csharp',
    '.php': 'php',
    '.rs': 'rust',
    '.swift': 'swift',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
  };
  return map[ext] ?? 'text';
}

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_WORDS).join(' ');
    if (slice.trim()) chunks.push(slice);
    i += CHUNK_WORDS - OVERLAP_WORDS;
  }
  return chunks;
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(full));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!INDEXED_EXTENSIONS.has(ext)) continue;
        if (entry.name.endsWith('.min.js')) continue;
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
        } catch {
          continue;
        }
        results.push(full);
      }
    }
  } catch {
    // Skip unreadable dirs
  }
  return results;
}

@Processor(GITHUB_INDEX_QUEUE)
export class GithubIndexProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubIndexProcessor.name);
  private readonly reposBasePath: string;

  constructor(
    private readonly config: ConfigService,
    private readonly githubService: GithubService,
    @InjectRepository(GithubRepo)
    private readonly repoRepo: Repository<GithubRepo>,
    @InjectRepository(GithubInstallation)
    private readonly installRepo: Repository<GithubInstallation>,
    @InjectRepository(GithubSourceDocument)
    private readonly sourceDocRepo: Repository<GithubSourceDocument>,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {
    super();
    this.reposBasePath = this.config.get<string>(
      'GITHUB_REPOS_BASE_PATH',
      '/tmp/abigail-repos',
    );
  }

  async process(job: Job) {
    if (job.name === GithubIndexJobs.INDEX_REPO) {
      await this.indexRepo(job.data.repoId);
    } else if (job.name === GithubIndexJobs.REINDEX_FILES) {
      await this.reindexFiles(job.data);
    }
  }

  private async indexRepo(repoId: string): Promise<void> {
    const repo = await this.repoRepo.findOneOrFail({ where: { id: repoId } });
    const installation = await this.installRepo.findOneOrFail({
      where: { id: repo.installationId },
    });

    await this.repoRepo.update(repoId, { indexStatus: 'indexing' });

    try {
      const targetDir = path.join(this.reposBasePath, repo.teamId, repoId);
      const token = this.githubService.decryptToken(
        repo.teamId,
        installation.accessToken,
      );
      const cloneUrl = `https://oauth2:${token}@github.com/${repo.repoFullName}.git`;

      if (fs.existsSync(path.join(targetDir, '.git'))) {
        await simpleGit(targetDir).pull();
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
        await simpleGit().clone(cloneUrl, targetDir, [
          '--depth=1',
          `--branch=${repo.defaultBranch}`,
        ]);
      }

      const gitInstance = simpleGit(targetDir);
      const log = await gitInstance.log({ maxCount: 1 });
      const commitSha = log.latest?.hash ?? null;

      const files = walkDir(targetDir);
      this.logger.log(
        `[GithubIndex] ${repo.repoFullName}: found ${files.length} files`,
      );

      const indexedPaths: string[] = [];
      for (let i = 0; i < files.length; i += EMBED_BATCH_SIZE) {
        await this.processBatch(
          files.slice(i, i + EMBED_BATCH_SIZE),
          targetDir,
          repo,
          commitSha,
          indexedPaths,
        );
      }

      if (indexedPaths.length > 0 && repo.projectId) {
        await this.sourceDocRepo
          .createQueryBuilder()
          .delete()
          .where('projectId = :pid AND filePath NOT IN (:...paths)', {
            pid: repo.projectId,
            paths: indexedPaths,
          })
          .execute();
      }

      await this.repoRepo.update(repoId, {
        indexStatus: 'ready',
        lastIndexedAt: new Date(),
        indexedCommitSha: commitSha,
      });

      this.logger.log(
        `[GithubIndex] ${repo.repoFullName}: indexed ${indexedPaths.length} paths`,
      );
    } catch (err: any) {
      await this.repoRepo.update(repoId, { indexStatus: 'failed' });
      this.logger.error(
        `[GithubIndex] Failed ${repo.repoFullName}: ${err.message}`,
      );
      throw err;
    }
  }

  private async reindexFiles(data: {
    repoId: string;
    changedFiles: string[];
    deletedFiles: string[];
    commitSha: string;
  }): Promise<void> {
    const { repoId, changedFiles, deletedFiles, commitSha } = data;
    const repo = await this.repoRepo.findOneOrFail({ where: { id: repoId } });

    await this.repoRepo.update(repoId, { indexStatus: 'indexing' });

    try {
      const targetDir = path.join(this.reposBasePath, repo.teamId, repoId);
      if (!fs.existsSync(path.join(targetDir, '.git'))) {
        await this.indexRepo(repoId);
        return;
      }

      await simpleGit(targetDir).pull();

      const fullPaths = changedFiles
        .map((f) => path.join(targetDir, f))
        .filter((p) => fs.existsSync(p));

      const indexedPaths: string[] = [];
      for (let i = 0; i < fullPaths.length; i += EMBED_BATCH_SIZE) {
        await this.processBatch(
          fullPaths.slice(i, i + EMBED_BATCH_SIZE),
          targetDir,
          repo,
          commitSha,
          indexedPaths,
        );
      }

      if (deletedFiles.length > 0 && repo.projectId) {
        await this.sourceDocRepo
          .createQueryBuilder()
          .delete()
          .where('projectId = :pid AND filePath IN (:...paths)', {
            pid: repo.projectId,
            paths: deletedFiles,
          })
          .execute();
      }

      await this.repoRepo.update(repoId, {
        indexStatus: 'ready',
        lastIndexedAt: new Date(),
        indexedCommitSha: commitSha,
      });
    } catch (err: any) {
      await this.repoRepo.update(repoId, { indexStatus: 'failed' });
      this.logger.error(
        `[GithubIndex] Reindex failed ${repo.repoFullName}: ${err.message}`,
      );
      throw err;
    }
  }

  private async processBatch(
    filePaths: string[],
    baseDir: string,
    repo: GithubRepo,
    commitSha: string | null,
    indexedPaths: string[],
  ): Promise<void> {
    type Chunk = {
      filePath: string;
      chunkIndex: number;
      content: string;
      language: string;
      tokenCount: number;
    };
    const allChunks: Chunk[] = [];

    for (const absPath of filePaths) {
      try {
        const relPath = path.relative(baseDir, absPath).replace(/\\/g, '/');
        const ext = path.extname(absPath).toLowerCase();
        const content = fs.readFileSync(absPath, 'utf-8');
        const chunks = chunkText(content);
        chunks.forEach((chunk, idx) => {
          allChunks.push({
            filePath: relPath,
            chunkIndex: idx,
            content: chunk,
            language: detectLanguage(ext),
            tokenCount: chunk.split(/\s+/).length,
          });
        });
        indexedPaths.push(relPath);
      } catch {
        // Skip unreadable files
      }
    }

    if (allChunks.length === 0) return;

    const embeddings: (number[] | null)[] = [];

    for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
      try {
        const results = await Promise.all(
          batch.map((c) => this.vertexEmbed.embed(c.content)),
        );
        embeddings.push(...results);
      } catch (err: any) {
        this.logger.warn(
          `Embedding batch failed: ${err.message} — storing without embeddings`,
        );
        embeddings.push(...batch.map(() => null));
      }
    }

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      await this.sourceDocRepo.upsert(
        {
          teamId: repo.teamId,
          projectId: repo.projectId ?? repo.teamId,
          filePath: chunk.filePath,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: embeddings[i] ?? null,
          branch: repo.defaultBranch,
          commitSha,
          language: chunk.language,
          tokenCount: chunk.tokenCount,
        },
        ['projectId', 'filePath', 'chunkIndex'],
      );
    }
  }
}
