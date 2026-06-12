import { Injectable } from '@nestjs/common';
import { MetricsService } from '../../observability/metrics.service';

@Injectable()
export class HttpProbeService {
  constructor(private readonly metricsService: MetricsService) {}

  async run(): Promise<{
    p95: number;
    errorRate: number;
    alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }>;
  }> {
    const metrics = await this.metricsService.getMetricsAsJSON();
    const alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }> = [];

    // 1. Latency (p95)
    const durationMetric = metrics.find(
      (m) => m.name === 'http_request_duration_seconds',
    );
    let p95 = 0;
    if (durationMetric && durationMetric.values.length > 0) {
      p95 = this.computeP95(durationMetric.values);
    }

    if (p95 > 2) {
      alerts.push({
        probe: 'http:latency',
        severity: 'critical',
        message: `HTTP p95 latency is very high: ${p95.toFixed(3)}s`,
      });
    } else if (p95 > 0.5) {
      alerts.push({
        probe: 'http:latency',
        severity: 'degraded',
        message: `HTTP p95 latency is high: ${p95.toFixed(3)}s`,
      });
    }

    // 2. Error Rate
    const requestsMetric = metrics.find(
      (m) => m.name === 'http_requests_total',
    );
    let errorRate = 0;
    if (requestsMetric) {
      errorRate = this.computeErrorRate(requestsMetric.values);
    }

    if (errorRate > 0.2) {
      alerts.push({
        probe: 'http:errors',
        severity: 'critical',
        message: `HTTP error rate is very high: ${(errorRate * 100).toFixed(1)}%`,
      });
    } else if (errorRate > 0.05) {
      alerts.push({
        probe: 'http:errors',
        severity: 'degraded',
        message: `HTTP error rate is high: ${(errorRate * 100).toFixed(1)}%`,
      });
    }

    return {
      p95,
      errorRate,
      alerts,
    };
  }

  private computeP95(values: any[]): number {
    // Histogram values have 'le' label for buckets
    // We'll aggregate across all routes for a global p95
    const buckets: Record<string, number> = {};
    let totalCount = 0;

    for (const v of values) {
      if (v.labels.le) {
        buckets[v.labels.le] = (buckets[v.labels.le] || 0) + v.value;
      }
      // sum and count are also there but we can get count from +Inf
      if (v.labels.le === '+Inf') {
        totalCount += v.value;
      }
    }

    if (totalCount === 0) return 0;

    const target = totalCount * 0.95;
    const sortedLe = Object.keys(buckets).sort((a, b) => {
      if (a === '+Inf') return 1;
      if (b === '+Inf') return -1;
      return parseFloat(a) - parseFloat(b);
    });

    let prevCount = 0;
    let prevLe = 0;

    for (const leStr of sortedLe) {
      const count = buckets[leStr];
      const le = leStr === '+Inf' ? Infinity : parseFloat(leStr);

      if (count >= target) {
        if (le === Infinity) return prevLe; // Can't interpolate to infinity
        // Linear interpolation
        const ratio = (target - prevCount) / (count - prevCount);
        return prevLe + (le - prevLe) * ratio;
      }
      prevCount = count;
      prevLe = le;
    }

    return prevLe;
  }

  private computeErrorRate(values: any[]): number {
    let total = 0;
    let errors = 0;

    for (const v of values) {
      const status = parseInt(v.labels.status_code);
      total += v.value;
      if (status >= 400) {
        errors += v.value;
      }
    }

    return total === 0 ? 0 : errors / total;
  }
}
