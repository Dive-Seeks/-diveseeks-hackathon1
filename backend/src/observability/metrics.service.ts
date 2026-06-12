import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  // HTTP Metrics
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private httpRequestsInFlight: Gauge;

  // Coordinator Metrics
  private coordinatorCyclesTotal: Counter;
  private taskSessionsTotal: Counter;
  private brainLoopDispatchTotal: Counter;
  private securityCriticalIssuesTotal: Counter;
  private mcpDispatchDuration: Histogram;
  private coordinatorCycleDuration: Histogram;
  private agentsFlagged: Gauge;
  private staleMcps: Gauge;

  // LLM Metrics
  private llmRequestsTotal: Counter;
  private llmRequestDuration: Histogram;
  private llmFallbackTotal: Counter;

  onModuleInit() {
    this.registerMetrics();
  }

  private registerMetrics() {
    // Clear registry to avoid errors on hot-reload
    register.clear();

    // --- HTTP ---
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Current HTTP requests in flight',
    });

    // --- Coordinator ---
    this.coordinatorCyclesTotal = new Counter({
      name: 'abigail_coordinator_cycles_total',
      help: 'Coordinator cycles run',
      labelNames: ['trigger'],
    });

    this.taskSessionsTotal = new Counter({
      name: 'abigail_task_sessions_total',
      help: 'Task sessions by status',
      labelNames: ['status'],
    });

    this.brainLoopDispatchTotal = new Counter({
      name: 'abigail_brain_loop_dispatch_total',
      help: 'MCP dispatches',
      labelNames: ['mcpId', 'success'],
    });

    this.securityCriticalIssuesTotal = new Counter({
      name: 'abigail_security_critical_issues_total',
      help: 'Critical security issues found',
      labelNames: ['tenantId'],
    });

    this.mcpDispatchDuration = new Histogram({
      name: 'abigail_mcp_dispatch_duration_seconds',
      help: 'MCP tool call duration',
      labelNames: ['mcpId', 'toolName'],
    });

    this.coordinatorCycleDuration = new Histogram({
      name: 'abigail_coordinator_cycle_duration_seconds',
      help: 'Full coordinator cycle duration',
      labelNames: ['trigger'],
    });

    this.agentsFlagged = new Gauge({
      name: 'abigail_agents_flagged',
      help: 'Agents currently flagged by behaviour audit',
      labelNames: ['tenantId', 'flag'],
    });

    this.staleMcps = new Gauge({
      name: 'abigail_stale_mcps',
      help: 'MCPs in stale state',
      labelNames: ['tenantId'],
    });

    // --- LLM ---
    this.llmRequestsTotal = new Counter({
      name: 'llm_requests_total',
      help: 'Total LLM requests',
      labelNames: ['provider', 'status'],
    });

    this.llmRequestDuration = new Histogram({
      name: 'llm_request_duration_seconds',
      help: 'LLM request latency in seconds',
      labelNames: ['provider'],
      buckets: [0.5, 1, 2, 5, 10, 30],
    });

    this.llmFallbackTotal = new Counter({
      name: 'llm_fallback_total',
      help: 'LLM fallbacks triggered',
      labelNames: ['from', 'to'],
    });
  }

  // --- Getters ---

  getHttpCounter(): Counter {
    return this.httpRequestsTotal;
  }

  getHttpHistogram(): Histogram {
    return this.httpRequestDuration;
  }

  getHttpInFlightGauge(): Gauge {
    return this.httpRequestsInFlight;
  }

  getCoordinatorCounters() {
    return {
      cycle: this.coordinatorCyclesTotal,
      taskSession: this.taskSessionsTotal,
      brainLoop: this.brainLoopDispatchTotal,
      securityIssue: this.securityCriticalIssuesTotal,
    };
  }

  getCoordinatorHistograms() {
    return {
      mcpDispatch: this.mcpDispatchDuration,
      cycleDuration: this.coordinatorCycleDuration,
    };
  }

  getCoordinatorGauges() {
    return {
      agentFlag: this.agentsFlagged,
      staleMcp: this.staleMcps,
    };
  }

  getLlmCounter(): Counter {
    return this.llmRequestsTotal;
  }

  getLlmHistogram(): Histogram {
    return this.llmRequestDuration;
  }

  getLlmFallbackCounter(): Counter {
    return this.llmFallbackTotal;
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getMetricsAsJSON() {
    return register.getMetricsAsJSON();
  }
}
