import { Module } from '@nestjs/common';
import { WebFetchModule } from './web-fetch/web-fetch.module';
import { WebSearchModule } from './web-search/web-search.module';
import { BrowserModule } from './browser/browser.module';

@Module({
  imports: [WebFetchModule, WebSearchModule, BrowserModule],
  exports: [WebFetchModule, WebSearchModule, BrowserModule],
})
export class ToolsModule {}
