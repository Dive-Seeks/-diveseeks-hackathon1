import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SandboxRecord } from './entities/sandbox-record.entity';
import { PortAllocatorService } from './port-allocator.service';

// Specialist → ports needed (containerPort list)
const SPECIALIST_PORTS: Record<string, number[]> = {
  rex: [7771],
  nova: [3000, 5173],
  sage: [3000, 7771],
  vex: [3000, 7771, 8000],
  // others need no ports
};

@Injectable()
export class SandboxService implements OnModuleInit {
  private readonly logger = new Logger(SandboxService.name);
  private isMock: boolean;

  constructor(
    @InjectRepository(SandboxRecord)
    private readonly repo: Repository<SandboxRecord>,
    private readonly portAllocator: PortAllocatorService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const mode = this.config.get<string>('SANDBOX_MODE');
    if (mode === 'docker') {
      this.isMock = false;
    } else if (mode === 'mock') {
      this.isMock = true;
    } else {
      // Auto-detect: Windows → mock, Linux → docker
      this.isMock = process.platform === 'win32';
    }
    this.logger.log(
      `SandboxService initialized — mode: ${this.isMock ? 'MOCK' : 'DOCKER'}`,
    );
  }

  async create(
    taskSessionId: string,
    projectId: string,
    specialistId: string,
  ): Promise<SandboxRecord> {
    const containerPorts = SPECIALIST_PORTS[specialistId] ?? [];
    const hostPorts = this.isMock
      ? containerPorts.map(() => 0)
      : this.portAllocator.allocate(containerPorts.length);

    const ports: Record<number, number> = {};
    containerPorts.forEach((cp, i) => {
      ports[cp] = hostPorts[i];
    });

    const record = this.repo.create({
      taskSessionId,
      projectId,
      status: 'creating',
      isMock: this.isMock,
      ports,
    });
    await this.repo.save(record);

    if (this.isMock) {
      return this.createMock(record, projectId);
    }
    return this.createDocker(record, projectId, specialistId, ports);
  }

  async destroy(taskSessionId: string): Promise<void> {
    const record = await this.repo.findOne({ where: { taskSessionId } });
    if (!record || record.status === 'destroyed') return;

    if (!record.isMock && record.containerId) {
      await this.destroyDocker(record.containerId);
      if (record.ports) {
        this.portAllocator.release(Object.values(record.ports));
      }
    }

    await this.repo.update(record.id, {
      status: 'destroyed',
      destroyedAt: new Date(),
    });
  }

  async exec(
    taskSessionId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const record = await this.repo.findOne({ where: { taskSessionId } });
    if (!record || record.status !== 'ready') {
      throw new Error(
        `Sandbox ${taskSessionId} is not ready (status: ${record?.status})`,
      );
    }
    if (record.isMock) {
      return this.execMock(command);
    }
    return this.execDocker(record.containerId, command);
  }

  async getStatus(
    taskSessionId: string,
  ): Promise<SandboxRecord['status'] | null> {
    const record = await this.repo.findOne({ where: { taskSessionId } });
    return record?.status ?? null;
  }

  async listActive(): Promise<SandboxRecord[]> {
    return this.repo.find({
      where: [{ status: 'creating' }, { status: 'ready' }],
    });
  }

  // ── MOCK IMPLEMENTATION ──────────────────────────────────────────────────

  private async createMock(
    record: SandboxRecord,
    projectId: string,
  ): Promise<SandboxRecord> {
    const workspacePath = process.cwd(); // host working directory
    await this.repo.update(record.id, { status: 'ready', workspacePath });
    this.logger.log(
      `[MOCK] Sandbox ready for task ${record.taskSessionId} → ${workspacePath}`,
    );
    return { ...record, status: 'ready', workspacePath };
  }

  private async execMock(
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (e: any) {
      return { stdout: '', stderr: e.message, exitCode: e.code ?? 1 };
    }
  }

  // ── DOCKER IMPLEMENTATION (stubbed for localhost — active on VPS) ────────

  private async createDocker(
    record: SandboxRecord,
    projectId: string,
    specialistId: string,
    ports: Record<number, number>,
  ): Promise<SandboxRecord> {
    // Stub on localhost — Docker not required for Windows dev
    // Full implementation in VPS plan: 2026-05-06-docker-sandbox-vps.md
    this.logger.warn(
      `[DOCKER] create() called but Docker not implemented on localhost — falling back to mock`,
    );
    return this.createMock(record, projectId);
  }

  private async destroyDocker(containerId: string): Promise<void> {
    this.logger.warn(`[DOCKER] destroy(${containerId}) — stub on localhost`);
  }

  private async execDocker(
    containerId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.logger.warn(`[DOCKER] exec() — stub on localhost, running on host`);
    return this.execMock(command);
  }
}
