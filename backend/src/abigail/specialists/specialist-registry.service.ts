import { Injectable } from '@nestjs/common';
import { ISpecialist } from './specialist.interface';

@Injectable()
export class SpecialistRegistryService {
  private readonly registry = new Map<string, ISpecialist>();

  register(team: string, specialist: ISpecialist): void {
    this.registry.set(`${team}:${specialist.id}`, specialist);
  }

  get(team: string, specialistId: string): ISpecialist {
    const key = `${team}:${specialistId}`;
    const s = this.registry.get(key);
    if (!s) throw new Error(`Specialist ${key} not found in registry`);
    return s;
  }
}
