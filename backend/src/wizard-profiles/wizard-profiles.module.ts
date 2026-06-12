import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WizardBusinessProfile } from './wizard-profiles.entity';
import { WizardProfilesService } from './wizard-profiles.service';
import { WizardProfilesController } from './wizard-profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WizardBusinessProfile])],
  providers: [WizardProfilesService],
  controllers: [WizardProfilesController],
  exports: [WizardProfilesService],
})
export class WizardProfilesModule {}
