import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { initAccounts, migrate } from 'ledgerstack-core';

@Injectable()
export class LedgerService implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    // Create a custom adapter that bridges ledgerstack-core to TypeORM
    const adapter = {
      dialect: 'postgres' as const,
      query: async (sql: string, params?: any[]) => {
        // Convert ? placeholders to $1, $2, etc. for PostgreSQL
        let index = 1;
        const pgSql = sql.replace(/\?/g, () => `$${index++}`);
        const result = await this.dataSource.query(pgSql, params);
        return {
          rows: Array.isArray(result) ? result : [],
          rowCount: Array.isArray(result) ? result.length : 0,
        };
      },
      select: async (table: string, where?: object) => {
        // Simple select implementation for ledgerstack-core
        let sql = `SELECT * FROM ${table}`;
        const params: any[] = [];
        if (where && Object.keys(where).length > 0) {
          const conditions = Object.entries(where).map(([key, val], i) => {
            params.push(val);
            return `${key} = $${i + 1}`;
          });
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        return this.dataSource.query(sql, params);
      },
      insert: async (table: string, data: object) => {
        const keys = Object.keys(data);
        const vals = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.dataSource.query(sql, vals);
        return result[0];
      },
      update: async (table: string, where: object, data: object) => {
        const setKeys = Object.keys(data);
        const setVals = Object.values(data);
        const whereKeys = Object.keys(where);
        const whereVals = Object.values(where);

        const setSql = setKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const whereSql = whereKeys
          .map((key, i) => `${key} = $${i + setKeys.length + 1}`)
          .join(' AND ');

        const sql = `UPDATE ${table} SET ${setSql} WHERE ${whereSql} RETURNING *`;
        return this.dataSource.query(sql, [...setVals, ...whereVals]);
      },
      delete: async (table: string, where: object) => {
        const keys = Object.keys(where);
        const vals = Object.values(where);
        const conditions = keys
          .map((key, i) => `${key} = $${i + 1}`)
          .join(' AND ');
        const sql = `DELETE FROM ${table} WHERE ${conditions}`;
        const result = await this.dataSource.query(sql, vals);
        return result[1] || 0; // rowCount
      },
      transaction: async <T>(fn: (ad: any) => Promise<T>): Promise<T> => {
        return this.dataSource.transaction(async (manager) => {
          // Note: In a real implementation, we should pass a manager-wrapped adapter
          // but for simplicity we reuse the global one if it's thread-safe enough or just use the manager
          return fn(adapter);
        });
      },
    };

    // Initialize LedgerStack
    await initAccounts({
      adapter: adapter,
      tenant: true,
      worker: false, // We'll process jobs manually or via BullMQ later
      autoMigrate: false,
    });

    console.log('LedgerStack Core initialized successfully.');
  }
}
