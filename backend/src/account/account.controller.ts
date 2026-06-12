import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePassword } from './dto/update-password/update-password';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId?: string;
    storeId?: string;
    role?: string;
  };
}

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  findMe(@Req() req: RequestWithUser) {
    return this.accountService.findMe(req.user.userId);
  }

  @Patch('me')
  updateMe(
    @Req() req: RequestWithUser,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountService.updateMe(req.user.userId, updateAccountDto);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: RequestWithUser,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountService.updatePreferences(
      req.user.userId,
      createAccountDto,
    );
  }

  @Patch('password')
  updatePassword(
    @Req() req: RequestWithUser,
    @Body() updatePasswordDto: UpdatePassword,
  ) {
    return this.accountService.updatePassword(
      req.user.userId,
      updatePasswordDto,
    );
  }

  @Get('health')
  getHealth(@Req() req: RequestWithUser) {
    return this.accountService.getAccountHealth(req.user.userId);
  }
}
