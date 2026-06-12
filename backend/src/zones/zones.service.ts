import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CheckZonePointDto } from './dto/check-zone-point.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { QueryZonesDto } from './dto/query-zones.dto';
import { Zone, ZoneType } from './entities/zone.entity';

export interface ZoneCheckRow {
  id: string;
  tenantId: string;
  name: string;
  zoneType: ZoneType;
  radiusMeters: number | null;
  within_radius: boolean | null;
  within_polygon: boolean | null;
}

@Injectable()
export class ZonesService {
  private readonly logger = new Logger(ZonesService.name);

  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
  ) {}

  async createZone(dto: CreateZoneDto) {
    try {
      const center =
        dto.zoneType === ZoneType.RADIUS && dto.center
          ? {
              type: 'Point' as const,
              coordinates: [dto.center.longitude, dto.center.latitude] as [
                number,
                number,
              ],
            }
          : null;

      const polygon =
        dto.zoneType === ZoneType.POLYGON && dto.polygonCoordinates
          ? {
              type: 'Polygon' as const,
              coordinates: [this.normalizePolygon(dto.polygonCoordinates)],
            }
          : null;

      const zone = this.zoneRepository.create({
        tenantId: dto.tenantId,
        name: dto.name,
        zoneType: dto.zoneType,
        radiusMeters:
          dto.zoneType === ZoneType.RADIUS ? (dto.radiusMeters ?? null) : null,
        center,
        polygon,
      });

      const saved = await this.zoneRepository.save(zone);
      this.logger.log(`Zone created: ${saved.id} for tenant ${saved.tenantId}`);
      return saved;
    } catch (error: unknown) {
      this.rethrowZoneStorageError(error);
    }
  }

  async listZones(query: QueryZonesDto) {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;

      const [data, total] = await this.zoneRepository.findAndCount({
        where: { tenantId: query.tenantId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error: unknown) {
      this.rethrowZoneStorageError(error);
    }
  }

  async checkPoint(dto: CheckZonePointDto) {
    try {
      const pointText = `POINT(${dto.longitude} ${dto.latitude})`;
      const rawRows: unknown = await this.zoneRepository.query(
        `
        SELECT
          id,
          "tenantId",
          name,
          "zoneType",
          "radiusMeters",
          ST_DWithin(
            center::geography,
            ST_SetSRID(ST_GeomFromText($1), 4326)::geography,
            COALESCE("radiusMeters", 0)
          ) AS within_radius,
          ST_Contains(
            polygon,
            ST_SetSRID(ST_GeomFromText($1), 4326)
          ) AS within_polygon
        FROM zones
        WHERE "tenantId" = $2
      `,
        [pointText, dto.tenantId],
      );
      const rows = this.toZoneCheckRows(rawRows);

      const matchedZone = rows.find((row) =>
        row.zoneType === ZoneType.RADIUS
          ? row.within_radius
          : row.within_polygon,
      );

      return {
        available: Boolean(matchedZone),
        zone: matchedZone ?? null,
      };
    } catch (error: unknown) {
      this.rethrowZonePointCheckError(error);
    }
  }

  private normalizePolygon(
    coordinates: Array<{ latitude: number; longitude: number }>,
  ): [number, number][] {
    if (coordinates.length < 3) {
      throw new BadRequestException('Polygon requires at least three points');
    }

    const ring = coordinates.map(
      (point) => [point.longitude, point.latitude] as [number, number],
    );

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }
    return ring;
  }

  private toZoneCheckRows(rawRows: unknown): ZoneCheckRow[] {
    if (!Array.isArray(rawRows)) {
      return [];
    }

    return rawRows.flatMap((row): ZoneCheckRow[] => {
      if (!row || typeof row !== 'object') {
        return [];
      }
      const record = row as Record<string, unknown>;
      const zoneType = record.zoneType;
      if (zoneType !== ZoneType.RADIUS && zoneType !== ZoneType.POLYGON) {
        return [];
      }
      const id = typeof record.id === 'string' ? record.id : '';
      const tenantId =
        typeof record.tenantId === 'string' ? record.tenantId : '';
      const name = typeof record.name === 'string' ? record.name : '';
      return [
        {
          id,
          tenantId,
          name,
          zoneType,
          radiusMeters:
            typeof record.radiusMeters === 'number'
              ? record.radiusMeters
              : null,
          within_radius:
            typeof record.within_radius === 'boolean'
              ? record.within_radius
              : null,
          within_polygon:
            typeof record.within_polygon === 'boolean'
              ? record.within_polygon
              : null,
        },
      ];
    });
  }

  private rethrowZoneStorageError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error('Zone storage operation failed', error as Error);
    throw new ServiceUnavailableException(
      'Zone storage unavailable. Ensure PostgreSQL PostGIS and zones schema are ready',
    );
  }

  private rethrowZonePointCheckError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (this.isPostgisUnavailableError(error)) {
      this.logger.error(
        'Zone point check failed due to missing PostGIS',
        error,
      );
      throw new ServiceUnavailableException(
        'Zone point check unavailable: PostGIS extension/functions are missing. Enable the PostGIS extension in this database',
      );
    }
    this.logger.error('Zone point check failed', error as Error);
    throw new ServiceUnavailableException(
      'Zone point check unavailable. Ensure PostgreSQL PostGIS and zones schema are ready',
    );
  }

  private isPostgisUnavailableError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as
      | { code?: string; message?: string }
      | undefined;
    const code = driverError?.code ?? '';
    const message = (driverError?.message ?? '').toLowerCase();
    if (code === '42883' || code === '42704' || code === '42P01') {
      return true;
    }
    return (
      message.includes('st_dwithin') ||
      message.includes('st_contains') ||
      message.includes('postgis') ||
      message.includes('geography') ||
      message.includes('geometry') ||
      message.includes('relation "zones" does not exist')
    );
  }
}
