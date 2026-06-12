import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAbigailFieldsToAiConfig1744358564000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tone field
    await queryRunner.addColumn(
      'ai_configurations',
      new TableColumn({
        name: 'tone',
        type: 'varchar',
        length: '20',
        default: "'professional'",
      }),
    );

    // Add monthly_budget_usd field
    await queryRunner.addColumn(
      'ai_configurations',
      new TableColumn({
        name: 'monthly_budget_usd',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 62.0,
      }),
    );

    // Add current_spending_usd field
    await queryRunner.addColumn(
      'ai_configurations',
      new TableColumn({
        name: 'current_spending_usd',
        type: 'decimal',
        precision: 10,
        scale: 6,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ai_configurations', 'current_spending_usd');
    await queryRunner.dropColumn('ai_configurations', 'monthly_budget_usd');
    await queryRunner.dropColumn('ai_configurations', 'tone');
  }
}
