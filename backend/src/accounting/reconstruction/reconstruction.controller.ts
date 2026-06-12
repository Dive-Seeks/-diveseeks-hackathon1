import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ReconstructionService,
  ReconstructionInput,
} from './reconstruction.service';
import { IsDateString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReconstructionInputDto implements ReconstructionInput {
  @IsNumber() openingAssets: number;
  @IsNumber() openingLiabilities: number;
  @IsNumber() closingAssets: number;
  @IsNumber() closingLiabilities: number;
  @IsNumber() drawings: number;
  @IsNumber() additionalCapital: number;
}

class ReconstructFromPosDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
}

@UseGuards(JwtAuthGuard)
@Controller('accounting/reconstruction')
export class ReconstructionController {
  constructor(private readonly service: ReconstructionService) {}

  @Post('missing-figure')
  calculateMissingFigure(
    @Request() req: any,
    @Body() dto: ReconstructionInputDto,
  ) {
    return this.service.calculateMissingFigure(req.user.tenantId, dto);
  }

  @Post('from-pos')
  reconstructFromPOS(@Request() req: any, @Body() dto: ReconstructFromPosDto) {
    return this.service.reconstructFromPOS(req.user.tenantId, {
      from: new Date(dto.from),
      to: new Date(dto.to),
    });
  }
}
