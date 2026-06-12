import { Module } from '@nestjs/common';
import { WebFetchService } from './web-fetch.service';

@Module({
  providers: [WebFetchService],
  exports: [WebFetchService],
})
export class WebFetchModule {}
