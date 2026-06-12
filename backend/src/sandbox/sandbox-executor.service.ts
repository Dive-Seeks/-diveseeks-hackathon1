import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { SandboxSession } from './entities/sandbox-session.entity';
import Docker from 'dockerode';
import { Cron } from '@nestjs/schedule';

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

@Injectable()
export class SandboxExecutorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SandboxExecutorService.name);
  private readonly docker: Docker;

  constructor(
    @InjectRepository(SandboxSession)
    private readonly sessionRepo: Repository<SandboxSession>,
  ) {
    this.docker = new Docker(); // Default options: /var/run/docker.sock
  }

  async onModuleInit() {
    this.logger.log(
      'SandboxExecutorService initialized. Testing Docker connection...',
    );
    try {
      await this.docker.ping();
      this.logger.log('Docker daemon is accessible.');
    } catch (err) {
      this.logger.error(`Failed to connect to Docker daemon: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log(
      'SandboxExecutorService destroying. Reaping all active containers...',
    );
    // In production, we might want to keep some sessions alive, but for safety:
    const active = await this.sessionRepo.find({
      where: { status: 'running' },
    });
    for (const session of active) {
      try {
        await this.closeSession(session.id);
      } catch (err) {
        this.logger.error(
          `Failed to close session ${session.id} on shutdown: ${err.message}`,
        );
      }
    }
  }

  async createSession(
    tenantId: string,
    opts: {
      image: string;
      envVars: Record<string, string>;
      maxDurationMs?: number;
      taskSessionId?: string;
      coordinatorJobId?: string;
    },
  ): Promise<SandboxSession> {
    const session = this.sessionRepo.create({
      tenantId,
      image: opts.image,
      envVars: opts.envVars,
      maxDurationMs: opts.maxDurationMs || 300000,
      taskSessionId: opts.taskSessionId,
      coordinatorJobId: opts.coordinatorJobId,
      status: 'pending',
    });
    await this.sessionRepo.save(session);

    try {
      const containerName = `abigail-sandbox-${session.id}`;

      // Pull image if not exists (non-blocking in a real app, but here we wait)
      // await this.docker.pull(opts.image, {});

      const container = await this.docker.createContainer({
        Image: opts.image,
        name: containerName,
        Env: Object.entries(opts.envVars).map(([k, v]) => `${k}=${v}`),
        Tty: true,
        Cmd: ['/bin/sh'], // Keep it alive
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB
          CpuQuota: 50000, // 50%
          NetworkMode: 'none', // Network isolation
          AutoRemove: false,
        },
      });

      await container.start();

      session.status = 'running';
      session.containerId = container.id;
      await this.sessionRepo.save(session);

      return session;
    } catch (err) {
      session.status = 'failed';
      session.errorMessage = err.message;
      await this.sessionRepo.save(session);

      if (
        err.message.includes('ENOENT') ||
        err.message.includes('ECONNREFUSED')
      ) {
        throw new ServiceUnavailableException(
          `Docker daemon is unreachable: ${err.message}`,
        );
      }
      throw err;
    }
  }

  async exec(
    sessionId: string,
    command: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<ExecResult> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
    });
    if (session.status !== 'running' || !session.containerId) {
      throw new Error(`Session ${sessionId} is not in running state`);
    }

    const startTime = Date.now();
    const container = this.docker.getContainer(session.containerId);

    try {
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        // Docker multiplexed stream handling (stdout/stderr)
        container.modem.demuxStream(
          stream,
          {
            write: (chunk) => {
              stdout += chunk.toString();
            },
          },
          {
            write: (chunk) => {
              stderr += chunk.toString();
            },
          },
        );

        stream.on('end', async () => {
          const inspect = await exec.inspect();
          const durationMs = Date.now() - startTime;

          const result = {
            exitCode: inspect.ExitCode ?? -1,
            stdout: stdout.substring(0, 10000),
            stderr: stderr.substring(0, 10000),
            durationMs,
          };

          // Update session with last result
          session.lastResult = { command, ...result };
          session.totalDurationMs += durationMs;
          await this.sessionRepo.save(session);

          resolve(result);
        });

        stream.on('error', reject);

        if (opts.timeoutMs) {
          setTimeout(() => {
            stream.destroy();
            reject(new Error('Command execution timeout'));
          }, opts.timeoutMs);
        }
      });
    } catch (err) {
      this.logger.error(`Exec failed in session ${sessionId}: ${err.message}`);
      throw err;
    }
  }

  async resumeSession(sessionId: string): Promise<SandboxSession> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
    });
    if (session.status === 'running') return session;
    if (!session.containerId)
      throw new Error(`No container ID for session ${sessionId}`);

    try {
      const container = this.docker.getContainer(session.containerId);
      await container.start();

      session.status = 'running';
      await this.sessionRepo.save(session);
      return session;
    } catch (err) {
      this.logger.error(
        `Failed to resume session ${sessionId}: ${err.message}`,
      );
      throw err;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
    });
    if (session.containerId) {
      try {
        const container = this.docker.getContainer(session.containerId);
        await container.stop().catch(() => {}); // Ignore error if already stopped
        await container.remove().catch(() => {});
      } catch (err) {
        this.logger.warn(
          `Failed to cleanup container ${session.containerId}: ${err.message}`,
        );
      }
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await this.sessionRepo.save(session);
  }

  @Cron('*/5 * * * *') // Every 5 minutes
  async reapExpiredSessions(): Promise<void> {
    this.logger.log('Reaping expired sandbox sessions...');
    const now = new Date();

    // Find sessions running past their maxDurationMs
    // Since we don't store "startedAt" for heartbeats, we use updatedAt as a proxy for activity
    const expired = await this.sessionRepo.find({
      where: {
        status: 'running',
      },
    });

    for (const session of expired) {
      const activeTime = now.getTime() - session.updatedAt.getTime();
      if (activeTime > session.maxDurationMs) {
        this.logger.warn(`Reaping session ${session.id} (timeout)`);
        await this.closeSession(session.id);
        await this.sessionRepo.update(session.id, { status: 'timeout' });
      }
    }
  }
}
