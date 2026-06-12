import { Module } from '@nestjs/common';
import { ClaraService } from './clara.service';
import { ClaraController } from './clara.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { ManagersModule } from '../managers/managers.module';

@Module({
  imports: [AccountingModule, ManagersModule],
  controllers: [ClaraController],
  providers: [ClaraService],
  exports: [ClaraService],
})
export class ClaraModule {}
