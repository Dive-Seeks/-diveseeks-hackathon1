import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SalesGateway } from './sales/sales.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [SalesGateway],
  exports: [SalesGateway],
})
export class GatewaysModule {}
