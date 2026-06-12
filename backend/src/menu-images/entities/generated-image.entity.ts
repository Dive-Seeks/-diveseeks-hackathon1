import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SourceMode {
  TEXT = 'text',
  SINGLE_PHOTO = 'single_photo',
  TWO_PHOTOS = 'two_photos',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export interface ImagePromptSchema {
  subject: string;
  ingredients: string[];
  style: string;
  lighting: string;
  background: string;
  camera: string;
  quality: string;
  presentationNotes: string;
  negativeHints: string;
  sourceMode: SourceMode;
}

@Entity('generated_images')
@Index(['tenantId', 'approvalStatus'])
@Index(['tenantId', 'storeId'])
@Index(['isGlobal', 'approvalStatus'])
export class GeneratedImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null;

  @Column({ name: 'item_name', type: 'text' })
  itemName: string;

  @Column({ name: 'cuisine_type', type: 'text', nullable: true })
  cuisineType: string | null;

  @Column({ name: 'business_type', type: 'text', nullable: true })
  businessType: string | null;

  @Column({
    name: 'source_mode',
    type: 'enum',
    enum: SourceMode,
    default: SourceMode.TEXT,
  })
  sourceMode: SourceMode;

  @Column({ name: 'source_image_url', type: 'text', nullable: true })
  sourceImageUrl: string | null;

  @Column({ name: 'style_ref_image_url', type: 'text', nullable: true })
  styleRefImageUrl: string | null;

  @Column({ name: 'prompt_json', type: 'jsonb', nullable: true })
  promptJson: ImagePromptSchema | null;

  @Column({
    name: 'prompt_embedding',
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? `[${v.join(',')}]` : null),
      from: (v: string | null) =>
        v ? v.slice(1, -1).split(',').map(Number) : null,
    },
  })
  promptEmbedding: number[] | null;

  @Column({ name: 'dalle_prompt', type: 'text', nullable: true })
  dallePrompt: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ name: 'is_global', type: 'boolean', default: false })
  isGlobal: boolean;

  @Column({ name: 'generation_model', type: 'text', nullable: true })
  generationModel: string | null;

  @Column({
    name: 'generation_cost',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  generationCost: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId: string | null;
}
