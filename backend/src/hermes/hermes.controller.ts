import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { HermesService } from './hermes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hermes')
@UseGuards(JwtAuthGuard)
export class HermesController {
  constructor(private readonly hermesService: HermesService) {}

  @Post('alerts/:id/acknowledge')
  async acknowledge(@Param('id') id: string) {
    await this.hermesService.acknowledgeAlert(id);
    return { acknowledged: true };
  }

  @Post('alerts/:id/dismiss')
  async dismiss(@Param('id') id: string) {
    await this.hermesService.acknowledgeAlert(id);
    return { dismissed: true };
  }
}
