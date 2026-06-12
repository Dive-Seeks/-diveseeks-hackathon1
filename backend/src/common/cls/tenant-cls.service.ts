import { Injectable } from '@nestjs/common';
import { ClsService, ClsStore } from 'nestjs-cls';

interface TenantClsStore extends ClsStore {
  tenantId: string | null;
  userId: string | null;
}

@Injectable()
export class TenantClsService {
  constructor(private readonly cls: ClsService<TenantClsStore>) {}

  setTenant(tenantId: string | null, userId: string | null): void {
    this.cls.set('tenantId', tenantId);
    this.cls.set('userId', userId);
  }

  getTenantId(): string | null {
    return this.cls.get('tenantId') ?? this.cls.get('userId') ?? null;
  }

  getUserId(): string | null {
    return this.cls.get('userId') ?? null;
  }
}
