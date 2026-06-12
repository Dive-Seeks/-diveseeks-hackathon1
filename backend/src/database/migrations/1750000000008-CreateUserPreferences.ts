import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserPreferences1750000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
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
          {
            name: 'category',
            type: 'enum',
            enum: ['style', 'fact', 'frustration', 'topic'],
          },
          { name: 'key', type: 'varchar' },
          { name: 'value', type: 'text' },
          { name: 'confidence', type: 'float', default: 1.0 },
          { name: 'reinforcementCount', type: 'int', default: 1 },
          {
            name: 'embedding',
            type: 'vector',
            length: '768',
            isNullable: true,
          },
          { name: 'lastReinforcedAt', type: 'timestamp' },
          { name: 'archivedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_preferences',
      new TableIndex({
        name: 'IDX_user_preferences_tenant_user',
        columnNames: ['tenantId', 'userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_preferences');
  }
}
