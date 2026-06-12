import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErrorRectificationService } from './error-rectification.service';
import { RectifyErrorDto } from './dto/rectify-error.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/rectification')
export class RectificationController {
  constructor(private readonly service: ErrorRectificationService) {}

  @Post()
  rectify(@Request() req: any, @Body() dto: RectifyErrorDto) {
    return this.service.rectify(req.user.tenantId, dto);
  }
}
