import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds composite (tenant_id) and (tenant_id, store_id) indexes on high-traffic
 * commerce tables to support horizontal scaling with proper tenant isolation.
 *
 * Run before deploying to production:
 *   npm run migration:run
 *
 * Column naming: TypeORM default snake_case strategy maps `businessId` → `business_id`.
 * Verified against actual schema columns — use `\d <table>` to confirm if in doubt.
 */
const COMMERCE_TABLES: Array<{
  table: string;
  tenantCol: string;
  storeCol?: string;
}> = [
  { table: 'sales', tenantCol: 'business_id', storeCol: 'store_id' },
  { table: 'products', tenantCol: 'business_id' },
  { table: 'inventory', tenantCol: 'business_id', storeCol: 'store_id' },
  { table: 'customers', tenantCol: 'tenant_id' },
  { table: 'menus', tenantCol: 'tenant_id', storeCol: 'store_id' },
  { table: 'categories', tenantCol: 'tenant_id' },
  { table: 'modifiers', tenantCol: 'tenant_id' },
];

export class TenantIndexes1747300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, tenantCol, storeCol } of COMMERCE_TABLES) {
      // Check the table exists before creating indexes (dev envs may be sparse)
      const exists = (await queryRunner.query(`SELECT to_regclass($1)`, [
        table,
      ])) as Array<{ to_regclass: string | null }>;
      if (!exists[0]?.to_regclass) continue;

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_${tenantCol.replace(/_/g, '')}"
         ON "${table}" ("${tenantCol}")`,
      );

      if (storeCol) {
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "idx_${table}_${tenantCol.replace(/_/g, '')}_${storeCol.replace(/_/g, '')}"
           ON "${table}" ("${tenantCol}", "${storeCol}")
           WHERE "${storeCol}" IS NOT NULL`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, tenantCol, storeCol } of COMMERCE_TABLES) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_${table}_${tenantCol.replace(/_/g, '')}"`,
      );
      if (storeCol) {
        await queryRunner.query(
          `DROP INDEX IF EXISTS "idx_${table}_${tenantCol.replace(/_/g, '')}_${storeCol.replace(/_/g, '')}"`,
        );
      }
    }
  }
}
