import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

type PointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [number, number][][];
};

export enum ZoneType {
  RADIUS = 'radius',
  POLYGON = 'polygon',
}

@Entity({ name: 'zones', synchronize: false })
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  @Index()
  tenantId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'enum', enum: ZoneType })
  zoneType: ZoneType;

  @Column({ type: 'float', nullable: true })
  radiusMeters: number | null;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  @Index({ spatial: true })
  center: PointGeometry | null;

  @Column('geometry', {
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  @Index({ spatial: true })
  polygon: PolygonGeometry | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
