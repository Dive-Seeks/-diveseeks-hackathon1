import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('menu_embeddings')
export class MenuEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', nullable: true, type: 'varchar' })
  tenantId: string | null;

  @Index()
  @Column({ name: 'source_type', type: 'varchar' })
  sourceType: string; // 'dish' | 'category' | 'modifier_blueprint' | 'menu_item'

  @Column({ name: 'source_id', type: 'varchar' })
  sourceId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>; // { cuisine, dietaryType, businessType, price }

  @Column({
    name: 'embedding',
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? `[${v.join(',')}]` : null),
      from: (v: string | null) =>
        v ? v.slice(1, -1).split(',').map(Number) : null,
    },
  })
  embedding: number[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
