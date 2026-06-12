import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Service providing core application functionality.
 */
@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  /**
   * Returns a basic health message and checks database connection.
   * @returns {Promise<any>} Health status and database connectivity.
   */
  getHealth(): any {
    const dbConnected = this.dataSource.isInitialized;
    return {
      status: 'ok',
      message: 'Dive POS API is online and healthy.',
      database: {
        connected: dbConnected,
        name: this.dataSource.options.database,
      },
    };
  }

  /**
   * Returns a basic health message.
   * @returns {string} Welcome message.
   */
  getHello(): string {
    return 'Dive POS API is online and healthy.';
  }
}
