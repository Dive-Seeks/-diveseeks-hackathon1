import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Approval, ApprovalStatus } from './entities/approval.entity';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    @InjectRepository(Approval)
    private readonly approvalRepo: Repository<Approval>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateApprovalDto): Promise<Approval> {
    const approval = this.approvalRepo.create({
      ...dto,
      status: 'pending',
    });

    const saved = await this.approvalRepo.save(approval);

    // Generate signed JWT token for email/WhatsApp approve links
    const signedToken = this.jwtService.sign(
      {
        approvalId: saved.id,
        tenantId: saved.tenantId,
        type: saved.type,
        action: 'approve',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      },
    );

    saved.signedToken = signedToken;
    return this.approvalRepo.save(saved);
  }

  async findAll(
    tenantId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Approval[]; total: number }> {
    const where: Record<string, any> = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [data, total] = await this.approvalRepo.findAndCount({
      where,
      relations: ['requestedByAgent', 'reviewedByAgent'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Approval> {
    const approval = await this.approvalRepo.findOne({
      where: { id },
      relations: ['requestedByAgent', 'reviewedByAgent'],
    });
    if (!approval) throw new NotFoundException(`Approval ${id} not found`);
    return approval;
  }

  async decide(
    id: string,
    dto: ApprovalDecisionDto,
    resolvedByAgentId: string,
  ): Promise<Approval> {
    const approval = await this.findOne(id);

    if (approval.status !== 'pending' && approval.status !== 'resubmitted') {
      throw new BadRequestException(
        `Approval ${id} is not in a decidable state (current: ${approval.status})`,
      );
    }

    const statusMap: Record<string, ApprovalStatus> = {
      approve: 'approved',
      reject: 'rejected',
      revision_requested: 'revision_requested',
    };

    approval.status = statusMap[dto.action];
    approval.decisionNote = dto.decisionNote ?? null;
    approval.resolvedByAgentId = resolvedByAgentId;
    approval.resolvedAt = new Date();

    const saved = await this.approvalRepo.save(approval);
    this.logger.log(
      `Approval ${id} decided: ${dto.action} by ${resolvedByAgentId}`,
    );
    return saved;
  }

  async resubmit(id: string): Promise<Approval> {
    const approval = await this.findOne(id);
    if (approval.status !== 'revision_requested') {
      throw new BadRequestException(
        `Approval ${id} is not in revision_requested state`,
      );
    }

    approval.status = 'resubmitted';
    approval.resolvedAt = null;
    return this.approvalRepo.save(approval);
  }
}
