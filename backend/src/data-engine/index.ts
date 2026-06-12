// src/data-engine/index.ts
// Public API for the data-engine bounded context.

export { SpecKitEntryService } from './spec-kit/spec-kit-entry.service';
export type { SpecKitGenerateParams } from './spec-kit/spec-kit-entry.service';
export type { SpecKitLifecycleResult } from './spec-kit/spec-kit-lifecycle.service';

// Entities used by external modules for TypeORM repository injection
export { DataRepo } from './entities/data-repo.entity';
export { WikiPage } from './entities/wiki-page.entity';
