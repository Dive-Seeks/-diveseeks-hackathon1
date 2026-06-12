import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDreamerConfigs1750000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dreamer_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'tenantId', type: 'uuid' },
          { name: 'cronExpression', type: 'varchar', default: "'30 2 * * *'" },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'dreamer_configs',
      new TableIndex({
        name: 'IDX_dreamer_configs_tenantId',
        columnNames: ['tenantId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dreamer_configs');
  }
}
