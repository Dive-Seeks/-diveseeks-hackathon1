import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMenuTemplates1744358562000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'menu_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'business_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'cuisine_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'dietary_category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'template_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'template_data',
            type: 'jsonb',
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 1.0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create composite index for fast lookups
    await queryRunner.createIndex(
      'menu_templates',
      new TableIndex({
        name: 'idx_menu_template_lookup',
        columnNames: ['business_type', 'cuisine_type', 'dietary_category'],
      }),
    );

    // Create index on usage_count for popularity sorting
    await queryRunner.createIndex(
      'menu_templates',
      new TableIndex({
        name: 'idx_menu_template_usage',
        columnNames: ['usage_count', 'confidence_score'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('menu_templates');
  }
}
