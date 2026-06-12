import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAiUsage1744358563000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_usage',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
          },
          {
            name: 'site_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tokens_input',
            type: 'integer',
          },
          {
            name: 'tokens_output',
            type: 'integer',
          },
          {
            name: 'cost_usd',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'ai_usage',
      new TableIndex({
        name: 'idx_ai_usage_tenant',
        columnNames: ['tenant_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'ai_usage',
      new TableIndex({
        name: 'idx_ai_usage_site',
        columnNames: ['site_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_usage');
  }
}
