import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteConfigToSite1745000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sites
        ADD COLUMN IF NOT EXISTS subdomain VARCHAR UNIQUE,
        ADD COLUMN IF NOT EXISTS website_status VARCHAR NOT NULL DEFAULT 'draft',
        ADD COLUMN IF NOT EXISTS website_config JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sites
        DROP COLUMN IF EXISTS subdomain,
        DROP COLUMN IF EXISTS website_status,
        DROP COLUMN IF EXISTS website_config
    `);
  }
}
