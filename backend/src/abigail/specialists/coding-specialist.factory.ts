import { Injectable } from '@nestjs/common';
import { ISpecialist } from './specialist.interface';
import {
  RexSpecialist,
  NovaSpecialist,
  KaiSpecialist,
  SageSpecialist,
  AtlasSpecialist,
  OrionSpecialist,
  PixelSpecialist,
  LumaSpecialist,
  FelixSpecialist,
  VexSpecialist,
} from './specialists';

@Injectable()
export class CodingSpecialistFactory {
  private specialists: Map<string, ISpecialist>;

  constructor(
    rex: RexSpecialist,
    nova: NovaSpecialist,
    kai: KaiSpecialist,
    sage: SageSpecialist,
    atlas: AtlasSpecialist,
    orion: OrionSpecialist,
    pixel: PixelSpecialist,
    luma: LumaSpecialist,
    felix: FelixSpecialist,
    vex: VexSpecialist,
  ) {
    this.specialists = new Map<string, ISpecialist>();
    this.specialists.set(rex.id, rex);
    this.specialists.set(nova.id, nova);
    this.specialists.set(kai.id, kai);
    this.specialists.set(sage.id, sage);
    this.specialists.set(atlas.id, atlas);
    this.specialists.set(orion.id, orion);
    this.specialists.set(pixel.id, pixel);
    this.specialists.set(luma.id, luma);
    this.specialists.set(felix.id, felix);
    this.specialists.set(vex.id, vex);
  }

  getSpecialist(id: string): ISpecialist {
    const specialist = this.specialists.get(id);
    if (!specialist) {
      throw new Error(`Specialist ${id} not found`);
    }
    return specialist;
  }
}
