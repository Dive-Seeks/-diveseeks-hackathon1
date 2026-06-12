import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSelectedChannelsToStore1733678400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'stores',
      new TableColumn({
        name: 'selectedChannels',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('stores', 'selectedChannels');
  }
}
