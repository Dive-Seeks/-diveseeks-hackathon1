import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthService } from './observability/health.service';

/**
 * Main application controller for health checks and base routes.
 */
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  /**
   * Health check endpoint including database connection status.
   * @returns Health status and database connectivity.
   */
  @Get('health')
  getHealth(): any {
    return this.healthService.getHealth();
  }
}
