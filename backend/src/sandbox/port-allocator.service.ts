import { Injectable } from '@nestjs/common';

const PORT_RANGE_START = 40000;
const PORT_RANGE_END = 49999;

@Injectable()
export class PortAllocatorService {
  private readonly usedPorts = new Set<number>();

  allocate(count: number): number[] {
    const ports: number[] = [];
    for (
      let p = PORT_RANGE_START;
      p <= PORT_RANGE_END && ports.length < count;
      p++
    ) {
      if (!this.usedPorts.has(p)) {
        this.usedPorts.add(p);
        ports.push(p);
      }
    }
    if (ports.length < count) throw new Error('Port pool exhausted');
    return ports;
  }

  release(ports: number[]): void {
    ports.forEach((p) => this.usedPorts.delete(p));
  }
}
