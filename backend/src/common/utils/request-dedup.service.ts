import { Injectable } from '@nestjs/common';

@Injectable()
export class RequestDedupService {
  private readonly inflight = new Map<string, Promise<unknown>>();

  async dedup<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const promise = factory().finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }
}
