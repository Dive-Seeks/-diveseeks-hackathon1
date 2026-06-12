import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('operating_hours')
export class OperatingHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  day: string; // e.g., 'Monday'

  @Column()
  open_time: string; // Format: HH:mm

  @Column()
  close_time: string; // Format: HH:mm

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.operatingHours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
