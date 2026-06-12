import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDreamerRuns1750000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dreamer_runs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'tenantId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'turnsProcessed', type: 'int' },
          { name: 'preferencesExtracted', type: 'int' },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed', 'skipped'],
          },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dreamer_runs');
  }
}
