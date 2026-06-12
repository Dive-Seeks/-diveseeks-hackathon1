import { Injectable } from '@nestjs/common';
import { CreateBusinessSettingDto } from './dto/create-business-setting.dto';
import { UpdateBusinessSettingDto } from './dto/update-business-setting.dto';

@Injectable()
export class BusinessSettingsService {
  create(_createBusinessSettingDto: CreateBusinessSettingDto) {
    return 'This action adds a new businessSetting';
  }

  findAll() {
    return `This action returns all businessSettings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} businessSetting`;
  }

  update(id: number, _updateBusinessSettingDto: UpdateBusinessSettingDto) {
    return `This action updates a #${id} businessSetting`;
  }

  remove(id: number) {
    return `This action removes a #${id} businessSetting`;
  }
}
