import { AccountType, AccountSubType } from '../account.entity';

export class AccountTreeDto {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: AccountSubType;
  balance: number;
  children: AccountTreeDto[];
}
