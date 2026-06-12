import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const enabled = process.env.OTEL_ENABLED !== 'false';
const endpoint = process.env.OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces';

const exporter = enabled ? new OTLPTraceExporter({ url: endpoint }) : undefined;

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME ?? 'dive-pos-backend',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
  }),
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
      '@opentelemetry/instrumentation-dns': { enabled: false }, // too noisy
      '@opentelemetry/instrumentation-net': { enabled: false }, // too noisy
    }),
  ],
});

if (enabled) {
  sdk.start();
  console.log(`[OTel] Tracing enabled. Exporting to ${endpoint}`);
} else {
  console.log('[OTel] Tracing disabled (OTEL_ENABLED=false)');
}

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[OTel] SDK shut down successfully'))
    .catch((error) => console.log('[OTel] Error shutting down SDK', error))
    .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  sdk
    .shutdown()
    .then(() => console.log('[OTel] SDK shut down successfully'))
    .catch((error) => console.log('[OTel] Error shutting down SDK', error))
    .finally(() => process.exit(0));
});
