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

@Entity('holidays')
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  date: string; // Format: YYYY-MM-DD

  @Column({ default: true })
  is_closed: boolean;

  @Column({ nullable: true })
  open_time: string; // Format: HH:mm

  @Column({ nullable: true })
  close_time: string; // Format: HH:mm

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.holidays, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
