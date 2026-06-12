import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InventoryMethod {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
}

@Entity('ca_inventory_valuations')
export class CaInventoryValuation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenantId: string;
  @Column({ type: 'uuid' }) productId: string;
  @Column({ type: 'enum', enum: InventoryMethod }) method: InventoryMethod;
  @Column({ type: 'decimal', precision: 15, scale: 4 }) unitCost: number;
  @Column({ type: 'int' }) quantityOnHand: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) totalValue: number;
  @Column({ type: 'date' }) valuationDate: Date;

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
