import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

export enum DependencyType {
  COMPLETION = 'completion',
  SUCCESS = 'success',
  DATA = 'data',
}

@Entity('tm_task_dependencies')
@Unique(['dependentTaskId', 'dependsOnTaskId'])
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dependentTaskId: string;

  @Column({ type: 'uuid' })
  dependsOnTaskId: string;

  @Column({
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.SUCCESS,
  })
  dependencyType: DependencyType;

  @Column({ length: 200, nullable: true })
  outputPath: string;

  @Column({ length: 200, nullable: true })
  inputKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
