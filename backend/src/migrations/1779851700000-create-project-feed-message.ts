import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProjectFeedMessage1779851700000 implements MigrationInterface {
  name = 'CreateProjectFeedMessage1779851700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_feed_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'varchar',
          },
          {
            name: 'projectId',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'specialist',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'outcome',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'refId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_feed_messages');
  }
}
